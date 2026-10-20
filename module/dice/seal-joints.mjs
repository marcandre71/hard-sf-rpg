/**
 * Joints passés à la main.
 *
 * Réf. LdR v0.2 §7. Décision Marc 20/10/2026 : une armure non
 * pressurisée n'a pas de joints étanches. Percer les siens ne lance
 * aucun compte à rebours. Sur une armure équipée et pressurisée,
 * « Percée » pose Combinaison percée (l'horloge part comme après
 * des dégâts, jeton non lié compris).
 * // Décision Marc 20/10/2026 : « Intacte » sur la dernière de ces
 * armures est un outil du MJ. Ça vaut colmatage, sans Rustine ni test.
 * Les règles de réparation viendront plus tard.
 * L'édition peut venir de n'importe quel client. Seul le MJ actif écrit.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.updateWorldTime.html
 */
import { jointEffect, shouldPoseSuit } from "./seal.mjs";
import { repairBreach } from "./seal-apply.mjs";

const SUIT = "sol-nouvelle-ere.suitBreach";

/** Pose en cours : deux couches ensemble ne posent le statut qu'une fois. */
const posing = new Set();

/**
 * @returns {void}
 */
export function registerSealJoints() {
  Hooks.on("updateItem", (item, changes, options, userId) => {
    void onSealUpdate(item, changes, options, userId);
  });
}

/**
 * @param {Item} item
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function onSealUpdate(item, changes, options, userId) {
  if ( options?.solSealApply === true ) return;
  if ( item?.type !== "armor" ) return;
  const next = nextSeal(changes);
  if ( next === undefined ) return;
  const actor = item.actor;
  if ( !actor ) return;
  const effect = jointEffect(next, {
    equipped: item.system?.equipped === true,
    pressurized: item.system?.pressurized === true
  });
  if ( effect === "ignore" ) {
    // Décision Marc 20/10/2026 : le joueur qui édite voit pourquoi rien ne part.
    if ( game.user?.id === userId && next === "breached" && item.system?.pressurized !== true ) {
      ui.notifications.warn(game.i18n.localize("SOL.Armor.sealState.inert"));
    }
    return;
  }
  if ( game.user?.isActiveGM !== true ) return;
  if ( effect === "start" ) {
    const key = poseIdentity(actor);
    const pending = key.length > 0 && posing.has(key);
    if ( !shouldPoseSuit({ hasStatus: actorHasStatus(actor, SUIT), pending }) ) return;
    if ( key ) posing.add(key);
    try {
      await actor.toggleStatusEffect(SUIT, { active: true });
    } finally {
      if ( key ) posing.delete(key);
    }
    return;
  }
  if ( otherBreached(actor, item.id) ) return;
  // Décision Marc 20/10/2026 : Intact à la main est un outil du MJ.
  // Ça vaut colmatage, sans Rustine ni test.
  // Les règles de réparation viendront plus tard.
  await repairBreach(actor);
}

/**
 * Même identité que l'horloge : jeton non lié, sinon acteur.
 *
 * @param {Actor} actor
 * @returns {string}
 */
function poseIdentity(actor) {
  if ( actor?.isToken && actor.parent?.uuid ) return actor.parent.uuid;
  return actor?.uuid || "";
}

/**
 * @param {object|null|undefined} changes
 * @returns {unknown|undefined}
 */
function nextSeal(changes) {
  if ( !changes || typeof changes !== "object" ) return undefined;
  if ( changes.system && Object.prototype.hasOwnProperty.call(changes.system, "sealState") ) {
    return changes.system.sealState;
  }
  if ( Object.prototype.hasOwnProperty.call(changes, "system.sealState") ) return changes["system.sealState"];
  return undefined;
}

/**
 * Une autre armure équipée et pressurisée est encore percée.
 *
 * @param {Actor} actor
 * @param {string} exceptId
 * @returns {boolean}
 */
function otherBreached(actor, exceptId) {
  for ( const piece of actor.items ?? [] ) {
    if ( piece.id === exceptId || piece.type !== "armor" ) continue;
    if ( piece.system?.equipped !== true || piece.system.pressurized !== true ) continue;
    if ( piece.system.sealState === "breached" ) return true;
  }
  return false;
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
