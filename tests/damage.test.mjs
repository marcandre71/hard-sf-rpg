/**
 * Dégâts et gravité, sans Foundry. `node tests/damage.test.mjs`
 *
 * Réf. LdR v0.2 §2, §3 et §7.
 * Exemple du mineur : carabine 10 + 2 DR, renforcée (torse 3, seuil 8),
 * FOR 30 CON 40. SB 4, nets 9, critique, brèche car 12 > 8.
 */
import assert from "node:assert/strict";
import { migrateArmorSource } from "../module/data/armor-migrate.mjs";
import {
  cardReminders,
  classifyInjury,
  consequenceKey,
  effectiveThreshold,
  INJURY_PENALTY,
  isUsableSeuil,
  pressurizedCovers,
  resolveBreaches,
  resolveStrike,
  SEUIL_DIVISOR,
  seuilBlessure,
  seuilFromCharacteristics,
  sumZoneArmour,
  visorHeadProtection
} from "../module/dice/damage.mjs";
import { breachClock, clockIsStopped, collectClockUuids } from "../module/dice/breach-clock.mjs";
import {
  ceilHalf,
  endurancePoints,
  enduranceZeroOffer,
  gTolerance,
  pruneResolvedCards,
  resolveEndurance,
  sangFroid
} from "../module/dice/derived.mjs";
import { canSeal, findSealMethod } from "../module/dice/seal.mjs";
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

const SB = 4;

check("seuil", () => {
  assert.equal(SEUIL_DIVISOR, 20);
  assert.equal(seuilBlessure(30, 40), 4);
  assert.equal(seuilBlessure(31, 30), 4);
  assert.equal(seuilBlessure(25, 25), 3);
  assert.equal(seuilBlessure(0, 0), 0);
  assert.equal(seuilFromCharacteristics({ for: { value: 30 }, con: { value: 40 } }), 4);
  assert.equal(seuilFromCharacteristics({ for: { value: 30 } }), null);
  assert.equal(seuilFromCharacteristics(undefined), null);
  assert.equal(isUsableSeuil(4), true);
  assert.equal(isUsableSeuil(1), true);
  assert.equal(isUsableSeuil(0), false);
  assert.equal(isUsableSeuil(null), false);
});

check("exemple du LdR : carabine 10 + 2 DR, renforcée, FOR 30 CON 40", () => {
  const armors = [{
    id: "renforcee",
    equipped: true,
    pressurized: true,
    breachThreshold: 8,
    protection: { head: 3, torso: 3, rightArm: 2, leftArm: 2, rightLeg: 2, leftLeg: 2 }
  }];
  assert.equal(sumZoneArmour(armors, "torso"), 3);
  const sb = seuilBlessure(30, 40);
  assert.equal(sb, 4);
  const strike = resolveStrike({ gross: 12, sb, armors, zone: "torso" });
  assert.equal(strike.armour, 3);
  assert.equal(strike.net, 9);
  assert.equal(strike.severity, "critical");
  assert.equal(strike.penalty, 0);
  assert.equal(strike.bleeding, false);
  assert.equal(strike.breach, true);
  assert.equal(strike.breaches[0].threshold, 8);
  assert.equal(strike.breaches[0].breached, true);
});

check("frontières de gravité pour un seuil de 4", () => {
  assert.equal(classifyInjury(0, SB), null);
  assert.equal(classifyInjury(-1, SB), null);
  assert.equal(classifyInjury(3, SB), "light");
  assert.equal(classifyInjury(4, SB), "serious");
  assert.equal(classifyInjury(7, SB), "serious");
  assert.equal(classifyInjury(8, SB), "critical");
  assert.equal(classifyInjury(11, SB), "critical");
  assert.equal(classifyInjury(12, SB), "mortal");
  assert.equal(INJURY_PENALTY.light, -10);
  assert.equal(INJURY_PENALTY.serious, -20);
  assert.equal(INJURY_PENALTY.critical, 0);
  assert.equal(INJURY_PENALTY.mortal, 0);
});

check("brèche au seuil, même sans blessure", () => {
  const soft = [{
    id: "souple",
    equipped: true,
    pressurized: true,
    breachThreshold: 4,
    protection: { torso: 6 }
  }];
  const absorbed = resolveStrike({ gross: 5, sb: SB, armors: soft, zone: "torso" });
  assert.equal(absorbed.net, -1);
  assert.equal(absorbed.severity, null);
  assert.equal(absorbed.breach, true);
  assert.equal(absorbed.breaches[0].threshold, 4);
  const equal = resolveStrike({
    gross: 4,
    sb: SB,
    armors: [{ ...soft[0], protection: { torso: 6 } }],
    zone: "torso"
  });
  assert.equal(equal.breach, false);
  const noThreshold = resolveStrike({
    gross: 12,
    sb: SB,
    armors: [{ id: "x", equipped: true, pressurized: true, protection: { torso: 0 } }],
    zone: "torso"
  });
  assert.equal(noThreshold.severity, "mortal");
  assert.equal(noThreshold.breach, false);
  assert.deepEqual(noThreshold.breaches, []);
});

check("armures : somme des couches équipées", () => {
  const armors = [
    { id: "a", equipped: true, pressurized: false, breachThreshold: 1, protection: { torso: 1, head: 0 } },
    { id: "b", equipped: true, pressurized: true, breachThreshold: 8, protection: { torso: 2 } },
    { id: "c", equipped: false, pressurized: true, breachThreshold: 1, protection: { torso: 9, head: 9 } }
  ];
  assert.equal(sumZoneArmour(armors, "torso"), 3);
  assert.equal(sumZoneArmour(armors, "head"), 0);
  assert.deepEqual(pressurizedCovers(armors, "torso").map(armor => armor.id), ["b"]);
  assert.deepEqual(pressurizedCovers(armors, "head"), []);
  const breaches = resolveBreaches(armors, "torso", 9);
  assert.equal(breaches.length, 1);
  assert.equal(breaches[0].id, "b");
  assert.equal(breaches[0].breached, true);
});

check("visière : moitié au supérieur, armure de pont", () => {
  const pont = [{
    id: "pont",
    equipped: true,
    pressurized: true,
    breachThreshold: 12,
    protection: { head: 5, torso: 6, rightArm: 4, leftArm: 4, rightLeg: 4, leftLeg: 4 }
  }];
  assert.equal(ceilHalf(5), 3);
  assert.equal(ceilHalf(12), 6);
  assert.equal(effectiveThreshold(12, "head", true), 6);
  assert.equal(effectiveThreshold(12, "torso", true), 12);
  assert.equal(sumZoneArmour(pont, "head", { visor: true }), 3);
  assert.equal(sumZoneArmour(pont, "head"), 5);
  const hit = resolveStrike({ gross: 7, sb: SB, armors: pont, zone: "head", visor: true });
  assert.equal(hit.armour, 3);
  assert.equal(hit.net, 4);
  assert.equal(hit.breaches[0].threshold, 6);
  assert.equal(hit.breach, true);
  const equal = resolveStrike({ gross: 6, sb: SB, armors: pont, zone: "head", visor: true });
  assert.equal(equal.breach, false);
  const layers = [
    { id: "a", equipped: true, pressurized: true, breachThreshold: 12, protection: { head: 5 } },
    { id: "b", equipped: true, pressurized: true, breachThreshold: 4, protection: { head: 1 } }
  ];
  // Décision Marc 20/10/2026 : somme puis /2. 5 + 1 = 6 → 3.
  // Les seuils restent par couche : 12 → 6, 4 → 2.
  assert.equal(sumZoneArmour(layers, "head", { visor: true }), 3);
  assert.equal(visorHeadProtection(layers), 3);
  const both = resolveBreaches(layers, "head", 3, { visor: true });
  assert.deepEqual(both.map(entry => entry.threshold), [6, 2]);
  assert.deepEqual(both.map(entry => entry.breached), [false, true]);
  const stacked = [
    { equipped: true, protection: { head: 1 } },
    { equipped: true, protection: { head: 3 } },
    { equipped: false, protection: { head: 9 } }
  ];
  assert.equal(visorHeadProtection(stacked), 2);
  assert.equal(sumZoneArmour(stacked, "head", { visor: true }), 2);
  assert.equal(sumZoneArmour([{ equipped: true, protection: { torso: "3" } }], "torso"), 3);
  assert.equal(effectiveThreshold("12", "head", true), 6);
  assert.equal(effectiveThreshold("abc", "head", true), null);
});

check("seuil inutilisable : pas de blessure, la brèche reste possible", () => {
  const armors = [{
    id: "souple",
    equipped: true,
    pressurized: true,
    breachThreshold: 4,
    protection: { torso: 0 }
  }];
  const strike = resolveStrike({ gross: 5, sb: 0, armors, zone: "torso" });
  assert.equal(strike.severity, null);
  assert.equal(strike.breach, true);
});

check("arrondis au supérieur", () => {
  assert.equal(endurancePoints(1), 1);
  assert.equal(endurancePoints(5), 1);
  assert.equal(endurancePoints(6), 2);
  assert.equal(gTolerance(1), 1);
  assert.equal(gTolerance(20), 1);
  assert.equal(gTolerance(21), 2);
  assert.equal(sangFroid(1), 1);
  assert.equal(sangFroid(5), 1);
  assert.equal(sangFroid(6), 2);
  assert.equal(ceilHalf(1), 1);
  assert.equal(ceilHalf(4), 2);
});

check("endurance à 0 : un seul passage", () => {
  assert.equal(enduranceZeroOffer(5, 0, false), "offer");
  assert.equal(enduranceZeroOffer(null, 0, false), "offer");
  assert.equal(enduranceZeroOffer(0, 0, true), "none");
  assert.equal(enduranceZeroOffer(0, 0, false), "none");
  assert.equal(enduranceZeroOffer(5, 0, true), "none");
  assert.equal(enduranceZeroOffer(0, 4, true), "clear");
  assert.equal(enduranceZeroOffer(4, 4, false), "none");
  assert.equal(enduranceZeroOffer(null, null, false), "none");
  assert.equal(enduranceZeroOffer(null, 3, false), "none");
});

check("migration d'armure : seulement une valeur unique", () => {
  const single = migrateArmorSource({ protection: 2, pressurized: true });
  assert.deepEqual(single.protection, {
    head: 2, torso: 2, rightArm: 2, leftArm: 2, rightLeg: 2, leftLeg: 2
  });
  const zones = { head: 5, torso: 6 };
  const kept = migrateArmorSource({ protection: zones, breachThreshold: 12 });
  assert.equal(kept.protection, zones);
  assert.equal(kept.breachThreshold, 12);
  const empty = migrateArmorSource({});
  assert.equal("protection" in empty, false);
  assert.equal("breachThreshold" in empty, false);
});

check("conséquence et rappels", () => {
  assert.equal(consequenceKey("light", "head"), null);
  assert.equal(consequenceKey("serious", "torso"), null);
  assert.equal(consequenceKey("critical", "rightArm"), "critical");
  assert.equal(consequenceKey("critical", "head"), "criticalVital");
  assert.equal(consequenceKey("critical", "torso"), "criticalVital");
  assert.equal(consequenceKey("mortal", "leftLeg"), "mortal");
  assert.deepEqual(cardReminders({ severity: null, zone: "torso", attackerCritical: true }), []);
  assert.deepEqual(cardReminders({ severity: "critical", zone: "head", attackerCritical: false }), ["unconscious", "con"]);
  assert.deepEqual(cardReminders({ severity: "serious", zone: "rightArm", attackerCritical: false }), ["drop", "bleeding", "vol"]);
  assert.deepEqual(cardReminders({ severity: "serious", zone: "leftLeg", attackerCritical: false }), ["slow", "bleeding", "vol"]);
  assert.deepEqual(cardReminders({ severity: "serious", zone: "torso", attackerCritical: true }), ["air", "bleeding", "vol"]);
  assert.deepEqual(cardReminders({ severity: "serious", zone: "torso", attackerCritical: false }), ["bleeding", "vol"]);
  assert.deepEqual(cardReminders({ severity: "mortal", zone: "head", attackerCritical: false }), []);
  assert.deepEqual(cardReminders({ severity: "light", zone: "head", attackerCritical: false }), []);
});

check("endurance vide : le maximum, un 0 reste 0", () => {
  assert.deepEqual(resolveEndurance(null, 40), { current: 8, max: 8, filled: true });
  assert.deepEqual(resolveEndurance(undefined, 40), { current: 8, max: 8, filled: true });
  assert.deepEqual(resolveEndurance(0, 40), { current: 0, max: 8, filled: false });
  assert.deepEqual(resolveEndurance(3, 40), { current: 3, max: 8, filled: false });
});

check("horloge de brèche : 5 minutes, puis 2", () => {
  const start = 1000;
  const fresh = breachClock(start, start);
  assert.equal(fresh.phase, "survival");
  assert.equal(fresh.remainingSurvival, 300);
  assert.equal(fresh.remainingDeath, 420);
  const almost = breachClock(start + 299, start);
  assert.equal(almost.phase, "survival");
  const out = breachClock(start + 300, start);
  assert.equal(out.phase, "unconscious");
  assert.equal(out.remainingSurvival, 0);
  assert.equal(out.remainingDeath, 120);
  const dead = breachClock(start + 420, start);
  assert.equal(dead.phase, "death");
  assert.equal(dead.remainingDeath, 0);
});

check("horloge : jeton non lié, et cartes d'endurance élaguées", () => {
  assert.deepEqual(collectClockUuids([
    { uuid: "Actor.a", clock: { startedAt: 10 } },
    { uuid: "Actor.a", clock: { startedAt: 10 }, linked: true },
    { uuid: "Scene.s.Token.t", clock: { startedAt: 12 }, linked: false },
    { uuid: "Scene.s.Token.u", clock: null },
    { uuid: "", clock: { startedAt: 1 } }
  ]), ["Actor.a", "Scene.s.Token.t"]);
  assert.equal(clockIsStopped({ startedAt: 1, stopped: true }), true);
  assert.equal(clockIsStopped({ startedAt: 1 }), false);
  assert.deepEqual(pruneResolvedCards(
    { vieux: true, vivant: true, courant: true },
    ["vivant"],
    "courant"
  ), { vivant: true, courant: true });
  assert.deepEqual(pruneResolvedCards({ vieux: true }, [], "neuf"), { neuf: true });
});

check("Épuisé et Rustine", () => {
  assert.equal(statusSituation([]), 0);
  assert.equal(statusSituation([EXHAUSTED_STATUS]), -20);
  assert.equal(findSealMethod(" rustine ", [{ id: "patch", name: "Rustine" }])?.id, "patch");
  assert.equal(findSealMethod("Mousse", [{ id: "patch", name: "Rustine" }]), null);
  assert.equal(canSeal(1), true);
  assert.equal(canSeal(0), false);
});

console.log("damage.test.mjs : ok");
