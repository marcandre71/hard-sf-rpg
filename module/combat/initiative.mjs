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
 * Les déplacements reportés partent dans `nextRound`, avant `super`,
 * quand le client est le MJ actif : une seule écriture, avant que le
 * nouveau round ne désigne l'ancien premier. Si c'est un joueur qui
 * passe le round, `_onStartRound` (MJ désigné, après l'écriture) sert
 * de secours. Les drapeaux sont retirés dans la même écriture : pas
 * de second passage.
 *
 * `Combatant._preUpdateOperation` conserve le combattant actif quand
 * l'initiative change. Pour garder l'index du tour, on passe
 * `{ combatTurn: combat.turn }` (confirmé par l'API, issue 12990).
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
  encodeInitiative,
  interruptTiming,
  repositionTiming,
  resolveDeferred,
  reflexScore,
  shouldClearRank,
  showRankLabel,
  stepBack,
  vigilanceBaseScore
} from "../dice/initiative.mjs";
import { rollChoice } from "../dice/roll-dialog.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";

/** Marque une écriture du système : le drapeau `rank` n'est pas effacé. */
const SYSTEM_WRITE = "solInitiativeWrite";

/** Ce client a déjà appliqué les déplacements dans `nextRound`. */
const deferredApplied = new WeakSet();

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
 * @param {{ automatic?: boolean }} [options] `automatic` : seulement le MJ actif.
 * Une action directe (apply-damage) accepte n'importe quel MJ.
 * @returns {Promise<void>}
 */
export async function markDeferEnd(actor, { automatic = false } = {}) {
  const allowed = automatic ? game.user.isActiveGM : game.user.isGM;
  if ( !allowed || !actor ) return;
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
 * Garde l'index du tour. `0` est un index valide : on le passe tel quel.
 *
 * @param {Combat} combat
 * @returns {{ combatTurn?: number }}
 */
function keepTurn(combat) {
  return typeof combat.turn === "number" ? { combatTurn: combat.turn } : {};
}

/**
 * @param {Combat} combat
 * @returns {Array<{ id: string, initiative: number|null }>}
 */
function turnOrder(combat) {
  return combat.turns.map(combatant => ({
    id: combatant.id,
    initiative: typeof combatant.initiative === "number" ? combatant.initiative : null
  }));
}

/**
 * Fin d'ordre, reculs et « se replacer » en attente, une seule écriture.
 * Ne fait rien s'il n'y a aucun drapeau : le second passage est vide.
 *
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function applyDeferred(combat) {
  if ( !game.user.isActiveGM ) return;
  const sorted = combat.turns.map(combatant => ({
    id: combatant.id,
    initiative: typeof combatant.initiative === "number" ? combatant.initiative : null,
    deferStep: combatant.getFlag(SYSTEM_ID, "deferStep") === true,
    deferEnd: combatant.getFlag(SYSTEM_ID, "deferEnd") === true,
    pendingInitiative: combatant.getFlag(SYSTEM_ID, "pendingInitiative") ?? null
  }));
  const resolved = resolveDeferred(sorted);
  if ( !resolved.length ) return;
  const updates = resolved.map(entry => {
    /** @type {object} */
    const data = { _id: entry.id };
    if ( entry.clearStep ) data[`flags.${SYSTEM_ID}.deferStep`] = false;
    if ( entry.clearEnd ) data[`flags.${SYSTEM_ID}.deferEnd`] = false;
    if ( entry.clearPending ) data[`flags.${SYSTEM_ID}.-=pendingInitiative`] = null;
    if ( entry.rank ) data[`flags.${SYSTEM_ID}.rank`] = entry.rank;
    if ( typeof entry.initiative === "number" ) data.initiative = entry.initiative;
    return data;
  });
  await combat.updateEmbeddedDocuments("Combatant", updates, {
    ...keepTurn(combat),
    [SYSTEM_WRITE]: true
  });
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

/**
 * L'écriture pose-t-elle le drapeau `rank` (jet du système) ?
 *
 * @param {object} changes
 * @returns {boolean}
 */
function updateSetsRank(changes) {
  if ( !changes || typeof changes !== "object" ) return false;
  if ( Object.prototype.hasOwnProperty.call(changes, `flags.${SYSTEM_ID}.rank`) ) return true;
  if ( Object.prototype.hasOwnProperty.call(changes, `flags.${SYSTEM_ID}.pendingInitiative`) ) return true;
  const scoped = changes.flags?.[SYSTEM_ID];
  if ( !scoped || typeof scoped !== "object" ) return false;
  return Object.prototype.hasOwnProperty.call(scoped, "rank")
    || Object.prototype.hasOwnProperty.call(scoped, "pendingInitiative");
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
   * Efface `rank` si l'initiative change hors d'un jet du système
   * (effacement, ou nombre saisi à la main).
   *
   * @override
   * @param {object} changes
   * @param {object} options
   * @param {User} user
   * @returns {Promise<boolean|void>}
   */
  async _preUpdate(changes, options, user) {
    const initiativeChanged = Boolean(changes) && Object.prototype.hasOwnProperty.call(changes, "initiative");
    if ( shouldClearRank(initiativeChanged, {
      systemWrite: options?.[SYSTEM_WRITE] === true,
      setsRank: updateSetsRank(changes)
    }) ) {
      changes[`flags.${SYSTEM_ID}.-=rank`] = null;
      changes[`flags.${SYSTEM_ID}.-=pendingInitiative`] = null;
    }
    return super._preUpdate(changes, options, user);
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
   * @param {{ formula?: string|null, updateTurn?: boolean, reposition?: boolean, messageMode?: string, messageOptions?: object }} [options]
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
      // Combatant caché : carte privée MJ (`gm`, doc ChatMessage.applyMode).
      // Sinon le mode du cœur, ou celui porté par messageOptions.
      const messageMode = combatant.hidden
        ? "gm"
        : (options.messageMode
          ?? options.messageOptions?.messageMode
          ?? options.messageOptions?.rollMode
          ?? null);
      const outcome = await performRoll({
        actor,
        label: game.i18n.localize("SOL.Initiative.vigilance"),
        score: rated.score,
        type: "initiative",
        choice,
        note: options.reposition ? game.i18n.localize("SOL.Initiative.sacrificed") : "",
        messageMode,
        messageOptions: options.messageOptions ?? null
      });
      if ( !outcome ) continue;
      const ref = reflexScore(actor.system?.characteristics);
      const initiative = encodeInitiative({
        success: outcome.success,
        dr: outcome.dr,
        de: outcome.de,
        ref
      });
      const rank = { success: outcome.success, dr: outcome.dr, de: outcome.de, ref };
      const index = this.turns.findIndex(entry => entry.id === id);
      // À confirmer par Marc : effet immédiat ou au round suivant.
      const deferPlace = options.reposition === true
        && repositionTiming(index, this.turn) === "defer";
      if ( deferPlace ) {
        updates.push({
          _id: id,
          [`flags.${SYSTEM_ID}.pendingInitiative`]: { initiative, rank }
        });
      } else {
        updates.push({
          _id: id,
          initiative,
          [`flags.${SYSTEM_ID}.rank`]: rank,
          [`flags.${SYSTEM_ID}.-=pendingInitiative`]: null
        });
      }
    }
    if ( updates.length ) {
      const wroteInitiative = updates.some(update => Object.prototype.hasOwnProperty.call(update, "initiative"));
      // updateTurn false, ou « se replacer » immédiat : garder l'index.
      // Sinon le cœur suit le combattant.
      const keepIndex = options.updateTurn === false || (options.reposition === true && wroteInitiative);
      await this.updateEmbeddedDocuments("Combatant", updates, {
        ...(keepIndex ? keepTurn(this) : {}),
        [SYSTEM_WRITE]: true
      });
      if ( wroteInitiative && options.reposition !== true && options.updateTurn !== false && previousId ) {
        const turn = this.turns.findIndex(entry => entry.id === previousId);
        if ( turn >= 0 && turn !== this.turn ) await this.update({ turn });
      }
    }
    return this;
  }

  /**
   * Déplacements reportés avant le nouveau round, chez le MJ actif.
   * Une seule écriture : l'ancien premier n'est pas réactivé.
   * Réf. LdR v0.2 §7.
   *
   * @override
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    if ( game.user.isActiveGM ) {
      await applyDeferred(this);
      deferredApplied.add(this);
    }
    return super.nextRound();
  }

  /**
   * Secours : un joueur a passé le round, le MJ actif n'a pas écrit
   * dans `nextRound`. Les drapeaux déjà retirés ne produisent rien.
   * Réf. LdR v0.2 §7.
   *
   * @override
   * @param {CombatRoundEventContext} context
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
   */
  async _onStartRound(context) {
    await super._onStartRound(context);
    if ( deferredApplied.delete(this) ) return;
    await applyDeferred(this);
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
          if ( !id || !combat || !game.user.isGM ) return;
          const index = combat.turns.findIndex(combatant => combatant.id === id);
          if ( index < 0 ) return;
          // À confirmer par Marc : effet immédiat ou au round suivant.
          if ( interruptTiming(index, combat.turn) === "defer" ) {
            void combat.updateEmbeddedDocuments("Combatant", [{
              _id: id,
              [`flags.${SYSTEM_ID}.deferStep`]: true
            }]);
            return;
          }
          const changes = stepBack(turnOrder(combat), id);
          if ( !changes ) return;
          void combat.updateEmbeddedDocuments("Combatant", changes.map(change => ({
            _id: change.id,
            initiative: change.initiative
          })), { ...keepTurn(combat), [SYSTEM_WRITE]: true });
        }
      },
      {
        name: "SOL.Initiative.reposition",
        icon: '<i class="fa-solid fa-dice-d20"></i>',
        condition: li => {
          if ( !game.combat?.started ) return false;
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

  /**
   * Le nombre stocké est un code de tri. Le tracker montre le jet.
   *
   * @override
   * @param {Combat} combat
   * @param {Combatant} combatant
   * @param {number} index
   * @returns {Promise<object>}
   */
  async _prepareTurnContext(combat, combatant, index) {
    const context = await super._prepareTurnContext(combat, combatant, index);
    const rank = combatant.getFlag(SYSTEM_ID, "rank");
    if ( showRankLabel(combatant.initiative, rank) ) context.initiative = rankLabel(rank);
    return context;
  }
}

/**
 * @param {{ success?: boolean, dr?: number, de?: number, ref?: number }|null|undefined} rank
 * @returns {string}
 */
function rankLabel(rank) {
  if ( !rank || typeof rank.success !== "boolean" ) return "";
  if ( rank.success ) {
    return game.i18n.format("SOL.Initiative.rankSuccess", {
      dr: rank.dr ?? 0,
      ref: rank.ref ?? 0
    });
  }
  return game.i18n.format("SOL.Initiative.rankFailure", { de: rank.de ?? 0 });
}

/**
 * @param {ActiveEffect} effect
 * @returns {void}
 */
function noteStunned(effect) {
  if ( !effectHasStatus(effect, STUNNED) ) return;
  flagStunned(effect.parent);
}

/**
 * @param {Actor|null|undefined} actor
 * @returns {void}
 */
function flagStunned(actor) {
  // À confirmer par Marc : retirer Sonné avant le round suivant
  // n'annule pas la fin d'ordre déjà marquée.
  if ( actor ) void markDeferEnd(actor, { automatic: true });
}

/**
 * @param {ActiveEffect} effect
 * @returns {void}
 */
function onStunned(effect) {
  noteStunned(effect);
}

/**
 * Sonné ajouté à un effet déjà là. S'il y était déjà, on ne repose pas
 * la fin d'ordre. `preUpdateActiveEffect` voit encore l'ancien état.
 *
 * @param {ActiveEffect} effect
 * @param {object} changes
 * @returns {void}
 */
function onStunnedPreUpdate(effect, changes) {
  if ( effectHasStatus(effect, STUNNED) ) return;
  const statuses = changes?.statuses;
  const added = typeof statuses?.has === "function"
    ? statuses.has(STUNNED)
    : Array.isArray(statuses) && statuses.includes(STUNNED);
  if ( !added ) return;
  // L'effet n'a pas encore le statut : preUpdate voit l'ancien état.
  flagStunned(effect.parent);
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
  Hooks.on("preUpdateActiveEffect", onStunnedPreUpdate);
  Hooks.once("ready", localizeStunnedHint);
}
