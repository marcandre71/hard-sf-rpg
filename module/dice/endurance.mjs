/**
 * Endurance à 0 : carte de test de CON. Réf. LdR v0.2 §3 et §11.
 *
 * Le champ est la valeur actuelle, nullable. On ne propose le test
 * que sur le passage à 0, chez celui qui a fait la modification.
 * Rester à 0 ne relance pas. Repasser au-dessus de 0 retire le drapeau.
 * Une fiche créée déjà à 0 ne passe pas par `updateActor` : pas de carte.
 * // À confirmer par Marc : un Atout qui dispense du test (LdR §3,
 * « sauf Atout contraire ») n'est pas joué ici.
 *
 * Échec : statut cœur `unconscious` (Inconscient). On ne le redéclare pas.
 * Réussite : `sol-nouvelle-ere.exhausted` (Épuisé).
 * Décision Marc 20/10/2026 : le −20 est appliqué par `status-mods.mjs`,
 * dans le plafond ±50. Ignorer la carte ne pose aucun statut.
 * La résolution est un drapeau d'acteur : le joueur n'est pas
 * propriétaire d'une carte créée par le MJ, et `message.setFlag` échoue.
 *
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.statusEffects.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 */
import { registerHudStatus } from "../combat/initiative.mjs";
import { characteristicRollLabel, SOL } from "../config.mjs";
import { performRoll } from "./chat.mjs";
import { enduranceReadyFill, enduranceZeroOffer, pruneResolvedCards } from "./derived.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const EXHAUSTED = "sol-nouvelle-ere.exhausted";
/** Id du cœur. `icons/svg/unconscious.svg`, `EFFECT.StatusUnconscious`. */
const UNCONSCIOUS = "unconscious";
const OFFERED = "enduranceZeroOffered";
const CARD = "systems/sol-nouvelle-ere/templates/chat/endurance-card.hbs";

/** Messages déjà en cours : un double clic ne lance pas deux tests. */
const busy = new Set();

/**
 * @returns {void}
 */
export function registerEndurance() {
  // Réf. LdR v0.2 §11. `description` est une clé, traduite au ready.
  registerHudStatus(EXHAUSTED, "SOL.Status.exhausted", "icons/svg/downgrade.svg", {
    description: "SOL.Status.exhaustedHint",
    order: 904
  });
  Hooks.on("preUpdateActor", onPreUpdate);
  Hooks.on("updateActor", onUpdate);
  Hooks.on("renderChatMessageHTML", onCard);
  // Pas de `createActor` : une CON par défaut (25) écrirait 5, puis la
  // fiche afficherait 5/8 après une CON à 40. `resolveEndurance` montre
  // déjà le maximum tant que le champ est vide. Une fiche récente
  // n'est pas écrite au ready : l'Endurance commence pleine à l'affichage
  // dès que la CON est posée. Seules les fiches d'avant la 0.6.1,
  // encore vides, sont remplies.
  Hooks.once("ready", () => {
    localizeExhaustedHint();
    if ( game.user?.isActiveGM !== true ) return;
    for ( const actor of game.actors ?? [] ) {
      if ( foundry.utils.isNewerVersion("0.6.1", actor._stats?.systemVersion ?? "0") !== true ) continue;
      void fillEndurance(actor);
    }
  });
}

/**
 * @returns {void}
 */
function localizeExhaustedHint() {
  const effects = CONFIG.statusEffects;
  const effect = effects?.[EXHAUSTED];
  const key = effect?.description;
  if ( typeof key !== "string" || !key.startsWith("SOL.") ) return;
  const text = game.i18n.localize(key);
  effect.description = text;
  if ( typeof effects[Symbol.iterator] !== "function" ) return;
  for ( const entry of effects ) {
    if ( entry?.id === EXHAUSTED ) entry.description = text;
  }
}

/**
 * @param {object|null|undefined} changes
 * @returns {boolean}
 */
function touchesEndurance(changes) {
  if ( !changes || typeof changes !== "object" ) return false;
  if ( changes.system && Object.prototype.hasOwnProperty.call(changes.system, "endurance") ) return true;
  return Object.prototype.hasOwnProperty.call(changes, "system.endurance");
}

/**
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 * @returns {void}
 */
function onPreUpdate(actor, changes, options) {
  if ( !touchesEndurance(changes) || !options ) return;
  options.solEndurancePrevious = actor.system?.endurance ?? null;
}

/**
 * @param {Actor} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 * @returns {void}
 */
/**
 * Absence seulement : null ou undefined. Un 0 stocké reste 0.
 * Pas de `migrateData` : un diff partiel n'est pas rempli ici.
 * Le drapeau évite qu'un remplissage vers 0 (CON à 0) propose le test.
 *
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function fillEndurance(actor) {
  if ( !actor?.system?.schema?.fields?.endurance ) return;
  const next = enduranceReadyFill(
    actor.system.endurance,
    actor.system.characteristics?.con?.value,
    actor._stats?.systemVersion,
    foundry.utils.isNewerVersion
  );
  if ( next == null ) return;
  await actor.update({ "system.endurance": next }, { solFillEndurance: true });
}

function onUpdate(actor, changes, options, userId) {
  if ( !touchesEndurance(changes) ) return;
  if ( options?.solFillEndurance === true ) return;
  if ( game.user.id !== userId ) return;
  const previous = options?.solEndurancePrevious ?? null;
  const next = actor.system?.endurance ?? null;
  const offered = actor.getFlag(SYSTEM_ID, OFFERED) === true;
  const action = enduranceZeroOffer(previous, next, offered);
  if ( action === "clear" ) void actor.unsetFlag(SYSTEM_ID, OFFERED);
  if ( action === "offer" ) void postOffer(actor);
}

/**
 * Pose le drapeau avant la carte : un second passage à 0, tant que
 * l'Endurance reste à 0, ne poste pas une autre carte.
 *
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function postOffer(actor) {
  await actor.setFlag(SYSTEM_ID, OFFERED, true);
  const content = await foundry.applications.handlebars.renderTemplate(CARD, {
    name: actor.name
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: {
      [SYSTEM_ID]: {
        type: "endurance",
        actorUuid: actor.uuid
      }
    }
  });
}

/**
 * @param {unknown} uuid
 * @returns {boolean}
 */
function allowed(uuid) {
  if ( game.user.isGM ) return true;
  if ( typeof uuid !== "string" ) return false;
  return foundry.utils.fromUuidSync(uuid)?.isOwner === true;
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
/**
 * La carte du MJ n'est pas à jour par le joueur. Le drapeau est sur l'acteur.
 *
 * @param {ChatMessage} message
 * @param {Actor|null|undefined} actor
 * @returns {boolean}
 */
function cardResolved(message, actor) {
  if ( message.getFlag(SYSTEM_ID, "enduranceResolved") === true ) return true;
  const cards = actor?.getFlag?.(SYSTEM_ID, "enduranceCards");
  return Boolean(cards && typeof cards === "object" && cards[message.id] === true);
}

/**
 * @param {Actor|null|undefined} actor
 * @param {string} messageId
 * @returns {Promise<void>}
 */
async function markCardResolved(actor, messageId) {
  if ( !actor || !messageId ) return;
  const prior = actor.getFlag(SYSTEM_ID, "enduranceCards");
  const existing = [];
  for ( const message of game.messages ?? [] ) existing.push(message.id);
  const cards = pruneResolvedCards(prior, existing, messageId);
  await actor.setFlag(SYSTEM_ID, "enduranceCards", cards);
}

function onCard(message, html) {
  if ( message.getFlag(SYSTEM_ID, "type") !== "endurance" ) return;
  const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
  const roll = html.querySelector("[data-action=sol-endurance-con]");
  const dismiss = html.querySelector("[data-action=sol-endurance-dismiss]");
  const actor = typeof uuid === "string" ? foundry.utils.fromUuidSync(uuid) : null;
  if ( !allowed(uuid) || cardResolved(message, actor) ) {
    roll?.remove();
    dismiss?.remove();
    return;
  }
  if ( roll && roll.dataset.solBound !== "1" ) {
    roll.dataset.solBound = "1";
    roll.addEventListener("click", event => {
      event.preventDefault();
      if ( event.detail > 1 ) return;
      void rollCon(message, roll);
    });
  }
  if ( dismiss && dismiss.dataset.solBound !== "1" ) {
    dismiss.dataset.solBound = "1";
    dismiss.addEventListener("click", event => {
      event.preventDefault();
      const current = typeof uuid === "string" ? foundry.utils.fromUuidSync(uuid) : null;
      if ( cardResolved(message, current) ) {
        roll?.remove();
        dismiss.remove();
        return;
      }
      void markCardResolved(current, message.id);
      roll?.remove();
      dismiss.remove();
    });
  }
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function rollCon(message, button) {
  if ( busy.has(message.id) ) return;
  busy.add(message.id);
  button.disabled = true;
  try {
    const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
    if ( typeof uuid !== "string" || !allowed(uuid) ) return;
    const actor = await foundry.utils.fromUuid(uuid);
    if ( !actor || cardResolved(message, actor) ) return;
    const score = actor.system?.characteristics?.con?.value;
    if ( typeof score !== "number" ) {
      ui.notifications.warn(game.i18n.format("SOL.Damage.noCharacteristic", { name: actor.name }));
      return;
    }
    const label = characteristicRollLabel(SOL.characteristics.con, text => game.i18n.localize(text));
    if ( !label ) return;
    const outcome = await performRoll({ actor, label, score, type: "characteristic" });
    if ( !outcome ) return;
    // Réf. LdR v0.2 §11. Inconscient : aucune action. Épuisé : −20, appliqué au jet.
    if ( outcome.success ) await actor.toggleStatusEffect(EXHAUSTED, { active: true });
    else await actor.toggleStatusEffect(UNCONSCIOUS, { active: true });
    await markCardResolved(actor, message.id);
  } finally {
    busy.delete(message.id);
    button.disabled = false;
  }
}
