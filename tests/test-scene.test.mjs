/**
 * Scène de test 1.0.1. Sans Foundry : un monde double.
 * `node tests/test-scene.test.mjs`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SCENE_NAME,
  TEST_CAST,
  findTestActor,
  runTestScene,
  scenePlan,
  shouldRunTestScene,
  testSceneData
} from "../module/test-scene.mjs";

const fr = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));

const PACKS = {
  machines: [{ name: "Crabe", type: "drone", system: { description: "<p>Crabe du compendium.</p>" } }],
  ships: [
    { name: "Petite Fortune", type: "ship", system: { shipType: "prospector" } },
    { name: "Patrouilleur de la Veille", type: "ship", system: { shipType: "watchPatrol" } }
  ],
  weapons: [{
    name: "Pistolet de bord 9 mm basse vélocité",
    type: "weapon",
    system: { ammo: { value: 15, max: 15 }, equipped: false }
  }],
  armors: [{
    name: "Combinaison souple « Peau de quart »",
    type: "armor",
    system: { equipped: true }
  }],
  skills: [{
    name: "Esquive",
    type: "skill",
    system: { characteristic: "ref", training: 0 }
  }]
};

/**
 * @param {{ packs?: object, actors?: object[], scenes?: object[], journals?: object[] }} [seed]
 * @returns {{ state: object, api: object }}
 */
function world(seed = {}) {
  const state = {
    actors: seed.actors ?? [],
    scenes: seed.scenes ?? [],
    journals: seed.journals ?? [],
    notes: [],
    active: null,
    packs: seed.packs === undefined ? PACKS : seed.packs
  };
  let n = 0;
  const api = {
    actors: async () => state.actors,
    scenes: async () => state.scenes,
    journals: async () => state.journals,
    async readDocument(pack, name) {
      const list = state.packs[pack];
      if ( !list ) return null;
      return list.find(entry => entry.name === name) ?? null;
    },
    async createActor(data) {
      const actor = {
        id: `a${++n}`,
        name: data.name,
        type: data.type,
        flags: data.flags,
        system: data.system,
        items: (data.items ?? []).map(item => ({ name: item.name, type: item.type }))
      };
      state.actors.push(actor);
      return actor;
    },
    async setRole(actor, role) {
      actor.flags = {
        ...(actor.flags ?? {}),
        "sol-nouvelle-ere": { ...(actor.flags?.["sol-nouvelle-ere"] ?? {}), testRole: role }
      };
    },
    async addItems(actor, items) {
      for ( const item of items ) actor.items.push({ name: item.name, type: item.type, equipped: item.system?.equipped === true });
    },
    async deleteScene(id) {
      state.scenes = state.scenes.filter(scene => scene.id !== id);
    },
    async createScene(data) {
      const scene = { id: `s${++n}`, tokenCount: 0, tokens: [], ...data };
      state.scenes.push(scene);
      return scene;
    },
    async activateScene(scene) {
      state.active = scene.id;
    },
    async placeTokens(scene, tokens) {
      scene.tokens = tokens;
      scene.tokenCount = tokens.length;
    },
    async createJournal(data) {
      const journal = { id: `j${++n}`, html: data.pages[0].text.content, ...data };
      state.journals.push(journal);
      return journal;
    },
    async updateJournal(journal, html) {
      journal.html = html;
    },
    async notify(level, key, data) {
      state.notes.push({ level, key, data });
    }
  };
  return { state, api };
}

/**
 * @param {object} api
 * @param {object} [extra]
 * @returns {Promise<object>}
 */
function run(api, extra = {}) {
  return runTestScene(api, {
    isActiveGM: true,
    created: false,
    force: false,
    journalHtml: fr.SOL.TestScene.journal,
    ...extra
  });
}

const options = { isActiveGM: true, created: false, force: false, journalHtml: fr.SOL.TestScene.journal };

const first = await (async () => {
  const { state, api } = world();
  const result = await run(api);
  assert.equal(result.status, "done");
  assert.equal(state.actors.length, 6);
  assert.equal(state.scenes.length, 1);
  assert.equal(state.scenes[0].name, SCENE_NAME);
  assert.equal(state.scenes[0].backgroundColor, "#141c24");
  assert.equal(state.scenes[0].grid.type, 1);
  assert.equal(JSON.stringify(state.scenes[0]).includes("http"), false);
  assert.equal(state.scenes[0].tokenCount, 6);
  assert.equal(state.active, state.scenes[0].id);
  assert.equal(state.journals.length, 1);
  assert.equal(state.journals[0].name, "Lisez-moi test");
  assert.equal(state.journals[0].html.includes("https://github.com/marcandre71/hard-sf-rpg"), true);
  const human = state.actors.find(actor => actor.name === "Humain d'essai");
  assert.equal(human.system.characteristics.for.base, 50);
  assert.equal(human.system.characteristics.for.origin, 5);
  assert.equal(human.system.characteristics.ada.origin, -10);
  assert.equal(human.items.some(item => item.name.includes("Pistolet") && item.equipped === true), true);
  assert.equal(human.items.some(item => item.name.includes("Peau de quart")), true);
  const synthetic = state.actors.find(actor => actor.name === "Synthétique d'essai");
  assert.equal(synthetic.items.some(item => item.name === "Esquive"), true);
  assert.equal(synthetic.flags["sol-nouvelle-ere"].testRole, "pc-synthetic");
  const byRole = Object.fromEntries(result.origins.map(entry => [entry.role, entry.source]));
  assert.equal(byRole["pc-human"], "fallback");
  assert.equal(byRole["pc-synthetic"], "fallback");
  assert.equal(byRole["npc-armed"], "fallback");
  assert.equal(byRole["drone-crabe"], "compendium");
  assert.equal(byRole["ship-player"], "compendium");
  assert.equal(byRole["ship-patrol"], "compendium");
  const again = await run(api, { created: true });
  assert.equal(again.status, "skipped");
  assert.equal(again.reason, "already");
  assert.equal(state.actors.length, 6);
  assert.equal(state.scenes.length, 1);
  return state;
})();

{
  const { state, api } = world();
  const result = await run(api, { isActiveGM: false });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "not-active");
  assert.equal(state.actors.length, 0);
  assert.equal(state.scenes.length, 0);
  assert.equal(state.notes.length, 0);
  assert.equal(shouldRunTestScene({ isActiveGM: false, created: false, force: true }), false);
}

{
  const existing = {
    id: "crabe-deja",
    name: "Crabe",
    flags: {},
    items: []
  };
  const { state, api } = world({ actors: [existing] });
  const result = await run(api);
  assert.equal(result.status, "done");
  assert.equal(state.actors.filter(actor => actor.name === "Crabe").length, 1);
  assert.equal(state.actors.find(actor => actor.name === "Crabe").id, "crabe-deja");
  assert.equal(existing.flags["sol-nouvelle-ere"].testRole, "drone-crabe");
  const crabe = result.origins.find(entry => entry.role === "drone-crabe");
  assert.equal(crabe.reused, true);
  assert.equal(crabe.source, "world");
}

{
  const { state, api } = world();
  await run(api);
  const before = state.actors.map(actor => actor.id).join();
  const pistol = state.actors.find(actor => actor.name === "Humain d'essai").items.filter(item => item.name.includes("Pistolet")).length;
  const result = await run(api, { created: true, force: true });
  assert.equal(result.status, "done");
  assert.equal(state.actors.length, 6);
  assert.equal(state.actors.map(actor => actor.id).join(), before);
  assert.equal(state.scenes.length, 1);
  assert.equal(state.scenes[0].tokenCount, 6);
  assert.equal(state.journals.length, 1);
  assert.equal(state.actors.find(actor => actor.name === "Humain d'essai").items.filter(item => item.name.includes("Pistolet")).length, pistol);
}

{
  const { state, api } = world({ packs: {} });
  const result = await run(api);
  assert.equal(result.status, "done");
  assert.equal(state.actors.length, 6);
  assert.equal(result.origins.every(entry => entry.source === "fallback"), true);
  assert.equal(state.notes.some(note => note.key === "missingPack" && note.data.pack === "machines"), true);
  assert.equal(state.notes.some(note => note.key === "itemFallback" && note.data.name === "Esquive"), true);
  const synthetic = state.actors.find(actor => actor.name === "Synthétique d'essai");
  assert.equal(synthetic.items.some(item => item.name === "Esquive"), true);
}

{
  const { state, api } = world();
  state.scenes.push({ id: "vide", name: SCENE_NAME, flags: { "sol-nouvelle-ere": { testScene: true } }, tokenCount: 0 });
  const result = await run(api);
  assert.equal(result.status, "done");
  assert.equal(state.scenes.length, 1);
  assert.equal(state.scenes[0].id, "vide");
  assert.equal(state.scenes[0].tokenCount, 6);
}

{
  const plan = scenePlan([{ id: "s", name: "Autre", flags: { "sol-nouvelle-ere": { testScene: true } }, tokenCount: 3 }], SCENE_NAME, true);
  assert.deepEqual(plan.deleteIds, ["s"]);
  assert.equal(plan.create, true);
  const kept = scenePlan([{ id: "s", name: SCENE_NAME, tokenCount: 2 }], SCENE_NAME, false);
  assert.equal(kept.create, false);
  assert.equal(kept.placeTokens, false);
}

{
  assert.equal(findTestActor([{ name: "Autre", flags: { "sol-nouvelle-ere": { testRole: "pc-human" } } }], TEST_CAST[0]).name, "Autre");
  const scene = testSceneData({ name: SCENE_NAME, journalId: "j1" });
  assert.equal(scene.journal, "j1");
  assert.equal(scene.flags["sol-nouvelle-ere"].testScene, true);
}

{
  const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
  assert.equal(tester.includes("## 25. 1.0.1 Scène de test"), true);
  for ( const key of ["recreate", "recreateHint", "done", "failed", "missingPack", "missingItem", "itemFallback", "kept", "journal"] ) {
    assert.equal(typeof fr.SOL.TestScene[key], "string", key);
  }
  assert.equal(fr.SOL.TestScene.journal.includes("TESTER.md#22-098-esquive-personnelle"), true);
  const foundry = readFileSync(new URL("../module/test-scene-foundry.mjs", import.meta.url), "utf8");
  assert.equal(foundry.includes("isActiveGM"), true);
  assert.equal(foundry.includes("Hooks.once(\"ready\""), true);
  assert.equal(foundry.includes(".activate()"), true);
  assert.equal(foundry.includes("restricted"), false);
}

assert.equal(first.actors.length, 6);
console.log("test-scene.test.mjs : ok", options.isActiveGM);
