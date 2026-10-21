/**
 * Fenêtre « Combat spatial » et jets de poste.
 *
 * Réf. Vaisseaux v0.1 §1 et §3.
 * L'état tient dans un réglage de monde, pas dans un document Combat :
 * le tracker des personnages reste celui de l'initiative, et un vaisseau
 * n'y entre pas (Décision Marc 18/10/2026). Le MJ peut tout modifier
 * à la main dans la fenêtre. Un tour dure environ une minute ; on
 * n'avance pas le temps du monde (l'horloge de brèche compte en secondes).
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 */
import { SOL } from "../config.mjs";
import { performRoll } from "../dice/chat.mjs";
import { skillScore } from "../dice/skill-score.mjs";
import { NPC_CREW_SCORES, SHIP_POST_IDS } from "./hull.mjs";
import {
  actingOrder,
  compareOpposed,
  currentStep,
  duplicateActors,
  evadeFromDr,
  finishRound,
  nextPost,
  normalizeCombat,
  settle,
  shiftRange,
  suggestedModifier,
  thrustCostKmS,
  turnOf,
  turnSchedule,
  weaponCanFire
} from "./combat.mjs";
import { registerShipCombatGuard } from "./guard.mjs";
import { skillsForPost } from "./post-skills.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const SETTING = "spaceCombat";

/**
 * Boutons de l'onglet Postes. Réf. Vaisseaux v0.1 §3.
 * L'ordre du tour est `SHIP_POST_IDS`, pas celui de cette carte.
 */
export const POST_ACTIONS = {
  commander: ["command"],
  operator: ["lock"],
  navigator: ["calculate"],
  pilot: ["evade", "changeRange"],
  gunner: ["fire"],
  engineer: ["simple"],
  medic: ["simple"]
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Réglage de monde et garde du tracker. Une fois, sur `init`.
 *
 * @returns {void}
 */
export function registerSpaceCombat() {
  game.settings.register(SYSTEM_ID, SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => refreshSpace()
  });
  registerShipCombatGuard();
}

/**
 * @returns {object}
 */
export function readCombat() {
  return normalizeCombat(game.settings.get(SYSTEM_ID, SETTING));
}

/**
 * @returns {SpaceCombatApp}
 */
export function openSpaceCombat() {
  if ( !game.user.isGM ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.gmOnly"));
    return null;
  }
  return new SpaceCombatApp().render({ force: true });
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} action
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
export async function rollPostAction(ship, postId, action) {
  if ( !ship || ship.type !== "ship" || !SHIP_POST_IDS.includes(postId) ) return null;
  warnIfDuplicate(ship, postId);
  if ( (action === "fire" || action === "changeRange") && !readCombat().ships.includes(ship.uuid) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.needCombat"));
    return null;
  }
  if ( action === "changeRange" ) return changeRange(ship);
  return rollSingle(ship, postId, action);
}

/**
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
class SpaceCombatApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "sol-space-combat",
    classes: ["sol", "sol-nouvelle-ere", "sol-space"],
    tag: "form",
    position: { width: 720, height: 780 },
    window: { title: "SOL.Space.title", resizable: true },
    actions: { opening, stepPost, stepRound, currentRoll }
  };

  /** @override */
  static PARTS = {
    body: {
      template: "systems/sol-nouvelle-ere/templates/combat/space-combat.hbs",
      scrollable: [""]
    }
  };

  /** @type {AbortController|null} */
  #abort = null;

  /**
   * @override
   * @returns {Promise<object>}
   */
  async _prepareContext() {
    const state = readCombat();
    const order = actingOrder(state);
    const step = currentStep(state);
    const names = new Map();
    const shipOptions = [];
    for ( const actor of game.actors ?? [] ) {
      if ( actor.type !== "ship" ) continue;
      names.set(actor.uuid, actor.name);
      shipOptions.push({ uuid: actor.uuid, name: actor.name });
    }
    for ( const uuid of state.ships ) {
      if ( uuid && !names.has(uuid) ) names.set(uuid, uuid);
    }
    const schedule = turnSchedule(state).map(row => ({
      ...row,
      postLabel: SOL.shipPosts[row.postId],
      name: row.uuid ? (names.get(row.uuid) ?? row.uuid) : "",
      emptyLabel: !row.uuid
    }));
    return {
      state,
      shipOptions,
      rangeOptions: ["close", "medium", "long"].map(id => ({
        id,
        label: `SOL.ShipModule.range.${id}`,
        selected: id === state.range
      })),
      firstOptions: [
        { id: "", label: "SOL.Space.firstUnset", selected: state.firstSide === null },
        { id: "0", label: names.get(state.ships[0]) || "SOL.Space.shipA", selected: state.firstSide === 0, plain: Boolean(names.get(state.ships[0])) },
        { id: "1", label: names.get(state.ships[1]) || "SOL.Space.shipB", selected: state.firstSide === 1, plain: Boolean(names.get(state.ships[1])) }
      ],
      postOptions: SHIP_POST_IDS.map((id, index) => ({
        id: String(index),
        label: SOL.shipPosts[id],
        selected: index === state.postIndex
      })),
      sideOptions: [0, 1].map(side => ({
        id: String(side),
        name: order[side] ? (names.get(order[side]) ?? order[side]) : "",
        selected: side === state.side
      })),
      picks: [0, 1].map(index => ({
        index,
        selected: state.ships[index] ?? "",
        options: shipOptions.map(option => ({
          ...option,
          selected: option.uuid === state.ships[index]
        }))
      })),
      panels: state.ships.filter(Boolean).map(uuid => panel(state, uuid, names.get(uuid) ?? uuid)),
      schedule,
      stepLabel: step.postId ? SOL.shipPosts[step.postId] : "",
      stepName: step.shipUuid ? (names.get(step.shipUuid) ?? step.shipUuid) : "",
      round: state.round
    };
  }

  /**
   * @override
   * @returns {Promise<void>}
   */
  async _onRender() {
    this.#abort?.abort();
    this.#abort = new AbortController();
    this.element.addEventListener("change", event => {
      const input = event.target;
      if ( !input?.dataset?.field ) return;
      void applyField(input);
    }, { signal: this.#abort.signal });
  }
}

/**
 * @param {object} state
 * @param {string} uuid
 * @param {string} name
 * @returns {object}
 */
function panel(state, uuid, name) {
  const turn = turnOf(state, uuid);
  return {
    uuid,
    name,
    thrust: turn.thrust,
    lock: turn.lock,
    pilotBonus: turn.pilotBonus,
    evadeOptions: [0, -10, -20, -30].map(value => ({
      value,
      selected: turn.evade === value
    })),
    postOptions: [{ id: "", label: "SOL.Space.noBonus", selected: turn.commanderPost === "" }].concat(
      SHIP_POST_IDS.map(id => ({
        id,
        label: SOL.shipPosts[id],
        selected: turn.commanderPost === id
      }))
    )
  };
}

/**
 * @param {HTMLInputElement|HTMLSelectElement} input
 * @returns {Promise<void>}
 */
async function applyField(input) {
  const state = readCombat();
  const field = input.dataset.field;
  if ( field === "ships.0" || field === "ships.1" ) {
    const index = field.endsWith("1") ? 1 : 0;
    state.ships[index] = input.value;
  } else if ( field === "range" ) {
    if ( input.value === "close" || input.value === "medium" || input.value === "long" ) state.range = input.value;
  } else if ( field === "firstSide" ) {
    state.firstSide = input.value === "0" || input.value === "1" ? Number(input.value) : null;
  } else if ( field === "round" ) {
    const round = Number(input.value);
    if ( Number.isFinite(round) && round >= 1 ) state.round = Math.trunc(round);
  } else if ( field === "postIndex" ) {
    const index = Number(input.value);
    if ( Number.isFinite(index) && index >= 0 && index < SHIP_POST_IDS.length ) state.postIndex = index;
  } else if ( field === "side" ) {
    state.side = input.value === "1" ? 1 : 0;
  } else if ( input.dataset.uuid && input.dataset.turn ) {
    const turn = turnOf(state, input.dataset.uuid);
    const turnKey = input.dataset.turn;
    if ( turnKey === "thrust" || turnKey === "lock" || turnKey === "pilotBonus" ) turn[turnKey] = input.checked;
    else if ( turnKey === "evade" ) turn.evade = Number(input.value);
    else if ( turnKey === "commanderPost" ) turn.commanderPost = input.value;
    else return;
    state.turns[input.dataset.uuid] = turn;
  } else {
    return;
  }
  await writeCombat(state);
}

/**
 * @returns {Promise<void>}
 */
async function opening() {
  const state = readCombat();
  const ships = [];
  for ( const uuid of state.ships ) {
    const ship = uuid ? await foundry.utils.fromUuid(uuid) : null;
    if ( !ship || ship.documentName !== "Actor" || ship.type !== "ship" ) {
      ui.notifications.warn(game.i18n.localize("SOL.Space.needTwo"));
      return;
    }
    ships.push(ship);
  }
  /** @type {{ success: boolean, dr: number, score: number }[]} */
  const results = [];
  for ( const ship of ships ) {
    const rolled = await rollSingle(ship, "operator", "opening");
    if ( !rolled ) return;
    results.push(rolled);
  }
  const verdict = compareOpposed(results[0], results[1], { useScore: true });
  if ( verdict === "tie" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.tie"));
    await ChatMessage.create({ content: `<p>${game.i18n.localize("SOL.Space.tie")}</p>` });
    return;
  }
  const firstSide = verdict === "a" ? 0 : 1;
  await writeCombat({ ...readCombat(), firstSide });
  const text = game.i18n.format("SOL.Space.first", { name: ships[firstSide].name });
  await ChatMessage.create({ content: `<p>${foundry.utils.escapeHTML(text)}</p>` });
}

/**
 * @returns {Promise<void>}
 */
async function stepPost() {
  const stepped = nextPost(readCombat());
  if ( stepped.done ) {
    ui.notifications.info(game.i18n.localize("SOL.Space.endOfRound"));
    return;
  }
  await writeCombat(settle(stepped.state).state);
}

/**
 * @returns {Promise<void>}
 */
async function stepRound() {
  const state = readCombat();
  /** @type {Record<string, { acceleration: unknown, deltaV: unknown, name: string }>} */
  const stats = {};
  for ( const uuid of state.ships ) {
    if ( !uuid ) continue;
    const actor = await foundry.utils.fromUuid(uuid);
    const source = actor?.system?._source ?? {};
    stats[uuid] = {
      acceleration: source.propulsion?.acceleration,
      deltaV: source.propulsion?.deltaV?.value,
      name: actor?.name ?? uuid
    };
  }
  const done = finishRound(state, stats);
  const settled = settle(done.state);
  if ( !await writeCombat(settled.state) ) return;
  /** @type {string[]} */
  const lines = [];
  for ( const row of done.deductions ) {
    const actor = await foundry.utils.fromUuid(row.uuid);
    if ( actor ) await actor.update({ "system.propulsion.deltaV.value": row.value });
    const meters = thrustCostKmS(stats[row.uuid]?.acceleration) * 1000;
    lines.push(game.i18n.format("SOL.Space.thrustLine", {
      name: stats[row.uuid]?.name ?? row.uuid,
      meters: formatNumber(meters, 1),
      value: formatNumber(row.value, 3)
    }));
  }
  if ( lines.length ) {
    const content = `<p>${lines.map(line => foundry.utils.escapeHTML(line)).join("<br>")}</p>`;
    await ChatMessage.create({ content });
  }
}

/**
 * @returns {Promise<void>}
 */
async function currentRoll() {
  const step = currentStep(readCombat());
  if ( !step.postId || !step.shipUuid ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.emptyPost"));
    return;
  }
  const ship = await foundry.utils.fromUuid(step.shipUuid);
  if ( !ship || ship.documentName !== "Actor" ) return;
  const action = POST_ACTIONS[step.postId]?.[0] ?? "simple";
  await rollPostAction(ship, step.postId, action);
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @returns {void}
 */
function warnIfDuplicate(ship, postId) {
  const posts = SHIP_POST_IDS.map(id => ({
    id,
    uuid: ship.system._source?.posts?.[id]?.actorUuid ?? ""
  }));
  const uuid = posts.find(post => post.id === postId)?.uuid ?? "";
  if ( uuid && duplicateActors(posts).includes(uuid) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.duplicate"));
  }
}

/**
 * @param {Actor} ship
 * @returns {Promise<null|object>}
 */
async function changeRange(ship) {
  const state = readCombat();
  const otherUuid = state.ships.find(uuid => uuid && uuid !== ship.uuid);
  const other = otherUuid ? await foundry.utils.fromUuid(otherUuid) : null;
  if ( !other || other.documentName !== "Actor" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.needTwo"));
    return null;
  }
  const noteFor = outcome => outcome.de >= 3 ? game.i18n.localize("SOL.Space.incident") : "";
  const mine = await rollSingle(ship, "pilot", "changeRange", { noteFor, store: false });
  if ( !mine ) return null;
  const theirs = await rollSingle(other, "pilot", "changeRange", { noteFor, store: false });
  if ( !theirs ) return null;
  const verdict = compareOpposed(mine, theirs);
  if ( verdict === "tie" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.rangeTie"));
    return mine;
  }
  const winner = verdict === "a" ? ship : other;
  const direction = await choose(game.i18n.format("SOL.Space.rangeWinner", { name: winner.name }), [
    { id: "closer", label: game.i18n.localize("SOL.Space.closer") },
    { id: "farther", label: game.i18n.localize("SOL.Space.farther") }
  ]);
  if ( direction !== "closer" && direction !== "farther" ) return mine;
  const nextRange = shiftRange(readCombat().range, direction);
  if ( nextRange === readCombat().range ) ui.notifications.info(game.i18n.localize("SOL.Space.rangeSame"));
  await writeCombat({ ...readCombat(), range: nextRange });
  return mine;
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} action
 * @param {{ noteFor?: (outcome: object) => string, store?: boolean }} [options]
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
async function rollSingle(ship, postId, action, options = {}) {
  const crew = await crewOf(ship, postId);
  if ( !crew ) return null;
  let aim = "";
  let skill = crew.skills[0];
  if ( action === "command" ) {
    const post = await choose(game.i18n.localize("SOL.Space.pickPost"), SHIP_POST_IDS.map(id => ({
      id,
      label: game.i18n.localize(SOL.shipPosts[id])
    })));
    if ( !post ) return null;
    crew.chosenPost = post;
  }
  if ( action === "fire" ) {
    const weapons = weaponsOf(ship).filter(weapon => weaponCanFire(weapon, readCombat().range));
    if ( !weapons.length ) {
      ui.notifications.warn(game.i18n.localize("SOL.Space.noWeapon"));
      return null;
    }
    const weaponId = await choose(game.i18n.localize("SOL.Space.pickWeapon"), weapons.map(weapon => ({
      id: weapon.id,
      label: weapon.name
    })));
    if ( !weaponId ) return null;
    aim = await choose(game.i18n.localize("SOL.Space.pickAim"), [
      { id: "none", label: game.i18n.localize("SOL.Space.aimNone") },
      { id: "section", label: game.i18n.localize("SOL.Space.aimSection") },
      { id: "module", label: game.i18n.localize("SOL.Space.aimModule") }
    ]);
    if ( !aim ) return null;
  }
  if ( crew.skills.length > 1 ) {
    const picked = await choose(game.i18n.localize("SOL.Space.pickSkill"), crew.skills.map((entry, index) => ({
      id: String(index),
      label: entry.name
    })));
    if ( picked === null ) return null;
    skill = crew.skills[Number(picked)] ?? skill;
  }
  if ( !skill ) return null;
  const score = crew.npc ? crew.score : ratedScore(crew.actor, skill);
  if ( score === null ) return null;
  const suggested = modifierFor(ship.uuid, postId, aim);
  const noteFor = options.noteFor ?? (action === "fire"
    ? outcome => outcome.success ? game.i18n.localize("SOL.Space.hitLater") : ""
    : null);
  const outcome = await performRoll({
    actor: crew.actor,
    label: `${ship.name} — ${game.i18n.localize(SOL.shipPosts[postId])} — ${skill.name}`,
    score,
    type: "skill",
    suggested,
    noteFor: noteFor ?? undefined
  });
  if ( !outcome ) return null;
  const result = { ...outcome, score };
  if ( options.store !== false ) await storeEffect(ship, action, result, crew.chosenPost);
  return result;
}

/**
 * @param {Actor} ship
 * @param {string} action
 * @param {{ success: boolean, dr: number }} result
 * @param {string} [chosenPost]
 * @returns {Promise<void>}
 */
async function storeEffect(ship, action, result, chosenPost) {
  if ( !result.success ) return;
  if ( !readCombat().ships.includes(ship.uuid) ) {
    if ( action === "opening" || action === "simple" ) return;
    ui.notifications.info(game.i18n.localize("SOL.Space.effectNotStored"));
    return;
  }
  const turn = turnOf(readCombat(), ship.uuid);
  if ( action === "command" && chosenPost ) turn.commanderPost = chosenPost;
  else if ( action === "lock" ) turn.lock = true;
  else if ( action === "evade" ) turn.evade = evadeFromDr(result.dr, true);
  else if ( action === "calculate" ) turn.pilotBonus = true;
  else return;
  const state = readCombat();
  state.turns[ship.uuid] = turn;
  await writeCombat(state);
}

/**
 * @param {string} shipUuid
 * @param {string} postId
 * @param {string} aim
 * @returns {number}
 */
function modifierFor(shipUuid, postId, aim) {
  const state = readCombat();
  if ( !state.ships.includes(shipUuid) ) {
    return suggestedModifier({ postId, range: "close", ship: {}, foe: {}, aim });
  }
  const foe = state.ships.find(uuid => uuid && uuid !== shipUuid) ?? "";
  return suggestedModifier({
    postId,
    range: state.range,
    ship: turnOf(state, shipUuid),
    foe: turnOf(state, foe),
    aim
  });
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @returns {Promise<null|{ actor: Actor, npc: boolean, score: number, skills: { name: string, system: object }[], chosenPost?: string }>}
 */
async function crewOf(ship, postId) {
  const uuid = ship.system._source?.posts?.[postId]?.actorUuid ?? "";
  const npcScore = NPC_CREW_SCORES[ship.system._source?.npcCrew] ?? NPC_CREW_SCORES.trained;
  const virtual = skillsForPost(postId, []);
  if ( !uuid ) {
    return { actor: ship, npc: true, score: npcScore, skills: virtual };
  }
  const crew = await foundry.utils.fromUuid(uuid);
  if ( !crew || crew.documentName !== "Actor" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.missingCrew"));
    return { actor: ship, npc: true, score: npcScore, skills: virtual };
  }
  const owned = crew.items
    .filter(item => item.type === "skill")
    .map(item => ({ name: item.name, system: item.system }));
  return {
    actor: crew,
    npc: false,
    score: 0,
    skills: skillsForPost(postId, owned)
  };
}

/**
 * @param {Actor} actor
 * @param {{ name: string, system: object }} skill
 * @returns {number|null}
 */
function ratedScore(actor, skill) {
  const rated = skillScore(actor.system?.characteristics, skill.system);
  if ( rated.impossible || rated.score === null ) {
    ui.notifications.warn(`${skill.name} — ${game.i18n.localize("SOL.Roll.impossible")}`);
    return null;
  }
  return rated.score;
}

/**
 * @param {Actor} ship
 * @returns {{ id: string, name: string, category: string, condition: string, rangeClose: boolean, rangeMedium: boolean, rangeLong: boolean }[]}
 */
function weaponsOf(ship) {
  return ship.items.filter(item => item.type === "shipModule").map(item => ({
    id: item.id,
    name: item.name,
    category: item.system.category,
    condition: item.system.condition,
    rangeClose: item.system.weapon?.rangeClose === true,
    rangeMedium: item.system.weapon?.rangeMedium === true,
    rangeLong: item.system.weapon?.rangeLong === true
  }));
}

/**
 * @param {string} title
 * @param {{ id: string, label: string }[]} options
 * @returns {Promise<string|null>}
 */
async function choose(title, options) {
  if ( !options.length ) return null;
  if ( options.length === 1 ) return options[0].id;
  const escape = foundry.utils.escapeHTML;
  const html = options.map(option => `<option value="${escape(option.id)}">${escape(option.label)}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title },
    content: `<label><select name="choice">${html}</select></label>`,
    buttons: [
      {
        action: "ok",
        label: game.i18n.localize("SOL.Roll.confirm"),
        default: true,
        callback: (_event, button) => button.form.elements.choice.value
      },
      {
        action: "cancel",
        label: game.i18n.localize("SOL.Roll.cancel")
      }
    ],
    rejectClose: false
  });
  if ( !result || result === "cancel" ) return null;
  return String(result);
}

/**
 * @param {object} state
 * @returns {Promise<boolean>}
 */
async function writeCombat(state) {
  if ( !game.user.isGM ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.gmOnly"));
    return false;
  }
  await game.settings.set(SYSTEM_ID, SETTING, normalizeCombat(state));
  return true;
}

/**
 * @returns {void}
 */
function refreshSpace() {
  const apps = foundry.applications?.instances;
  if ( !apps ) return;
  for ( const app of apps.values() ) {
    if ( app.id === "sol-space-combat" || app.document?.type === "ship" ) void app.render();
  }
}

/**
 * @param {number} value
 * @param {number} digits
 * @returns {string}
 */
function formatNumber(value, digits) {
  return Number(value).toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
