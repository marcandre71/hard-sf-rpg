/**
 * Esquive personnelle opposée. Sans Foundry. `node tests/esquive.test.mjs`
 *
 * Réf. LdR v0.2 §2, §6, §7 et §11. Décision Marc 08/11/2026.
 * Les fonctions testées sont celles que la carte et le tour appellent.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skillScore } from "../module/dice/skill-score.mjs";
import { compareOpposed } from "../module/ships/combat.mjs";
import {
  attackDamageGate,
  attackFullyApplied,
  blankReaction,
  canRollDodge,
  canSkipDodge,
  commitDodgeClaim,
  defenderDamage,
  dodgeEntry,
  dodgeOfferReminder,
  finishDodge,
  holdsDodge,
  keptAttackDamage,
  markDefenderApplied,
  markSpent,
  mergeDodgeTargets,
  openDodge,
  personalOpposed,
  reactionOnLaunch,
  reactionOnTurnStart,
  releaseDodge,
  reopenDamage,
  skipDodge
} from "../module/dice/esquive.mjs";

function check(label, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`échec : ${label}`);
    console.error(error);
    process.exit(1);
  }
}

const pending = dodgeEntry({ uuid: "Actor.a", name: "Ilka", hasRef: true, tracked: true, reactionSpent: false });

check("opposition : une réussite, DR, score modifié, égalité au défenseur", () => {
  assert.equal(personalOpposed(
    { success: true, dr: 1, score: 40 },
    { success: false, dr: 0, score: 80 }
  ), "attack");
  assert.equal(personalOpposed(
    { success: false, dr: 0, score: 90 },
    { success: true, dr: 0, score: 20 }
  ), "defender");
  assert.equal(personalOpposed(
    { success: true, dr: 3, score: 40 },
    { success: true, dr: 1, score: 90 }
  ), "attack");
  assert.equal(personalOpposed(
    { success: true, dr: 2, score: 55 },
    { success: true, dr: 2, score: 70 }
  ), "defender");
  assert.equal(personalOpposed(
    { success: true, dr: 2, score: 55 },
    { success: true, dr: 2, score: 55 }
  ), "defender");
  assert.equal(personalOpposed(
    { success: false, dr: 0, score: 80 },
    { success: false, dr: 0, score: 10 }
  ), "defender");
  assert.equal(compareOpposed(
    { success: true, dr: 2, score: 55 },
    { success: true, dr: 2, score: 55 },
    { useScore: true, scoreOnFailure: false }
  ), "tie");
  assert.equal(personalOpposed(
    { success: true, dr: 4, score: 60, critical: "success" },
    { success: true, dr: 5, score: 40 }
  ), "defender");
});

check("la touche garde le DR de l'attaque", () => {
  assert.deepEqual(keptAttackDamage(4, 10, "attack"), { dr: 4, damage: 14 });
  assert.equal(keptAttackDamage(1, 10, "defender"), null);
  const won = keptAttackDamage(2, 8, "attack");
  assert.equal(won.damage, 10);
  assert.notEqual(won.dr, 6);
});

check("annuler ne dépense pas, le jet effectif dépense même raté", () => {
  const claim = commitDodgeClaim({ "Actor.a": pending }, "Actor.a", "user-1");
  assert.equal(claim.ok, true);
  assert.equal(holdsDodge(claim.map["Actor.a"], "user-1"), true);
  const again = commitDodgeClaim(claim.map, "Actor.a", "user-2");
  assert.equal(again.ok, false);
  assert.equal(holdsDodge(again.map["Actor.a"], "user-2"), false);
  const released = releaseDodge(claim.map["Actor.a"], "user-1");
  assert.equal(released.ok, true);
  assert.equal(released.spent, false);
  assert.equal(released.entry.state, "pending");
  assert.equal(attackDamageGate({ "Actor.a": released.entry }), false);
  const spent = reactionOnLaunch({ tracked: true, state: blankReaction() });
  assert.equal(spent.spend, true);
  assert.equal(spent.state.spent, true);
  const lost = personalOpposed(
    { success: true, dr: 3, score: 50 },
    { success: true, dr: 1, score: 40 }
  );
  assert.equal(lost, "attack");
  assert.equal(reactionOnLaunch({ tracked: true, state: spent.state }).refused, true);
});

check("passage MJ et fenêtre annulée : état cohérent, humains et machines", () => {
  const passed = skipDodge(pending, true);
  assert.equal(passed.ok, true);
  assert.equal(passed.spent, false);
  assert.equal(passed.entry.state, "skipped");
  assert.equal(defenderDamage(passed.entry, { dr: 3 }).write, true);
  assert.equal(defenderDamage(passed.entry, { dr: 3 }).dr, 3);
  assert.equal(skipDodge(pending, false).ok, false);
  assert.equal(canSkipDodge(pending, true), true);
  const rolling = commitDodgeClaim({ "Actor.a": pending }, "Actor.a", "mj").map["Actor.a"];
  assert.equal(skipDodge(rolling, true).ok, false);
  const human = dodgeEntry({ uuid: "Actor.h", name: "Ilka", hasRef: true });
  const machine = dodgeEntry({ uuid: "Actor.d", name: "Luciole", hasRef: false });
  assert.equal(human.state, "pending");
  assert.equal(machine.state, "no-ref");
  assert.equal(canRollDodge({
    entry: human,
    isOwner: true,
    isGM: false,
    tracked: true,
    reactionSpent: false,
    stunned: true
  }), true);
  assert.equal(canRollDodge({
    entry: human,
    isOwner: false,
    isGM: false,
    tracked: true,
    reactionSpent: false
  }), false);
  assert.equal(defenderDamage(machine, { dr: 2 }).write, true);
  assert.equal(defenderDamage(machine, { dr: 2 }).dr, 2);
});

check("une esquive n'annule pas l'autre touche", () => {
  const map = openDodge([
    { uuid: "Actor.a", name: "A", hasRef: true },
    { uuid: "Actor.b", name: "B", hasRef: true }
  ]);
  const claimed = commitDodgeClaim(map, "Actor.a", "user-a");
  const evaded = finishDodge(claimed.map["Actor.a"], "user-a", "defender").entry;
  const failed = finishDodge(
    commitDodgeClaim(map, "Actor.b", "user-b").map["Actor.b"],
    "user-b",
    "attack"
  ).entry;
  const plans = {
    "Actor.a": defenderDamage(evaded, { dr: 4 }),
    "Actor.b": defenderDamage(failed, { dr: 4 })
  };
  assert.equal(plans["Actor.a"].write, false);
  assert.equal(plans["Actor.a"].reason, "evaded");
  assert.equal(plans["Actor.b"].write, true);
  assert.equal(plans["Actor.b"].dr, 4);
  const written = {
    "Actor.a": evaded,
    "Actor.b": markDefenderApplied(failed)
  };
  assert.equal(defenderDamage(written["Actor.b"], { dr: 4 }).reason, "already");
  assert.equal(reopenDamage(written)["Actor.a"].state, "evaded");
  assert.equal(reopenDamage(written)["Actor.b"].applied, false);
  assert.equal(attackFullyApplied(written), true);
});

check("réaction : prochain tour du défenseur, pas un tour rejoué, pas hors combat", () => {
  const outside = reactionOnLaunch({ tracked: false, state: blankReaction() });
  assert.equal(outside.spend, false);
  assert.equal(outside.remind, true);
  assert.equal(outside.state.spent, false);
  const spent = markSpent(blankReaction()).state;
  const replayed = reactionOnTurnStart({
    ...spent,
    turnNonce: 1,
    lastStart: { round: 1, turn: 0, combatantId: "c1" }
  }, { round: 1, turn: 0, combatantId: "c1" });
  assert.equal(replayed.replay, true);
  assert.equal(replayed.cleared, false);
  assert.equal(replayed.state.spent, true);
  const other = reactionOnTurnStart(spent, { round: 1, turn: 1, combatantId: "c2" });
  assert.equal(other.cleared, true);
  assert.equal(other.state.spent, false);
  const ownNext = reactionOnTurnStart(
    { spent: true, spentNonce: 1, turnNonce: 1, lastStart: { round: 1, turn: 0, combatantId: "c1" } },
    { round: 2, turn: 0, combatantId: "c1" }
  );
  assert.equal(ownNext.cleared, true);
  assert.equal(ownNext.state.turnNonce, 2);
  const added = mergeDodgeTargets(
    { "Actor.a": { state: "evaded", name: "A", applied: false } },
    [{ uuid: "Actor.a", name: "A", hasRef: true }, { uuid: "Actor.c", name: "C", hasRef: true }]
  );
  assert.equal(added.changed, true);
  assert.equal(added.map["Actor.a"].state, "evaded");
  assert.equal(added.map["Actor.c"].state, "pending");
  assert.equal(attackDamageGate(added.map), false);
});

check("rappel d'offre sur la carte, rafale non bloquante", () => {
  const pendingMap = openDodge([{ uuid: "Actor.a", name: "A", hasRef: true }]);
  assert.equal(dodgeOfferReminder(pendingMap), true);
  assert.equal(dodgeOfferReminder({ "Actor.d": dodgeEntry({ name: "Luciole", hasRef: false }) }), false);
  assert.equal(dodgeOfferReminder({ "Actor.a": skipDodge(pending, true).entry }), false);
  const lang = readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8");
  assert.equal(lang.includes("rafales multiples"), true);
  assert.equal(lang.includes("coup par coup"), true);
  assert.equal(JSON.parse(lang).SOL.Dodge.eligibility.includes("Rafale"), true);
});

check("sans RÉF : la formule de compétence ne ouvre pas l'esquive", () => {
  const rated = skillScore(
    { coo: { value: 50 }, ada: { value: 60 } },
    { characteristic: "ref", training: 40, trainingRequired: false }
  );
  assert.equal(rated.impossible, false);
  assert.equal(rated.score, 40);
  const entry = dodgeEntry({ uuid: "Actor.s", name: "Synth", hasRef: false });
  assert.equal(entry.state, "no-ref");
  assert.equal(defenderDamage(entry, { dr: 2 }).write, true);
  assert.equal(dodgeOfferReminder({ "Actor.s": entry }), false);
});

check("TESTER §22 décrit les cas manuels", () => {
  const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
  assert.equal(tester.includes("## 22. 0.9.8 Esquive personnelle"), true);
  assert.equal(tester.includes("Passer l'esquive"), true);
  assert.equal(tester.includes("Sans combat démarré"), true);
  assert.equal(tester.includes("coup par coup"), true);
  assert.equal(tester.includes("score autonome"), true);
  assert.equal(tester.includes("lance quand même sur sa RÉF"), true);
});

console.log("esquive.test.mjs : ok");
