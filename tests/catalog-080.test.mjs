/**
 * Catalogue 0.8.0. Sans Foundry.
 * Décision Marc 31/10/2026. Réf. LdR v0.2 §7 et §15.
 * Réf. Atouts v0.3 §3, Modules v0.3 §7, Équipement v0.3 §5.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const root = new URL("../packs/_source/", import.meta.url);

/**
 * @param {string} pack
 * @returns {object[]}
 */
function load(pack) {
  const dir = new URL(`${pack}/`, root);
  return readdirSync(dir)
    .filter(name => name.endsWith(".json"))
    .map(name => JSON.parse(readFileSync(new URL(name, dir), "utf8")));
}

const machines = load("machines");
const gear = load("gear");
const injuries = load("injuries");
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.equal(system.version, "0.8.0");
assert.equal(system.packs.some(pack => pack.name === "machines" && pack.type === "Actor"), true);

assert.equal(machines.length, 3);
for (const drone of machines) {
  assert.equal(drone.type, "drone", drone.name);
  assert.equal(drone._id.length, 16, drone.name);
  assert.equal("characteristics" in drone.system, false, drone.name);
  assert.equal(drone.system.description.includes("[à compléter]"), true, drone.name);
  assert.equal(drone.system.description.includes("Symbiose"), true, drone.name);
}
const byName = Object.fromEntries(machines.map(entry => [entry.name, entry]));
assert.equal(byName.TATI.system.description.includes("Équipement v0.3 §5"), true);
assert.equal(byName.TATI.system.description.includes("Masse : [à compléter]"), true);
assert.equal(byName.Crabe.system.description.includes("TATI ou Crabe"), true);
assert.equal(byName.Luciole.system.description.includes("TATI ou Crabe"), false);
assert.equal(gear.some(entry => ["Luciole", "Crabe", "TATI"].includes(entry.name)), false);

const machineInjuries = injuries.filter(entry => entry.name.startsWith("Blessure de machine"));
assert.equal(machineInjuries.length, 4);
for (const injury of machineInjuries) {
  assert.equal(injury.system.description.includes("[à compléter]"), true, injury.name);
  assert.equal(injury.system.description.includes("À confirmer par Marc"), true, injury.name);
}
assert.equal(injuries.some(entry => entry.name.includes("Lentille")), false);

const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
assert.equal(tester.includes("## 19. 0.8.0 Machines"), true);
assert.equal(tester.includes("donnez-lui le droit **Observateur**"), true);

console.log("catalog-080.test.mjs : ok");
