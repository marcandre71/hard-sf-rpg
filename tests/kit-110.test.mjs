/**
 * Kit joueurs 1.1.0. Sans Foundry.
 * `node tests/kit-110.test.mjs`
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { KIT_GM_PACKS, KIT_IMPORTS, kitImportPlan, shouldImportKit } from "../module/kit-import.mjs";

const root = new URL("../", import.meta.url);

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, root), "utf8"));
}

function pack(name) {
  const dir = new URL(`../packs/_source/${name}/`, import.meta.url);
  return readdirSync(dir).filter(file => file.endsWith(".json")).map(file => readJson(`packs/_source/${name}/${file}`));
}

const pregens = pack("kit-pregens");
const scenes = pack("kit-scenes");
const journals = pack("kit-journals");
const names = pregens.map(actor => actor.name).sort();
assert.deepEqual(names, ["Anouk Sall", "Bosco", "Dr Inès Okafor-Lund", "Joachim Ferraz", "Kesi Varga", "Tariq Benali"]);
assert.equal(scenes.length, 5);
assert.deepEqual(scenes.map(scene => scene.background.src).sort(), [
  "systems/sol-nouvelle-ere/assets/kit/01-ceres.webp",
  "systems/sol-nouvelle-ere/assets/kit/02-rade.webp",
  "systems/sol-nouvelle-ere/assets/kit/03-bouee.webp",
  "systems/sol-nouvelle-ere/assets/kit/04-hirondelle.webp",
  "systems/sol-nouvelle-ere/assets/kit/05-fortune.webp"
]);

const catalogs = {};
for ( const name of ["skills", "weapons", "armors", "gear", "software", "substances", "origins", "backgrounds", "professions"] ) {
  catalogs[name] = new Set(pack(name).map(doc => doc.name));
}
const typePack = { skill: "skills", weapon: "weapons", armor: "armors", gear: "gear", software: "software", substance: "substances", origin: "origins", background: "backgrounds", profession: "professions" };
for ( const actor of pregens ) {
  assert.equal(actor._id.length, 16, actor.name);
  assert.equal(actor.ownership.default, 2, actor.name);
  assert.equal(actor.flags["sol-nouvelle-ere"].kit, "pregen");
  const joined = JSON.stringify(actor);
  assert.equal(joined.includes("secret de l'Atlas"), false, actor.name);
  assert.equal(joined.includes("Note pour le meneur"), false, actor.name);
  for ( const item of actor.items ) {
    const bucket = typePack[item.type];
    assert.equal(catalogs[bucket].has(item.name), true, `${actor.name} : ${item.name}`);
    assert.equal(item._id.length, 16);
  }
}
const joachim = pregens.find(actor => actor.name === "Joachim Ferraz");
assert.equal(joachim.system.characteristics.con.base, 40);
assert.equal(joachim.system.characteristics.con.origin, 10);
assert.equal(joachim.system.radiation.starting, 180);
assert.equal(joachim.system.radiation.acute, null);
assert.equal(joachim.items.some(item => item.name === "Armure de pont"), false);

for ( const scene of scenes ) {
  assert.equal(scene.grid.type, 1);
  assert.equal(scene.flags["sol-nouvelle-ere"].note.includes("sans échelle"), true, scene.name);
  assert.equal(JSON.stringify(scene).includes("Pia"), false);
  assert.equal(scene.background.src.includes("MJ"), false);
}
for ( const journal of journals ) {
  assert.equal(journal.ownership.default, 2, journal.name);
  const text = JSON.stringify(journal);
  assert.equal(text.includes("Quand la donner"), false, journal.name);
  assert.equal(text.includes("Note pour le meneur"), false, journal.name);
  assert.equal(text.includes("secret de l'Atlas"), false, journal.name);
}
const aides = journals.find(journal => journal.name === "Aides de jeu");
assert.equal(aides.pages.length >= 9, true);

assert.equal(shouldImportKit({ isActiveGM: false }), false);
assert.equal(shouldImportKit({ isActiveGM: true }), true);
assert.equal(KIT_GM_PACKS.length, 0);
const plan = kitImportPlan([{ kitId: "a" }, { kitId: "b" }], ["a"]);
assert.deepEqual(plan.map(entry => entry.kitId), ["b"]);
assert.equal(KIT_IMPORTS.map(entry => entry.pack).join(), "kit-pregens,kit-scenes,kit-journals");

const system = readJson("system.json");
assert.equal(system.version, "1.1.1");
for ( const name of ["kit-pregens", "kit-scenes", "kit-journals"] ) {
  assert.equal(system.packs.some(pack => pack.name === name), true, name);
}
const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
assert.equal(tester.includes("## 27. 1.1.0 Kit joueurs"), true);
const source = readFileSync(new URL("../module/kit-import.mjs", import.meta.url), "utf8");
assert.equal(source.includes("isActiveGM"), true);

console.log("kit-110.test.mjs : ok");
