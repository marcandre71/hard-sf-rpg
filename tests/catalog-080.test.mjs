/**
 * Catalogue Machines. Le manifeste suit la version du système (0.9.7).
 * Le passage DataModel se fait si FOUNDRY_PATH est défini.
 * Décision Didier/Marc 31/10/2026. Réf. Équipement v0.3 §5.
 * Réf. Blessures et Séquelles v0.3 corrigée §3.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { characteristicFieldsFor } from "../module/config.mjs";
import { migrateDroneSource } from "../module/data/drone-migrate.mjs";
import { endurancePoints } from "../module/dice/derived.mjs";
import { seuilBlessure } from "../module/dice/damage.mjs";

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
const armors = load("armors");
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const sheet = readFileSync(new URL("../module/sheets/character-sheet.mjs", import.meta.url), "utf8");
const actorSheet = readFileSync(new URL("../templates/actor/actor-sheet.hbs", import.meta.url), "utf8");
const sol = readFileSync(new URL("../module/sol.mjs", import.meta.url), "utf8");

assert.equal(system.version, "0.9.7");
assert.equal(sol.includes("// Choix technique : numéro croissant pour la mise à jour Foundry"), true);
assert.equal(system.packs.some(pack => pack.name === "machines" && pack.type === "Actor"), true);

const expected = {
  Luciole: { for: 5, con: 15, per: 50, coo: 50, ada: 60, score: 35, endurance: 3, armor: "Coque de Luciole", rating: 1, sb: 1 },
  Crabe: { for: 45, con: 45, per: 40, coo: 45, ada: 55, score: 40, endurance: 9, armor: "Carapace de Crabe", rating: 3, sb: 5 },
  TATI: { for: 75, con: 65, per: 60, coo: 55, ada: 50, score: 50, endurance: 13, armor: "Blindage alu-titane oléophobe", rating: 4, sb: 7 }
};
assert.equal(machines.length, 3);
for (const drone of machines) {
  const row = expected[drone.name];
  assert.equal(drone.type, "drone", drone.name);
  assert.equal(drone.system.autonomousScore, row.score, drone.name);
  assert.equal(drone.system.endurance, row.endurance, drone.name);
  for (const key of ["for", "con", "per", "coo", "ada"]) {
    assert.equal(drone.system.characteristics[key].base, row[key], `${drone.name} ${key}`);
  }
  assert.equal(endurancePoints(row.con), row.endurance, `${drone.name} endurance`);
  assert.equal(seuilBlessure(row.for, row.con), row.sb, drone.name);
  assert.equal(drone.items.length, 1, drone.name);
  assert.equal(drone.items[0].name, row.armor, drone.name);
  assert.equal(drone.items[0].system.equipped, true, drone.name);
  for (const zone of ["head", "torso", "rightArm", "leftArm", "rightLeg", "leftLeg"]) {
    assert.equal(drone.items[0].system.protection[zone], row.rating, `${drone.name} ${zone}`);
  }
  const packArmor = armors.find(entry => entry._id === drone.items[0]._id);
  assert.equal(packArmor.name, row.armor, drone.name);
}
assert.equal(machines.find(entry => entry.name === "Luciole").items[0].system.pressurized, false);
assert.equal(machines.find(entry => entry.name === "Luciole").system.description.includes("TATI ou Crabe"), false);
assert.equal(machines.find(entry => entry.name === "TATI").system.description.includes("350 kg"), true);
assert.equal(gear.some(entry => ["Luciole", "Crabe", "TATI"].includes(entry.name)), false);
assert.equal(characteristicFieldsFor("npc").base.max, 100);
assert.equal(seuilBlessure(75, 65), 7);

const migrated = migrateDroneSource({ description: "<p>autre</p>" });
assert.equal("autonomousScore" in migrated, false);
assert.equal("characteristics" in migrated, false);

assert.equal(sheet.includes('key === "autonomousScore"'), true);
assert.equal(sheet.includes('type: "characteristic"'), true);
assert.equal(actorSheet.includes('data-characteristic="autonomousScore"'), true);
assert.equal(actorSheet.includes("sol-name-label"), false);

const table = [
  ["Lentille étoilée (optiques)", "InjLightMachine1", "head", "light", false, -10, false],
  ["Capteurs aveuglés (optiques)", "InjSeriousMach01", "head", "serious", true, -20, true],
  ["Court-circuit du bus logique (optiques)", "InjCritMach00001", "head", "critical", false, 0, true],
  ["Destruction du noyau logique (optiques)", "InjMortalMach001", "head", "mortal", false, 0, true],
  ["Servomoteur grippé (manipulateur droit)", "InjServoDroit001", "rightArm", "light", false, -10, false],
  ["Servomoteur grippé (manipulateur gauche)", "InjServoGauch001", "leftArm", "light", false, -10, false],
  ["Vérin hydraulique rompu (manipulateur droit)", "InjVerinDroit001", "rightArm", "serious", true, -20, true],
  ["Vérin hydraulique rompu (manipulateur gauche)", "InjVerinGauch001", "leftArm", "serious", true, -20, true],
  ["Bras arraché (manipulateur droit)", "InjBrasArrDt0001", "rightArm", "critical", false, 0, true],
  ["Bras arraché (manipulateur gauche)", "InjBrasArrGg0001", "leftArm", "critical", false, 0, true],
  ["Retour de haute tension (manipulateur droit)", "InjTensionDt0001", "rightArm", "mortal", false, 0, true],
  ["Retour de haute tension (manipulateur gauche)", "InjTensionGg0001", "leftArm", "mortal", false, 0, true],
  ["Carénage enfoncé (châssis)", "InjCarenage00001", "torso", "light", false, -10, false],
  ["Fuite de refroidissement ou batterie percée (châssis)", "InjFuiteChass001", "torso", "serious", true, -20, true],
  ["Brèche du microréacteur ou de la pile (châssis)", "InjBrecheReact01", "torso", "critical", false, 0, true],
  ["Désintégration du châssis", "InjDesintegrat01", "torso", "mortal", false, 0, true],
  ["Tuyère désaxée ou patte voilée (propulsion droite)", "InjTuyereDt00001", "rightLeg", "light", false, -10, false],
  ["Tuyère désaxée ou patte voilée (propulsion gauche)", "InjTuyereGg00001", "leftLeg", "light", false, -10, false],
  ["Propulseur coupé (propulsion droite)", "InjPropCoupDt001", "rightLeg", "serious", true, -20, true],
  ["Propulseur coupé (propulsion gauche)", "InjPropCoupGg001", "leftLeg", "serious", true, -20, true],
  ["Perte totale de propulsion (droite)", "InjPertePropDt01", "rightLeg", "critical", false, 0, true],
  ["Perte totale de propulsion (gauche)", "InjPertePropGg01", "leftLeg", "critical", false, 0, true],
  ["Explosion des réservoirs de poussée (droite)", "InjExplosDt00001", "rightLeg", "mortal", false, 0, true],
  ["Explosion des réservoirs de poussée (gauche)", "InjExplosGg00001", "leftLeg", "mortal", false, 0, true]
];
const byId = Object.fromEntries(injuries.map(entry => [entry._id, entry]));
const zones = new Set();
for (const [name, id, location, severity, bleeding, penalty, endOfOrder] of table) {
  const injury = byId[id];
  assert.equal(injury.name, name, id);
  assert.equal(injury.system.location, location, name);
  assert.equal(injury.system.severity, severity, name);
  assert.equal(injury.system.bleeding, bleeding, name);
  assert.equal(injury.system.penalty, penalty, name);
  assert.equal(injury.system.endOfOrder, endOfOrder, name);
  assert.equal(injury.system.treated, false, name);
  assert.equal(injury.system.activeRoundOne, false, name);
  assert.equal(injury.system.source, "", name);
  zones.add(location);
}
assert.equal(zones.size, 6);
const machineText = table.map(row => byId[row[1]].system.description).join("\n");
assert.equal(machineText.includes("[à compléter]"), false);
assert.equal(machineText.includes("Fuite (refroidissement ou batterie)."), true);
assert.equal(machineText.includes("Pas de jet d'explosion"), true);
assert.equal(machineText.includes("Elles ne deviennent pas des pièces de vaisseau."), true);
assert.equal(machineText.includes("Pas de détection automatique."), true);

const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
assert.equal(tester.includes("## 19. 0.9.5 Machines"), true);
assert.equal(tester.includes("En tant que MJ"), true);
assert.equal(tester.includes("## 21. 0.9.7 Blessures des machines"), true);

/**
 * @param {string} foundryRoot
 * @returns {Promise<boolean>}
 */
async function tryLoadFoundry(foundryRoot) {
  const candidates = [
    "dist/data/foundry.mjs",
    "common/server.mjs",
    "common/data/module.mjs",
    "common/data/fields.mjs",
    "client/data/module.mjs"
  ];
  for (const base of [foundryRoot, path.join(foundryRoot, "resources", "app")]) {
    for (const relative of candidates) {
      const file = path.join(base, relative);
      if (!existsSync(file)) continue;
      try {
        const mod = await import(pathToFileURL(file).href);
        if (mod?.data?.fields && mod?.abstract) globalThis.foundry ??= mod;
      } catch {
        // Le candidat suivant peut être le bon fichier.
      }
      if (globalThis.foundry?.abstract?.TypeDataModel) return true;
    }
  }
  return false;
}

const foundryRoot = process.env.FOUNDRY_PATH;
if (!foundryRoot) {
  console.log("catalog-080.test.mjs : DataModel ignoré (FOUNDRY_PATH absent).");
} else if (!(await tryLoadFoundry(foundryRoot))) {
  console.error("catalog-080.test.mjs : FOUNDRY_PATH défini, DataModel introuvable.");
  process.exit(1);
} else {
  globalThis.game = { i18n: { translations: {}, localize(key) { return key; } } };
  const { DroneData } = await import("../module/data/actors.mjs");
  for (const drone of machines) {
    const cleaned = DroneData.cleanData(structuredClone(drone.system));
    const model = new DroneData(cleaned);
    model.prepareDerivedData();
    assert.equal(model.validate({ strict: true }), true, drone.name);
    assert.equal(model.characteristics.for.value, expected[drone.name].for, drone.name);
  }
  const diff = { description: "<p>autre</p>" };
  const migratedModel = DroneData.migrateData(structuredClone(diff));
  const cleanedDiff = DroneData.cleanData(structuredClone(diff), { partial: true });
  assert.equal("autonomousScore" in migratedModel, false);
  assert.equal("characteristics" in migratedModel, false);
  assert.equal("autonomousScore" in cleanedDiff, false);
  assert.equal("characteristics" in cleanedDiff, false);
  console.log("catalog-080.test.mjs : DataModel ok.");
}

console.log("catalog-080.test.mjs : ok");
