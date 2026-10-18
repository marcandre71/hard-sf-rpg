/**
 * Classement de l'initiative glissante, sans Foundry.
 * `node tests/initiative.test.mjs`
 *
 * Réf. LdR v0.2 §7. Décision Marc 18/10/2026 : réussites avant échecs,
 * moins de DE d'abord, égalité à la RÉF.
 */
import assert from "node:assert/strict";
import {
  deferToEnd,
  encodeInitiative,
  INITIATIVE_SUCCESS_BASE,
  reflexScore,
  severityDefers,
  stepBack,
  vigilanceBaseScore
} from "../module/dice/initiative.mjs";

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

/**
 * @param {Array<{ id: string, success: boolean, dr?: number, de?: number, ref?: number }>} ranks
 * @returns {string[]}
 */
function orderByRank(ranks) {
  return ranks
    .map(rank => ({ id: rank.id, key: encodeInitiative(rank) }))
    .sort((a, b) => b.key - a.key || a.id.localeCompare(b.id))
    .map(entry => entry.id);
}

/**
 * @param {Array<{ id: string, initiative: number|null }>} sorted
 * @param {Array<{ id: string, initiative: number }>|null} changes
 * @returns {string[]}
 */
function orderAfter(sorted, changes) {
  const values = new Map(sorted.map(entry => [entry.id, entry.initiative]));
  for ( const change of changes ?? [] ) values.set(change.id, change.initiative);
  return [...values.entries()]
    .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0])))
    .map(entry => entry[0]);
}

check("DR décroissants, RÉF à égalité de DR", () => {
  const order = orderByRank([
    { id: "dr2-ref30", success: true, dr: 2, ref: 30 },
    { id: "dr2-ref50", success: true, dr: 2, ref: 50 },
    { id: "dr1-ref90", success: true, dr: 1, ref: 90 },
    { id: "dr0-ref10", success: true, dr: 0, ref: 10 }
  ]);
  assert.deepEqual(order, ["dr2-ref50", "dr2-ref30", "dr1-ref90", "dr0-ref10"]);
});

check("réussites avant échecs, moins de DE d'abord, puis RÉF", () => {
  const order = orderByRank([
    { id: "fail-de2-ref90", success: false, de: 2, ref: 90 },
    { id: "fail-de0-ref10", success: false, de: 0, ref: 10 },
    { id: "fail-de2-ref40", success: false, de: 2, ref: 40 },
    { id: "ok-dr0-ref0", success: true, dr: 0, ref: 0 },
    { id: "fail-de0-ref80", success: false, de: 0, ref: 80 }
  ]);
  assert.deepEqual(order, [
    "ok-dr0-ref0",
    "fail-de0-ref80",
    "fail-de0-ref10",
    "fail-de2-ref90",
    "fail-de2-ref40"
  ]);
});

check("le meilleur échec reste sous la plus petite réussite", () => {
  const worstFailure = encodeInitiative({ success: false, de: 0, ref: 100 });
  const smallestSuccess = encodeInitiative({ success: true, dr: 0, ref: 0 });
  assert.ok(worstFailure < INITIATIVE_SUCCESS_BASE);
  assert.ok(smallestSuccess >= INITIATIVE_SUCCESS_BASE);
  assert.ok(smallestSuccess > worstFailure);
});

check("DR ou DE au-dessus de 999 : la réussite reste devant", () => {
  const hugeSuccess = encodeInitiative({ success: true, dr: 5000, ref: 100 });
  const hugeFailure = encodeInitiative({ success: false, de: 5000, ref: 100 });
  const bestFailure = encodeInitiative({ success: false, de: 0, ref: 100 });
  assert.ok(hugeSuccess > bestFailure);
  assert.ok(hugeSuccess > hugeFailure);
  assert.equal(hugeFailure, encodeInitiative({ success: false, de: 999, ref: 100 }));
});

check("RÉF absente ou invalide : 0", () => {
  assert.equal(reflexScore(undefined), 0);
  assert.equal(reflexScore({ ref: { value: Number.NaN } }), 0);
  assert.equal(reflexScore({ ref: { value: 45 } }), 45);
  assert.equal(encodeInitiative({ success: true, dr: 0, ref: Number.NaN }), INITIATIVE_SUCCESS_BASE);
});

check("Vigilance absente et pas (F) : PER entière, pas la moitié", () => {
  const rated = vigilanceBaseScore(
    { per: { value: 41 } },
    [],
    "Vigilance"
  );
  assert.equal(rated.impossible, false);
  assert.equal(rated.halved, false);
  assert.equal(rated.missingPerception, false);
  assert.equal(rated.score, 41);
});

check("objet Vigilance : skillScore, formation comprise", () => {
  const rated = vigilanceBaseScore(
    { per: { value: 40 } },
    [{
      name: "  vigilance ",
      system: { characteristic: "per", training: 10, trainingRequired: false }
    }],
    "Vigilance"
  );
  assert.equal(rated.score, 50);
  assert.equal(rated.halved, false);
});

check("compétence (F) sans formation : impossible", () => {
  const rated = vigilanceBaseScore(
    { per: { value: 40 } },
    [{
      name: "Vigilance",
      system: { characteristic: "per", training: 0, trainingRequired: true, untrainedAllowed: false }
    }],
    "Vigilance"
  );
  assert.equal(rated.impossible, true);
  assert.equal(rated.score, null);
});

check("sans PER et sans objet : score 0", () => {
  const rated = vigilanceBaseScore({ for: { value: 30 } }, [], "Vigilance");
  assert.equal(rated.score, 0);
  assert.equal(rated.missingPerception, true);
  assert.equal(rated.impossible, false);
});

check("blessure grave ou pire seulement", () => {
  assert.equal(severityDefers("light"), false);
  assert.equal(severityDefers(null), false);
  assert.equal(severityDefers("serious"), true);
  assert.equal(severityDefers("critical"), true);
  assert.equal(severityDefers("mortal"), true);
});

check("fin d'ordre : sous tous ceux qui restent, ordre relatif gardé", () => {
  const sorted = [
    { id: "a", initiative: 1_002_050 },
    { id: "b", initiative: 1_001_030 },
    { id: "c", initiative: 500 }
  ];
  assert.deepEqual(deferToEnd(sorted, ["a"]), [{ id: "a", initiative: 499 }]);
  assert.deepEqual(deferToEnd(sorted, ["a", "b"]), [
    { id: "a", initiative: 499 },
    { id: "b", initiative: 498 }
  ]);
  assert.deepEqual(deferToEnd(sorted, ["a", "b", "c"]), []);
  assert.deepEqual(deferToEnd(sorted, []), []);
  assert.deepEqual(deferToEnd(sorted, ["absent"]), []);
});

check("recul d'une place : échange des nombres", () => {
  const sorted = [
    { id: "a", initiative: 10 },
    { id: "b", initiative: 8 },
    { id: "c", initiative: 6 }
  ];
  const changes = stepBack(sorted, "a");
  assert.deepEqual(orderAfter(sorted, changes), ["b", "a", "c"]);
  assert.equal(stepBack(sorted, "c"), null);
  assert.equal(stepBack(sorted, "absent"), null);
  assert.equal(stepBack([{ id: "a", initiative: null }, { id: "b", initiative: 1 }], "a"), null);
});

check("égalité : une place, sans sauter le suivant", () => {
  const sorted = [
    { id: "a", initiative: 5 },
    { id: "b", initiative: 5 },
    { id: "c", initiative: 5 },
    { id: "d", initiative: 1 }
  ];
  const changes = stepBack(sorted, "a");
  assert.deepEqual(orderAfter(sorted, changes), ["b", "a", "c", "d"]);
  const values = new Map(changes.map(change => [change.id, change.initiative]));
  assert.ok(values.get("b") > values.get("a"));
  assert.ok(values.get("a") > values.get("c"));
  assert.ok(values.get("c") > 1);
});

console.log("initiative.test.mjs : ok");
