/**
 * Horloge de décompression sur le temps du monde.
 *
 * Réf. LdR v0.2 §7. 5 minutes, puis inconscience, puis mort 2 minutes
 * plus tard si la brèche n'est toujours pas colmatée. Seul le MJ actif
 * écrit. Les messages partent au MJ. Rien n'est silencieux.
 * // À confirmer par Marc : à l'échéance, le statut vaincu
 * (`CONFIG.specialStatusEffects.DEFEATED`, sinon `dead`) est appliqué,
 * avec un message. On ne se contente pas de le proposer.
 * Le rappel de réserve d'air est du texte, pas une consommation.
 *
 * Un jeton non lié n'est pas dans `game.actors`. Son uuid est celui du
 * jeton (`Scene.<id>.Token.<id>`). Le registre monde les retrouve après
 * un rechargement. Décision Marc 20/10/2026 : retirer ou déséquiper
 * l'armure ne coupe pas l'horloge. Le MJ peut l'arrêter ; le statut
 * Combinaison percée peut rester. Retirer le statut, lui, efface tout,
 * pour qu'une brèche suivante reparte de zéro.
 *
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.updateWorldTime.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect
 * @see https://foundryvtt.com/api/v14/functions/foundry.utils.fromUuid.html
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.html
 */
import { breachClock, clockIsStopped, clockParts, collectClockUuids } from "./breach-clock.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const SUIT = "sol-nouvelle-ere.suitBreach";
const CLOCK = "breachClock";
const REGISTRY = "breachClocks";
const UNCONSCIOUS = "unconscious";

/** Une horloge à la fois par acteur : deux `advance` ne doublent pas l'échéance. */
const busy = new Set();

/**
 * @returns {void}
 */
export function registerBreachCountdown() {
  game.settings.register(SYSTEM_ID, REGISTRY, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
  Hooks.on("createActiveEffect", effect => { void syncFromEffect(effect); });
  Hooks.on("deleteActiveEffect", effect => { void syncFromEffect(effect); });
  Hooks.on("updateWorldTime", worldTime => { void tick(worldTime); });
  Hooks.on("renderChatMessageHTML", onBreachCard);
  Hooks.once("ready", () => {
    void rebuildRegistry().then(() => tick(game.time?.worldTime));
  });
}

/**
 * Statut vaincu du cœur. `dead` si la clé n'est pas posée.
 * // À confirmer par Marc : on l'applique, on ne le propose pas.
 *
 * @returns {string}
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.html
 */
function defeatedId() {
  const id = CONFIG.specialStatusEffects?.DEFEATED;
  return typeof id === "string" && id ? id : "dead";
}

/**
 * Bouton de fiche. `this` est la feuille. Réservé au MJ.
 * Décision Marc 20/10/2026.
 *
 * @returns {Promise<void>}
 */
export async function stopBreachClock() {
  if ( game.user?.isGM !== true ) return;
  await haltClock(this?.document);
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
 * Le statut présent ne relance pas une horloge arrêtée.
 * Le statut absent efface le drapeau, y compris `stopped`.
 *
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
  const actors = await clockActors();
  for ( const actor of actors ) {
    if ( !actorHasStatus(actor, SUIT) ) {
      await clearClock(actor);
      continue;
    }
    await advance(actor, now);
  }
}

/**
 * Acteurs du monde et jetons non liés, plus le registre.
 *
 * @returns {Promise<Actor[]>}
 */
async function clockActors() {
  /** @type {Map<string, Actor>} */
  const byUuid = new Map();
  for ( const entry of scanClockEntries() ) {
    if ( entry.linked || !entry.actor ) continue;
    const watched = actorHasStatus(entry.actor, SUIT) || Number.isFinite(entry.clock?.startedAt);
    if ( !watched ) continue;
    byUuid.set(entry.uuid, entry.actor);
  }
  for ( const uuid of readRegistry() ) {
    if ( byUuid.has(uuid) ) continue;
    const actor = await actorFromUuid(uuid);
    if ( !actor ) continue;
    byUuid.set(clockIdentity(actor), actor);
  }
  return [...byUuid.values()];
}

/**
 * @returns {Array<{ uuid: string, clock: object|null, linked: boolean, actor: Actor|null }>}
 */
function scanClockEntries() {
  /** @type {Array<{ uuid: string, clock: object|null, linked: boolean, actor: Actor|null }>} */
  const entries = [];
  for ( const actor of game.actors ?? [] ) {
    if ( !actor?.uuid ) continue;
    entries.push({
      uuid: actor.uuid,
      clock: actor.getFlag(SYSTEM_ID, CLOCK) ?? null,
      linked: false,
      actor
    });
  }
  for ( const scene of game.scenes ?? [] ) {
    for ( const token of scene.tokens ?? [] ) {
      const actor = token?.actor;
      if ( !actor ) continue;
      const linked = token.actorLink === true;
      entries.push({
        uuid: linked ? actor.uuid : token.uuid,
        clock: actor.getFlag(SYSTEM_ID, CLOCK) ?? null,
        linked,
        actor: linked ? null : actor
      });
    }
  }
  return entries;
}

/**
 * Jeton non lié : `Scene.<id>.Token.<id>`. Acteur du monde : `Actor.<id>`.
 *
 * @param {Actor|null|undefined} actor
 * @returns {string}
 */
function clockIdentity(actor) {
  if ( actor?.isToken && actor.parent?.uuid ) return actor.parent.uuid;
  return actor?.uuid ?? "";
}

/**
 * @param {string} uuid
 * @returns {Promise<Actor|null>}
 */
async function actorFromUuid(uuid) {
  if ( typeof uuid !== "string" || !uuid ) return null;
  const doc = await foundry.utils.fromUuid(uuid);
  if ( !doc ) return null;
  if ( doc.documentName === "Actor" ) return doc;
  if ( doc.documentName === "Token" ) return doc.actor ?? null;
  return null;
}

/**
 * @returns {string[]}
 */
function readRegistry() {
  try {
    const value = game.settings.get(SYSTEM_ID, REGISTRY);
    if ( !Array.isArray(value) ) return [];
    return value.filter(id => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

/**
 * @param {string[]} uuids
 * @returns {Promise<void>}
 */
async function writeRegistry(uuids) {
  if ( game.user?.isActiveGM !== true ) return;
  await game.settings.set(SYSTEM_ID, REGISTRY, uuids);
}

/**
 * @param {string} uuid
 * @returns {Promise<void>}
 */
async function remember(uuid) {
  if ( typeof uuid !== "string" || !uuid ) return;
  const list = readRegistry();
  if ( list.includes(uuid) ) return;
  await writeRegistry([...list, uuid]);
}

/**
 * @param {string} uuid
 * @returns {Promise<void>}
 */
async function forget(uuid) {
  const list = readRegistry();
  if ( !list.includes(uuid) ) return;
  await writeRegistry(list.filter(id => id !== uuid));
}

/**
 * @returns {Promise<void>}
 */
async function rebuildRegistry() {
  if ( game.user?.isActiveGM !== true ) return;
  const entries = scanClockEntries();
  for ( const uuid of readRegistry() ) {
    if ( entries.some(entry => entry.uuid === uuid) ) continue;
    const actor = await actorFromUuid(uuid);
    if ( !actor ) continue;
    entries.push({
      uuid,
      clock: actor.getFlag(SYSTEM_ID, CLOCK) ?? null,
      linked: false,
      actor
    });
  }
  await writeRegistry(collectClockUuids(entries));
}

/**
 * Démarre l'horloge si elle n'existe pas. Ne recule pas un départ déjà posé.
 * Une horloge arrêtée ne redémarre pas tant que le statut est là.
 *
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function ensureClock(actor) {
  const existing = actor.getFlag(SYSTEM_ID, CLOCK);
  if ( clockIsStopped(existing) ) return;
  const uuid = clockIdentity(actor);
  if ( existing && Number.isFinite(existing.startedAt) ) {
    await remember(uuid);
    return;
  }
  const startedAt = game.time?.worldTime;
  if ( typeof startedAt !== "number" || !Number.isFinite(startedAt) ) return;
  await actor.setFlag(SYSTEM_ID, CLOCK, { startedAt, unconscious: false, death: false });
  await remember(uuid);
  await postGm(actor, "SOL.Breach.started", airHtml(actor), true);
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function clearClock(actor) {
  if ( actor.getFlag(SYSTEM_ID, CLOCK) ) await actor.unsetFlag(SYSTEM_ID, CLOCK);
  await forget(clockIdentity(actor));
}

/**
 * Coupe l'horloge. Le statut Combinaison percée n'est pas retiré.
 * Décision Marc 20/10/2026.
 *
 * @param {Actor|null|undefined} actor
 * @returns {Promise<void>}
 */
async function haltClock(actor) {
  if ( game.user?.isGM !== true || !actor ) return;
  const clock = actor.getFlag(SYSTEM_ID, CLOCK);
  if ( !clock || clockIsStopped(clock) || !Number.isFinite(clock.startedAt) ) return;
  await actor.setFlag(SYSTEM_ID, CLOCK, {
    startedAt: clock.startedAt,
    unconscious: clock.unconscious === true,
    death: clock.death === true,
    stopped: true
  });
  await postGm(actor, "SOL.Breach.stopped");
}

/**
 * @param {Actor} actor
 * @param {number} now
 * @returns {Promise<void>}
 */
async function advance(actor, now) {
  const uuid = clockIdentity(actor) || actor.uuid;
  if ( busy.has(uuid) ) return;
  busy.add(uuid);
  try {
    if ( !actorHasStatus(actor, SUIT) ) {
      await clearClock(actor);
      return;
    }
    const clock = actor.getFlag(SYSTEM_ID, CLOCK);
    if ( clockIsStopped(clock) ) return;
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
      await postGm(actor, "SOL.Breach.unconscious", "", true);
      unconscious = true;
      changed = true;
    }
    if ( state.phase === "death" && !death ) {
      // À confirmer par Marc : appliquer le statut vaincu, message au MJ, pas de proposition muette.
      const dead = defeatedId();
      if ( !actorHasStatus(actor, dead) ) await actor.toggleStatusEffect(dead, { active: true });
      await postGm(actor, "SOL.Breach.death");
      death = true;
      changed = true;
    }
    if ( changed ) {
      await actor.setFlag(SYSTEM_ID, CLOCK, {
        startedAt: clock.startedAt,
        unconscious,
        death,
        stopped: false
      });
    }
  } finally {
    busy.delete(uuid);
  }
}

/**
 * Texte de fiche : temps restant, et réserves d'air des combinaisons équipées.
 * `stop` : le MJ peut couper l'horloge sans retirer le statut.
 *
 * @param {Actor} actor
 * @returns {{ text: string, air: string[], stop: boolean }}
 */
export function breachContext(actor) {
  const empty = { text: "", air: [], stop: false };
  if ( !actor || !actorHasStatus(actor, SUIT) ) return empty;
  const clock = actor.getFlag(SYSTEM_ID, CLOCK);
  const air = airTexts(actor);
  if ( clockIsStopped(clock) ) {
    return { text: game.i18n.localize("SOL.Breach.stoppedSheet"), air, stop: false };
  }
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
  const stop = game.user?.isGM === true && Number.isFinite(clock?.startedAt);
  return { text, air, stop };
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
function onBreachCard(message, html) {
  if ( message.getFlag(SYSTEM_ID, "type") !== "breach" ) return;
  const button = html.querySelector("[data-action=sol-breach-stop]");
  if ( !button ) return;
  if ( game.user?.isGM !== true ) {
    button.remove();
    return;
  }
  if ( button.dataset.solBound === "1" ) return;
  button.dataset.solBound = "1";
  button.addEventListener("click", event => {
    event.preventDefault();
    const uuid = message.getFlag(SYSTEM_ID, "actorUuid");
    void stopFromChat(uuid, button);
  });
}

/**
 * @param {unknown} uuid
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function stopFromChat(uuid, button) {
  if ( game.user?.isGM !== true || typeof uuid !== "string" ) return;
  button.disabled = true;
  try {
    const actor = await actorFromUuid(uuid);
    await haltClock(actor);
  } finally {
    button.disabled = false;
  }
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
 * @param {boolean} [offerStop]
 * @returns {Promise<void>}
 */
async function postGm(actor, key, extra = "", offerStop = false) {
  const body = escape(game.i18n.format(key, { name: actor.name }));
  const whisper = (game.users ?? []).filter(user => user.isGM).map(user => user.id);
  const stop = offerStop
    ? `<p><button type="button" data-action="sol-breach-stop">${escape(game.i18n.localize("SOL.Breach.stop"))}</button></p>`
    : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p>${body}</p>${extra}${stop}`,
    whisper,
    flags: {
      [SYSTEM_ID]: {
        type: "breach",
        actorUuid: clockIdentity(actor)
      }
    }
  });
}

/**
 * @returns {void}
 */
function refreshSheets() {
  /** @type {Map<string, Actor>} */
  const seen = new Map();
  for ( const entry of scanClockEntries() ) {
    if ( entry.linked || !entry.actor ) continue;
    seen.set(entry.uuid, entry.actor);
  }
  for ( const actor of seen.values() ) {
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
