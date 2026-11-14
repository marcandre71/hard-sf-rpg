/**
 * Lore public 0.9.6. Sans Foundry.
 * Extraits publics Bible v0.6 du 08/11/2026, §3, §6 et §7.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../packs/_source/universe/", import.meta.url);
const files = readdirSync(root).filter(name => name.endsWith(".json"));
const docs = files.map(name => JSON.parse(readFileSync(new URL(name, root), "utf8")));
const factions = docs.find(entry => entry.name === "Factions");
const glossary = docs.find(entry => entry.name === "Glossaire");
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.equal(system.version, "1.1.3");
assert.equal(factions.pages.length, 6);
const names = factions.pages.map(page => page.name);
assert.deepEqual(names, [
  "L'Office de la Veille",
  "Le Compact d'Hellas",
  "Le Directoire de Tharsis",
  "Le Consortium de la Ceinture",
  "Le Kombinat Hélion",
  "Le Collège de Valhalla"
]);
const ids = factions.pages.map(page => page._id);
assert.equal(ids.includes("PgPartantsLongs0"), false);
assert.equal(ids.includes("PgMutuelleCeint0"), true);
assert.equal(ids.includes("PgDirectTharsis"), true);
assert.equal(factions.pages.find(page => page._id === "PgMutuelleCeint0").name, "Le Consortium de la Ceinture");
const joined = factions.pages.map(page => page.text.content).join("\n");
assert.equal(joined.includes("Traité de Genève de 1981"), true);
assert.equal(joined.includes("inspecteurs de l'Office"), true);
assert.equal(joined.includes("ancienne Mutuelle"), true);
assert.equal(joined.includes("Directoire de Tharsis"), true);
assert.equal(joined.includes("Traité d'Asimov"), false);
assert.equal(joined.includes("comète"), false);
assert.equal(joined.includes("Partants"), false);

const gloss = glossary.pages[0].text.content;
assert.equal(gloss.includes("Consortium de la Ceinture"), true);
assert.equal(gloss.includes("Directoire de Tharsis"), true);
assert.equal(gloss.includes("Traité d'Asimov"), true);
assert.equal(gloss.includes("Double clé"), true);
assert.equal(gloss.includes("Ce n'est plus une faction principale"), true);
assert.equal(gloss.includes("Retiré de la liste des puissances principales"), true);
assert.equal(gloss.includes("C/2186"), false);
assert.equal(gloss.includes("Caisse Noire"), false);
assert.equal(gloss.includes("Bible de l'univers v0.4"), false);

const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
assert.equal(tester.includes("## 20. 0.9.6 Lore public"), true);

console.log("catalog-096.test.mjs : ok");
