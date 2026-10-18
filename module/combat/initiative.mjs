/**
 * Initiative glissante dans le Combat Tracker.
 *
 * Réf. LdR v0.2 §7. Décision Marc 18/10/2026.
 * Le premier tour est un test de Vigilance. L'ordre reste ensuite,
 * sauf fin d'ordre (blessure grave ou pire, ou Sonné) au round suivant,
 * recul d'une place (interruption), ou « se replacer ».
 * Aucun bonus lié à la place.
 *
 * Cause du plantage signalé : `system.json` n'a pas de clé `initiative`,
 * et `CONFIG.Combat.initiative.formula` vaut `null` (doc v14).
 * `Combatant._getInitiativeFormula` fait
 * `String(CONFIG.Combat.initiative.formula || game.system.initiative)`,
 * donc `String(undefined)` = `"undefined"`. `Roll` en fait un StringTerm
 * et `evaluate` lève « Unresolved StringTerm undefined ».
 * On ne lance plus cette formule : `SolCombat.rollInitiative` fait le D100.
 * La formule `"0"` n'est qu'un garde-fou si un autre appel l'évalue.
 *
 * Le hook `combatRound` part du client qui avance le round, avant
 * l'écriture, et `Hooks.call` n'attend pas une promesse. La fin d'ordre
 * est donc écrite dans `nextRound`, avant `super`.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combatant.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.CombatTracker.html
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.Combat.html
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.Combatant.html
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.ui.html
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.combatRound.html
 */
import { SOL } from "../config.mjs";
import { performRoll } from "../dice/chat.mjs";
import {
  deferToEnd,
  encodeInitiative,
  reflexScore,
  stepBack,
  vigilanceBaseScore
} from "../dice/initiative.mjs";
import { rollChoice } from "../dice/roll-dialog.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";

/** Condition Sonné. Réf. LdR v0.2 §7. L'effet est un rappel, pas une règle jouée par le logiciel. */
export const STUNNED = "sol-nouvelle-ere.stunned";

const CAN_FIGHT = new Set(["character", "npc", "creature", "synthetic", "drone"]);

/**
 * @param {string} id
 * @param {string} name
 * @param {string} img
 * @param {string} [description]
 * @returns {void}
 */
function registerStatus(id, name, img, description) {
  const effect = { id, name, img };
  if ( description ) effect.description = description;
  CONFIG.statusEffects ??= {};
  const effects = CONFIG.statusEffects;
  if ( Array.isArray(effects) ) {
    if ( !effects.some(entry => entry.id === id) ) effects.push(effect);
    return;
  }
  effects[id] = effect;
}

/**
 * `name` reste une clé : Foundry la traduit en créant l'effet.
 * `description` est recopiée telle quelle. On la traduit au `ready`,
 * quand les fichiers de langue sont chargés.
 *
 * @returns {void}
 */
function localizeStunnedHint() {
  const effects = CONFIG.statusEffects;
  const effect = Array.isArray(effects)
    ? effects.find(entry => entry.id === STUNNED)
    : effects?.[STUNNED];
  if ( !effect?.description ) return;
  effect.description = game.i18n.localize(effect.description);
}

/**
 * @param {ActiveEffect} effect
 * @param {string} id
 * @returns {boolean}
 */
function effectHasStatus(effect, id) {
  const statuses = effect?.statuses;
  if ( !statuses ) return false;
  if ( typeof statuses.has === "function" ) return statuses.has(id);
  return Array.isArray(statuses) && statuses.includes(id);
}

/**
 * Marque le combattant : fin d'ordre au prochain `nextRound`.
 * // À confirmer par Marc : hors du combat en cours, on ne pose rien.
 *
 * @param {Actor|null|undefined} actor
 * @returns {Promise<void>}
 */
export async function markDeferEnd(actor) {
  if ( !game.user.isGM || !actor ) return;
  const combat = game.combat;
  if ( !combat ) return;
  const updates = combat.combatants
    .filter(combatant => combatant.actor?.uuid === actor.uuid)
    .map(combatant => ({
      _id: combatant.id,
      [`flags.${SYSTEM_ID}.deferEnd`]: true
    }));
  if ( updates.length ) await combat.updateEmbeddedDocuments("Combatant", updates);
}

/**
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function applyDeferredEnds(combat) {
  if ( !game.user.isGM ) return;
  const ids = combat.combatants
    .filter(combatant => combatant.getFlag(SYSTEM_ID, "deferEnd") === true)
    .map(combatant => combatant.id);
  if ( !ids.length ) return;
  const sorted = combat.turns.map(combatant => ({
    id: combatant.id,
    initiative: typeof combatant.initiative === "number" ? combatant.initiative : null
  }));
  const moved = deferToEnd(sorted, ids);
  const byId = new Map(moved.map(entry => [entry.id, entry.initiative]));
  const updates = ids.map(id => {
    /** @type {object} */
    const data = { _id: id, [`flags.${SYSTEM_ID}.deferEnd`]: false };
    if ( byId.has(id) ) data.initiative = byId.get(id);
    return data;
  });
  await combat.updateEmbeddedDocuments("Combatant", updates);
}

/**
 * Le menu contextuel v14 passe un HTMLElement, parfois un tableau ou un objet jQuery.
 *
 * @param {HTMLElement|JQuery|HTMLElement[]} li
 * @returns {string|null}
 */
function combatantIdFrom(li) {
  const node = Array.isArray(li) ? li[0] : li;
  const element = node instanceof HTMLElement ? node : node?.[0];
  if ( !(element instanceof HTMLElement) ) return null;
  const host = element.dataset.combatantId
    ? element
    : element.closest("[data-combatant-id]");
  return host?.dataset.combatantId ?? null;
}

export class SolCombatant extends Combatant {
  /**
   * Garde-fou. Le jet réel ne passe pas par cette formule.
   * @override
   * @returns {string}
   */
  _getInitiativeFormula() {
    return "0";
  }

  /**
   * @override
   * @returns {Promise<Combatant>}
   */
  async rollInitiative() {
    const combat = this.parent;
    if ( combat ) await combat.rollInitiative(this.id);
    return this;
  }
}

export class SolCombat extends Combat {
  /**
   * Test de Vigilance, pas la formule du cœur.
   * `rollAll` et `rollNPC` appellent cette méthode (doc v14).
   *
   * @override
   * @param {string|string[]} ids
   * @param {{ formula?: string|null, updateTurn?: boolean, reposition?: boolean }} [options]
   * @returns {Promise<Combat>}
   */
  async rollInitiative(ids, options = {}) {
    const list = typeof ids === "string" ? [ids] : [...ids];
    const previousId = this.combatant?.id ?? null;
    const batch = list.length > 1 && options.reposition !== true;
    /** @type {object[]} */
    const updates = [];
    for ( const id of list ) {
      const combatant = this.combatants.get(id);
      if ( !combatant?.isOwner ) continue;
      const actor = combatant.actor;
      if ( !actor ) continue;
      if ( !CAN_FIGHT.has(actor.type) ) {
        ui.notifications.warn(game.i18n.format("SOL.Initiative.notAllowed", { name: combatant.name }));
        continue;
      }
      const rated = vigilanceBaseScore(
        actor.system?.characteristics,
        actor.items.filter(item => item.type === "skill"),
        SOL.vigilanceSkill
      );
      if ( rated.impossible || typeof rated.score !== "number" ) {
        ui.notifications.warn(game.i18n.format("SOL.Initiative.impossible", { name: actor.name }));
        continue;
      }
      if ( rated.missingPerception ) {
        ui.notifications.warn(game.i18n.format("SOL.Initiative.noPerception", { name: actor.name }));
      }
      // À confirmer par Marc : un jet groupé (tout lancer, lancer les PNJ)
      // est en difficulté Normale, sans une fenêtre par combattant.
      const choice = batch ? rollChoice(rated.score) : null;
      const outcome = await performRoll({
        actor,
        label: game.i18n.localize("SOL.Initiative.vigilance"),
        score: rated.score,
        type: "initiative",
        choice,
        note: options.reposition ? game.i18n.localize("SOL.Initiative.sacrificed") : ""
      });
      if ( !outcome ) continue;
      const ref = reflexScore(actor.system?.characteristics);
      updates.push({
        _id: id,
        initiative: encodeInitiative({
          success: outcome.success,
          dr: outcome.dr,
          de: outcome.de,
          ref
        }),
        [`flags.${SYSTEM_ID}.rank`]: {
          success: outcome.success,
          dr: outcome.dr,
          de: outcome.de,
          ref
        }
      });
    }
    if ( updates.length ) {
      await this.updateEmbeddedDocuments("Combatant", updates);
      if ( options.updateTurn !== false && previousId ) {
        const turn = this.turns.findIndex(entry => entry.id === previousId);
        if ( turn >= 0 && turn !== this.turn ) await this.update({ turn });
      }
    }
    return this;
  }

  /**
   * Fin d'ordre reportée, avant le changement de round.
   * On ne relance pas la Vigilance : l'ordre est conservé.
   * Réf. LdR v0.2 §7.
   *
   * @override
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    await applyDeferredEnds(this);
    return super.nextRound();
  }
}

export class SolCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  /**
   * @override
   * @returns {ContextMenuEntry[]}
   */
  _getEntryContextOptions() {
    const entries = super._getEntryContextOptions();
    entries.push(
      {
        name: "SOL.Initiative.interrupt",
        icon: '<i class="fa-solid fa-arrow-down"></i>',
        condition: () => game.user.isGM,
        callback: li => {
          const id = combatantIdFrom(li);
          const combat = game.combat;
          if ( !id || !combat ) return;
          const sorted = combat.turns.map(combatant => ({
            id: combatant.id,
            initiative: combatant.initiative
          }));
          const changes = stepBack(sorted, id);
          if ( !changes ) return;
          void combat.updateEmbeddedDocuments("Combatant", changes.map(change => ({
            _id: change.id,
            initiative: change.initiative
          })));
        }
      },
      {
        name: "SOL.Initiative.reposition",
        icon: '<i class="fa-solid fa-dice-d20"></i>',
        condition: li => {
          const id = combatantIdFrom(li);
          const combatant = game.combat?.combatants.get(id);
          return game.user.isGM || combatant?.isOwner === true;
        },
        callback: li => {
          const id = combatantIdFrom(li);
          const combat = game.combat;
          if ( !id || !combat ) return;
          void combat.rollInitiative(id, { reposition: true });
        }
      }
    );
    return entries;
  }
}

/**
 * @param {ActiveEffect} effect
 * @returns {void}
 */
function onStunned(effect) {
  if ( !effectHasStatus(effect, STUNNED) ) return;
  const actor = effect.parent;
  // À confirmer par Marc : retirer Sonné avant le round suivant
  // n'annule pas la fin d'ordre déjà marquée.
  if ( actor ) void markDeferEnd(actor);
}

/**
 * @returns {void}
 */
export function registerInitiative() {
  // Garde-fou du plantage « StringTerm undefined ». Le jet n'utilise pas cette formule.
  CONFIG.Combat.initiative ??= { formula: null, decimals: 2 };
  CONFIG.Combat.initiative.formula = "0";
  CONFIG.Combat.documentClass = SolCombat;
  CONFIG.Combatant.documentClass = SolCombatant;
  CONFIG.ui.combat = SolCombatTracker;
  registerStatus(
    STUNNED,
    "SOL.Status.stunned",
    "icons/svg/daze.svg",
    "SOL.Status.stunnedHint"
  );
  Hooks.on("createActiveEffect", onStunned);
  Hooks.once("ready", localizeStunnedHint);
}
