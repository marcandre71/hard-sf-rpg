/**
 * Détection du module privé, 1.1.3. Sans Foundry.
 * `node tests/kit-113.test.mjs`
 *
 * Les doubles n'ont pas de nom de personne, de lieu ni de scénario.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GM_KIT_FOLDER,
  GM_KIT_MODULE_ID,
  KIT_GM_PACKS,
  gmKitImportSteps,
  gmKitPlan,
  kitImportPlan,
  preparedKitDocument,
  shouldImportKit
} from "../module/kit-import.mjs";

const systemId = "sol-nouvelle-ere";
const twoPacks = [{ name: "alpha", type: "JournalEntry" }, { name: "beta", type: "Actor" }];

function packsOf(found) {
  return {
    get(key) {
      return found[key] ?? null;
    }
  };
}

const absent = gmKitPlan(null, packsOf({}), { isActiveGM: true });
assert.equal(absent.status, "absent");
assert.equal(absent.entries.length, 0);
assert.equal(gmKitImportSteps(absent).notice, "gmAbsent");
assert.equal(gmKitImportSteps(absent).imports.length, 0);

const inactive = gmKitPlan({ active: false, packs: twoPacks }, packsOf({
  "sol-kit-mj.alpha": { documentName: "JournalEntry" }
}), { isActiveGM: true });
assert.equal(inactive.status, "absent");
assert.equal(inactive.entries.length, 0);
assert.equal(gmKitImportSteps(inactive).notice, "gmAbsent");

const live = packsOf({
  "sol-kit-mj.alpha": { documentName: "JournalEntry" },
  "sol-kit-mj.beta": { documentName: "Actor" }
});
const active = gmKitPlan({ active: true, packs: twoPacks }, live, { isActiveGM: true });
assert.equal(active.status, "active");
assert.equal(active.entries.length, 2);
assert.deepEqual(active.entries.map(entry => entry.key), ["sol-kit-mj.alpha", "sol-kit-mj.beta"]);
assert.deepEqual(active.entries.map(entry => entry.folder), [GM_KIT_FOLDER, GM_KIT_FOLDER]);
assert.deepEqual(active.entries.map(entry => entry.documentName), ["JournalEntry", "Actor"]);
const activeSteps = gmKitImportSteps(active);
assert.equal(activeSteps.notice, null);
assert.equal(activeSteps.warnings.length, 0);
assert.equal(activeSteps.imports.length, 2);

const player = gmKitPlan({ active: true, packs: twoPacks }, live, { isActiveGM: false });
assert.equal(player.status, "not-gm");
assert.equal(player.entries.length, 0);
assert.equal(gmKitImportSteps(player).imports.length, 0);
assert.equal(shouldImportKit({ isActiveGM: false }), false);

const missing = gmKitPlan({
  active: true,
  packs: [...twoPacks, { name: "gamma", type: "Scene" }]
}, live, { isActiveGM: true });
const missingSteps = gmKitImportSteps(missing);
assert.deepEqual(missingSteps.warnings, ["sol-kit-mj.gamma"]);
assert.equal(missingSteps.imports.length, 2);

const documents = [
  { kitId: "DocAlpha0000001" },
  { kitId: "DocBeta00000002" }
];
const first = kitImportPlan(documents, []);
assert.equal(first.length, 2);
const second = kitImportPlan(documents, first.map(entry => entry.kitId));
assert.equal(second.length, 0);

const journal = {
  id: "DocAlpha0000001",
  toObject() {
    return {
      _id: "DocAlpha0000001",
      name: "page",
      ownership: { default: 0 },
      flags: {}
    };
  }
};
const prepared = preparedKitDocument(journal, {
  systemId,
  folderId: "dossier",
  pack: "alpha"
});
assert.equal(prepared._id, undefined);
assert.deepEqual(prepared.ownership, { default: 0 });
assert.equal(prepared.ownership.default === 2, false);
assert.equal(prepared.flags[systemId].kitId, "DocAlpha0000001");
assert.equal(prepared.flags[systemId].kit, "alpha");
assert.equal(prepared.folder, "dossier");

assert.equal(KIT_GM_PACKS.length, 0);
assert.equal(GM_KIT_MODULE_ID, "sol-kit-mj");
assert.equal(GM_KIT_FOLDER, "Kit MJ — La Cale du quai 9");

const source = readFileSync(new URL("../module/kit-import.mjs", import.meta.url), "utf8");
assert.equal(source.includes("sol-kit-mj"), true);
assert.equal(source.includes("KIT_GM_PACKS = []"), true);
assert.equal(/ownership\s*[:=]/.test(source), false);
const lang = readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8");
assert.equal(lang.includes("Kit MJ non détecté."), true);
const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
assert.equal(tester.includes("## 30. 1.1.3 détection du kit MJ"), true);
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
assert.equal(system.version, "1.1.3");
assert.equal(system.packs.some(pack => pack.name.includes("sol-kit-mj")), false);

console.log("kit-113.test.mjs : ok");
