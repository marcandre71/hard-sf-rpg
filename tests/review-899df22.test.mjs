/**
 * Deux gardes après attente. Sans Foundry.
 * `node tests/review-899df22.test.mjs`
 */
const S = "sol-nouvelle-ere";

globalThis.Combatant = class {};
globalThis.Combat = class {};
globalThis.foundry = {
  utils: {
    deepClone: value => structuredClone(value),
    escapeHTML: value => value,
    fromUuid: async uuid => (uuid === "Actor.d" ? actor : null)
  },
  applications: {
    sidebar: { tabs: { CombatTracker: class {} } },
    api: { DialogV2: { wait: async () => null } },
    handlebars: { renderTemplate: async () => "" }
  }
};
globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
globalThis.ChatMessage = { getSpeaker: () => ({}), async create() { return { id: "sum" }; } };
globalThis.Hooks = { on() {} };

globalThis.CONFIG = { statusEffects: {}, queries: {} };
const { registerDamage } = await import("../module/dice/apply-damage.mjs");

let actor;
let card;

function message(id, flags) {
  return {
    id,
    flags: structuredClone(flags),
    getFlag(_scope, key) { return this.flags[key]; },
    async setFlag(_scope, key, value) { this.flags[key] = structuredClone(value); }
  };
}

function setup() {
  card = message("m1", {
    type: "weapon",
    success: true,
    dr: 1,
    target: 45,
    damage: 20,
    location: "torso",
    dodge: { "Actor.d": { state: "skipped", applied: false, name: "D" } }
  });
  const armor = {
    id: "arm1",
    type: "armor",
    system: {
      equipped: true,
      pressurized: true,
      protection: { torso: 0 },
      breachThreshold: 1,
      sealState: "intact"
    }
  };
  actor = {
    uuid: "Actor.d",
    name: "D",
    type: "character",
    effects: [],
    items: [armor],
    system: { characteristics: { for: { value: 50 }, con: { value: 50 } } },
    testUserPermission() { return true; },
    async updateEmbeddedDocuments() {},
    async createEmbeddedDocuments(_type, records) {
      return records.map((data, index) => {
        const item = {
          ...data,
          id: `inj${index}`,
          getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
        };
        actor.items.push(item);
        return item;
      });
    },
    async toggleStatusEffect() {}
  };
  actor.items.get = id => actor.items.find(item => item.id === id);
  actor.items.find = Array.prototype.find.bind(actor.items);
  actor.items.filter = Array.prototype.filter.bind(actor.items);
  const contents = [card];
  globalThis.game = {
    user: { id: "gm", isActiveGM: true, isGM: true },
    users: { get: id => ({ id, isGM: id === "gm" }) },
    messages: { contents, get: id => contents.find(entry => entry.id === id) ?? null },
    combat: null,
    i18n: { localize: key => key, format: () => "" }
  };
  foundry.utils.fromUuid = async () => actor;
}

setup();
registerDamage();
let suitAfterBreach = 0;
actor.updateEmbeddedDocuments = async () => { game.user.isActiveGM = false; };
actor.toggleStatusEffect = async id => {
  if ( id === `${S}.suitBreach` ) suitAfterBreach += 1;
};
await globalThis.CONFIG.queries[`${S}.damage`]({
  messageId: "m1",
  defenderUuids: ["Actor.d"],
  zone: "torso"
}, { user: { id: "gm" } });
if ( suitAfterBreach !== 0 ) throw new Error("statut de brèche envoyé après perte du MJ");

setup();
let summaries = 0;
foundry.applications.handlebars.renderTemplate = async () => {
  game.user.isActiveGM = false;
  return "";
};
ChatMessage.create = async () => { summaries += 1; return { id: "sum" }; };
await globalThis.CONFIG.queries[`${S}.damage`]({
  messageId: "m1",
  defenderUuids: ["Actor.d"],
  zone: "torso"
}, { user: { id: "gm" } });
if ( summaries !== 0 ) throw new Error("récapitulatif créé après perte du MJ");

console.log("review-899df22.test.mjs : ok");
