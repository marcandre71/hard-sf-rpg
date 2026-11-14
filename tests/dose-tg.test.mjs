/**
 * Tolérance aux g et dose de départ. Sans Foundry.
 * `node tests/dose-tg.test.mjs`
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import {
  cumulativeDose,
  gTolerance,
  originToleranceModifier,
  radiationTier
} from "../module/dice/derived.mjs";

assert.equal(gTolerance(55), 3);
assert.equal(gTolerance(55, 1), 4);
assert.equal(gTolerance(55, -2), 1);
assert.equal(gTolerance(20, 0), 1);
assert.equal(gTolerance(21, -1), 1);
assert.equal(originToleranceModifier([
  { type: "skill", system: { gToleranceModifier: 9 } },
  { type: "origin", system: { gToleranceModifier: -2 } }
]), -2);
assert.equal(originToleranceModifier([]), 0);
assert.equal(originToleranceModifier([{ type: "origin", system: {} }]), 0);

const expected = {
  "Terre": 1,
  "Lune ou orbite terrestre": 0,
  "Mars": -1,
  "Ceinture (Cérès, Vesta, petits habitats)": -2,
  "Habitat tournant (station)": -1,
  "Systèmes extérieurs (Callisto, Titan)": -1
};
const dir = new URL("../packs/_source/origins/", import.meta.url);
const files = readdirSync(dir).filter(name => name.endsWith(".json"));
assert.equal(files.length, 6);
const seen = {};
for ( const file of files ) {
  const doc = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
  seen[doc.name] = doc.system.gToleranceModifier;
}
assert.deepEqual(seen, expected);

assert.equal(cumulativeDose(null, null), 0);
assert.equal(cumulativeDose(80, null), 80);
assert.equal(cumulativeDose(80, 20), 100);
assert.equal(cumulativeDose(undefined, 250), 250);
assert.equal(radiationTier(0), "healthy");
assert.equal(radiationTier(50), "healthy");
assert.equal(radiationTier(249), "healthy");
assert.equal(radiationTier(250), "exposed");
assert.equal(radiationTier(999), "exposed");
assert.equal(radiationTier(1000), "irradiated");
assert.equal(radiationTier(2999), "irradiated");
assert.equal(radiationTier(3000), "condemned");

const fr = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));
assert.equal(fr.SOL.Radiation.starting, "Dose de départ (mSv)");
assert.equal(fr.SOL.Derived.gTolerance, "Tolérance aux g");
const person = readFileSync(new URL("../module/data/person.mjs", import.meta.url), "utf8");
assert.equal(person.includes("static migrateData"), false);
assert.equal(person.includes("min: 50"), true);
assert.equal(person.includes("max: 500"), true);

const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
assert.equal(tester.includes("## 26. 1.0.3 Tolérance aux g et dose"), true);

console.log("dose-tg.test.mjs : ok");
