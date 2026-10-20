/**
 * États visibles sur la fiche, et dépôt d'une page du compendium États.
 *
 * La section lit `actor.statuses` et les ActiveEffects, donc le HUD
 * et les automatismes (Épuisé, Inconscient, Combinaison percée…) s'y
 * voient. Déposer une page pose le statut dont l'id est dans
 * `flags.sol-nouvelle-ere.statusId`. Pas de drapeau, ou id absent de
 * `CONFIG.statusEffects` : notification, aucun effet inventé.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.statusEffects.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 */
import { statusEffectKnown, statusIdFromFlags } from "../dice/state-status.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const STATES_PACK = "sol-nouvelle-ere.states";

/**
 * Lignes de la section États.
 *
 * @param {Actor} actor
 * @returns {{ id: string, name: string, img: string, hint: string }[]}
 */
export function presentStatuses(actor) {
  /** @type {string[]} */
  const ids = [];
  const seen = new Set();
  const add = id => {
    if ( typeof id !== "string" || id.length === 0 || seen.has(id) ) return;
    seen.add(id);
    ids.push(id);
  };
  if ( actor?.statuses ) {
    for ( const id of actor.statuses ) add(id);
  }
  for ( const effect of actor?.effects ?? [] ) {
    const statuses = effect?.statuses;
    if ( !statuses ) continue;
    for ( const id of statuses ) add(id);
  }
  const rows = ids.map(id => {
    const effect = findEffect(id);
    return {
      id,
      name: effectName(effect, id),
      img: effect?.img || "icons/svg/aura.svg",
      hint: effectHint(effect)
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return rows;
}

/**
 * Retire le statut. Propriétaire ou MJ. `this` est la feuille.
 *
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function removeStatus(event, target) {
  if ( event?.detail > 1 ) return;
  const actor = this?.document;
  if ( !actor ) return;
  if ( game.user?.isGM !== true && actor.isOwner !== true ) return;
  const id = target?.closest?.("[data-status-id]")?.dataset.statusId ?? target?.dataset?.statusId;
  if ( !id ) return;
  await actor.toggleStatusEffect(id, { active: false });
}

/**
 * Donnée du glisser-déposer. v14 : TextEditor. Repli : le JSON du transfert.
 *
 * @param {DragEvent} event
 * @returns {object|null}
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.ux.TextEditor.html
 */
export function dragData(event) {
  const TextEditor = foundry.applications?.ux?.TextEditor ?? globalThis.TextEditor;
  if ( typeof TextEditor?.getDragEventData === "function" ) {
    try {
      return TextEditor.getDragEventData(event);
    } catch {
      // Le repli ci-dessous.
    }
  }
  const raw = event?.dataTransfer?.getData("text/plain");
  if ( !raw ) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Pose le statut d'une page États. `true` : le dépôt est consommé.
 *
 * @param {Actor} actor
 * @param {object|null|undefined} data
 * @returns {Promise<boolean>}
 */
export async function applyDroppedState(actor, data) {
  const type = data?.type;
  if ( type !== "JournalEntry" && type !== "JournalEntryPage" ) return false;
  if ( typeof data.uuid !== "string" || !data.uuid ) return false;
  if ( game.user?.isGM !== true && actor?.isOwner !== true ) return false;
  const doc = await foundry.utils.fromUuid(data.uuid);
  if ( !doc ) return false;
  const page = await droppedPage(doc);
  if ( page === false ) return false;
  if ( !page ) return true;
  const statusId = page.getFlag?.(SYSTEM_ID, "statusId")
    ?? statusIdFromFlags(page.flags);
  if ( !statusEffectKnown(statusId, CONFIG.statusEffects) ) {
    ui.notifications.warn(game.i18n.format("SOL.Status.noMechanic", { name: page.name }));
    return true;
  }
  if ( actorHasStatus(actor, statusId) ) {
    ui.notifications.info(game.i18n.format("SOL.Status.already", { name: page.name }));
    return true;
  }
  await actor.toggleStatusEffect(statusId, { active: true });
  return true;
}

/**
 * Page unique, ou `null` si le journal en a plusieurs (avertissement déjà donné).
 * `false` : ce n'est pas le compendium États.
 *
 * @param {Document} doc
 * @returns {Promise<Document|null|false>}
 */
async function droppedPage(doc) {
  if ( doc.documentName === "JournalEntryPage" ) {
    if ( !fromStates(doc) && !pageStatus(doc) ) return false;
    return doc;
  }
  if ( doc.documentName !== "JournalEntry" ) return false;
  if ( !fromStates(doc) ) return false;
  const pages = [...(doc.pages ?? [])];
  if ( pages.length === 1 ) return pages[0];
  ui.notifications.warn(game.i18n.localize("SOL.Status.dropPage"));
  return null;
}

/**
 * @param {Document} doc
 * @returns {boolean}
 */
function fromStates(doc) {
  const pack = doc?.pack ?? doc?.parent?.pack ?? "";
  return pack === STATES_PACK;
}

/**
 * @param {Document} page
 * @returns {string|null}
 */
function pageStatus(page) {
  return page.getFlag?.(SYSTEM_ID, "statusId") ?? statusIdFromFlags(page.flags);
}

/**
 * @param {string} id
 * @returns {object|null}
 */
function findEffect(id) {
  const effects = CONFIG.statusEffects;
  if ( !effects ) return null;
  if ( !Array.isArray(effects) && effects[id] ) return effects[id];
  if ( typeof effects[Symbol.iterator] !== "function" ) return null;
  for ( const effect of effects ) {
    if ( effect?.id === id ) return effect;
  }
  return null;
}

/**
 * @param {object|null} effect
 * @param {string} id
 * @returns {string}
 */
function effectName(effect, id) {
  const name = effect?.name;
  if ( typeof name !== "string" || !name ) return id;
  return game.i18n.localize(name);
}

/**
 * @param {object|null} effect
 * @returns {string}
 */
function effectHint(effect) {
  const hint = effect?.description;
  if ( typeof hint !== "string" || !hint ) return "";
  return game.i18n.localize(hint);
}

/**
 * @param {Actor|null|undefined} actor
 * @param {string} id
 * @returns {boolean}
 */
function actorHasStatus(actor, id) {
  if ( !actor ) return false;
  if ( typeof actor.statuses?.has === "function" && actor.statuses.has(id) ) return true;
  const effects = actor.effects;
  if ( !effects ) return false;
  for ( const effect of effects ) {
    const statuses = effect?.statuses;
    if ( !statuses ) continue;
    if ( typeof statuses.has === "function" && statuses.has(id) ) return true;
    if ( Array.isArray(statuses) && statuses.includes(id) ) return true;
  }
  return false;
}
