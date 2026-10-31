/**
 * Catalogues 0.9.2. Sans Foundry.
 * Réf. Atouts v0.3, Augmentations v0.3, Logiciels v0.3, Substances v0.3.
 * Décision Marc 30/10/2026. Doses pleines : Décision Marc 31/10/2026.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { SOL } from "../module/config.mjs";
import { applyFullDoses, fullDosesValue } from "../module/data/substance-doses.mjs";
import { administrationReading } from "../module/sheets/administration-label.mjs";

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

const talents = load("talents");
const augmentations = load("augmentations");
const software = load("software");
const substances = load("substances");

assert.equal(talents.length, 25, "25 atouts");
assert.equal(augmentations.length, 14, "14 augmentations");
assert.equal(software.length, 15, "15 logiciels");
assert.equal(substances.length, 15, "15 substances");

const domains = new Set(Object.keys(SOL.talentDomains));
for (const talent of talents) {
  assert.equal(talent.type, "talent");
  assert.equal(talent.system.xpCost, 15, talent.name);
  assert.equal(domains.has(talent.system.domain), true, talent.name);
  assert.equal(talent.system.prerequisites.length > 0, true, talent.name);
  assert.equal(talent.system.effect.includes("<p>"), true, talent.name);
  assert.equal("geneTherapy" in talent.system, false);
}

const kinds = new Set(Object.keys(SOL.augmentationKinds));
for (const aug of augmentations) {
  assert.equal(aug.system.cost, 0, aug.name);
  assert.equal(kinds.has(aug.system.kind), true, aug.name);
  assert.equal(typeof aug.system.legality.earth, "string", aug.name);
  assert.equal(aug.system.effect.includes("<p>"), true, aug.name);
}

const categories = new Set(Object.keys(SOL.softwareCategories));
const hosts = new Set(Object.keys(SOL.softwareHosts));
assert.equal(SOL.softwareCategories.utility, "SOL.Software.category.utility");
for (const entry of software) {
  assert.equal(categories.has(entry.system.category), true, entry.name);
  assert.equal(hosts.has(entry.system.host), true, entry.name);
  assert.equal(typeof entry.system.sereguineLock, "boolean", entry.name);
  assert.equal(Number.isInteger(entry.system.autonomousScore), true, entry.name);
  assert.equal(Number.isInteger(entry.system.skillBonus), true, entry.name);
}

const witness = software.find(entry => entry.name.startsWith("Dérivation Sereguine"));
assert.equal(witness.system.sereguineLock, false);
assert.equal(witness.system.autonomousScore, 50);
assert.equal(witness.system.category, "intrusion");

const kepler = software.find(entry => entry.name.includes("Kepler-V"));
assert.equal(kepler.system.host, "ship");
assert.equal(kepler.system.skillBonus, 10);
assert.equal(kepler.system.autonomousScore, 50);

const substanceCategories = new Set(Object.keys(SOL.substanceCategories));
let legalityBlank = 0;
for (const entry of substances) {
  assert.equal(substanceCategories.has(entry.system.category), true, entry.name);
  assert.equal(Number.isInteger(entry.system.doses.max), true, entry.name);
  assert.equal(entry.system.doses.value, entry.system.doses.max, `${entry.name} : doses actuelles pleines`);
  if (entry.system.legality === "") {
    legalityBlank += 1;
    assert.equal(entry.system.description.includes("[à compléter]"), true, entry.name);
  }
}
assert.equal(legalityBlank, 10, "légalités laissées vides");

for (const name of ["Chélateur d'actinides (Bleu de Prusse, DTPA)", "Oxygénateur sanguin perfluoré « Souffle Noir »", "Charge sédative « Dortoir » (pour fléchettes)"]) {
  const entry = substances.find(row => row.name === name);
  assert.equal(entry.system.effect.includes("[à compléter]"), true, name);
}

const iron = substances.find(entry => entry.name.includes("Jus de Fer"));
assert.equal(iron.system.doses.max, 1);
assert.equal(iron.system.doses.value, 1);
assert.equal(iron.system.administration, "autoInjector");
assert.equal(administrationReading("autoInjector"), "SOL.Substance.administrationMode.autoInjector");
assert.equal(administrationReading("autoInjector ou timbre"), "SOL.Substance.administrationMode.autoInjectorOrPatch");
assert.equal(administrationReading("sous-cutanée"), "");
assert.equal(administrationReading("timbre"), "");
const fr = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));
assert.equal(fr.SOL.Substance.administrationMode.autoInjector, "auto-injecteur");
assert.equal(fr.SOL.Substance.administrationMode.autoInjectorOrPatch, "auto-injecteur ou timbre");

// Décision Marc 31/10/2026. Création seulement : un 0 reste 0, une fiche sans maximum reste vide.
assert.equal(fullDosesValue({ value: null, max: 1 }), 1);
assert.equal(fullDosesValue({ max: 30 }), 30);
assert.equal(fullDosesValue({ value: 0, max: 5 }), undefined);
assert.equal(fullDosesValue({ value: 2, max: 5 }), undefined);
assert.equal(fullDosesValue({ value: null, max: null }), undefined);
assert.equal(fullDosesValue(null), undefined);

const created = [];
applyFullDoses({
  doses: { value: null, max: 4 },
  parent: { updateSource(changes) { created.push(changes); } }
});
assert.deepEqual(created, [{ "system.doses.value": 4 }]);

const kept = [];
applyFullDoses({
  doses: { value: 0, max: 4 },
  parent: { updateSource(changes) { kept.push(changes); } }
});
assert.deepEqual(kept, []);
applyFullDoses({
  doses: { value: null, max: null },
  parent: { updateSource(changes) { kept.push(changes); } }
});
assert.deepEqual(kept, []);

const substanceSource = readFileSync(new URL("../module/data/base-item.mjs", import.meta.url), "utf8");
const substanceBlock = substanceSource.slice(
  substanceSource.indexOf("export class SubstanceData"),
  substanceSource.indexOf("export class SoftwareData")
);
assert.equal(substanceBlock.includes("// Décision Marc 31/10/2026"), true);
assert.equal(substanceBlock.includes("_preCreate"), true);
assert.equal(substanceBlock.includes("this.parent.updateSource"), true);
assert.equal(substanceBlock.includes("substanceAdministration"), false);
assert.equal(substanceBlock.includes("static migrateData"), false);

console.log("catalog-092.test.mjs : ok");
