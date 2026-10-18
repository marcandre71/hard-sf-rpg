/**
 * Dégâts et gravité, sans Foundry. `node tests/damage.test.mjs`
 *
 * Réf. LdR v0.2 §7. Décision Marc 18/10/2026.
 */
import assert from "node:assert/strict";
import {
  cardReminders,
  classifyInjury,
  consequenceKey,
  INJURY_PENALTY,
  isUsableSeuil,
  pressurizedCovers,
  resolveStrike,
  seuilBlessure,
  seuilFromCharacteristics,
  sumZoneArmour
} from "../module/dice/damage.mjs";

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

const SB = 7;

check("seuil", () => {
  assert.equal(seuilBlessure(30, 40), 7);
  assert.equal(seuilBlessure(31, 30), 7);
  assert.equal(seuilBlessure(25, 25), 5);
  assert.equal(seuilBlessure(0, 0), 0);
  assert.equal(seuilFromCharacteristics({ for: { value: 30 }, con: { value: 40 } }), 7);
  assert.equal(seuilFromCharacteristics({ for: { value: 30 } }), null);
  assert.equal(seuilFromCharacteristics(undefined), null);
  assert.equal(isUsableSeuil(7), true);
  assert.equal(isUsableSeuil(0), false);
  assert.equal(isUsableSeuil(null), false);
});

check("exemple du livre : carabine 10 + 2 DR, armure 3, SB 7", () => {
  const armors = [{
    equipped: true,
    pressurized: true,
    protection: { torso: 3 }
  }];
  assert.equal(sumZoneArmour(armors, "torso"), 3);
  const strike = resolveStrike({
    gross: 12,
    armour: 3,
    sb: SB,
    pressurized: pressurizedCovers(armors, "torso").length > 0
  });
  assert.equal(strike.net, 9);
  assert.equal(strike.severity, "serious");
  assert.equal(strike.penalty, -20);
  assert.equal(strike.bleeding, true);
  assert.equal(strike.breach, true);
});

check("frontières de gravité pour un seuil de 7", () => {
  assert.equal(classifyInjury(0, SB), null);
  assert.equal(classifyInjury(-1, SB), null);
  assert.equal(classifyInjury(SB - 1, SB), "light");
  assert.equal(classifyInjury(SB, SB), "serious");
  assert.equal(classifyInjury(2 * SB - 1, SB), "serious");
  assert.equal(classifyInjury(2 * SB, SB), "critical");
  assert.equal(classifyInjury(3 * SB - 1, SB), "critical");
  assert.equal(classifyInjury(3 * SB, SB), "mortal");
  assert.equal(INJURY_PENALTY.light, -10);
  assert.equal(INJURY_PENALTY.serious, -20);
  assert.equal(INJURY_PENALTY.critical, 0);
  assert.equal(INJURY_PENALTY.mortal, 0);
});

check("dégâts nets nuls ou négatifs : ni blessure ni brèche", () => {
  const absorbed = resolveStrike({ gross: 3, armour: 3, sb: SB, pressurized: true });
  assert.equal(absorbed.net, 0);
  assert.equal(absorbed.severity, null);
  assert.equal(absorbed.breach, false);
  const over = resolveStrike({ gross: 2, armour: 5, sb: SB, pressurized: true });
  assert.equal(over.net, -3);
  assert.equal(over.breach, false);
});

check("armures : somme des couches équipées, brèche si pressurisée", () => {
  const armors = [
    { id: "a", equipped: true, pressurized: false, protection: { torso: 1, head: 0 } },
    { id: "b", equipped: true, pressurized: true, protection: { torso: 2 } },
    { id: "c", equipped: false, pressurized: true, protection: { torso: 9, head: 9 } }
  ];
  assert.equal(sumZoneArmour(armors, "torso"), 3);
  assert.equal(sumZoneArmour(armors, "head"), 0);
  assert.deepEqual(pressurizedCovers(armors, "torso").map(armor => armor.id), ["b"]);
  assert.deepEqual(pressurizedCovers(armors, "head"), []);
  const headSuit = [{ equipped: true, pressurized: true, protection: { head: 0 } }];
  const head = resolveStrike({
    gross: 4,
    armour: sumZoneArmour(headSuit, "head"),
    sb: SB,
    pressurized: pressurizedCovers(headSuit, "head").length > 0
  });
  assert.equal(head.severity, "light");
  assert.equal(head.breach, true);
});

check("seuil inutilisable : pas de blessure", () => {
  const strike = resolveStrike({ gross: 12, armour: 0, sb: 0, pressurized: true });
  assert.equal(strike.severity, null);
  assert.equal(strike.breach, false);
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

console.log("damage.test.mjs : ok");
