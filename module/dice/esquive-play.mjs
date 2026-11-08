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
import { findSkillByName, skillScore } from "./skill-score.mjs";
import { performRoll } from "./chat.mjs";
import {
  attackDamageGate,
  blankReaction,
  dodgeOfferReminder,
  canRollDodge,
  commitDodgeClaim,
  DODGE_SKILL,
  finishDodge,
  holdsDodge,
  personalOpposed,
  reactionOnLaunch,
  reactionOnTurnStart,
  releaseDodge,
  skipDodge
} from "./esquive.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const busy = new Set();

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
 * @param {Record<string, object>} map
 * @returns {Promise<ChatMessage>}
 */
function writeDodge(message, map) {
  return message.setFlag(SYSTEM_ID, "dodge", map);
}

/**
 * @param {string} key
 * @returns {string}
 */
function lockKey(messageId, uuid) {
  return `${messageId}:${uuid}`;
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
        void passDodge(message, uuid, event.currentTarget);
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
async function rollDodge(message, uuid, button) {
  const key = lockKey(message.id, uuid);
  if ( busy.has(key) ) return;
  const userId = game.user.id;
  if ( typeof userId !== "string" || !userId ) return;
  const actor = await foundry.utils.fromUuid(uuid);
  if ( !actor ) {
    ui.notifications.warn(game.i18n.localize("SOL.Dodge.missing"));
    return;
  }
  const tracked = trackedCombatant(actor);
  const reaction = actor.getFlag(SYSTEM_ID, "reaction");
  const opened = readDodge(message)[uuid];
  if ( !canRollDodge({
    entry: opened,
    isGM: game.user.isGM === true,
    isOwner: actor.isOwner === true,
    reactionSpent: reaction?.spent === true,
    tracked
  }) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Dodge.denied"));
    return;
  }
  const claim = commitDodgeClaim(readDodge(message), uuid, userId);
  if ( !claim.ok ) return;
  busy.add(key);
  button.disabled = true;
  try {
    await writeDodge(message, claim.map);
    const held = readDodge(message)[uuid];
    if ( !holdsDodge(held, userId) ) return;
    const score = dodgeScore(actor);
    if ( score == null ) {
      ui.notifications.warn(game.i18n.localize("SOL.Roll.impossible"));
      await releaseIfHeld(message, uuid, userId);
      return;
    }
    const outcome = await performRoll({
      actor,
      label: DODGE_SKILL,
      score: score.score,
      type: "skill",
      note: tracked ? "" : game.i18n.localize("SOL.Dodge.remind")
    });
    if ( !outcome ) {
      await releaseIfHeld(message, uuid, userId);
      return;
    }
    const launch = reactionOnLaunch({
      tracked,
      state: actor.getFlag(SYSTEM_ID, "reaction")
    });
    if ( launch.spend ) await actor.setFlag(SYSTEM_ID, "reaction", launch.state);
    if ( launch.remind ) ui.notifications.info(game.i18n.localize("SOL.Dodge.remind"));
    const attack = {
      success: message.getFlag(SYSTEM_ID, "success") === true,
      dr: message.getFlag(SYSTEM_ID, "dr"),
      score: message.getFlag(SYSTEM_ID, "target")
    };
    const verdict = personalOpposed(attack, {
      success: outcome.success,
      dr: outcome.dr,
      score: outcome.target
    });
    const done = finishDodge(readDodge(message)[uuid], userId, verdict);
    if ( !done.ok || !done.entry ) return;
    const map = readDodge(message);
    map[uuid] = done.entry;
    await writeDodge(message, map);
    const text = verdict === "defender" ? "SOL.Dodge.evaded" : "SOL.Dodge.failed";
    ui.notifications.info(game.i18n.format(text, { name: actor.name ?? "" }));
  } finally {
    busy.delete(key);
    button.disabled = false;
  }
}

/**
 * @param {Actor} actor
 * @returns {{ score: number }|null}
 */
function dodgeScore(actor) {
  const skills = actor.items?.filter(item => item.type === "skill") ?? [];
  const found = findSkillByName(skills, DODGE_SKILL);
  if ( found ) {
    const rated = skillScore(actor.system?.characteristics, found.system ?? {});
    if ( rated.impossible || typeof rated.score !== "number" ) return null;
    return { score: rated.score };
  }
  const ref = actor.system?.characteristics?.ref?.value;
  if ( typeof ref !== "number" ) return null;
  return { score: ref };
}

/**
 * @param {ChatMessage} message
 * @param {string} uuid
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function releaseIfHeld(message, uuid, userId) {
  const map = readDodge(message);
  const released = releaseDodge(map[uuid], userId);
  if ( !released.ok || !released.entry ) return;
  map[uuid] = released.entry;
  await writeDodge(message, map);
}

/**
 * @param {ChatMessage} message
 * @param {string} uuid
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function passDodge(message, uuid, button) {
  if ( game.user.isGM !== true ) return;
  const key = lockKey(message.id, uuid);
  if ( busy.has(key) ) return;
  const map = readDodge(message);
  const passed = skipDodge(map[uuid], true);
  if ( !passed.ok || !passed.entry ) return;
  busy.add(key);
  button.disabled = true;
  try {
    map[uuid] = passed.entry;
    await writeDodge(message, map);
    ui.notifications.info(game.i18n.format("SOL.Dodge.skipped", { name: passed.entry.name ?? "" }));
  } finally {
    busy.delete(key);
    button.disabled = false;
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
  await actor.setFlag(SYSTEM_ID, "reaction", next.state);
}

/**
 * @returns {void}
 */
export function registerEsquive() {
  Hooks.on("renderChatMessageHTML", onChatCard);
}
