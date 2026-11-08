/**
 * Fenêtre d'esquive sur la carte d'attaque, et retour de la réaction.
 *
 * Réf. LdR v0.2 §6 et §7. Décision Marc 08/11/2026.
 * Le dé de l'attaque n'est pas relancé. Annuler ne dépense rien.
 * Le lancement effectif dépense la réaction, même ratée.
 * Hors combat suivi : rappel au MJ, pas de drapeau.
 * `_onStartTurn` n'est appelé que pour un MJ désigné
 * (API v14, Combat#_onStartTurn). Un second passage du même
 * tour ne rend pas la réaction.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html#_onStartTurn
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.Document.html#setFlag
 */
import { findSkillByName } from "./skill-score.mjs";
import { performRoll } from "./chat.mjs";
import {
  attackDamageGate,
  blankReaction,
  canRollDodge,
  DODGE_SKILL,
  dodgeOfferReminder,
  esquiveScore,
  reactionOnTurnStart,
  skipDodge
} from "./esquive.mjs";
import { activeGmNow, applyDodgeCommand, createSerialQueue, planDodgeWrites, provenSender, recoverShown } from "./gm-authority.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const SOCKET = `system.${SYSTEM_ID}`;
const serial = createSerialQueue();
const starting = new Set();

/**
 * @param {Actor|null|undefined} actor
 * @returns {boolean}
 */
function trackedCombatant(actor) {
  const uuid = actor?.uuid;
  const combat = game.combat;
  if ( !uuid || combat?.started !== true ) return false;
  return Array.from(combat.combatants ?? []).some(combatant => combatant.actor?.uuid === uuid);
}

/**
 * @param {ChatMessage} message
 * @returns {Record<string, object>}
 */
function readDodge(message) {
  const raw = message.getFlag(SYSTEM_ID, "dodge");
  if ( !raw || typeof raw !== "object" ) return {};
  return foundry.utils.deepClone(raw);
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
function onChatCard(message, html) {
  const root = html.querySelector?.(".sol-roll-card") ?? html;
  if ( !(root instanceof HTMLElement) ) return;
  const map = readDodge(message);
  if ( !Object.keys(map).length ) return;
  root.querySelector("[data-dodge-root]")?.remove();
  const box = document.createElement("div");
  box.dataset.dodgeRoot = "1";
  for ( const [uuid, entry] of Object.entries(map) ) {
    const line = document.createElement("p");
    line.textContent = lineText(entry);
    box.append(line);
    const actor = foundry.utils.fromUuidSync(uuid);
    const tracked = trackedCombatant(actor);
    const reaction = actor?.getFlag?.(SYSTEM_ID, "reaction");
    if ( canRollDodge({
      entry,
      isGM: game.user.isGM === true,
      isOwner: actor?.isOwner === true,
      reactionSpent: reaction?.spent === true,
      tracked
    }) ) {
      box.append(button("sol-dodge", uuid, game.i18n.localize("SOL.Dodge.roll"), event => {
        void rollDodge(message, uuid, event.currentTarget);
      }));
    }
    if ( skipDodge(entry, game.user.isGM === true).ok ) {
      box.append(button("sol-dodge-skip", uuid, game.i18n.localize("SOL.Dodge.skip"), event => {
        void askDodge(message, uuid, "skip");
      }));
    }
    if ( recoverShown(entry, reaction, message.id, game.user.isGM === true) ) {
      box.append(button("sol-dodge-recover", uuid, game.i18n.localize("SOL.Dodge.recover"), event => {
        void askDodge(message, uuid, "recover");
      }));
    }
  }
  if ( dodgeOfferReminder(map) ) {
    const reminder = document.createElement("p");
    reminder.className = "sol-damage-remind";
    reminder.textContent = game.i18n.localize("SOL.Dodge.eligibility");
    box.append(reminder);
  }
  const apply = root.querySelector("[data-action=sol-apply-damage]");
  if ( apply && !attackDamageGate(map) ) {
    apply.disabled = true;
    apply.textContent = game.i18n.localize("SOL.Dodge.blocked");
  }
  root.append(box);
}

/**
 * @param {object} entry
 * @returns {string}
 */
function lineText(entry) {
  const name = entry?.name || "";
  if ( entry?.state === "no-ref" ) return game.i18n.format("SOL.Dodge.noRef", { name });
  if ( entry?.state === "unavailable" ) return game.i18n.format("SOL.Dodge.spent", { name });
  if ( entry?.state === "rolling" ) return game.i18n.format("SOL.Dodge.rolling", { name });
  if ( entry?.state === "evaded" ) return game.i18n.format("SOL.Dodge.evaded", { name });
  if ( entry?.state === "failed" ) return game.i18n.format("SOL.Dodge.failed", { name });
  if ( entry?.state === "skipped" ) return game.i18n.format("SOL.Dodge.skipped", { name });
  return game.i18n.format("SOL.Dodge.pending", { name });
}

/**
 * @param {string} action
 * @param {string} uuid
 * @param {string} label
 * @param {(event: PointerEvent) => void} onClick
 * @returns {HTMLButtonElement}
 */
function button(action, uuid, label, onClick) {
  const element = document.createElement("button");
  element.type = "button";
  element.dataset.action = action;
  element.dataset.defender = uuid;
  element.textContent = label;
  element.addEventListener("click", event => {
    event.preventDefault();
    if ( event.detail > 1 ) return;
    onClick(event);
  });
  return element;
}

/**
 * @param {ChatMessage} message
 * @param {string} uuid
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function rollDodge(message, uuid) {
  await askDodge(message, uuid, "reserve");
}

/**
 * Le joueur ne écrit pas la carte d'attaque. Le MJ actif exécute.
 * `senderId` du socket n'est pas recopié dans le message.
 *
 * @param {ChatMessage} message
 * @param {string} uuid
 * @param {string} action
 * @param {object} [extra]
 * @returns {Promise<void>}
 */
async function askDodge(message, uuid, action, extra = {}) {
  const payload = {
    type: "sol-dodge",
    action,
    messageId: message.id,
    defenderUuid: uuid,
    ...extra
  };
  if ( game.user?.isActiveGM === true ) {
    const result = await executeDodge(payload, game.user.id);
    if ( result?.ok === false ) ui.notifications.warn(game.i18n.localize("SOL.Dodge.denied"));
    return;
  }
  const gm = game.users?.activeGM;
  if ( !gm || typeof gm.query !== "function" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Dodge.noActiveGm"));
    return;
  }
  // API v14 : le contexte { user } est celui de la session, pas un champ du message.
  // Un délai échu n'annule pas ce que le MJ a déjà commencé, et on ne relance pas.
  // @see https://foundryvtt.com/api/v14/classes/foundry.documents.User.html#query
  try {
    await gm.query(`${SYSTEM_ID}.dodge`, payload, { timeout: 15000 });
  } catch (error) {
    console.error(error);
    ui.notifications.warn(game.i18n.localize("SOL.Dodge.queryFailed"));
  }
}

/**
 * @param {object} payload
 * @param {string|undefined} senderId
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function executeDodge(payload, senderId) {
  if ( game.user?.isActiveGM !== true ) return { ok: false, reason: "not-active" };
  const defenderUuid = payload?.defenderUuid;
  const messageId = payload?.messageId;
  if ( typeof defenderUuid !== "string" || typeof messageId !== "string" ) {
    return { ok: false, reason: "missing" };
  }
  if ( provenSender(senderId, payload) == null ) return { ok: false, reason: "unproven" };
  return serial(`actor:${defenderUuid}`, () => serial(`card:${messageId}`, async () => {
    if ( !activeGmNow() ) return { ok: false, reason: "not-active" };
    const built = await dodgeWorld(payload, senderId);
    if ( !activeGmNow() ) return { ok: false, reason: "not-active" };
    if ( !built ) return { ok: false, reason: "missing" };
    if ( payload.action === "finish" || payload.action === "recover" ) {
      return applyDodgeWrites(built, payload, senderId);
    }
    const result = applyDodgeCommand(built.world, built.command, senderId);
    if ( !activeGmNow() ) return { ok: false, reason: "not-active" };
    await persistDodgeWorld(built.world);
    if ( result?.remind ) ui.notifications.info(game.i18n.localize("SOL.Dodge.remind"));
    return result;
  }));
}

/**
 * @param {Actor} actor
 * @returns {{ score: number }|null}
 */
function dodgeScore(actor) {
  const skills = actor.items?.filter(item => item.type === "skill") ?? [];
  const found = findSkillByName(skills, DODGE_SKILL);
  const score = esquiveScore({
    characteristics: actor.system?.characteristics,
    skill: found ? (found.system ?? {}) : null
  });
  return typeof score === "number" ? { score } : null;
}

/**
 * @param {object} payload
 * @param {string} senderId
 * @returns {Promise<object|null>}
 */
async function dodgeWorld(payload, senderId) {
  const message = game.messages?.get?.(payload.messageId);
  const actor = await foundry.utils.fromUuid(payload.defenderUuid);
  const user = game.users?.get?.(senderId);
  if ( !message || !actor || !user ) return null;
  const owns = actor.testUserPermission?.(user, "OWNER") === true;
  let command = payload;
  if ( payload.action === "reserve" ) {
    command = {
      action: "reserve",
      messageId: payload.messageId,
      defenderUuid: payload.defenderUuid,
      authorizedBase: dodgeScore(actor)?.score
    };
  }
  const card = {
    id: message.id,
    success: message.getFlag(SYSTEM_ID, "success") === true,
    dr: message.getFlag(SYSTEM_ID, "dr"),
    score: message.getFlag(SYSTEM_ID, "target"),
    dodge: readDodge(message)
  };
  return {
    command,
    world: {
      users: { [senderId]: { isGM: user.isGM === true, owns: owns ? [actor.uuid] : [] } },
      cards: { [message.id]: card },
      actors: {
        [actor.uuid]: {
          uuid: actor.uuid,
          tracked: trackedCombatant(actor),
          reaction: actor.getFlag(SYSTEM_ID, "reaction") ?? blankReaction()
        }
      }
    }
  };
}

/**
 * @param {object} world
 * @returns {Promise<void>}
 */
async function persistDodgeWorld(world) {
  for ( const card of Object.values(world.cards ?? {}) ) {
    if ( !activeGmNow() ) throw new Error("not-active");
    const message = game.messages?.get?.(card.id);
    if ( message ) await message.setFlag(SYSTEM_ID, "dodge", card.dodge);
  }
  for ( const actorSnap of Object.values(world.actors ?? {}) ) {
    if ( !activeGmNow() ) throw new Error("not-active");
    const actor = await foundry.utils.fromUuid(actorSnap.uuid);
    if ( !activeGmNow() ) throw new Error("not-active");
    if ( actor ) await actor.setFlag(SYSTEM_ID, "reaction", actorSnap.reaction);
  }
}

/**
 * @param {object} built
 * @param {object} payload
 * @param {string} senderId
 * @returns {Promise<{ ok: boolean, reason?: string, verdict?: string|null }>}
 */
async function applyDodgeWrites(built, payload, senderId) {
  const message = game.messages?.get?.(payload.messageId);
  const actor = await foundry.utils.fromUuid(payload.defenderUuid);
  if ( !message || !actor ) return { ok: false, reason: "missing" };
  if ( !activeGmNow() ) return { ok: false, reason: "not-active" };
  const user = game.users?.get?.(senderId);
  const entry = readDodge(message)[payload.defenderUuid];
  if ( !entry || !user ) return { ok: false, reason: "missing" };
  const gm = user.isGM === true;
  const owner = actor.testUserPermission?.(user, "OWNER") === true;
  if ( payload.action === "recover" && !gm ) return { ok: false, reason: "rights" };
  if ( payload.action === "finish" && !gm && !owner ) return { ok: false, reason: "rights" };
  const roll = payload.action === "recover" || payload.action === "finish"
    ? findLinkedRoll(message, payload.defenderUuid, entry)
    : null;
  const plan = planDodgeWrites({
    action: payload.action,
    entry,
    reaction: actor.getFlag(SYSTEM_ID, "reaction") ?? blankReaction(),
    tracked: trackedCombatant(actor),
    roll,
    attack: {
      success: message.getFlag(SYSTEM_ID, "success") === true,
      dr: message.getFlag(SYSTEM_ID, "dr"),
      score: message.getFlag(SYSTEM_ID, "target")
    },
    isGM: gm
  });
  if ( !plan.ok ) return plan;
  for ( const write of plan.writes ) {
    if ( !activeGmNow() ) return { ok: false, reason: "not-active" };
    if ( write.kind === "card" ) {
      const map = readDodge(message);
      map[payload.defenderUuid] = write.entry;
      await message.setFlag(SYSTEM_ID, "dodge", map);
    } else if ( write.kind === "actor" ) {
      if ( !activeGmNow() ) return { ok: false, reason: "not-active" };
      await actor.setFlag(SYSTEM_ID, "reaction", write.reaction);
    }
  }
  if ( plan.verdict && trackedCombatant(actor) !== true ) {
    ui.notifications.info(game.i18n.localize("SOL.Dodge.remind"));
  }
  return { ok: true, verdict: plan.verdict ?? null };
}

/**
 * Carte de jet liée à cette attaque. Le score lu est celui du document.
 *
 * @param {ChatMessage} attack
 * @param {string} defenderUuid
 * @param {object} entry
 * @returns {object|null}
 */
function findLinkedRoll(attack, defenderUuid, entry) {
  const bag = game.messages;
  const list = Array.isArray(bag?.contents) ? bag.contents : [];
  const byId = typeof bag?.get === "function" ? bag.get.bind(bag) : () => null;
  const ids = [];
  if ( typeof entry?.rollMessageId === "string" ) ids.push(entry.rollMessageId);
  for ( const message of list ) {
    if ( message?.id && !ids.includes(message.id) ) ids.push(message.id);
  }
  for ( const id of ids ) {
    const message = byId(id) ?? list.find(item => item?.id === id);
    const link = message?.getFlag?.(SYSTEM_ID, "esquiveFor");
    if ( !message || !link ) continue;
    if ( link.attackMessageId !== attack.id || link.defenderUuid !== defenderUuid ) continue;
    const authorId = message.author?.id ?? message.user?.id ?? null;
    if ( entry?.roller && authorId && authorId !== entry.roller ) continue;
    const target = message.getFlag?.(SYSTEM_ID, "target");
    const die = message.getFlag?.(SYSTEM_ID, "die");
    return {
      messageId: message.id,
      authorId,
      attackMessageId: link.attackMessageId,
      defenderUuid: link.defenderUuid,
      die,
      target
    };
  }
  return null;
}

/**
 * Le jet part seulement chez le demandeur dont l'id est sur la carte,
 * après la réservation du MJ actif.
 *
 * @param {ChatMessage} message
 * @param {string} uuid
 * @returns {Promise<void>}
 */
async function rollAfterReserve(message, uuid) {
  const actor = await foundry.utils.fromUuid(uuid);
  if ( !actor ) return;
  const fixed = readDodge(message)[uuid]?.authorizedBase;
  const score = typeof fixed === "number" ? { score: fixed } : dodgeScore(actor);
  if ( !score ) {
    await askDodge(message, uuid, "release");
    return;
  }
  const outcome = await performRoll({
    actor,
    label: DODGE_SKILL,
    score: score.score,
    type: "skill",
    note: trackedCombatant(actor) ? "" : game.i18n.localize("SOL.Dodge.remind"),
    esquiveLink: { attackMessageId: message.id, defenderUuid: uuid }
  });
  if ( !outcome?.messageId ) {
    await askDodge(message, uuid, "release");
    return;
  }
  await askDodge(message, uuid, "finish", { rollMessageId: outcome.messageId });
}

/**
 * @param {object} payload
 * @param {string|undefined} senderId
 * @returns {Promise<void>}
 */
/**
 * @param {ChatMessage} message
 * @returns {void}
 */
function onUpdate(message) {
  const map = readDodge(message);
  for ( const [uuid, entry] of Object.entries(map) ) {
    if ( entry?.state !== "rolling" || entry.launched === true ) continue;
    if ( entry.roller !== game.user?.id ) continue;
    const key = `${message.id}:${uuid}`;
    if ( starting.has(key) ) continue;
    starting.add(key);
    void rollAfterReserve(message, uuid).finally(() => starting.delete(key));
  }
}

/**
 * Nouveau combat : la réaction repart. Le tour 1 l'enregistre ensuite.
 * Décision Marc 08/11/2026.
 *
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
export async function resetReactionsForCombat(combat) {
  if ( game.user?.isActiveGM !== true ) return;
  const seen = new Set();
  for ( const combatant of combat.combatants ?? [] ) {
    const actor = combatant.actor;
    const uuid = actor?.uuid;
    if ( !actor || typeof uuid !== "string" || seen.has(uuid) ) continue;
    seen.add(uuid);
    if ( game.user?.isActiveGM !== true ) return;
    await actor.setFlag(SYSTEM_ID, "reaction", blankReaction());
  }
}

/**
 * Début du tour de ce combattant. Un rappel du même tour ne change rien.
 *
 * @param {Combatant} combatant
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
export async function refreshPersonalReaction(combatant, combat) {
  if ( game.user?.isActiveGM !== true ) return;
  const actor = combatant?.actor;
  const combatantId = combatant?.id;
  if ( !actor || typeof combatantId !== "string" ) return;
  if ( typeof combat?.round !== "number" || typeof combat?.turn !== "number" ) return;
  const next = reactionOnTurnStart(actor.getFlag(SYSTEM_ID, "reaction"), {
    round: combat.round,
    turn: combat.turn,
    combatantId
  });
  if ( next.replay ) return;
  if ( game.user?.isActiveGM !== true ) return;
  await actor.setFlag(SYSTEM_ID, "reaction", next.state);
}

/**
 * @returns {void}
 */
export function registerEsquive() {
  Hooks.on("renderChatMessageHTML", onChatCard);
  Hooks.on("updateChatMessage", onUpdate);
  globalThis.CONFIG ??= {};
  const queries = globalThis.CONFIG.queries ??= {};
  const query = `${SYSTEM_ID}.dodge`;
  if ( !queries[query] ) {
    queries[query] = (data, context) => executeDodge(data, context?.user?.id);
  }
}
