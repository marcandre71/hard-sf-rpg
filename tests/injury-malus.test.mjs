/**
 * Malus de blessure au jet personnel. Sans Foundry.
 * `node tests/injury-malus.test.mjs`
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkedInjuryIds,
  injuryMalusOptions,
  injuryMalusTotal,
  personalRollModifier
} from "../module/dice/injury-malus.mjs";

function check(label, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`échec : ${label}`);
    console.error(error);
    process.exit(1);
  }
}

const sheet = [
  { id: "legere", type: "injury", name: "Entaille", system: { location: "rightArm", penalty: -10, severity: "light" } },
  { id: "grave", type: "injury", name: "Fracture", system: { location: "leftLeg", penalty: -20, severity: "serious" } },
  { id: "critique", type: "injury", name: "Critique", system: { location: "head", penalty: 0, severity: "critical" } },
  { id: "mortelle", type: "injury", name: "Mortelle", system: { location: "torso", penalty: 0, severity: "mortal" } },
  { id: "soignee", type: "injury", name: "Ancienne", system: { location: "torso", penalty: -10, treated: true } }
];

check("liste : malus non nul, critique et mortelle absentes", () => {
  const options = injuryMalusOptions(sheet);
  assert.deepEqual(options.map(item => item.id), ["legere", "grave", "soignee"]);
  assert.equal(options.some(item => item.penalty === 0), false);
});

check("décoché : aucun malus ; une ou deux cases s'ajoutent", () => {
  const options = injuryMalusOptions(sheet);
  assert.equal(injuryMalusTotal(options, []), 0);
  assert.equal(injuryMalusTotal(options, ["legere"]), -10);
  assert.equal(injuryMalusTotal(options, ["legere", "grave"]), -30);
  const none = { injuryPenalty: [
    { value: "legere", checked: false, tagName: undefined },
    { value: "grave", checked: false }
  ]};
  none.injuryPenalty.tagName = undefined;
  assert.deepEqual(checkedInjuryIds(none), []);
  const one = { injuryPenalty: { value: "legere", checked: true, tagName: "INPUT" } };
  assert.deepEqual(checkedInjuryIds(one), ["legere"]);
  assert.equal(injuryMalusTotal(options, checkedInjuryIds(one)), -10);
});

check("plafond ±50 avec Épuisé, vaisseau sans blessure", () => {
  assert.equal(personalRollModifier({
    difficulty: 0,
    free: 0,
    status: -20,
    injury: -30
  }), -50);
  assert.equal(personalRollModifier({
    difficulty: 0,
    free: 0,
    status: -20,
    injury: -10
  }), -30);
  assert.equal(personalRollModifier({
    difficulty: 0,
    free: 0,
    status: -20,
    injury: -40,
    shipPost: true
  }), -20);
  const target = 55 + personalRollModifier({ injury: -30 });
  assert.equal(target, 25);
});

check("TESTER §23", () => {
  const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
  assert.equal(tester.includes("## 23. 0.9.9 Malus de blessure"), true);
  const lang = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));
  assert.equal(typeof lang.SOL.Roll.injuries, "string");
});

console.log("injury-malus.test.mjs : ok");
