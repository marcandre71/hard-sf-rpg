/**
 * Fiches d'essai 1.0.2. Sans Foundry.
 * `node tests/test-cast.test.mjs`
 */
import assert from "node:assert/strict";
import {
  FREE_TRAINING_CAP,
  FREE_TRAINING_POOL,
  HUMAN_BASES,
  HUMAN_SKILLS,
  NPC_BASE,
  POINT_BUY_CAP,
  SHEET_VERSION,
  SYNTHETIC_BASE,
  SYNTHETIC_ESQUIVE_TRAINING,
  TERRE_MODIFIERS,
  castProfile,
  esquiveWithoutReflex,
  freeTrainingSpent,
  isPristineTestActor,
  pointBuySpent,
  pointBuyValid,
  previewSheet,
  stackTraining
} from "../module/test-cast.mjs";
import { upgradeTestCast } from "../module/test-scene.mjs";
import { endurancePoints } from "../module/dice/derived.mjs";
import { seuilBlessure } from "../module/dice/damage.mjs";

assert.equal(pointBuyValid(HUMAN_BASES), true);
assert.equal(pointBuySpent(HUMAN_BASES), 130);
assert.equal(Math.max(...Object.values(HUMAN_BASES)) <= POINT_BUY_CAP, true);
assert.equal(freeTrainingSpent(HUMAN_SKILLS), FREE_TRAINING_POOL);
assert.equal(HUMAN_SKILLS.every(skill => skill.free <= FREE_TRAINING_CAP), true);
assert.equal(HUMAN_SKILLS.length >= 3 && HUMAN_SKILLS.length <= 5, true);
assert.equal(stackTraining(HUMAN_SKILLS[0]), 30);
assert.equal(stackTraining({ free: 40 }), 10);

const human = castProfile("pc-human");
const humanView = previewSheet(human.system);
assert.equal(humanView.characteristics.for.value, 55);
assert.equal(humanView.characteristics.con.value, 55);
assert.equal(humanView.characteristics.ada.value, 15);
assert.equal(humanView.characteristics.coo.value, 50);
assert.equal(humanView.sb, seuilBlessure(55, 55));
assert.equal(humanView.sb, 6);
assert.equal(humanView.endurance, endurancePoints(55));
assert.equal(humanView.endurance, 11);
assert.equal(humanView.sangFroid, 5);
assert.equal(humanView.gTolerance, 3);
assert.equal(TERRE_MODIFIERS.con, 10);

const npc = castProfile("npc-armed");
const npcView = previewSheet(npc.system);
assert.equal(Object.values(npc.system.characteristics).every(block => block.base === NPC_BASE), true);
assert.equal(npcView.characteristics.for.value, 40);
assert.equal(npcView.characteristics.coo.value, 35);
assert.equal(npcView.sb < humanView.sb, true);
const npcShot = npc.items.find(item => item.name === "Armes de poing");
assert.equal(npcShot.training, 20);

const synthetic = castProfile("pc-synthetic");
assert.equal(synthetic.system.characteristics.for.base, SYNTHETIC_BASE);
assert.equal(synthetic.system.characteristics.coo, undefined);
assert.equal(esquiveWithoutReflex(SYNTHETIC_ESQUIVE_TRAINING), 20);
const names = synthetic.items.map(item => item.name);
assert.equal(names.includes("Esquive"), true);
assert.equal(names.includes("Terre"), false);
assert.equal(synthetic.items.length >= 3 && synthetic.items.length <= 5, true);

const pristine = {
  name: "Humain d'essai",
  system: { characteristics: { for: { base: 25, origin: 0, advance: 0, temp: 0 } } },
  items: [{ name: "Pistolet de bord 9 mm basse vélocité", type: "weapon" }]
};
assert.equal(isPristineTestActor(pristine, "pc-human"), true);
const edited = structuredClone(pristine);
edited.system.characteristics.for.base = 40;
assert.equal(isPristineTestActor(edited, "pc-human"), false);

function memory(actors) {
  const notes = [];
  const calls = [];
  const api = {
    actors: async () => actors,
    async readDocument() {
      return null;
    },
    async updateSystem(actor, system) {
      calls.push("update");
      actor.system = { ...(actor.system ?? {}), ...system };
    },
    async setSheetMark(actor, mark) {
      actor.flags = { ...(actor.flags ?? {}), "sol-nouvelle-ere": { ...(actor.flags?.["sol-nouvelle-ere"] ?? {}), testSheet: mark } };
    },
    async setTraining(actor, name, training) {
      const item = actor.items.find(entry => entry.name === name);
      item.system = { ...(item.system ?? {}), training };
    },
    async addItems(actor, items) {
      for ( const item of items ) actor.items.push({ name: item.name, type: item.type, system: item.system });
    },
    async notify(level, key, data) {
      notes.push({ level, key, data });
    }
  };
  return { notes, calls, api };
}

{
  const actor = {
    id: "h",
    name: "Humain d'essai",
    flags: { "sol-nouvelle-ere": { testRole: "pc-human" } },
    system: { characteristics: { for: { base: 40, origin: 0, advance: 0, temp: 0 } } },
    items: []
  };
  const { notes, calls, api } = memory([actor]);
  const result = await upgradeTestCast(api, { isActiveGM: true, version: 0 });
  assert.equal(result.results.find(entry => entry.role === "pc-human").action, "skip");
  assert.equal(calls.includes("update"), false);
  assert.equal(actor.system.characteristics.for.base, 40);
  assert.equal(notes.some(note => note.key === "kept"), true);
  const again = await upgradeTestCast(api, { isActiveGM: true, version: SHEET_VERSION });
  assert.equal(again.status, "skipped");
  assert.equal(again.reason, "already");
}

{
  const actor = {
    id: "s",
    name: "Synthétique d'essai",
    flags: { "sol-nouvelle-ere": { testRole: "pc-synthetic" } },
    system: { characteristics: { for: { base: 25, origin: 0, advance: 0, temp: 0 } } },
    items: [{ name: "Esquive", type: "skill", system: { training: 0 } }]
  };
  const { calls, api } = memory([actor]);
  const player = await upgradeTestCast(api, { isActiveGM: false, version: 0 });
  assert.equal(player.status, "skipped");
  assert.equal(player.reason, "not-active");
  assert.equal(calls.length, 0);
  const filled = await upgradeTestCast(api, { isActiveGM: true, version: 0 });
  assert.equal(filled.results[0].action, "fill");
  assert.equal(actor.system.characteristics.for.base, 40);
  assert.equal(actor.items.find(item => item.name === "Esquive").system.training, 20);
  const names = actor.items.map(item => item.name);
  assert.equal(new Set(names).size, names.length);
  const second = await upgradeTestCast(api, { isActiveGM: true, version: 0 });
  assert.equal(second.results[0].action, "keep");
  assert.equal(actor.items.filter(item => item.name === "Esquive").length, 1);
}

console.log("test-cast.test.mjs : ok");
