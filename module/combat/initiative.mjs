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
 * nouveau round ne désigne l'ancien premier. `turnEvents: false` évite
 * un début ou une fin de tour en trop. La surprise du round 1 est
 * retirée dans `_onStartRound` quand le round est déjà ≥ 2,
 * une seule fois (pas dans `nextRound`). Si c'est un joueur
 * qui passe le round, `_onStartRound` (MJ désigné, après l'écriture)
 * sert de secours, sans `turnEvents: false`. Les drapeaux sont retirés
 * dans la même écriture : un second passage est vide. Sans MJ connecté,
 * Foundry n'appelle pas `_onStartRound` : les drapeaux attendent son retour.
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
  canReposition,
  encodeInitiative,
  flagDeletionUpdate,
  indexAfterRoll,
  initiativeRollPlan,
  endOfOrderWas,
  injuryBoxChange,
  injuryDeferList,
  injuryDefersAtStart,
  INITIATIVE_FLAG_SCOPE,
  interruptTiming,
  resetAllFlagUpdate,
  resolveDeferred,
  reflexScore,
  shouldClearRank,
  showRankLabel,
  stepBack,
  stunnedAtStart,
  surprisedTurnIndex,
  vigilanceBaseScore
} from "../dice/initiative.mjs";
import { rollChoice } from "../dice/roll-dialog.mjs";

const SYSTEM_ID = INITIATIVE_FLAG_SCOPE;

/** Marque une écriture du système : le drapeau `rank` n'est pas effacé. */
const SYSTEM_WRITE = "solInitiativeWrite";

/** Posé dans `preUpdateActiveEffect`, lu dans `updateActiveEffect`. */
const STUNNED_ADDED = "solStunnedAdded";

/** Condition Sonné. Réf. LdR v0.2 §7. L'effet est un rappel, pas une règle jouée par le logiciel. */
export const STUNNED = "sol-nouvelle-ere.stunned";

/**
 * Condition Surpris. Réf. LdR v0.2 §7, ligne 158.
 * Le statut est la marque (visible dans le HUD du jeton). Le menu du
 * tracker la bascule. Au round 1, `_onStartTurn` saute le tour.
 */
export const SURPRISED = "sol-nouvelle-ere.surprised";

const CAN_FIGHT = new Set(["character", "npc", "creature", "synthetic", "drone"]);

/**
 * Enregistre une condition dans le HUD du jeton.
 *
 * v14 : `CONFIG.statusEffects` est un objet indexé par id, avec une
 * compatibilité tableau jusqu'en v16 (issue 13122). `push` seul ne met
 * pas à jour la vue par id que le HUD lit (`Object.values`, SR5 #1960).
 * On assigne toujours `effects[id]`. On ne pousse que si l'itérateur
 * ne voit pas encore cette id, pour ne pas doubler l'entrée.
 *
 * `description` n'est pas dans l'objet au moment de l'insertion.
 * Sonné était le seul statut à la porter : Saignement et Combinaison
 * percée, enregistrés sans elle, apparaissaient, lui non. On l'ajoute
 * ensuite, sur l'objet déjà stocké.
 * `hud: true` : le HUD saute `hud === false`
 * (`TokenHUD#_getStatusEffectChoices`).
 * `name` reste une clé : `init` tourne avant les traductions.
 *
 * @param {string} id
 * @param {string} name
 * @param {string} img
 * @param {{ description?: string, order?: number }} [options]
 * @returns {void}
 */
export function registerHudStatus(id, name, img, { description, order } = {}) {
  const effect = { id, name, img, hud: true };
  if ( typeof order === "number" ) effect.order = order;
  storeStatusEffect(effect);
  if ( description ) attachStatusDescription(id, description);
}

/**
 * @param {{ id: string, name: string, img: string, hud: true, order?: number }} effect
 * @returns {void}
 */
function storeStatusEffect(effect) {
  CONFIG.statusEffects ??= {};
  const effects = CONFIG.statusEffects;
  effects[effect.id] = effect;
  if ( statusListed(effects, effect.id) ) return;
  if ( typeof effects.push === "function" ) effects.push(effect);
}

/**
 * @param {object} effects
 * @param {string} id
 * @returns {boolean}
 */
function statusListed(effects, id) {
  if ( typeof effects[Symbol.iterator] !== "function" ) return false;
  for ( const entry of effects ) {
    if ( entry?.id === id ) return true;
  }
  return false;
}

/**
 * @param {string} id
 * @param {string} description
 * @returns {void}
 */
function attachStatusDescription(id, description) {
  const effects = CONFIG.statusEffects;
  if ( !effects ) return;
  const stored = effects[id];
  if ( stored && typeof stored === "object" ) stored.description = description;
  if ( typeof effects[Symbol.iterator] !== "function" ) return;
  for ( const entry of effects ) {
    if ( entry?.id === id && entry !== stored ) entry.description = description;
  }
}

/**
 * `name` reste une clé : Foundry la traduit en créant l'effet.
 * `description` est recopiée telle quelle. On la traduit au `ready`,
 * quand les fichiers de langue sont chargés.
 *
 * @returns {void}
 */
function localizeStunnedHint() {
  const effect = CONFIG.statusEffects?.[STUNNED];
  const key = effect?.description;
  if ( typeof key !== "string" || !key.startsWith("SOL.") ) return;
  attachStatusDescription(STUNNED, game.i18n.localize(key));
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
    if ( effectHasStatus(effect, id) ) return true;
  }
  return false;
}

/** Une écriture par acteur : deux cases cochées ensemble ne s'effacent pas. */
const deferQueues = new Map();

/**
 * @param {string} key
 * @param {() => Promise<void>} task
 * @returns {Promise<void>}
 */
function enqueueDefer(key, task) {
  const previous = deferQueues.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  deferQueues.set(key, run.then(() => undefined, () => undefined));
  return run;
}

/**
 * Case « Envoie en fin d'ordre » cochée, pas encore consommée.
 * Décision Marc 18/10/2026. `injuryDefer` est la liste des ids.
 * Décocher retire cet id seulement, pas un renvoi Sonné (`deferEnd`).
 * Un booléen `true` (0.6.1) reste jusqu'au passage de round : le retirer
 * ici ne sait pas quel id il représentait. Seul le MJ actif écrit.
 * // À confirmer par Marc : hors du combat en cours, on ne pose rien.
 *
 * @param {Actor|null|undefined} actor
 * @param {string} injuryId
 * @param {boolean} active
 * @returns {Promise<void>}
 */
export async function markInjuryDefer(actor, injuryId, active) {
  if ( game.user?.isActiveGM !== true || !actor ) return;
  if ( typeof injuryId !== "string" || injuryId.length === 0 ) return;
  const key = actor.uuid || actor.id;
  if ( !key ) return;
  await enqueueDefer(key, () => writeInjuryDefer(actor, injuryId, active));
}

/**
 * @param {Actor} actor
 * @param {string} injuryId
 * @param {boolean} active
 * @returns {Promise<void>}
 */
async function writeInjuryDefer(actor, injuryId, active) {
  const combat = game.combat;
  if ( !combat ) return;
  /** @type {object[]} */
  const updates = [];
  for ( const combatant of combat.combatants ) {
    if ( combatant.actor?.uuid !== actor.uuid ) continue;
    const current = combatant.getFlag(SYSTEM_ID, "injuryDefer");
    if ( current === true && active !== true ) continue;
    const next = injuryDeferList(current, active === true ? { add: injuryId } : { remove: injuryId });
    if ( Array.isArray(current) && current.length === next.length && current.every((id, index) => id === next[index]) ) {
      continue;
    }
    updates.push({
      _id: combatant.id,
      [`flags.${SYSTEM_ID}.injuryDefer`]: next
    });
  }
  if ( updates.length ) await combat.updateEmbeddedDocuments("Combatant", updates);
}

/**
 * L'id est-il dans la liste d'un combattant de cet acteur ?
 *
 * @param {Actor} actor
 * @param {string} injuryId
 * @returns {boolean}
 */
function injuryListed(actor, injuryId) {
  const combat = game.combat;
  if ( !combat || !injuryId ) return false;
  for ( const combatant of combat.combatants ) {
    if ( combatant.actor?.uuid !== actor.uuid ) continue;
    const current = combatant.getFlag(SYSTEM_ID, "injuryDefer");
    if ( Array.isArray(current) && current.includes(injuryId) ) return true;
  }
  return false;
}

/**
 * @param {Item} item
 * @param {object} changes
 * @returns {boolean}
 */
function touchesEndOfOrder(changes) {
  if ( !changes || typeof changes !== "object" ) return false;
  if ( changes.system && Object.prototype.hasOwnProperty.call(changes.system, "endOfOrder") ) return true;
  return Object.prototype.hasOwnProperty.call(changes, "system.endOfOrder");
}

/**
 * @param {Item} item
 * @param {object} changes
 * @param {object} options
 * @returns {void}
 */
function onInjuryPreUpdate(item, changes, options) {
  if ( item?.type !== "injury" || !touchesEndOfOrder(changes) || !options ) return;
  options.solEndOfOrderWas = item.system?.endOfOrder === true;
}

/**
 * @param {Item} item
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 * @returns {void}
 */
function onInjuryUpdate(item, changes, options, _userId) {
  // Le MJ actif écrit, pas seulement le client qui a coché.
  // `solEndOfOrderWas` est posé au preUpdate. S'il n'arrive pas
  // (socket), l'id encore dans `injuryDefer` dit que la case comptait.
  if ( game.user?.isActiveGM !== true ) return;
  if ( item?.type !== "injury" || !touchesEndOfOrder(changes) ) return;
  const actor = item.actor;
  if ( !actor || !item.id ) return;
  const was = endOfOrderWas(options?.solEndOfOrderWas, injuryListed(actor, item.id));
  const change = injuryBoxChange(was, item.system?.endOfOrder === true);
  if ( change === "set" ) void markInjuryDefer(actor, item.id, true);
  if ( change === "clear" ) void markInjuryDefer(actor, item.id, false);
}

/**
 * @param {Item} item
 * @param {object} _options
 * @param {string} userId
 * @returns {void}
 */
function onInjuryCreate(item, _options, _userId) {
  if ( game.user?.isActiveGM !== true ) return;
  if ( item?.type !== "injury" || item.system?.endOfOrder !== true || !item.id ) return;
  void markInjuryDefer(item.actor, item.id, true);
}

/**
 * Marque le combattant : fin d'ordre au prochain `nextRound`.
 * // À confirmer par Marc : hors du combat en cours, on ne pose rien.
 *
 * @param {Actor|null|undefined} actor
 * @param {{ automatic?: boolean }} [options] `automatic` : seulement le MJ actif.
 * Une action directe accepte n'importe quel MJ.
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
 * v14 : `foundry.data.operators.ForcedDeletion.create()` (doc v14,
 * `-=` déprécié, issue 13090). Sinon le singleton `_del`. Sinon null :
 * `flagDeletionUpdate` retombe sur `-=`.
 *
 * @returns {object|null}
 */
function deletionOperator() {
  const ForcedDeletion = globalThis.foundry?.data?.operators?.ForcedDeletion;
  if ( typeof ForcedDeletion?.create === "function" ) return ForcedDeletion.create();
  if ( globalThis._del ) return globalThis._del;
  if ( typeof ForcedDeletion === "function" ) return new ForcedDeletion();
  return null;
}

/**
 * @param {string} key
 * @returns {object}
 */
function withoutFlag(key) {
  return flagDeletionUpdate(key, deletionOperator());
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
 * @param {{ turnEvents?: boolean }} [options] `turnEvents: false` dans `nextRound` seulement.
 * @returns {Promise<void>}
 */
async function applyDeferred(combat, { turnEvents = true } = {}) {
  if ( !game.user.isActiveGM ) return;
  const sorted = combat.turns.map(combatant => ({
    id: combatant.id,
    initiative: typeof combatant.initiative === "number" ? combatant.initiative : null,
    deferStep: combatant.getFlag(SYSTEM_ID, "deferStep") === true,
    deferEnd: combatant.getFlag(SYSTEM_ID, "deferEnd") === true,
    injuryDefer: combatant.getFlag(SYSTEM_ID, "injuryDefer"),
    pendingInitiative: combatant.getFlag(SYSTEM_ID, "pendingInitiative") ?? null
  }));
  const resolved = resolveDeferred(sorted);
  if ( !resolved.length ) return;
  const updates = resolved.map(entry => {
    /** @type {object} */
    const data = { _id: entry.id };
    if ( entry.clearStep ) data[`flags.${SYSTEM_ID}.deferStep`] = false;
    if ( entry.clearEnd ) data[`flags.${SYSTEM_ID}.deferEnd`] = false;
    if ( entry.clearInjury ) data[`flags.${SYSTEM_ID}.injuryDefer`] = [];
    if ( entry.clearPending ) Object.assign(data, withoutFlag("pendingInitiative"));
    if ( entry.rank ) data[`flags.${SYSTEM_ID}.rank`] = entry.rank;
    if ( typeof entry.initiative === "number" ) data.initiative = entry.initiative;
    return data;
  });
  /** @type {object} */
  const operation = { ...keepTurn(combat), [SYSTEM_WRITE]: true };
  if ( turnEvents === false ) operation.turnEvents = false;
  await combat.updateEmbeddedDocuments("Combatant", updates, operation);
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
      Object.assign(changes, withoutFlag("rank"), withoutFlag("pendingInitiative"));
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
    // Figer l'index seulement pour un « se replacer » immédiat.
    // Un premier jet ne le fait pas : on conserve le combattant actif.
    let keepIndex = options.updateTurn === false;
    let preserveActive = false;
    for ( const id of list ) {
      const combatant = this.combatants.get(id);
      if ( !combatant?.isOwner ) continue;
      const actor = combatant.actor;
      if ( !actor ) continue;
      if ( !CAN_FIGHT.has(actor.type) ) {
        // Décision Marc 18/10/2026 : véhicule et vaisseau restent hors
        // initiative (le pilote ou l'équipage agit). À revoir avec le
        // combat spatial.
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
      // Décision Marc 18/10/2026 : un jet groupé (tout lancer, lancer les PNJ)
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
        ref,
        critical: outcome.critical,
        score: rated.score
      });
      const rank = {
        success: outcome.success,
        dr: outcome.dr,
        de: outcome.de,
        ref,
        critical: outcome.critical ?? null,
        score: rated.score
      };
      const order = turnOrder(this);
      const index = order.findIndex(entry => entry.id === id);
      const newIndex = indexAfterRoll(order, id, initiative);
      // Décision Marc 18/10/2026 : actif ou déjà joué, au round suivant.
      const plan = initiativeRollPlan({
        reposition: options.reposition === true,
        started: this.started === true,
        alone: list.length === 1,
        initiative: combatant.initiative,
        currentIndex: index,
        newIndex,
        turn: this.turn,
        updateTurn: options.updateTurn !== false
      });
      if ( plan.defer ) {
        updates.push({
          _id: id,
          [`flags.${SYSTEM_ID}.pendingInitiative`]: { initiative, rank }
        });
      } else {
        updates.push({
          _id: id,
          initiative,
          [`flags.${SYSTEM_ID}.rank`]: rank,
          ...withoutFlag("pendingInitiative")
        });
        if ( plan.keepIndex ) keepIndex = true;
        if ( plan.preserveActive ) preserveActive = true;
      }
    }
    if ( updates.length ) {
      const wroteInitiative = updates.some(update => Object.prototype.hasOwnProperty.call(update, "initiative"));
      // « Se replacer » immédiat : figer l'index. Premier jet : non,
      // le combattant actif est replacé juste après.
      await this.updateEmbeddedDocuments("Combatant", updates, {
        ...(keepIndex ? keepTurn(this) : {}),
        [SYSTEM_WRITE]: true
      });
      if ( wroteInitiative && preserveActive && !keepIndex && previousId ) {
        const turn = this.turns.findIndex(entry => entry.id === previousId);
        if ( turn >= 0 && turn !== this.turn ) await this.update({ turn });
      }
    }
    return this;
  }

  /**
   * Le cœur (v13) écrit `{ combatants }` avec `diff: false`.
   * `Combatant._preUpdate` ne tourne pas : on retire les drapeaux avant.
   *
   * @override
   * @param {{ updateTurn?: boolean }} [options]
   * @returns {Promise<Combat>}
   * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html#resetAll
   */
  async resetAll(options) {
    const data = resetAllFlagUpdate(deletionOperator());
    const updates = this.combatants.map(combatant => ({ _id: combatant.id, ...data }));
    if ( updates.length ) await this.updateEmbeddedDocuments("Combatant", updates);
    return super.resetAll(options);
  }

  /**
   * Déplacements reportés avant le nouveau round, chez le MJ actif.
   * Une seule écriture, sans événement de tour : l'ancien premier
   * n'est pas réactivé. Réf. LdR v0.2 §7.
   *
   * @override
   * @returns {Promise<Combat>}
   */
  async nextRound() {
    if ( game.user.isActiveGM ) {
      await applyDeferred(this, { turnEvents: false });
    }
    // La surprise part dans `_onStartRound` (round ≥ 2), une seule fois.
    return super.nextRound();
  }

  /**
   * Sonné posé avant le combat : fin d'ordre dès le round 1.
   * Décision Marc 18/10/2026. `markDeferEnd` ne fait rien tant qu'il
   * n'y a pas de combat : on place ici, avant le premier tour.
   *
   * @override
   * @param {object} [options]
   * @returns {Promise<Combat>}
   */
  async startCombat(options) {
    if ( game.user.isActiveGM ) await placePrecombatStunned(this);
    return super.startCombat(options);
  }

  /**
   * Secours : un joueur a passé le round, le MJ actif n'a pas écrit
   * dans `nextRound`. Les drapeaux déjà retirés ne produisent rien.
   * Sans MJ connecté, ce hook n'est pas appelé : les drapeaux attendent.
   * Réf. LdR v0.2 §7.
   *
   * @override
   * @param {CombatRoundEventContext} context
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
   */
  async _onStartRound(context) {
    await super._onStartRound(context);
    const round = context?.round ?? this.round;
    // Secours : un joueur a démarré le combat, le MJ actif n'a pas
    // écrit dans startCombat. Le drapeau évite un second recul.
    if ( round === 1 ) await placePrecombatStunned(this);
    if ( round >= 2 ) await clearSurprise(this);
    await applyDeferred(this);
  }

  /**
   * Round 1 : saute le tour d'un surpris, d'un seul `update`.
   * `nextTurn` rappelé depuis ici relancerait ce hook avant que le
   * drapeau de réentrance ne soit levé, et le surpris suivant serait
   * perdu. Un index non surpris rappelle ce hook une fois, puis s'arrête.
   * Réf. LdR v0.2 §7, ligne 158. Sans MJ connecté, Foundry n'appelle
   * pas ce hook : le tour n'est pas sauté.
   *
   * @override
   * @param {Combatant} combatant
   * @param {CombatTurnEventContext} context
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html#_onStartTurn
   */
  async _onStartTurn(combatant, context) {
    await super._onStartTurn(combatant, context);
    if ( !game.user.isActiveGM ) return;
    const entries = this.turns.map(combatant => ({
      id: combatant.id,
      surprised: actorHasStatus(combatant.actor, SURPRISED)
    }));
    const next = surprisedTurnIndex(entries, this.turn, this.round);
    if ( next === null ) { if ( (this.round === 1) && entries[this.turn]?.surprised ) await this.nextRound(); return; }
    await this.update({ turn: next });
  }
}

export class SolCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  /**
   * @override
   * @returns {ContextMenuEntry[]}
   */
  _getEntryContextOptions() {
    const entries = super._getEntryContextOptions();
    // v14 : `condition` lève pendant `ContextMenu#renderEntries`
    // (« ContextMenuEntry#condition is deprecated. Use visible instead »,
    // build 369). On ne pose pas la propriété. v13 : `condition` + `callback`.
    entries.push(
      trackerMenuEntry({
        name: "SOL.Initiative.interrupt",
        icon: '<i class="fa-solid fa-arrow-down"></i>',
        visible: () => game.user.isGM,
        onClick: onInterrupt
      }),
      trackerMenuEntry({
        name: "SOL.Initiative.reposition",
        icon: '<i class="fa-solid fa-dice-d20"></i>',
        visible: repositionVisible,
        onClick: onReposition
      }),
      trackerMenuEntry({
        name: "SOL.Initiative.surprised",
        icon: '<i class="fa-solid fa-eye-slash"></i>',
        visible: () => game.user.isGM,
        onClick: onSurprise
      })
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
    const key = rank.critical === "success"
      ? "SOL.Initiative.rankCritical"
      : "SOL.Initiative.rankSuccess";
    return game.i18n.format(key, {
      dr: rank.dr ?? 0,
      ref: rank.ref ?? 0
    });
  }
  return game.i18n.format("SOL.Initiative.rankFailure", { de: rank.de ?? 0 });
}

/**
 * v14 : `label`, `visible`, `onClick(event, target)`.
 * v13 : `condition`, `callback(li)`. Pas de `condition` en v14 : la lire lève.
 *
 * @param {{ name: string, icon: string, visible: Function, onClick: Function }} entry
 * @returns {object}
 */
function trackerMenuEntry({ name, icon, visible, onClick }) {
  const generation = game.release?.generation ?? 14;
  // v14 : `label` seul. `name` à côté de `label` n'est plus une clé du menu.
  if ( generation >= 14 ) return { label: name, icon, visible, onClick };
  return { name, icon, condition: visible, callback: onClick };
}

/**
 * v14 passe `(event, target)`. v13 passe `(li)`.
 *
 * @param {Event|HTMLElement|JQuery|HTMLElement[]} first
 * @param {HTMLElement|undefined} second
 * @returns {HTMLElement|JQuery|HTMLElement[]}
 */
function menuTarget(first, second) {
  if ( second instanceof HTMLElement || Array.isArray(second) || second?.[0] ) return second;
  return first;
}

/**
 * @param {Event|HTMLElement|JQuery|HTMLElement[]} first
 * @param {HTMLElement|undefined} second
 * @returns {void}
 */
function onInterrupt(first, second) {
  const id = combatantIdFrom(menuTarget(first, second));
  const combat = game.combat;
  if ( !id || !combat || !game.user.isGM ) return;
  const index = combat.turns.findIndex(combatant => combatant.id === id);
  if ( index < 0 ) return;
  // Décision Marc 18/10/2026 : actif ou déjà joué, au round suivant.
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

/**
 * Décision Marc 18/10/2026 : seulement le combattant actif,
 * propriétaire ou MJ, combat commencé.
 *
 * @param {HTMLElement|JQuery|HTMLElement[]} target
 * @returns {boolean}
 */
function repositionVisible(target) {
  const combat = game.combat;
  if ( !combat ) return false;
  const id = combatantIdFrom(target);
  const combatant = id ? combat.combatants.get(id) : null;
  return canReposition({
    started: combat.started === true,
    isActive: Boolean(id) && combat.combatant?.id === id,
    isOwner: combatant?.isOwner === true,
    isGM: game.user.isGM === true
  });
}

/**
 * @param {Event|HTMLElement|JQuery|HTMLElement[]} first
 * @param {HTMLElement|undefined} second
 * @returns {void}
 */
function onReposition(first, second) {
  const id = combatantIdFrom(menuTarget(first, second));
  const combat = game.combat;
  if ( !id || !combat ) return;
  if ( !repositionVisible(menuTarget(first, second)) ) return;
  void combat.rollInitiative(id, { reposition: true });
}

/**
 * Bascule le statut Surpris. Le HUD du jeton montre la même marque.
 *
 * @param {Event|HTMLElement|JQuery|HTMLElement[]} first
 * @param {HTMLElement|undefined} second
 * @returns {void}
 */
function onSurprise(first, second) {
  if ( !game.user.isGM ) return;
  const id = combatantIdFrom(menuTarget(first, second));
  const actor = game.combat?.combatants.get(id)?.actor;
  if ( !actor ) return;
  void actor.toggleStatusEffect(SURPRISED, { active: !actorHasStatus(actor, SURPRISED) });
}

/**
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function placePrecombatStunned(combat) {
  if ( !game.user.isActiveGM ) return;
  if ( combat.getFlag(SYSTEM_ID, "stunnedStart") === true ) return;
  const sorted = combat.turns.map(combatant => ({
    id: combatant.id,
    initiative: typeof combatant.initiative === "number" ? combatant.initiative : null,
    stunned: actorHasStatus(combatant.actor, STUNNED),
    injuryDefer: injuryDefersAtStart(startInjuries(combatant.actor))
  }));
  const changes = stunnedAtStart(sorted);
  if ( !changes.length ) return;
  const updates = changes.map(change => {
    /** @type {object} */
    const data = { _id: change.id };
    if ( typeof change.initiative === "number" ) data.initiative = change.initiative;
    if ( change.deferEnd ) data[`flags.${SYSTEM_ID}.deferEnd`] = true;
    return data;
  });
  await combat.updateEmbeddedDocuments("Combatant", updates, {
    ...keepTurn(combat),
    [SYSTEM_WRITE]: true,
    turnEvents: false
  });
  await combat.setFlag(SYSTEM_ID, "stunnedStart", true);
}

/**
 * Blessures déjà sur la fiche au démarrage.
 * Décision Marc 18/10/2026 : les deux cases, sinon ça ne compte pas.
 *
 * @param {Actor|null|undefined} actor
 * @returns {Array<{ endOfOrder: boolean, activeRoundOne: boolean }>}
 */
function startInjuries(actor) {
  if ( !actor?.items ) return [];
  /** @type {Array<{ endOfOrder: boolean, activeRoundOne: boolean }>} */
  const injuries = [];
  for ( const item of actor.items ) {
    if ( item.type !== "injury" ) continue;
    injuries.push({
      endOfOrder: item.system.endOfOrder === true,
      activeRoundOne: item.system.activeRoundOne === true
    });
  }
  return injuries;
}

/**
 * La marque surpris disparaît au round 2. Une fois par acteur.
 *
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function clearSurprise(combat) {
  if ( !game.user.isActiveGM ) return;
  const seen = new Set();
  for ( const combatant of combat.combatants ) {
    const actor = combatant.actor;
    if ( !actor || seen.has(actor.uuid) ) continue;
    seen.add(actor.uuid);
    if ( !actorHasStatus(actor, SURPRISED) ) continue;
    await actor.toggleStatusEffect(SURPRISED, { active: false });
  }
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
  // Décision Marc 18/10/2026 : retirer Sonné avant le round suivant
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
 * @param {object} options
 * @returns {void}
 */
function onStunnedPreUpdate(effect, changes, options) {
  if ( effectHasStatus(effect, STUNNED) ) return;
  const statuses = changes?.statuses;
  const added = typeof statuses?.has === "function"
    ? statuses.has(STUNNED)
    : Array.isArray(statuses) && statuses.includes(STUNNED);
  if ( !added || !options ) return;
  // preUpdate ne tourne que chez le demandeur. La marque part avec
  // l'opération : updateActiveEffect la lit sur tous les clients.
  options[STUNNED_ADDED] = true;
}

/**
 * @param {ActiveEffect} effect
 * @param {object} changes
 * @param {object} options
 * @returns {void}
 */
function onStunnedUpdate(effect, changes, options) {
  if ( options?.[STUNNED_ADDED] !== true ) return;
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
  registerHudStatus(STUNNED, "SOL.Status.stunned", "icons/svg/daze.svg", {
    description: "SOL.Status.stunnedHint",
    order: 900
  });
  registerHudStatus(SURPRISED, "SOL.Status.surprised", "icons/svg/mystery-man.svg", {
    order: 903
  });
  Hooks.on("createActiveEffect", onStunned);
  Hooks.on("preUpdateActiveEffect", onStunnedPreUpdate);
  Hooks.on("updateActiveEffect", onStunnedUpdate);
  Hooks.on("createItem", onInjuryCreate);
  Hooks.on("preUpdateItem", onInjuryPreUpdate);
  Hooks.on("updateItem", onInjuryUpdate);
  Hooks.once("ready", localizeStunnedHint);
}
