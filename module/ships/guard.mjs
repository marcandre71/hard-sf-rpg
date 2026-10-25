/**
 * Un véhicule n'entre pas dans le Combat Tracker.
 *
 * Décision Marc 18/10/2026. Réf. Vaisseaux v0.1 §1.
 * Décision Marc 23/10/2026 : le vaisseau, lui, y entre.
 * Clic droit sur le pion, icône Combat.
 * `return false` annule la création. L'avertissement ne part que
 * chez celui qui a glissé le pion.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combatant.html
 */
import { blocksCharacterCombat } from "./combat.mjs";

/**
 * Enregistre le hook. Appelé une fois depuis `module/sol.mjs` (`init`).
 *
 * @returns {void}
 */
export function registerShipCombatGuard() {
  Hooks.on("preCreateCombatant", onPreCreateCombatant);
}

/**
 * @param {Combatant} combatant
 * @param {object} data
 * @param {object} _options
 * @param {string} userId
 * @returns {boolean|void}
 */
function onPreCreateCombatant(combatant, data, _options, userId) {
  if ( !blocksCharacterCombat(combatantActorType(combatant, data)) ) return;
  if ( game.user?.id === userId ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.notInTracker"));
  }
  return false;
}

/**
 * @param {Combatant} combatant
 * @param {object} data
 * @returns {string|null}
 */
function combatantActorType(combatant, data) {
  if ( combatant?.actor?.type ) return combatant.actor.type;
  const actorId = data?.actorId ?? combatant?.actorId;
  const fromWorld = globalThis.game?.actors?.get?.(actorId);
  if ( fromWorld?.type ) return fromWorld.type;
  return combatant?.token?.actor?.type ?? null;
}
