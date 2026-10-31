/**
 * Catalogues 0.9.4. Sans Foundry.
 * Réf. Blessures v0.3, Origines v0.3, Bible v0.1 §6, Vaisseaux v0.1 §8.
 * Décision Marc 30/10/2026.
 * Décision Didier/Marc 31/10/2026.
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

const injuries = load("injuries");
const sequels = load("sequels");
const origins = load("origins");
const universe = load("universe");
const ships = load("ships");

assert.equal(injuries.length, 32, "8 déjà là + 24 blessures nommées");
const kept = ["InjLightHuman001", "InjSeriousHuman1", "InjCritHuman0001", "InjMortalHuman01", "InjLightMachine1", "InjSeriousMach01", "InjCritMach00001", "InjMortalMach001"];
for (const id of kept) assert.equal(injuries.some(entry => entry._id === id), true, id);
assert.equal(injuries.some(entry => entry.name.includes("Lentille")), false, "pas la table des machines");
const named = injuries.find(entry => entry.name === "Contusion faciale, arcade ouverte");
assert.equal(named.system.location, "head");
assert.equal(named.system.severity, "light");
assert.equal(named.system.penalty, -10);
assert.equal(named.system.bleeding, false);
assert.equal(named.system.endOfOrder, false);
const mortal = injuries.find(entry => entry.name === "Cœur ou aorte déchirés");
assert.equal(mortal.system.severity, "mortal");
assert.equal(mortal.system.endOfOrder, true);
for (const machine of injuries.filter(entry => entry.name.startsWith("Blessure de machine"))) {
  assert.equal(machine.system.description.includes("À confirmer par Marc"), true, machine.name);
}

assert.equal(sequels.length, 8);
for (const sequel of sequels) {
  assert.equal(sequel.system.category, "radiation", sequel.name);
  assert.equal(sequel.system.permanent, true, sequel.name);
  assert.equal(sequel.system.description.includes("[à compléter]"), false, sequel.name);
  assert.equal(sequel.system.description.includes("Pas de dé"), true, sequel.name);
  assert.equal(sequel.system.effect.includes("[à compléter]"), false, sequel.name);
}
const cancer = sequels.find(entry => entry.name === "Cancer radio-induit");
assert.equal(cancer.system.effect.includes("se déclare plus tard"), true);
assert.equal(cancer.system.effect.includes("Pas d'effet immédiat"), true);
const cognitive = sequels.find(entry => entry.name === "Troubles cognitifs radio-induits");
assert.equal(cognitive.system.effect.includes("−10"), true);
assert.equal(cognitive.system.effect.includes("INT"), true);
assert.equal(cognitive.system.effect.includes("pas de malus automatique"), true);
const fragility = sequels.find(entry => entry.name === "Fragilité cellulaire acquise");
assert.equal(fragility.system.effect.includes("150 mSv"), true);
assert.equal(fragility.system.effect.includes("divisé par deux"), false);

const habitat = origins.find(entry => entry._id === "shzqbEn7U7HEOdXY");
assert.equal(habitat.name, "Habitat tournant (station)");
assert.equal(habitat.system.description, "<p>0,3 à 0,7 g</p>");
assert.equal(habitat.system.characteristicModifiers, "ADA +10, PER +5, FOR -5, CON -5");
const earth = origins.find(entry => entry.name === "Terre");
assert.equal(earth._id, "ZqmsYPaRoPKGuono");
assert.equal(earth.system.gToleranceModifier, 1);
assert.equal(origins.length, 6);

const factions = universe.find(entry => entry.name === "Factions");
assert.equal(factions.pages.length, 6);
assert.equal(factions.pages[0].text.content.includes("Traité de Genève de 1981"), true);
assert.equal(factions.pages[0].text.content.includes("v0.4"), false);
const glossary = universe.find(entry => entry.name === "Glossaire");
assert.equal(glossary.pages.length, 1);
assert.equal(glossary.pages[0].text.content.includes("Adaptation spatiale"), true);
assert.equal(glossary.pages[0].text.content.includes("Réf. Glossaire v0.2"), true);
assert.equal(glossary.pages[0].text.content.includes("Glossaire (v0.2)"), true);

const patrol = ships.find(entry => entry.name === "Patrouilleur de la Veille");
const cargo = ships.find(entry => entry.name === "Cargo");
const fortune = ships.find(entry => entry.name === "Petite Fortune");
assert.equal(patrol.system.shipType, "watchPatrol");
assert.equal(patrol.system.notes.includes("À confirmer par Marc"), true);
assert.equal(patrol.system.mass.dry, 80);
assert.equal(patrol.system.propulsion.acceleration, 50);
assert.equal(patrol.system.propulsion.deltaV.value, 3.6);
assert.equal(patrol.system.propulsion.deltaV.max, 3.6);
const patrolEngine = patrol.items.find(entry => entry.name.startsWith("Moteur nucléaire"));
assert.equal(patrolEngine.system.effects.includes("Isp ~350 à 380 s"), true);
assert.equal(patrolEngine.system.effects.includes("Décision Marc 21/10/2026"), true);
assert.equal(patrolEngine.system.effects.includes("Réf. Vaisseaux v0.1 §8"), true);
assert.equal(patrolEngine.system.effects.includes("113 kN"), true);
assert.equal(patrolEngine.system.effects.includes("50 milli-g pour 230 t"), true);
assert.equal(patrolEngine.system.effects.includes("21 milli-g"), false);
assert.equal(patrolEngine.system.effects.includes("2,9 h"), false);
assert.equal(patrolEngine.system.effects.includes("provisoire"), true);
assert.equal(patrol.system.mass.reaction, 150);
assert.equal(patrol.system.notes.includes("provisoire jusqu'à la 1.0"), true);
const heavy = patrol.items.find(entry => entry.name.startsWith("Laser lourd"));
assert.equal(heavy.system.weapon.class, "laser");
assert.equal(heavy.system.weapon.damage, 11);
assert.equal(cargo.system.shipType, "slowPlasmaFreighter");
assert.equal(cargo.system.notes.includes("À confirmer par Marc"), true);
assert.equal(cargo.system.propulsion.type, "Propulseur à plasma (cargo lent)");
assert.equal(cargo.system.notes.includes("provisoire, copie de la Petite Fortune"), true);
assert.equal(cargo.system.mass.reaction, 150);
assert.equal(cargo.system.propulsion.acceleration, 0.05);
assert.equal(cargo.system.propulsion.deltaV.value, 3.6);
assert.equal(cargo.system.propulsion.deltaV.max, 3.6);
assert.equal(cargo.items.find(entry => entry.system.category === "propulsion").name, "Propulseur à plasma (cargo lent)");
assert.equal(fortune.system.propulsion.acceleration, 21);
assert.equal(fortune.system.propulsion.deltaV.value, 3.6);
assert.equal(fortune.items.length, 13);
assert.equal(fortune.system.sections.bow.armor.value, 8);
assert.equal(fortune.items.some(entry => entry.name.startsWith("Laser de forage")), true);

console.log("catalog-093.test.mjs : ok");
