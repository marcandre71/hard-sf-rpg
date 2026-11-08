/**
 * Régressions de la relecture de 98ae298. Sans Foundry.
 * `node tests/review-98ae298.test.mjs`
 */
import assert from "node:assert/strict";
import { executeDodge, registerEsquive } from "../module/dice/esquive-play.mjs";
import { reactionOnTurnStart } from "../module/dice/esquive.mjs";

const S = "sol-nouvelle-ere";
function msg(id, flags) {
  return {
    id,
    flags: structuredClone(flags),
    getFlag(_scope, key) { return this.flags[key]; },
    async setFlag(_scope, key, value) { this.flags[key] = structuredClone(value); }
  };
}

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
  }
  querySelector() { return null; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener() {}
  remove() {}
}

let actor;
let card;
let roll;

function setup() {
  card = msg("m1", {
    type: "weapon",
    success: true,
    dr: 1,
    target: 45,
    damage: 6,
    location: "torso",
    dodge: {
      "Actor.d": { state: "rolling", roller: "player", launched: false, applied: false, name: "D" }
    }
  });
  roll = msg("r1", {
    die: 50,
    target: 40,
    esquiveFor: { attackMessageId: "m1", defenderUuid: "Actor.d" }
  });
  roll.author = { id: "player" };
  actor = {
    uuid: "Actor.d",
    name: "D",
    type: "character",
    items: [],
    effects: [],
    system: { characteristics: { ref: { value: 60 }, for: { value: 50 }, con: { value: 50 } } },
    reaction: {
      spent: false,
      turnNonce: 1,
      spentNonce: null,
      reserved: { messageId: "m1", senderId: "player" }
    },
    getFlag() { return structuredClone(this.reaction); },
    testUserPermission() { return true; },
    async setFlag(_scope, _key, value) { this.reaction = structuredClone(value); },
    async createEmbeddedDocuments(_type, records) {
      return records.map(data => {
        const item = {
          ...data,
          id: "injury",
          getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
        };
        actor.items.push(item);
        return item;
      });
    },
    async toggleStatusEffect(id) {
      actor.effects.push({ statuses: new Set([id]) });
    },
    async updateEmbeddedDocuments() {}
  };
  const contents = [card, roll];
  globalThis.game = {
    user: { id: "gm", isActiveGM: true, isGM: true },
    users: { get: id => ({ id, isGM: id === "gm" }), activeGM: null },
    messages: { contents, get: id => contents.find(entry => entry.id === id) ?? null },
    combat: { started: true, combatants: [{ actor }] },
    i18n: { localize: key => key, format: () => "" }
  };
  globalThis.foundry = {
    utils: {
      deepClone: value => structuredClone(value),
      fromUuid: async () => actor,
      fromUuidSync: () => actor,
      escapeHTML: value => value
    },
    applications: {
      handlebars: { renderTemplate: async () => "" },
      api: { DialogV2: { wait: async () => null } }
    }
  };
  globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
    async create(data) {
      const created = msg("summary", data.flags?.[S] ?? {});
      game.messages.contents.push(created);
      return created;
    }
  };
}

function actionsOf(root) {
  const actions = [];
  const walk = node => {
    if ( node?.dataset?.action ) actions.push(node.dataset.action);
    for ( const child of node?.children ?? [] ) walk(child);
  };
  walk(root);
  return actions;
}

setup();
let writes = 0;
actor.setFlag = async (_scope, _key, value) => {
  if ( ++writes === 2 ) throw new Error("dernier checkpoint acteur");
  actor.reaction = structuredClone(value);
};
await assert.rejects(executeDodge({
  action: "finish",
  messageId: "m1",
  defenderUuid: "Actor.d"
}, "player"));
assert.equal(card.flags.dodge["Actor.d"].state, "failed");
assert.ok(actor.reaction.reserved);
assert.equal(actor.reaction.spent, true);
const blocked = reactionOnTurnStart(actor.reaction, { round: 2, turn: 0, combatantId: "c1" });
assert.equal(blocked.state.spent, true);

const hooks = {};
globalThis.Hooks = { on: (key, fn) => { (hooks[key] ??= []).push(fn); } };
globalThis.HTMLElement = Element;
globalThis.document = { createElement: () => new Element() };
registerEsquive();
const root = new Element();
hooks.renderChatMessageHTML[0](card, root);
assert.equal(actionsOf(root).includes("sol-dodge-recover"), true);

actor.setFlag = async (_scope, _key, value) => { actor.reaction = structuredClone(value); };
const repaired = await executeDodge({
  action: "recover",
  messageId: "m1",
  defenderUuid: "Actor.d"
}, "gm");
assert.equal(repaired.ok, true);
assert.equal(card.flags.dodge["Actor.d"].state, "failed");
assert.equal(actor.reaction.spent, true);
assert.equal(actor.reaction.reserved, null);
const freed = reactionOnTurnStart(actor.reaction, { round: 2, turn: 0, combatantId: "c1" });
assert.equal(freed.state.spent, false);
assert.equal(freed.cleared, true);

globalThis.Combatant = class {};
globalThis.Combat = class {};
globalThis.foundry ??= { utils: {}, applications: {} };
foundry.applications ??= {};
foundry.applications.sidebar ??= {};
foundry.applications.sidebar.tabs ??= {};
foundry.applications.sidebar.tabs.CombatTracker ??= class {};
foundry.applications.api ??= { DialogV2: { wait: async () => null } };
foundry.applications.handlebars ??= { renderTemplate: async () => "" };
const { registerDamage } = await import("../module/dice/apply-damage.mjs");
setup();
card.flags.dodge["Actor.d"] = { state: "skipped", applied: false, name: "D" };
let injuries = 0;
let unauthorized = 0;
actor.createEmbeddedDocuments = async (_type, records) => {
  injuries += 1;
  if ( !game.user.isActiveGM ) unauthorized += 1;
  return records.map(data => {
    const item = {
      ...data,
      id: `i${injuries}`,
      getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
    };
    actor.items.push(item);
    return item;
  });
};
card.setFlag = async (_scope, key, value) => {
  card.flags[key] = structuredClone(value);
  game.user.isActiveGM = false;
};
registerDamage();
await globalThis.CONFIG.queries[`${S}.damage`]({
  messageId: "m1",
  defenderUuids: ["Actor.d"],
  zone: "torso"
}, { user: { id: "gm" } });
assert.equal(injuries, 0);
assert.equal(unauthorized, 0);

setup();
game.combat = null;
card.flags.dodge["Actor.d"] = { state: "skipped", applied: false, name: "D" };
let toggles = 0;
actor.createEmbeddedDocuments = async (_type, records) => records.map(data => {
  const item = {
    ...data,
    id: "injury",
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  actor.items.push(item);
  return item;
});
actor.toggleStatusEffect = async () => {
  toggles += 1;
  throw new Error("panne statut");
};
const payload = { messageId: "m1", defenderUuids: ["Actor.d"], zone: "torso" };
await globalThis.CONFIG.queries[`${S}.damage`](payload, { user: { id: "gm" } });
assert.equal(actor.items.length, 1);
assert.equal(toggles, 1);
assert.notEqual(card.flags.dodge["Actor.d"].applied, true);
actor.toggleStatusEffect = async id => {
  toggles += 1;
  actor.effects.push({ statuses: new Set([id]) });
};
await globalThis.CONFIG.queries[`${S}.damage`](payload, { user: { id: "gm" } });
assert.equal(actor.items.length, 1);
assert.equal(toggles, 2);
assert.equal(card.flags.dodge["Actor.d"].applied, true);
assert.equal(actor.effects.some(effect => effect.statuses.has(`${S}.bleeding`)), true);

setup();
game.combat = null;
actor.type = "synthetic";
delete actor.system.characteristics.ref;
card.flags.dodge["Actor.d"] = { state: "no-ref", applied: false, name: "D" };
let machineToggles = 0;
actor.toggleStatusEffect = async () => { machineToggles += 1; };
actor.createEmbeddedDocuments = async (_type, records) => records.map(data => {
  const item = {
    ...data,
    id: "injury-machine",
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  actor.items.push(item);
  return item;
});
await globalThis.CONFIG.queries[`${S}.damage`]({
  messageId: "m1",
  defenderUuids: ["Actor.d"],
  zone: "torso"
}, { user: { id: "gm" } });
assert.equal(machineToggles, 0);
assert.equal(actor.items.length, 1);

console.log("review-98ae298.test.mjs : ok");
