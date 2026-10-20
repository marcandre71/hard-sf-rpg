/**
 * Horloge de décompression sur le temps du monde.
 *
 * Réf. LdR v0.2 §7. 5 minutes, puis inconscience, puis mort 2 minutes
 * plus tard si la brèche n'est toujours pas colmatée. Seul le MJ actif
 * écrit. Les messages partent au MJ. Rien n'est silencieux.
 * // À confirmer par Marc : à l'échéance, le statut cœur `dead` est
 * appliqué, avec un message. On ne se contente pas de le proposer.
 * Le rappel de réserve d'air est du texte, pas une consommation.
 *
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.updateWorldTime.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 */
import { breachClock, clockParts } from "./breach-clock.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const SUIT = "sol-nouvelle-ere.suitBreach";
const CLOCK = "breachClock";
const UNCONSCIOUS = "unconscious";
const DEAD = "dead";

/** Une horloge à la fois par acteur : deux `advance` ne doublent pas l'échéance. */
const busy = new Set();

/**
 * @returns {void}
 */
export function registerBreachCountdown() {
  Hooks.on("createActiveEffect", effect => { void syncFromEffect(effect); });
  Hooks.on("deleteActiveEffect", effect => { void syncFromEffect(effect); });
  Hooks.on("updateWorldTime", worldTime => { void tick(worldTime); });
  Hooks.once("ready", () => { void tick(game.time?.worldTime); });
}

/**
 * @param {ActiveEffect} effect
 * @returns {Promise<void>}
 */
async function syncFromEffect(effect) {
  if ( game.user?.isActiveGM !== true ) return;
  const actor = effect?.parent;
  if ( !actor || actor.documentName !== "Actor" ) return;
  await syncActor(actor);
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function syncActor(actor) {
  if ( actorHasStatus(actor, SUIT) ) await ensureClock(actor);
  else await clearClock(actor);
}

/**
 * @param {number} [worldTime]
 * @returns {Promise<void>}
 */
async function tick(worldTime) {
  refreshSheets();
  if ( game.user?.isActiveGM !== true ) return;
  const now = typeof worldTime === "number" ? worldTime : game.time?.worldTime;
  if ( typeof now !== "number" ) return;
  for ( const actor of game.actors ?? [] ) {
    if ( !actorHasStatus(actor, SUIT) ) continue;
    await advance(actor, now);
  }
}

/**
 * Démarre l'horloge si elle n'existe pas. Ne recule pas un départ déjà posé.
 *
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function ensureClock(actor) {
  const existing = actor.getFlag(SYSTEM_ID, CLOCK);
  if ( existing && Number.isFinite(existing.startedAt) ) return;
  const startedAt = game.time?.worldTime;
  if ( typeof startedAt !== "number" || !Number.isFinite(startedAt) ) return;
  await actor.setFlag(SYSTEM_ID, CLOCK, { startedAt, unconscious: false, death: false });
  await postGm(actor, "SOL.Breach.started", airHtml(actor));
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function clearClock(actor) {
  if ( actor.getFlag(SYSTEM_ID, CLOCK) ) await actor.unsetFlag(SYSTEM_ID, CLOCK);
}

/**
 * @param {Actor} actor
 * @param {number} now
 * @returns {Promise<void>}
 */
async function advance(actor, now) {
  if ( busy.has(actor.uuid) ) return;
  busy.add(actor.uuid);
  try {
    if ( !actorHasStatus(actor, SUIT) ) {
      await clearClock(actor);
      return;
    }
    const clock = actor.getFlag(SYSTEM_ID, CLOCK);
    if ( !clock || !Number.isFinite(clock.startedAt) ) {
      await ensureClock(actor);
      return;
    }
    const state = breachClock(now, clock.startedAt);
    if ( !state ) return;
    let unconscious = clock.unconscious === true;
    let death = clock.death === true;
    let changed = false;
    if ( state.phase !== "survival" && !unconscious ) {
      if ( !actorHasStatus(actor, UNCONSCIOUS) ) {
        await actor.toggleStatusEffect(UNCONSCIOUS, { active: true });
      }
      await postGm(actor, "SOL.Breach.unconscious");
      unconscious = true;
      changed = true;
    }
    if ( state.phase === "death" && !death ) {
      // À confirmer par Marc : appliquer `dead`, message au MJ, pas de proposition muette.
      if ( !actorHasStatus(actor, DEAD) ) await actor.toggleStatusEffect(DEAD, { active: true });
      await postGm(actor, "SOL.Breach.death");
      death = true;
      changed = true;
    }
    if ( changed ) {
      await actor.setFlag(SYSTEM_ID, CLOCK, {
        startedAt: clock.startedAt,
        unconscious,
        death
      });
    }
  } finally {
    busy.delete(actor.uuid);
  }
}

/**
 * Texte de fiche : temps restant, et réserves d'air des combinaisons équipées.
 *
 * @param {Actor} actor
 * @returns {{ text: string, air: string[] }}
 */
export function breachContext(actor) {
  const empty = { text: "", air: [] };
  if ( !actor || !actorHasStatus(actor, SUIT) ) return empty;
  const clock = actor.getFlag(SYSTEM_ID, CLOCK);
  const now = game.time?.worldTime;
  const state = clock && typeof now === "number" ? breachClock(now, clock.startedAt) : null;
  let text = game.i18n.localize("SOL.Breach.remainingUnknown");
  if ( state?.phase === "survival" ) {
    text = game.i18n.format("SOL.Breach.remainingSurvival", clockParts(state.remainingSurvival));
  } else if ( state?.phase === "unconscious" ) {
    text = game.i18n.format("SOL.Breach.remainingDeath", clockParts(state.remainingDeath));
  } else if ( state?.phase === "death" ) {
    text = game.i18n.localize("SOL.Breach.remainingOver");
  }
  return { text, air: airTexts(actor) };
}

/**
 * @param {Actor} actor
 * @returns {string[]}
 */
function airTexts(actor) {
  /** @type {string[]} */
  const lines = [];
  for ( const item of actor.items ?? [] ) {
    if ( item.type !== "armor" || item.system?.equipped !== true || item.system.pressurized !== true ) continue;
    const value = item.system.airReserve?.value;
    const max = item.system.airReserve?.max;
    if ( typeof value !== "number" && typeof max !== "number" ) continue;
    lines.push(game.i18n.format("SOL.Breach.air", {
      name: item.name,
      value: typeof value === "number" ? value : "—",
      max: typeof max === "number" ? max : "—"
    }));
  }
  return lines;
}

/**
 * @param {Actor} actor
 * @returns {string}
 */
function airHtml(actor) {
  return airTexts(actor).map(line => `<p>${escape(line)}</p>`).join("");
}

/**
 * @param {Actor} actor
 * @param {string} key
 * @param {string} [extra]
 * @returns {Promise<void>}
 */
async function postGm(actor, key, extra = "") {
  const body = escape(game.i18n.format(key, { name: actor.name }));
  const whisper = (game.users ?? []).filter(user => user.isGM).map(user => user.id);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p>${body}</p>${extra}`,
    whisper
  });
}

/**
 * @returns {void}
 */
function refreshSheets() {
  for ( const actor of game.actors ?? [] ) {
    if ( !actorHasStatus(actor, SUIT) ) continue;
    if ( actor.sheet?.rendered ) actor.sheet.render();
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function escape(text) {
  return foundry.utils.escapeHTML(String(text));
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
