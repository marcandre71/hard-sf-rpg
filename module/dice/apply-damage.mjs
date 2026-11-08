/**
 * Le MJ applique les dégâts d'une carte d'attaque à des jetons.
 *
 * Réf. LdR v0.2 §7. Rien n'est écrit tant que le MJ n'a pas confirmé.
 * Le saignement (−1 Endurance par tour) n'est pas automatisé.
 * L'horloge de décompression part avec la condition Combinaison percée.
 * Décision Marc 18/10/2026 : la case
 * « Envoie en fin d'ordre » est cochée si la blessure est grave ou pire,
 * et c'est cette case qui marque la fin d'ordre, pas la gravité seule.
 * Décision Marc 18/10/2026 :
 * créature, synthétique et drone ont FOR et CON, donc un Seuil.
 * Véhicule et vaisseau n'en ont pas : on refuse.
 * Aucun acteur n'a de champ d'armure par zone en dehors des objets
 * `armor` équipés.
 *
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.renderChatMessageHTML.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.statusEffects.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 */
import { markInjuryDefer, registerHudStatus } from "../combat/initiative.mjs";
import { characteristicRollLabel, SOL } from "../config.mjs";
import {
  applyPlannedInjury,
  BIOLOGICAL_BLEEDING_STATUS,
  commitDamageZone,
  consequenceKey,
  isMachineActorType,
  numeric,
  planTargetInjury,
  resolveStrike,
  seuilFromCharacteristics
} from "./damage.mjs";
import {
  attackDamageGate,
  attackFullyApplied,
  defenderDamage,
  mergeDodgeTargets,
  reopenDamage
} from "./esquive.mjs";
import { defenderFromActor } from "./esquive-targets.mjs";
import {
  beginDamageOp,
  createSerialQueue,
  damageOpId,
  mutationRoute,
  provenSender,
  runDamageSteps
} from "./gm-authority.mjs";
import { performRoll } from "./chat.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const CARD = "systems/sol-nouvelle-ere/templates/chat/damage-card.hbs";

/** Conditions. `name` reste une clé i18n : Foundry la traduit en créant l'effet. */
const SUIT_BREACH = "sol-nouvelle-ere.suitBreach";
const BLEEDING = BIOLOGICAL_BLEEDING_STATUS;

/** Messages déjà en cours : un double clic n'ouvre pas deux fenêtres. */
const busy = new Set();
const damageSerial = createSerialQueue();
const SOCKET = `system.${SYSTEM_ID}`;

/**
 * `name` est la clé i18n, pas le français. `init` tourne avant le
 * chargement des traductions : `localize` ici renverrait la clé.
 * Foundry traduit `name` en créant l'effet.
 * `registerHudStatus` assigne par id et pose `hud: true`.
 *
 * @returns {void}
 */
function registerStatuses() {
  registerHudStatus(SUIT_BREACH, "SOL.Status.suitBreach", "icons/svg/hazard.svg", { order: 901 });
  // Réf. LdR v0.2 §11. Pas d'automatisation de l'Endurance.
  registerHudStatus(BLEEDING, "SOL.Status.bleeding", "icons/svg/blood.svg", { order: 902 });
}

/**
 * Le HTML stocké est celui du jet. Le texte « déjà appliqué » est posé
 * au rendu, quand le drapeau existe.
 *
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
function onChatCard(message, html) {
  const apply = html.querySelector("[data-action=sol-apply-damage]");
  if ( apply ) {
    // Visible pour le MJ seulement. Le clic est revérifié dans le handler.
    if ( !game.user.isGM ) apply.remove();
    else {
      if ( message.getFlag(SYSTEM_ID, "applied") === true ) {
        apply.textContent = game.i18n.localize("SOL.Damage.applied");
      }
      if ( apply.dataset.solBound !== "1" ) {
        apply.dataset.solBound = "1";
        apply.addEventListener("click", event => {
          event.preventDefault();
          if ( event.detail > 1 ) return;
          void applyDamage(message, apply);
        });
      }
    }
  }

  const followup = html.querySelector("[data-action=sol-roll-followup]");
  if ( followup ) {
    const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
    // Propriétaire de la cible, ou MJ. Le clic est revérifié.
    if ( !followupAllowed(uuid) ) followup.remove();
    else if ( followup.dataset.solBound !== "1" ) {
      followup.dataset.solBound = "1";
      followup.addEventListener("click", event => {
        event.preventDefault();
        if ( event.detail > 1 ) return;
        void rollFollowup(message, followup);
      });
    }
  }
}

/**
 * @param {unknown} uuid
 * @returns {boolean}
 */
function followupAllowed(uuid) {
  if ( game.user.isGM ) return true;
  if ( typeof uuid !== "string" ) return false;
  return foundry.utils.fromUuidSync(uuid)?.isOwner === true;
}

/**
 * @returns {void}
 */
export function registerDamage() {
  registerStatuses();
  Hooks.on("renderChatMessageHTML", onChatCard);
  game.socket?.on(SOCKET, (payload, senderId) => {
    if ( !payload || payload.type !== "sol-damage" ) return;
    if ( game.user?.isActiveGM !== true ) return;
    void executeDamage(payload, senderId);
  });
}

/**
 * @param {ChatMessage} message
 * @returns {Record<string, object>}
 */
function readDodgeMap(message) {
  const raw = message.getFlag(SYSTEM_ID, "dodge");
  if ( !raw || typeof raw !== "object" ) return {};
  return foundry.utils.deepClone(raw);
}

function readAttack(message) {
  const get = key => message.getFlag(SYSTEM_ID, key);
  const location = get("location");
  const damage = get("damage");
  if ( get("type") !== "weapon" || get("success") !== true ) return null;
  if ( typeof location !== "string" || !(location in SOL.bodyLocations) ) return null;
  if ( typeof damage !== "number" || !Number.isFinite(damage) ) return null;
  const label = get("label");
  return {
    location,
    gross: damage,
    attackerCritical: get("critical") === "success",
    label: typeof label === "string" ? label : "",
    // Réf. LdR v0.2 §7. La visière divise protection et seuil de la tête.
    visor: get("visor") === true
  };
}

/**
 * Cibles du MJ : jetons ciblés, sinon jetons sélectionnés.
 * Deux jetons liés partagent `actor.uuid` : une seule cible.
 * Deux jetons non liés du même acteur de base ont chacun un uuid :
 * chacun est touché. `actor.id` les confondrait.
 *
 * @returns {Token[]}
 */
function candidateTokens() {
  const targeted = Array.from(game.user.targets ?? []);
  const tokens = targeted.length ? targeted : Array.from(canvas.tokens?.controlled ?? []);
  const seen = new Set();
  /** @type {Token[]} */
  const unique = [];
  for ( const token of tokens ) {
    const uuid = token.actor?.uuid;
    if ( !uuid || seen.has(uuid) ) continue;
    seen.add(uuid);
    unique.push(token);
  }
  return unique;
}

/**
 * Copie les protections connues. Un 0 reste une zone couverte.
 *
 * @param {Item} item
 * @returns {object}
 */
function readArmor(item) {
  /** @type {Record<string, number>} */
  const protection = {};
  for ( const zone of Object.keys(SOL.bodyLocations) ) {
    const value = numeric(item.system.protection?.[zone]);
    if ( value != null ) protection[zone] = value;
  }
  return {
    id: item.id,
    equipped: item.system.equipped === true,
    pressurized: item.system.pressurized === true,
    protection,
    // null : pas de seuil, donc pas de brèche. On ne met pas 0.
    // Une chaîne numérique (« 8 ») compte. « abc » ne perce pas.
    breachThreshold: numeric(item.system.breachThreshold)
  };
}

/**
 * @param {Actor} actor
 * @param {number} gross
 * @returns {{ actor: Actor, name: string, sb: number, armors: object[], gross: number }|null}
 */
function prepareTarget(actor, gross) {
  const name = actor.name;
  if ( !(SOL.allowedItems[actor.type] ?? []).includes("injury") ) {
    ui.notifications.warn(game.i18n.format("SOL.Damage.notAllowed", { name }));
    return null;
  }
  const sb = seuilFromCharacteristics(actor.system?.characteristics);
  if ( sb == null ) {
    ui.notifications.warn(game.i18n.format("SOL.Damage.noSeuil", { name }));
    return null;
  }
  // Seuil < 1 : pas de blessure, mais la brèche s'écrit quand même.
  const armors = actor.items.filter(item => item.type === "armor").map(readArmor);
  return { actor, name, sb, armors, gross, actorType: actor.type };
}

/**
 * @param {string} text
 * @returns {string}
 */
function escape(text) {
  return foundry.utils.escapeHTML(String(text));
}

/**
 * @param {string} zone
 * @param {Array<{ name: string, sb: number, armors: object[], gross: number }>} targets
 * @param {boolean} visor
 * @returns {string}
 */
function previewTable(zone, targets, visor) {
  const header = ["target", "zone", "gross", "armour", "net", "sb", "severity", "threshold", "breach"]
    .map(key => `<th>${escape(game.i18n.localize(`SOL.Damage.${key}`))}</th>`)
    .join("");
  const rows = targets.map(target => {
    const strike = resolveStrike({
      gross: target.gross,
      sb: target.sb,
      armors: target.armors,
      zone,
      visor
    });
    const severity = strike.severity
      ? game.i18n.localize(SOL.injurySeverities[strike.severity])
      : game.i18n.localize("SOL.Damage.none");
    const breach = game.i18n.localize(strike.breach ? "SOL.Damage.yes" : "SOL.Damage.no");
    const cells = [
      target.name,
      game.i18n.localize(SOL.bodyLocations[zone]),
      target.gross,
      strike.armour,
      strike.net,
      target.sb,
      severity,
      thresholdText(strike.breaches),
      breach
    ];
    return `<tr>${cells.map(cell => `<td>${escape(cell)}</td>`).join("")}</tr>`;
  }).join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * Seuils affichés. Plusieurs armures : une valeur par couche.
 *
 * @param {Array<{ threshold: number }>|undefined} breaches
 * @returns {string}
 */
function thresholdText(breaches) {
  if ( !breaches?.length ) return "—";
  return breaches.map(entry => String(entry.threshold)).join(", ");
}

/**
 * @param {HTMLElement|object} first
 * @param {object} [second]
 * @returns {HTMLElement|null}
 */
function dialogRoot(first, second) {
  if ( first instanceof HTMLElement ) return first;
  const element = second?.element ?? first?.element ?? second;
  return element instanceof HTMLElement ? element : null;
}

/**
 * @param {object} attack
 * @param {Array<{ actor: Actor, name: string, sb: number, armors: object[], gross: number }>} targets
 * @returns {Promise<string|null>}
 */
async function askDamage(attack, targets) {
  const escapeHtml = escape;
  // La zone est celle du dé, ou celle du tir visé déjà écrite sur la carte.
  const zoneLabel = escapeHtml(game.i18n.localize(SOL.bodyLocations[attack.location]));
  const visorNote = attack.visor
    ? `<p>${escapeHtml(game.i18n.localize("SOL.Damage.visor"))}</p>`
    : "";
  // Décision 08/11/2026 : liste seulement si toutes les cibles sont des machines.
  const machines = targets.length > 0 && targets.every(target => isMachineActorType(target.actorType));
  const options = Object.keys(SOL.bodyLocations).map(key => {
    const selected = key === attack.location ? " selected" : "";
    const label = escapeHtml(game.i18n.localize(SOL.bodyLocations[key]));
    return `<option value="${key}"${selected}>${label}</option>`;
  }).join("");
  const zoneControl = machines
    ? `<label>${escapeHtml(game.i18n.localize("SOL.Damage.zoneChoice"))}
        <select name="zone">${options}</select></label>
        <p>${escapeHtml(game.i18n.localize("SOL.Damage.zoneChoiceHint"))}</p>
        ${visorNote}`
    : `<p>${escapeHtml(game.i18n.localize("SOL.Damage.zone"))}
        <strong>${zoneLabel}</strong></p>
        ${visorNote}
        <input type="hidden" name="zone" value="${attack.location}">`;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SOL.Damage.title") },
    position: { width: 720 },
    classes: ["sol", "sol-nouvelle-ere", "sol-damage-dialog"],
    content: `<div class="sol-damage-form">${zoneControl}<div data-preview></div></div>`,
    buttons: [
      {
        action: "apply",
        label: game.i18n.localize("SOL.Damage.confirm"),
        default: true,
        callback: (_event, button) => button.form?.elements?.zone?.value
      },
      {
        action: "cancel",
        label: game.i18n.localize("SOL.Damage.cancel")
      }
    ],
    rejectClose: false,
    render: (first, second) => {
      const root = dialogRoot(first, second);
      const preview = root?.querySelector("[data-preview]");
      const form = root?.querySelector("form") ?? root;
      if ( !preview || !form ) return;
      const paint = () => {
        const zone = form.elements?.zone?.value;
        if ( typeof zone === "string" && zone in SOL.bodyLocations ) {
          preview.innerHTML = previewTable(zone, targets, attack.visor === true);
        }
      };
      paint();
      form.elements?.zone?.addEventListener?.("change", paint);
    }
  });

  return commitDamageZone(result, {
    actorTypes: targets.map(target => target.actorType),
    rolledZone: attack.location
  });
}

/**
 * @param {Actor} actor
 * @returns {boolean}
 */
function hasStatus(actor, id) {
  return actor.effects.some(effect => {
    const statuses = effect.statuses;
    if ( !statuses ) return false;
    if ( typeof statuses.has === "function" ) return statuses.has(id);
    return Array.isArray(statuses) && statuses.includes(id);
  });
}

/**
 * @param {object} target
 * @param {string} zone
 * @param {{ attackerCritical: boolean, label: string }} attack
 * @param {ChatMessage} source
 * @returns {Promise<void>}
 */
async function applyOne(target, zone, attack, source) {
  const { actor } = target;
  const uuid = actor.uuid;
  const opId = damageOpId(source.id, uuid);
  let dodge = readDodgeMap(source);
  const begun = beginDamageOp(dodge[uuid], opId, zone);
  if ( !begun.ok || !begun.entry ) return;
  const storedZone = begun.entry.damageOp?.zone ?? zone;
  const visor = attack.visor === true && storedZone === "head";
  const strike = resolveStrike({
    gross: target.gross,
    sb: target.sb,
    armors: target.armors,
    zone: storedZone,
    visor
  });
  const plan = planTargetInjury({
    actorType: actor.type,
    alreadyBleeding: hasStatus(actor, BLEEDING),
    zone: storedZone,
    strike,
    label: attack.label,
    attackerCritical: attack.attackerCritical
  });
  const writers = damageWriters(target, storedZone, attack, source, strike, plan);
  let entry = begun.entry;
  await runDamageSteps(entry.damageOp, writers, async next => {
    entry = { ...entry, damageOp: next, applied: next.done === true };
    const fresh = readDodgeMap(source);
    fresh[uuid] = entry;
    await source.setFlag(SYSTEM_ID, "dodge", fresh);
  });
}

/**
 * @param {object} target
 * @param {string} zone
 * @param {object} attack
 * @param {ChatMessage} source
 * @param {object} strike
 * @param {object|null} plan
 * @returns {object}
 */
function damageWriters(target, zone, attack, source, strike, plan) {
  const { actor } = target;
  const visor = attack.visor === true && zone === "head";
  return {
    injury: plan ? async () => {
      const key = consequenceKey(strike.severity, zone);
      const description = key
        ? `<p>${foundry.utils.escapeHTML(game.i18n.localize(`SOL.Damage.consequence.${key}`))}</p>`
        : undefined;
      const created = await applyPlannedInjury(actor, plan, {
        name: game.i18n.format("SOL.Damage.injuryName", {
          severity: game.i18n.localize(SOL.injurySeverities[strike.severity]),
          zone: game.i18n.localize(SOL.bodyLocations[zone])
        }),
        description
      });
      const id = created?.id;
      if ( typeof id !== "string" ) throw new Error("injury");
      return id;
    } : null,
    defer: plan?.system?.endOfOrder ? async injuryId => {
      await markInjuryDefer(actor, injuryId, true);
    } : null,
    breach: strike.breach ? async () => {
      const breached = new Set(strike.breaches.filter(item => item.breached).map(item => item.id));
      const updates = target.armors
        .filter(armor => breached.has(armor.id))
        .map(armor => actor.items.get(armor.id))
        .filter(item => item && item.system.sealState !== "breached")
        .map(item => ({ _id: item.id, "system.sealState": "breached" }));
      if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates, { solSealApply: true });
      if ( !hasStatus(actor, SUIT_BREACH) ) {
        await actor.toggleStatusEffect(SUIT_BREACH, { active: true });
      }
    } : null,
    summary: async () => {
      const followup = plan?.followup ?? null;
      const reminders = (plan?.reminders ?? []).map(key => game.i18n.localize(`SOL.Damage.remind.${key}`));
      const content = await foundry.applications.handlebars.renderTemplate(CARD, {
        name: actor.name,
        zone: game.i18n.localize(SOL.bodyLocations[zone]),
        net: strike.net,
        severity: strike.severity
          ? game.i18n.localize(SOL.injurySeverities[strike.severity])
          : game.i18n.localize("SOL.Damage.none"),
        breach: game.i18n.localize(strike.breach ? "SOL.Damage.yes" : "SOL.Damage.no"),
        threshold: thresholdText(strike.breaches),
        visor,
        reminders,
        followupLabel: followup ? game.i18n.localize(`SOL.Damage.followup.${followup}`) : ""
      });
      const created = await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
        whisper: Array.from(source.whisper ?? []),
        blind: source.blind === true,
        flags: {
          [SYSTEM_ID]: {
            type: "damage",
            actorUuid: actor.uuid,
            characteristic: followup,
            damageOp: damageOpId(source.id, actor.uuid)
          }
        }
      });
      const id = created?.id;
      if ( typeof id !== "string" ) throw new Error("summary");
      return id;
    }
  };
}

/**
 * Relit la carte après la confirmation. Seul le MJ actif écrit.
 *
 * @param {object} payload
 * @param {string|undefined} senderId
 * @returns {Promise<void>}
 */
async function executeDamage(payload, senderId) {
  if ( game.user?.isActiveGM !== true ) return;
  const proven = provenSender(senderId, payload);
  const user = proven ? game.users?.get?.(proven) : null;
  if ( !user || user.isGM !== true ) return;
  const messageId = payload?.messageId;
  if ( typeof messageId !== "string" ) return;
  await damageSerial(`card:${messageId}`, async () => {
    const message = game.messages?.get?.(messageId);
    const attack = message ? readAttack(message) : null;
    if ( !message || !attack ) return;
    const actors = [];
    for ( const uuid of payload.defenderUuids ?? [] ) {
      if ( typeof uuid !== "string" ) continue;
      const actor = await foundry.utils.fromUuid(uuid);
      if ( actor ) actors.push(actor);
    }
    if ( !actors.length ) return;
    let dodge = readDodgeMap(message);
    if ( payload.reapply === true && message.getFlag(SYSTEM_ID, "applied") === true ) {
      dodge = reopenDamage(dodge);
    }
    const offers = actors.map(actor => defenderFromActor(actor)).filter(Boolean);
    const merged = mergeDodgeTargets(dodge, offers);
    dodge = merged.map;
    const zone = commitDamageZone(payload.zone, {
      actorTypes: actors.map(actor => actor.type),
      rolledZone: attack.location
    });
    if ( !zone || !attackDamageGate(dodge) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Dodge.blocked"));
      await message.setFlag(SYSTEM_ID, "dodge", dodge);
      return;
    }
    await message.setFlag(SYSTEM_ID, "dodge", dodge);
    const targets = [];
    for ( const actor of actors ) {
      const prepared = prepareTarget(actor, attack.gross);
      if ( prepared ) targets.push(prepared);
    }
    for ( const target of targets ) {
      const fresh = readDodgeMap(message);
      const entry = fresh[target.actor.uuid];
      const resume = entry?.damageOp && entry.damageOp.done !== true && entry.damageOp.injuryId;
      if ( !resume && !defenderDamage(entry, attack).write ) continue;
      try {
        await applyOne(target, zone, attack, message);
      } catch (error) {
        console.error(error);
        ui.notifications.error(game.i18n.format("SOL.Damage.failed", { name: target.name }));
      }
    }
    const after = readDodgeMap(message);
    if ( attackFullyApplied(after) ) await message.setFlag(SYSTEM_ID, "applied", true);
  });
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function applyDamage(message, button) {
  if ( !game.user.isGM ) {
    ui.notifications.warn(game.i18n.localize("SOL.Damage.gmOnly"));
    return;
  }
  if ( busy.has(message.id) ) return;
  const attack = readAttack(message);
  if ( !attack ) {
    ui.notifications.warn(game.i18n.localize("SOL.Damage.badCard"));
    return;
  }
  const tokens = candidateTokens();
  if ( !tokens.length ) {
    ui.notifications.warn(game.i18n.localize("SOL.Damage.noTarget"));
    return;
  }

  /** @type {Array<{ actor: Actor, name: string, sb: number, armors: object[], gross: number }>} */
  const targets = [];
  for ( const token of tokens ) {
    const prepared = prepareTarget(token.actor, attack.gross);
    if ( prepared ) targets.push(prepared);
  }
  if ( !targets.length ) return;

  const dodgeNow = readDodgeMap(message);
  if ( !attackDamageGate(dodgeNow) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Dodge.blocked"));
    return;
  }
  const writable = targets.filter(target => {
    const entry = dodgeNow[target.actor.uuid];
    if ( entry?.damageOp?.done === true || entry?.applied === true ) return false;
    return !entry || defenderDamage(entry, attack).write;
  });
  if ( !writable.length ) return;
  if ( message.getFlag(SYSTEM_ID, "applied") === true ) {
    const again = await confirmReapply();
    if ( !again ) return;
  }
  const zone = await askDamage(attack, writable);
  if ( !zone ) return;
  const payload = {
    type: "sol-damage",
    messageId: message.id,
    zone,
    defenderUuids: writable.map(target => target.actor.uuid),
    reapply: message.getFlag(SYSTEM_ID, "applied") === true
  };
  const route = mutationRoute({
    isActiveGM: game.user.isActiveGM === true,
    senderId: game.user.id,
    senderIsGM: true
  });
  if ( route === "relay" ) {
    if ( !game.users?.activeGM || !game.socket?.emit ) {
      ui.notifications.warn(game.i18n.localize("SOL.Dodge.noActiveGm"));
      return;
    }
    game.socket.emit(SOCKET, payload);
    return;
  }
  if ( route !== "write" ) return;
  busy.add(message.id);
  button.disabled = true;
  try {
    await executeDamage(payload, game.user.id);
    if ( message.getFlag(SYSTEM_ID, "applied") === true ) {
      button.textContent = game.i18n.localize("SOL.Damage.applied");
    }
  } finally {
    busy.delete(message.id);
    button.disabled = false;
  }
}

/**
 * Un second clic demande confirmation. Annuler n'écrit rien.
 *
 * @returns {Promise<boolean>}
 */
async function confirmReapply() {
  const question = game.i18n.localize("SOL.Damage.reapply");
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: question },
    classes: ["sol", "sol-nouvelle-ere", "sol-damage-dialog"],
    content: `<p>${escape(question)}</p>`,
    buttons: [
      {
        action: "again",
        label: game.i18n.localize("SOL.Damage.again")
      },
      {
        action: "cancel",
        label: game.i18n.localize("SOL.Damage.cancel"),
        default: true
      }
    ],
    rejectClose: false
  });
  return result === "again";
}

/**
 * Test de VOL (grave) ou de CON (critique) sur la cible, via la fenêtre
 * de jet déjà utilisée pour les caractéristiques.
 *
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function rollFollowup(message, button) {
  if ( busy.has(message.id) ) return;
  const key = message.getFlag(SYSTEM_ID, "characteristic");
  const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
  if ( (key !== "vol" && key !== "con") || typeof uuid !== "string" ) return;
  if ( !followupAllowed(uuid) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Damage.followupDenied"));
    return;
  }
  const actor = await foundry.utils.fromUuid(uuid);
  if ( !actor ) {
    ui.notifications.warn(game.i18n.localize("SOL.Damage.missingActor"));
    return;
  }
  const score = actor.system?.characteristics?.[key]?.value;
  if ( typeof score !== "number" ) {
    ui.notifications.warn(game.i18n.format("SOL.Damage.noCharacteristic", { name: actor.name }));
    return;
  }
  const label = characteristicRollLabel(SOL.characteristics[key], text => game.i18n.localize(text));
  if ( !label ) return;
  busy.add(message.id);
  button.disabled = true;
  try {
    await performRoll({
      actor,
      label,
      score,
      type: "characteristic"
    });
  } finally {
    busy.delete(message.id);
    button.disabled = false;
  }
}
