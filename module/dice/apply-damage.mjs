/**
 * Le MJ applique les dégâts d'une carte d'attaque à des jetons.
 *
 * Réf. LdR v0.2 §7. Rien n'est écrit tant que le MJ n'a pas confirmé.
 * L'endurance, l'initiative et l'horloge de décompression ne sont pas
 * automatisées. Créature, synthétique et drone n'ont pas de FOR ni de
 * CON (module/data/actors.mjs) : pas de Seuil, on refuse.
 * Aucun acteur n'a de champ d'armure par zone en dehors des objets
 * `armor` équipés.
 *
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.renderChatMessageHTML.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.statusEffects.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 */
import { SOL } from "../config.mjs";
import {
  cardReminders,
  consequenceKey,
  isUsableSeuil,
  pressurizedCovers,
  resolveStrike,
  seuilFromCharacteristics,
  sumZoneArmour
} from "./damage.mjs";
import { performRoll } from "./chat.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const CARD = "systems/sol-nouvelle-ere/templates/chat/damage-card.hbs";

/**
 * Identifiant de la condition. `name` est une clé i18n : Foundry la
 * traduit en créant l'effet. L'icône est un SVG du cœur.
 */
const SUIT_BREACH = "sol-nouvelle-ere.suitBreach";

/** Messages déjà en cours : un double clic n'ouvre pas deux fenêtres. */
const busy = new Set();

/**
 * Doc v14 : `CONFIG.statusEffects` est un objet indexé par id
 * (`{ [id: string]: StatusEffectConfig }`). Le texte de la même page
 * dit encore « array ». On enregistre des deux façons, selon ce que
 * le cœur a réellement posé.
 *
 * @returns {void}
 */
function registerSuitBreach() {
  const effect = {
    id: SUIT_BREACH,
    // Traduit ici : le libellé affiché sur le jeton est le français, pas la clé.
    name: game.i18n.localize("SOL.Status.suitBreach"),
    img: "icons/svg/hazard.svg"
  };
  CONFIG.statusEffects ??= {};
  const effects = CONFIG.statusEffects;
  if ( Array.isArray(effects) ) {
    if ( !effects.some(entry => entry.id === SUIT_BREACH) ) effects.push(effect);
    return;
  }
  effects[SUIT_BREACH] = effect;
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
function onChatCard(message, html) {
  const apply = html.querySelector("[data-action=sol-apply-damage]");
  if ( apply ) {
    // Visible pour le MJ seulement. Le clic est revérifié dans le handler.
    if ( !game.user.isGM ) apply.remove();
    else if ( apply.dataset.solBound !== "1" ) {
      apply.dataset.solBound = "1";
      apply.addEventListener("click", event => {
        event.preventDefault();
        if ( event.detail > 1 ) return;
        void applyDamage(message, apply);
      });
    }
  }

  const followup = html.querySelector("[data-action=sol-roll-followup]");
  if ( followup && followup.dataset.solBound !== "1" ) {
    followup.dataset.solBound = "1";
    followup.addEventListener("click", event => {
      event.preventDefault();
      if ( event.detail > 1 ) return;
      void rollFollowup(message, followup);
    });
  }
}

/**
 * @returns {void}
 */
export function registerDamage() {
  registerSuitBreach();
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
    label: typeof label === "string" ? label : ""
  };
}

/**
 * Cibles du MJ : jetons ciblés, sinon jetons sélectionnés.
 * Deux jetons du même acteur ne comptent qu'une fois.
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
    const id = token.actor?.id;
    if ( !id || seen.has(id) ) continue;
    seen.add(id);
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
    const value = item.system.protection?.[zone];
    if ( typeof value === "number" && Number.isFinite(value) ) protection[zone] = value;
  }
  return {
    id: item.id,
    equipped: item.system.equipped === true,
    pressurized: item.system.pressurized === true,
    protection
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
  if ( !isUsableSeuil(sb) ) {
    ui.notifications.warn(game.i18n.format("SOL.Damage.sbTooLow", { name }));
    return null;
  }
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
 * @returns {string}
 */
function previewTable(zone, targets) {
  const header = ["target", "zone", "gross", "armour", "net", "sb", "severity", "breach"]
    .map(key => `<th>${escape(game.i18n.localize(`SOL.Damage.${key}`))}</th>`)
    .join("");
  const rows = targets.map(target => {
    const armour = sumZoneArmour(target.armors, zone);
    const strike = resolveStrike({
      gross: target.gross,
      armour,
      sb: target.sb,
      pressurized: pressurizedCovers(target.armors, zone).length > 0
    });
    const severity = strike.severity
      ? game.i18n.localize(SOL.injurySeverities[strike.severity])
      : game.i18n.localize("SOL.Damage.none");
    const breach = game.i18n.localize(strike.breach ? "SOL.Damage.yes" : "SOL.Damage.no");
    const cells = [
      target.name,
      game.i18n.localize(SOL.bodyLocations[zone]),
      target.gross,
      armour,
      strike.net,
      target.sb,
      severity,
      breach
    ];
    return `<tr>${cells.map(cell => `<td>${escape(cell)}</td>`).join("")}</tr>`;
  }).join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
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
  const zoneOptions = Object.keys(SOL.bodyLocations).map(key => {
    const selected = key === attack.location ? " selected" : "";
    const text = game.i18n.localize(SOL.bodyLocations[key]);
    return `<option value="${key}"${selected}>${escapeHtml(text)}</option>`;
  }).join("");
  const zoneControl = attack.attackerCritical
    ? `<label>${escapeHtml(game.i18n.localize("SOL.Damage.zone"))}
        <select name="zone">${zoneOptions}</select></label>`
    : `<p>${escapeHtml(game.i18n.localize("SOL.Damage.zone"))}
        <strong>${escapeHtml(game.i18n.localize(SOL.bodyLocations[attack.location]))}</strong></p>
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
      const paint = () => {
        const zone = form.elements?.zone?.value;
        if ( typeof zone === "string" && zone in SOL.bodyLocations ) {
          preview.innerHTML = previewTable(zone, targets);
        }
      };
      form.querySelector("[name=zone]")?.addEventListener("change", paint);
      paint();
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
  const armour = sumZoneArmour(target.armors, zone);
  const covers = pressurizedCovers(target.armors, zone);
  const strike = resolveStrike({
    gross: target.gross,
    armour,
    sb: target.sb,
    pressurized: covers.length > 0
  });

  if ( strike.severity ) {
    const key = consequenceKey(strike.severity, zone);
    /** @type {object} */
    const system = {
      location: zone,
      severity: strike.severity,
      bleeding: strike.bleeding,
      penalty: strike.penalty,
      source: attack.label
    };
    if ( key ) {
      const text = game.i18n.localize(`SOL.Damage.consequence.${key}`);
      system.description = `<p>${foundry.utils.escapeHTML(text)}</p>`;
    }
    await actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.format("SOL.Damage.injuryName", {
        severity: game.i18n.localize(SOL.injurySeverities[strike.severity]),
        zone: game.i18n.localize(SOL.bodyLocations[zone])
      }),
      type: "injury",
      system
    }]);
  }

  if ( strike.breach ) {
    const updates = covers
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
    const zone = await askDamage(attack, targets);
    if ( !zone ) return;
    for ( const target of targets ) {
      try {
        await applyOne(target, zone, attack, message);
      } catch (error) {
        console.error(error);
        ui.notifications.error(game.i18n.format("SOL.Damage.failed", { name: target.name }));
      }
    }
  } finally {
    busy.delete(message.id);
    button.disabled = false;
  }
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
  busy.add(message.id);
  button.disabled = true;
  try {
    await performRoll({
      actor,
      label: game.i18n.localize(SOL.characteristics[key]),
      score,
      type: "characteristic"
    });
  } finally {
    busy.delete(message.id);
    button.disabled = false;
  }
}
