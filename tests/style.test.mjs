/**
 * Habillage 0.9.3. Sans Foundry.
 * Décision Marc 31/10/2026. Polices embarquées, palette sous .sol-nouvelle-ere.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles/sol.css", import.meta.url), "utf8");
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const header = readFileSync(new URL("../templates/actor/header.hbs", import.meta.url), "utf8");
const actorSheet = readFileSync(new URL("../templates/actor/actor-sheet.hbs", import.meta.url), "utf8");
const portrait = readFileSync(new URL("../module/sheets/portrait.mjs", import.meta.url), "utf8");
const principal = readFileSync(new URL("../templates/actor/tab-principal.hbs", import.meta.url), "utf8");

assert.equal(system.version, "0.9.3");
assert.equal(system.styles.includes("styles/sol.css"), true);
assert.equal("fonts" in system, false, "le manifeste v14 n'a pas de clé fonts");

for (const hex of ["#0c1117", "#141c24", "#2b3b4a", "#dbe3ea", "#8fa0ae", "#4cc4dc", "#f0685c", "#5cc28a", "#e6a940"]) {
  assert.equal(css.includes(hex), true, hex);
}
assert.equal(css.includes(".sol-nouvelle-ere.actor"), true);
assert.equal(css.includes(".sol-nouvelle-ere.item"), true);
assert.equal(/:root\s*\{[^}]*--sol-bg/.test(css), false);
assert.equal(css.includes("http://") || css.includes("https://"), false);
assert.equal(css.includes("font-size: 10px") || css.includes("font-size: 11px"), false);
assert.equal(css.includes(":focus-visible"), true);

const faces = [
  "IBMPlexSansCondensed-Regular.woff2",
  "IBMPlexSansCondensed-Medium.woff2",
  "IBMPlexSansCondensed-SemiBold.woff2",
  "IBMPlexMono-Regular.woff2",
  "IBMPlexMono-Medium.woff2",
  "AtkinsonHyperlegibleNext-Regular.woff2",
  "AtkinsonHyperlegibleNext-Bold.woff2"
];
for (const file of faces) {
  assert.equal(css.includes(file), true, file);
  assert.equal(existsSync(new URL(`../fonts/${file}`, import.meta.url)), true, file);
}
for (const license of ["OFL-IBM-Plex.txt", "OFL-Atkinson.txt"]) {
  const text = readFileSync(new URL(`../fonts/${license}`, import.meta.url), "utf8");
  assert.equal(text.includes("SIL Open Font License"), true, license);
}

assert.equal(header.includes('data-action="editImage"'), true);
assert.equal(header.includes("sol-gauge"), true);
assert.equal(actorSheet.includes('data-action="editImage"'), true);
assert.equal(actorSheet.includes("sol-gauge"), true);
assert.equal(portrait.includes("foundry.applications.apps.FilePicker"), true);
assert.equal(principal.includes("armorZones"), true);
assert.equal(css.includes(".sol-roll-card .sol-result.success"), true);

console.log("style.test.mjs : ok");
