/**
 * Munitions au tir d'une arme de personnage. Sans Foundry.
 * Décision Marc 31/10/2026. Réf. Vaisseaux v0.1 §4.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  beginPersonalShot,
  endPersonalShot,
  personalAmmoAfterRoll,
  personalAmmoSpend,
  personalShotRefusedToNonOwner
} from "../module/dice/personal-ammo.mjs";

const loaded = personalAmmoSpend({ value: 15, max: 15 });
assert.equal(loaded.fire, true);
assert.equal(loaded.next, 14);

const one = personalAmmoSpend({ value: 1, max: 6 });
assert.equal(one.fire, true);
assert.equal(one.next, 0);

const pistolEmpty = personalAmmoSpend({ value: 0, max: 15 });
assert.equal(pistolEmpty.fire, false, "pistolet 0/15 : tir refusé");
assert.equal(pistolEmpty.next, null);

const knife = personalAmmoSpend({ value: 0, max: 0 });
assert.equal(knife.fire, true, "couteau 0/0 : le tir passe");
assert.equal(knife.next, null, "couteau 0/0 : rien n'est retiré");

const nullValue = personalAmmoSpend({ value: null, max: 15 });
assert.equal(nullValue.fire, true);
assert.equal(nullValue.next, null);

const nullMax = personalAmmoSpend({ value: 5, max: null });
assert.equal(nullMax.fire, true);
assert.equal(nullMax.next, null);

const missing = personalAmmoSpend(null);
assert.equal(missing.fire, true);
assert.equal(missing.next, null);

assert.equal(personalShotRefusedToNonOwner({ value: 15, max: 15 }, false), true, "pistolet, non propriétaire : refusé");
assert.equal(personalShotRefusedToNonOwner({ value: 15, max: 15 }, true), false, "pistolet, propriétaire : le tir continue");
assert.equal(personalShotRefusedToNonOwner({ value: 0, max: 0 }, false), false, "couteau sans chargeur : le propriétaire n'est pas exigé");

let chained = { value: 15, max: 15 };
for ( let shot = 0; shot < 2; shot += 1 ) {
  assert.equal(beginPersonalShot("Item.pistol"), true, "tir enchaîné : le verrou se prend");
  try {
    const spent = personalAmmoAfterRoll(chained);
    assert.equal(spent.write, true);
    chained = { value: spent.next, max: 15 };
  } finally {
    endPersonalShot("Item.pistol");
  }
}
assert.equal(chained.value, 13, "deux tirs enchaînés retirent 2");

const planned = personalAmmoSpend({ value: 15, max: 15 });
assert.equal(planned.next, 14);
const edited = personalAmmoAfterRoll({ value: 10, max: 15 });
assert.equal(edited.write, true);
assert.equal(edited.next, 9, "une saisie pendant la fenêtre n'est pas écrasée par 14");
assert.notEqual(edited.next, planned.next);

const emptied = personalAmmoAfterRoll({ value: 0, max: 15 });
assert.equal(emptied.write, false, "0 relu : on n'écrit rien");
assert.equal(emptied.notify, true);

assert.equal(beginPersonalShot("Item.pistol"), true);
assert.equal(beginPersonalShot("Item.pistol"), false, "second tir pendant la fenêtre : verrou refusé");
endPersonalShot("Item.pistol");
assert.equal(beginPersonalShot("Item.pistol"), true, "après finally, un nouveau tir passe");
endPersonalShot("Item.pistol");

const sheet = readFileSync(new URL("../module/sheets/item-list.mjs", import.meta.url), "utf8");
assert.equal(sheet.includes("personalAmmoSpend"), true);
assert.equal(sheet.includes("personalAmmoAfterRoll"), true);
assert.equal(sheet.includes('"system.ammo.value"'), true);
assert.equal(sheet.includes("SOL.Item.ammoEmpty"), true);
assert.equal(sheet.includes("SOL.Item.notOwner"), true);
assert.equal(sheet.includes("item.isOwner"), true);
assert.equal(sheet.includes("relayToGm"), false);
const weaponRollAt = sheet.lastIndexOf("await performRoll");
const afterAt = sheet.lastIndexOf("personalAmmoAfterRoll(fresh)");
const updateAt = sheet.lastIndexOf('"system.ammo.value"');
assert.equal(weaponRollAt < afterAt && afterAt < updateAt, true, "on relit après le jet, puis on écrit");
assert.equal(sheet.includes("finally"), true);
assert.equal(sheet.includes("endPersonalShot"), true);

console.log("personal-ammo.test.mjs : ok");
