/**
 * Classement de l'initiative glissante, sans Foundry.
 * `node tests/initiative.test.mjs`
 *
 * Réf. LdR v0.2 §7. Décision Marc 18/10/2026 : réussites avant échecs,
 * moins de DE d'abord, égalité à la RÉF.
 */
import assert from "node:assert/strict";
import {
  compareByFoundryInitiative,
  deferToEnd,
  encodeInitiative,
  flagDeletionUpdate,
  indexAfterRoll,
  initiativeRollPlan,
  INITIATIVE_SUCCESS_BASE,
  interruptTiming,
  repositionPlacement,
  repositionTiming,
  resetAllFlagUpdate,
  resolveDeferred,
  reflexScore,
  severityDefers,
  shouldClearRank,
  showRankLabel,
  sortByInitiative,
  stepBack,
  vigilanceBaseScore
} from "../module/dice/initiative.mjs";
import { mapMessageMode } from "../module/dice/chat.mjs";

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
  return sortByInitiative(ranks.map(rank => ({
    id: rank.id,
    initiative: encodeInitiative(rank)
  }))).map(entry => entry.id);
}

/**
 * @param {Array<{ id: string, initiative: number|null }>} sorted
 * @param {Array<{ id: string, initiative: number }>|null} changes
 * @returns {string[]}
 */
function orderAfter(sorted, changes) {
  const values = new Map(sorted.map(entry => [entry.id, entry.initiative]));
  for ( const change of changes ?? [] ) values.set(change.id, change.initiative);
  return sortByInitiative([...values.entries()].map(([id, initiative]) => ({ id, initiative })))
    .map(entry => entry.id);
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

check("objet Vigilance sans PER : formation seule, pas d'avertissement", () => {
  const rated = vigilanceBaseScore(
    { for: { value: 30 } },
    [{
      name: "Vigilance",
      system: { characteristic: "per", training: 15, trainingRequired: false }
    }],
    "Vigilance"
  );
  assert.equal(rated.score, 15);
  assert.equal(rated.missingPerception, false);
  assert.equal(rated.impossible, false);
});

check("interrompu actif : reporté au round suivant", () => {
  // Ordre A, B, C. A est le tour en cours (index 0, turn 0).
  assert.equal(interruptTiming(0, 0), "defer");
});

check("interrompu déjà joué : reporté au round suivant", () => {
  // B est actif (turn 1). A (index 0) a déjà joué.
  assert.equal(interruptTiming(0, 1), "defer");
  assert.equal(interruptTiming(1, 1), "defer");
});

check("interrompu pas encore joué : tout de suite", () => {
  // A est actif (turn 0). B (index 1) et C (index 2) n'ont pas joué.
  assert.equal(interruptTiming(1, 0), "now");
  assert.equal(interruptTiming(2, 1), "now");
  assert.equal(interruptTiming(0, null), "now");
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

check("se replacer, actif : au round suivant", () => {
  // A, B, C. B est actif (index 1, turn 1) et se replace.
  assert.equal(repositionTiming(1, 1), "defer");
});

check("se replacer, déjà joué : au round suivant", () => {
  // B est actif. A (index 0) a déjà joué et se replace.
  assert.equal(repositionTiming(0, 1), "defer");
});

check("se replacer, pas encore joué : tout de suite", () => {
  // B est actif. C (index 2) n'a pas joué et se replace.
  assert.equal(repositionTiming(2, 1), "now");
});

check("égalité d'initiative : identifiant par code de caractère", () => {
  const order = sortByInitiative([
    { id: "é", initiative: 5 },
    { id: "z", initiative: 5 },
    { id: "m", initiative: 9 }
  ]);
  assert.deepEqual(order.map(entry => entry.id), ["m", "z", "é"]);
  assert.equal(compareByFoundryInitiative(
    { id: "é", initiative: 5 },
    { id: "z", initiative: 5 }
  ), 1);
  assert.ok("é" > "z");
});

check("effacer rank : initiative vide ou saisie à la main", () => {
  assert.equal(shouldClearRank(true, {}), true);
  assert.equal(shouldClearRank(true, { systemWrite: true }), false);
  assert.equal(shouldClearRank(true, { setsRank: true }), false);
  assert.equal(shouldClearRank(false, {}), false);
  assert.equal(showRankLabel(null, { success: true }), false);
  assert.equal(showRankLabel(1_002_057, { success: true }), true);
  assert.equal(showRankLabel(4, null), false);
});

check("se replacer reporté : le nouveau rang prend sa place au passage", () => {
  const sorted = [
    { id: "a", initiative: 10 },
    {
      id: "b",
      initiative: 8,
      pendingInitiative: { initiative: 3, rank: { success: false, dr: 0, de: 2, ref: 0 } }
    },
    { id: "c", initiative: 6 }
  ];
  const updates = resolveDeferred(sorted);
  const values = new Map(sorted.map(entry => [entry.id, entry.initiative]));
  for ( const update of updates ) {
    if ( typeof update.initiative === "number" ) values.set(update.id, update.initiative);
  }
  const order = sortByInitiative([...values].map(([id, initiative]) => ({ id, initiative })));
  assert.deepEqual(order.map(entry => entry.id), ["a", "c", "b"]);
  const b = updates.find(update => update.id === "b");
  assert.equal(b.clearPending, true);
  assert.equal(b.rank.de, 2);
});

check("pendingInitiative puis fin d'ordre, une seule passe", () => {
  const sorted = [
    {
      id: "a",
      initiative: 10,
      deferEnd: true,
      pendingInitiative: { initiative: 50, rank: { success: true, dr: 2, de: 0, ref: 1 } }
    },
    { id: "b", initiative: 8 },
    { id: "c", initiative: 6 }
  ];
  const updates = resolveDeferred(sorted);
  const a = updates.find(update => update.id === "a");
  assert.equal(a.clearEnd, true);
  assert.equal(a.clearPending, true);
  assert.equal(a.rank.dr, 2);
  assert.ok(a.initiative < 6);
  const again = resolveDeferred(sorted.map(entry => ({
    ...entry,
    deferEnd: false,
    pendingInitiative: null,
    initiative: updates.find(update => update.id === entry.id)?.initiative ?? entry.initiative
  })));
  assert.deepEqual(again, []);
});

check("recul : égalité devant, le suivant ne remonte pas", () => {
  const sorted = [
    { id: "m1", initiative: 40 },
    { id: "m2", initiative: 40 },
    { id: "P", initiative: 30 }
  ];
  const changes = stepBack(sorted, "m2");
  assert.deepEqual(orderAfter(sorted, changes), ["m1", "P", "m2"]);
  assert.deepEqual(changes.map(change => change.id).sort(), ["P", "m2"]);
});

check("recul : fin d'un groupe d'égalité, les précédents restent", () => {
  const sorted = [
    { id: "B2", initiative: 40 },
    { id: "a1", initiative: 40 },
    { id: "c3", initiative: 40 },
    { id: "e5", initiative: 40 },
    { id: "D4", initiative: 30 }
  ];
  const changes = stepBack(sorted, "e5");
  assert.deepEqual(orderAfter(sorted, changes), ["B2", "a1", "c3", "D4", "e5"]);
  assert.deepEqual(changes.map(change => change.id).sort(), ["D4", "e5"]);
});

/**
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {Array<{ id: string, initiative: number }>} sorted
 * @param {Array<{ id: string, initiative?: number }>} updates
 * @returns {string[]}
 */
function orderFromUpdates(sorted, updates) {
  const values = new Map(sorted.map(entry => [entry.id, entry.initiative]));
  for ( const update of updates ) {
    if ( typeof update.initiative === "number" ) values.set(update.id, update.initiative);
  }
  return sortByInitiative([...values].map(([id, initiative]) => ({ id, initiative })))
    .map(entry => entry.id);
}

check("égalités aléatoires : aucun tiers ne change de place", () => {
  const random = mulberry32(0x5e7);
  for ( let n = 0; n < 80; n += 1 ) {
    const count = 3 + Math.floor(random() * 6);
    const sorted = [];
    for ( let i = 0; i < count; i += 1 ) {
      const tied = i > 0 && random() < 0.65;
      sorted.push({
        id: `n${n}i${i}`,
        initiative: tied ? sorted[i - 1].initiative : 50 - i
      });
    }
    const index = Math.floor(random() * (count - 1));
    const id = sorted[index].id;
    const nextId = sorted[index + 1].id;
    const changes = stepBack(sorted, id);
    const expected = sorted.map(entry => entry.id);
    expected[index] = nextId;
    expected[index + 1] = id;
    assert.deepEqual(orderAfter(sorted, changes), expected);
    if ( sorted[index].initiative !== sorted[index + 1].initiative ) {
      assert.deepEqual(changes.map(change => change.id).sort(), [id, nextId].sort());
    }
    const flagged = sorted.map(entry => ({ ...entry, deferStep: entry.id === id }));
    assert.deepEqual(orderFromUpdates(sorted, resolveDeferred(flagged)), expected);
  }
});

check("se replacer devant l'actif : au round suivant", () => {
  const order = [
    { id: "A", initiative: 30 },
    { id: "B", initiative: 20 },
    { id: "C", initiative: 10 },
    { id: "D", initiative: 5 }
  ];
  const ahead = indexAfterRoll(order, "C", 40);
  assert.equal(ahead, 0);
  assert.equal(repositionPlacement(2, ahead, 0), "defer");
  const behind = indexAfterRoll(order, "C", 15);
  assert.equal(behind, 2);
  assert.equal(repositionPlacement(2, behind, 0), "now");
});

check("premier jet en cours de round, devant l'actif : écrit tout de suite", () => {
  // A est actif. C vient d'être ajouté, sans initiative, et tire devant A.
  const order = [
    { id: "A", initiative: 30 },
    { id: "B", initiative: 20 },
    { id: "C", initiative: null }
  ];
  const newIndex = indexAfterRoll(order, "C", 40);
  assert.equal(newIndex, 0);
  const plan = initiativeRollPlan({
    started: true,
    alone: true,
    initiative: null,
    currentIndex: 2,
    newIndex,
    turn: 0
  });
  assert.equal(plan.likeReposition, false);
  assert.equal(plan.defer, false);
  assert.equal(plan.writeNow, true);
  assert.equal(plan.preserveActive, true);
  assert.equal(plan.keepIndex, false);
  // Le même jet, s'il avait déjà une initiative, est un « se replacer ».
  const again = initiativeRollPlan({
    started: true,
    alone: true,
    initiative: 10,
    currentIndex: 2,
    newIndex: 0,
    turn: 0
  });
  assert.equal(again.likeReposition, true);
  assert.equal(again.defer, true);
  assert.equal(again.writeNow, false);
});

check("resetAll retire rank, pending, recul et fin d'ordre", () => {
  const marker = { op: "ForcedDeletion" };
  const v14 = resetAllFlagUpdate(marker);
  assert.equal(v14["flags.sol-nouvelle-ere.deferStep"], false);
  assert.equal(v14["flags.sol-nouvelle-ere.deferEnd"], false);
  assert.equal(v14["flags.sol-nouvelle-ere.rank"], marker);
  assert.equal(v14["flags.sol-nouvelle-ere.pendingInitiative"], marker);
  assert.equal(v14["flags.sol-nouvelle-ere.-=rank"], undefined);
  const v13 = resetAllFlagUpdate(null);
  assert.equal(v13["flags.sol-nouvelle-ere.-=rank"], null);
  assert.equal(v13["flags.sol-nouvelle-ere.-=pendingInitiative"], null);
  assert.equal(v13["flags.sol-nouvelle-ere.rank"], undefined);
  assert.deepEqual(flagDeletionUpdate("rank", null), { "flags.sol-nouvelle-ere.-=rank": null });
  const cleared = [
    { id: "a", initiative: null, deferStep: false, deferEnd: false, pendingInitiative: null },
    { id: "b", initiative: 5 }
  ];
  assert.deepEqual(resolveDeferred(cleared), []);
});

check("modes de carte v13 et v14", () => {
  assert.equal(mapMessageMode("public", "v13"), "publicroll");
  assert.equal(mapMessageMode("gm", "v13"), "gmroll");
  assert.equal(mapMessageMode("blind", "v13"), "blindroll");
  assert.equal(mapMessageMode("self", "v13"), "selfroll");
  assert.equal(mapMessageMode("publicroll", "v14"), "public");
  assert.equal(mapMessageMode("gmroll", "v14"), "gm");
  assert.equal(mapMessageMode("blindroll", "v14"), "blind");
  assert.equal(mapMessageMode("selfroll", "v14"), "self");
  assert.equal(mapMessageMode("public", "v14"), "public");
  assert.equal(mapMessageMode("gmroll", "v13"), "gmroll");
  assert.equal(mapMessageMode(null, "v14"), null);
});

console.log("initiative.test.mjs : ok");
