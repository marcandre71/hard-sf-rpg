/**
 * Munitions au tir d'une arme de personnage. Sans Foundry.
 * Décision Marc 31/10/2026. Réf. Vaisseaux v0.1 §4.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { personalAmmoSpend } from "../module/dice/personal-ammo.mjs";

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

const sheet = readFileSync(new URL("../module/sheets/item-list.mjs", import.meta.url), "utf8");
assert.equal(sheet.includes("personalAmmoSpend"), true);
assert.equal(sheet.includes('"system.ammo.value"'), true);

console.log("personal-ammo.test.mjs : ok");
