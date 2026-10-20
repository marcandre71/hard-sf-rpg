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
import { newInjuryEndsOrder } from "./initiative.mjs";
import {
  cardReminders,
  consequenceKey,
  numeric,
  resolveStrike,
  seuilFromCharacteristics
} from "./damage.mjs";
import { performRoll } from "./chat.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const CARD = "systems/sol-nouvelle-ere/templates/chat/damage-card.hbs";

/** Conditions. `name` reste une clé i18n : Foundry la traduit en créant l'effet. */
const SUIT_BREACH = "sol-nouvelle-ere.suitBreach";
const BLEEDING = "sol-nouvelle-ere.bleeding";

/** Messages déjà en cours : un double clic n'ouvre pas deux fenêtres. */
const busy = new Set();

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
}

/**
 * @param {ChatMessage} message
 * @returns {{ location: string, gross: number, attackerCritical: boolean, label: string }|null}
 */
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
  return { actor, name, sb, armors, gross };
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
  const zoneControl = `<p>${escapeHtml(game.i18n.localize("SOL.Damage.zone"))}
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
        callback: (_event, button) => button.form?.elements?.zone?.value ?? attack.location
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
      const zone = form.elements?.zone?.value;
      if ( typeof zone === "string" && zone in SOL.bodyLocations ) {
        preview.innerHTML = previewTable(zone, targets, attack.visor === true);
      }
    }
  });

  if ( !result || result === "cancel" || result === "apply" ) return null;
  if ( typeof result !== "string" || !(result in SOL.bodyLocations) ) return null;
  return result;
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
  const visor = attack.visor === true && zone === "head";
  const strike = resolveStrike({
    gross: target.gross,
    sb: target.sb,
    armors: target.armors,
    zone,
    visor
  });

  if ( strike.severity ) {
    const key = consequenceKey(strike.severity, zone);
    // Décision Marc 18/10/2026 : la case, pas la gravité seule.
    // Grave ou pire : cochée. Légère : décochée.
    // « Active pour le round 1 » reste décochée : cette blessure
    // naît pendant le combat, le déplacement part tout de suite.
    const endOfOrder = newInjuryEndsOrder(strike.severity);
    /** @type {object} */
    const system = {
      location: zone,
      severity: strike.severity,
      bleeding: strike.bleeding,
      penalty: strike.penalty,
      source: attack.label,
      endOfOrder
    };
    if ( key ) {
      const text = game.i18n.localize(`SOL.Damage.consequence.${key}`);
      system.description = `<p>${foundry.utils.escapeHTML(text)}</p>`;
    }
    const [created] = await actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.format("SOL.Damage.injuryName", {
        severity: game.i18n.localize(SOL.injurySeverities[strike.severity]),
        zone: game.i18n.localize(SOL.bodyLocations[zone])
      }),
      type: "injury",
      system
    }]);
    // Réf. LdR v0.2 §11. Pas d'automatisation de l'Endurance.
    if ( strike.bleeding && !hasStatus(actor, BLEEDING) ) {
      await actor.toggleStatusEffect(BLEEDING, { active: true });
    }
    // Réf. LdR v0.2 §7. La case est relue au passage de round.
    // Décocher avant ce passage annule le déplacement de cette blessure.
    // Le drapeau Sonné (`deferEnd`) n'est pas touché.
    if ( endOfOrder && created?.id ) await markInjuryDefer(actor, created.id, true);
  }

  if ( strike.breach ) {
    const breached = new Set(strike.breaches.filter(entry => entry.breached).map(entry => entry.id));
    const updates = target.armors
      .filter(armor => breached.has(armor.id))
      .map(armor => actor.items.get(armor.id))
      .filter(item => item && item.system.sealState !== "breached")
      .map(item => ({ _id: item.id, "system.sealState": "breached" }));
    if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
    if ( !hasStatus(actor, SUIT_BREACH) ) {
      await actor.toggleStatusEffect(SUIT_BREACH, { active: true });
    }
  }

  const followup = strike.severity === "serious"
    ? "vol"
    : strike.severity === "critical" ? "con" : null;
  const reminders = cardReminders({
    severity: strike.severity,
    zone,
    attackerCritical: attack.attackerCritical
  }).map(key => game.i18n.localize(`SOL.Damage.remind.${key}`));

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

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    whisper: Array.from(source.whisper ?? []),
    blind: source.blind === true,
    flags: {
      [SYSTEM_ID]: {
        type: "damage",
        actorUuid: actor.uuid,
        characteristic: followup
      }
    }
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

  busy.add(message.id);
  button.disabled = true;
  try {
    if ( message.getFlag(SYSTEM_ID, "applied") === true ) {
      const again = await confirmReapply();
      if ( !again ) return;
    }
    const zone = await askDamage(attack, targets);
    if ( !zone ) return;
    let applied = false;
    for ( const target of targets ) {
      try {
        await applyOne(target, zone, attack, message);
        applied = true;
      } catch (error) {
        console.error(error);
        ui.notifications.error(game.i18n.format("SOL.Damage.failed", { name: target.name }));
      }
    }
    if ( applied ) {
      await message.setFlag(SYSTEM_ID, "applied", true);
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
