/**
 * Jet D100, sans Foundry. `node tests/d100.test.mjs`
 *
 * Réf. LdR v0.2 §2, §4, §5, §7. Décisions Marc 18/10/2026.
 */
import assert from "node:assert/strict";
import { characteristicFieldsFor, characteristicRollLabel, SOL } from "../module/config.mjs";
import {
  cappedModifier,
  formatModifier,
  hitLocation,
  modifiedTarget,
  resolveD100,
  tens
} from "../module/dice/d100.mjs";
import { aimModifier, attackRangePenalty, attackSituation, showsAttackRange, struckZone } from "../module/dice/attack.mjs";
import { skillScore, weaponAttackScore, weaponCharacteristicFallback } from "../module/dice/skill-score.mjs";
import { EXHAUSTED_STATUS, statusSituation } from "../module/dice/status-mods.mjs";

/**
 * @param {string} label
 * @param {() => void} fn
 * @returns {void}
 */
function check(label, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`échec : ${label}`);
    console.error(error);
    process.exit(1);
  }
}

check("dizaines", () => {
  assert.equal(tens(100), 10);
  assert.equal(tens(1), 0);
  assert.equal(tens(9), 0);
  assert.equal(tens(10), 1);
  assert.equal(tens(55), 5);
  assert.equal(tens(125), 12);
  assert.equal(tens(0), 0);
  assert.equal(tens(-5), -1);
  assert.equal(tens(-20), -2);
});

check("plafond ±50", () => {
  assert.equal(cappedModifier(0, 0), 0);
  assert.equal(cappedModifier(-40, 0), -40);
  assert.equal(cappedModifier(30, 0), 30);
  assert.equal(cappedModifier(-40, -20), -50);
  assert.equal(cappedModifier(30, 30), 50);
  assert.equal(cappedModifier(30, 40), 50);
  assert.equal(cappedModifier(-40, -30), -50);
  assert.equal(cappedModifier(10, -5), 5);
  assert.equal(cappedModifier(-40, 0, -40), -50);
  assert.equal(cappedModifier(0, 0, 20), 20);
  assert.deepEqual(modifiedTarget(55, -40, -20), { modifier: -50, target: 5 });
  // Le score visé n'est pas reborné : 80 + 50 = 130.
  assert.deepEqual(modifiedTarget(80, 30, 30), { modifier: 50, target: 130 });
  assert.equal(formatModifier(-50), "-50");
  assert.equal(formatModifier(0), "0");
  assert.equal(formatModifier(30), "+30");
});

check("01 et 05 toujours réussite critique", () => {
  const low = resolveD100(1, 0);
  assert.equal(low.success, true);
  assert.equal(low.critical, "success");
  assert.equal(low.dr, 0);
  const under = resolveD100(5, -10);
  assert.equal(under.success, true);
  assert.equal(under.critical, "success");
  assert.equal(under.dr, 0);
  assert.equal(under.de, 0);
});

check("06 n'est pas une critique", () => {
  const hit = resolveD100(6, 6);
  assert.equal(hit.success, true);
  assert.equal(hit.critical, null);
  assert.equal(hit.dr, 0);
  const miss = resolveD100(6, 5);
  assert.equal(miss.success, false);
  assert.equal(miss.critical, null);
  assert.equal(miss.de, 0);
});

check("doubles des deux côtés du score modifié", () => {
  const under = resolveD100(22, 22);
  assert.equal(under.success, true);
  assert.equal(under.critical, "success");
  const over = resolveD100(22, 21);
  assert.equal(over.success, false);
  assert.equal(over.critical, "failure");
  const wide = resolveD100(11, 100);
  assert.equal(wide.critical, "success");
  assert.equal(wide.dr, 9);
  const miss = resolveD100(88, 50);
  assert.equal(miss.critical, "failure");
  assert.equal(miss.success, false);
});

check("96 et 100 toujours échec critique, 99 prioritaire sur le double", () => {
  const high = resolveD100(96, 100);
  assert.equal(high.success, false);
  assert.equal(high.critical, "failure");
  assert.equal(high.de, 0);
  const hundred = resolveD100(100, 100);
  assert.equal(hundred.success, false);
  assert.equal(hundred.critical, "failure");
  const ninetyNine = resolveD100(99, 99);
  assert.equal(ninetyNine.success, false);
  assert.equal(ninetyNine.critical, "failure");
});

check("exemple Lina : 55 contre 38 donne 2 DR", () => {
  const lina = resolveD100(38, 55);
  assert.equal(lina.success, true);
  assert.equal(lina.critical, null);
  assert.equal(lina.dr, 2);
  const fail = resolveD100(70, 55);
  assert.equal(fail.success, false);
  assert.equal(fail.de, 2);
});

check("score ≥ 100 et score négatif", () => {
  const high = resolveD100(50, 125);
  assert.equal(high.success, true);
  assert.equal(high.dr, 7);
  const crit = resolveD100(1, 125);
  assert.equal(crit.critical, "success");
  assert.equal(crit.dr, 12);
  const negative = resolveD100(20, -20);
  assert.equal(negative.success, false);
  assert.equal(negative.critical, null);
  assert.equal(negative.de, 4);
});

check("localisation", () => {
  assert.equal(hitLocation(10), "head");
  assert.equal(hitLocation(100), "leftLeg");
  assert.equal(hitLocation(37), "rightLeg");
  assert.equal(hitLocation(1), "head");
  assert.equal(hitLocation(11), "rightArm");
  assert.equal(hitLocation(73), "leftArm");
});

check("score de compétence", () => {
  const chars = { coo: { value: 51 }, int: { value: 40 } };
  const plain = skillScore(chars, { characteristic: "coo", training: 0, trainingRequired: false, untrainedAllowed: true });
  assert.deepEqual(plain, { impossible: false, score: 51, halved: false });
  const half = skillScore(chars, { characteristic: "coo", training: 0, trainingRequired: true, untrainedAllowed: true });
  assert.deepEqual(half, { impossible: false, score: 26, halved: true });
  // La moitié est le score de base. La difficulté s'ajoute après.
  assert.deepEqual(modifiedTarget(half.score, -40, -20), { modifier: -50, target: -24 });
  const blocked = skillScore(chars, { characteristic: "coo", training: 0, trainingRequired: true, untrainedAllowed: false });
  assert.equal(blocked.impossible, true);
  assert.equal(blocked.score, null);
  const trained = skillScore(chars, { characteristic: "int", training: 5, trainingRequired: true, untrainedAllowed: false });
  assert.deepEqual(trained, { impossible: false, score: 45, halved: false });
});

check("arme : nom de compétence, sinon caractéristique", () => {
  const chars = { coo: { value: 40 }, for: { value: 30 } };
  const skills = [{
    name: "Armes de poing",
    system: { characteristic: "coo", training: 10, trainingRequired: false, untrainedAllowed: true }
  }];
  const named = weaponAttackScore(chars, "armes de poing", skills);
  assert.equal(named.unknown, false);
  assert.equal(named.fallback, false);
  assert.equal(named.score, 50);
  const melee = weaponAttackScore(chars, "Corps-à-corps", []);
  assert.equal(melee.fallback, true);
  assert.equal(melee.score, 30);
  assert.equal(weaponCharacteristicFallback("  Armes d'épaule "), "coo");
  const unknown = weaponAttackScore(chars, "Lance-flammes", []);
  assert.equal(unknown.unknown, false);
  assert.equal(unknown.fallback, true);
  assert.equal(unknown.characteristic, "coo");
  assert.equal(unknown.score, 40);
  const empty = weaponAttackScore(chars, "", []);
  assert.equal(empty.characteristic, "coo");
  assert.equal(empty.score, 40);
  assert.equal(empty.unknown, false);
  assert.equal(weaponCharacteristicFallback("Corps-à-corps"), "for");
});

check("viser et tir visé", () => {
  assert.equal(aimModifier(0).total, 0);
  assert.equal(aimModifier(1).total, 10);
  assert.equal(aimModifier(3).total, 30);
  assert.equal(aimModifier(9).total, 30);
  assert.equal(aimModifier(-2).total, 0);
  const headTwo = attackSituation("head", 2);
  assert.equal(headTwo.called.penalty, -30);
  assert.equal(headTwo.situation, -10);
  assert.equal(cappedModifier(0, 0, headTwo.situation), -10);
  const exhausted = statusSituation([EXHAUSTED_STATUS]);
  assert.equal(exhausted, -20);
  const visorShot = attackSituation("visor", 0);
  assert.equal(cappedModifier(0, 0, visorShot.situation + exhausted), -50);
  const visor = struckZone(55, "visor");
  assert.equal(visor.zone, "head");
  assert.equal(visor.visor, true);
  const none = struckZone(55, "none");
  assert.equal(none.visor, false);
  assert.equal(none.zone, hitLocation(55));
  assert.equal(struckZone(1, "leftLeg").zone, "leftLeg");
  const aids = [
    { id: "aim", per: 10, max: 30, maxActions: 3, label: "SOL.Roll.aim" },
    { id: "scope", per: 10, max: 10, maxActions: 1, label: "SOL.Roll.aim" }
  ];
  assert.equal(aimModifier({ aim: 2, scope: 1 }, aids).total, 30);
});

check("portée du jet d'attaque", () => {
  // Décision Marc 30/10/2026. Réf. LdR v0.2 §5. Courte par défaut.
  assert.equal(attackRangePenalty("short"), 0);
  assert.equal(attackRangePenalty("medium"), -10);
  assert.equal(attackRangePenalty("long"), -20);
  assert.equal(attackRangePenalty("close"), 0);
  assert.equal(attackRangePenalty(undefined), 0);
  assert.equal(attackSituation("head", 2).situation, -10);
  assert.equal(attackSituation("head", 2).range, "short");
  assert.equal(attackSituation("head", 2).rangePenalty, 0);
  const medium = attackSituation("none", 0, undefined, "medium");
  assert.equal(medium.rangePenalty, -10);
  assert.equal(medium.situation, -10);
  assert.equal(cappedModifier(0, 0, medium.situation), -10);
  const far = attackSituation("none", 0, undefined, "long");
  assert.equal(far.rangePenalty, -20);
  assert.equal(cappedModifier(0, 0, far.situation), -20);
  const stacked = attackSituation("visor", 0, undefined, "long");
  assert.equal(stacked.situation, -60);
  assert.equal(cappedModifier(0, 0, stacked.situation), -50);
  assert.equal(cappedModifier(-40, -20, attackRangePenalty("long")), -50);
  assert.equal(attackSituation("none", 0, undefined, "proche").range, "short");
  assert.equal(attackSituation("none", 0, undefined, "proche").rangePenalty, 0);
  assert.equal(showsAttackRange({ name: "Couteau", system: { skill: "Corps-à-corps", description: "<p>Lame.</p>" } }), false);
  assert.equal(showsAttackRange({ name: "Découpeur", system: { skill: "Corps-à-corps", description: "<p>Contact, 10 charges.</p>" } }), false);
  assert.equal(showsAttackRange({ name: "Électrochoc de coursive", system: { skill: "Armes de poing", description: "<p>Portée contact à 5 m.</p>" } }), true);
  assert.equal(showsAttackRange({ name: "Pistolet de scellement thermique", system: { skill: "Armes de poing", description: "<p>Contact à 4 m.</p>" } }), true);
  assert.equal(showsAttackRange({ name: "Découpeur plasma de main", system: { skill: "Corps-à-corps", description: "<p>Contact, 10 charges.</p>" } }), false);
  assert.equal(showsAttackRange({ name: "Lance-filet et harpon magnétique d'EVA", system: { skill: "Armes d'épaule", description: "<p>15 / 30 m.</p>" } }), true);
  assert.equal(showsAttackRange({ name: "Carabine", system: { skill: "Armes d'épaule", description: "<p>40 / 100 / 200 m.</p>" } }), true);
});

check("Base du PNJ", () => {
  const character = characteristicFieldsFor("character").base;
  const npc = characteristicFieldsFor("npc").base;
  assert.equal(character.max, 60);
  assert.equal(character.min, 1);
  assert.equal(npc.min, character.min);
  assert.equal(npc.max, 100);
  assert.equal(characteristicFieldsFor("character").base.max, 60);
});

check("libellé VOL/CON", () => {
  const localize = key => {
    if ( typeof key !== "string" ) throw new TypeError("localize attend une chaîne");
    if ( key === "SOL.Characteristic.vol.abbr" ) return "VOL";
    if ( key === "SOL.Characteristic.vol.label" ) return "Volonté";
    if ( key === "SOL.Characteristic.con.abbr" ) return "CON";
    if ( key === "SOL.Characteristic.con.label" ) return "Constitution";
    return key;
  };
  assert.throws(() => localize(SOL.characteristics.vol), TypeError);
  assert.equal(characteristicRollLabel(SOL.characteristics.vol, localize), "VOL — Volonté");
  assert.equal(characteristicRollLabel(SOL.characteristics.con, localize), "CON — Constitution");
  assert.equal(characteristicRollLabel(SOL.characteristics.vol, null), null);
  assert.equal(characteristicRollLabel(null, localize), null);
  assert.equal(characteristicRollLabel({ label: 1, abbr: "VOL" }, localize), null);
});

console.log("tests/d100.test.mjs : ok");
