/**
 * Ordre du tour spatial, esquive, portée, delta-v. Sans Foundry.
 * Réf. Vaisseaux v0.1 §1 et §3.
 */
import { readFileSync } from "node:fs";
import { SHIP_POST_IDS } from "../module/ships/hull.mjs";
import {
  actingOrder,
  blocksCharacterCombat,
  blankCombat,
  compareOpposed,
  currentStep,
  deltaVAfterRangeChange,
  deltaVAfterThrust,
  duplicateActors,
  evadeFromDr,
  finishRound,
  nextPost,
  normalizeCombat,
  settle,
  roundDeltaV,
  shiftRange,
  suggestedModifier,
  thrustCostKmS,
  turnOf,
  turnSchedule,
  weaponCanFire
} from "../module/ships/combat.mjs";
import { matchesSkillSpec, skillsForPost } from "../module/ships/post-skills.mjs";

const fr = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));

let failed = 0;

/**
 * @param {boolean} ok
 * @param {string} message
 * @returns {void}
 */
function check(ok, message) {
  if ( ok ) return;
  failed += 1;
  console.error(message);
}

/**
 * @param {number} actual
 * @param {number} expected
 * @returns {boolean}
 */
function near(actual, expected) {
  return Math.abs(actual - expected) < 1e-9;
}

const expectedCost = 21 * 0.001 * 9.80665 * 60 / 1000;
check(near(thrustCostKmS(21), expectedCost), `21 milli-g → ${expectedCost} km/s`);
check(near(thrustCostKmS(21) * 1000, 12.356379), "21 milli-g → 12,356 m/s, sans arrondi à 12");
check(thrustCostKmS(0) === 0 && thrustCostKmS(-3) === 0 && thrustCostKmS("x") === 0, "pas de poussée si l'accélération n'est pas positive");
check(near(deltaVAfterThrust(3.6, 21), 3.6 - expectedCost), "3,6 km/s moins le produit exact");
check(roundDeltaV(3.6 - expectedCost) === 3.588, "avant l'écriture, 3 décimales : 3,588");
check(roundDeltaV(thrustCostKmS(21)) === 0.012, "le coût de manœuvre arrondi vaut 0,012 km/s");
check(deltaVAfterRangeChange(3.6, 21) === 3.588, "changer de portée : 3,6 − 0,012 = 3,588");
check(deltaVAfterRangeChange(0.001, 21) === 0, "la manœuvre ne passe pas sous 0");
check(deltaVAfterThrust(3.6, 0) === 3.6, "accélération nulle : le delta-v ne bouge pas");
check(deltaVAfterThrust(0.001, 21) === 0, "le delta-v ne passe pas sous 0");

check(evadeFromDr(1, true) === -10, "1 DR : −10");
check(evadeFromDr(2, true) === -20, "2 DR : −20");
check(evadeFromDr(4, true) === -30, "4 DR plafonnés à −30");
check(evadeFromDr(2, false) === 0, "un échec n'esquive pas");
check(evadeFromDr(0, true) === -10, "réussite à 0 DR : −10");

const gunner = {
  postId: "gunner",
  range: "medium",
  ship: { lock: false, commanderPost: "gunner" },
  foe: { evade: -30 },
  aim: "module"
};
check(suggestedModifier(gunner) === 10 - 20 - 30 - 40, "artilleur : +10, sans verrou −20, esquive −30, module −40");
check(suggestedModifier({ ...gunner, weaponCondition: "degraded" }) === 10 - 20 - 30 - 40 - 20, "arme dégradée : −20 de plus pour l'artilleur");
check(suggestedModifier({ postId: "pilot", ship: { pilotBonus: true }, weaponCondition: "degraded" }) === 10, "le −20 dégradé ne s'ajoute pas au pilote");
check(suggestedModifier({
  postId: "gunner",
  range: "close",
  ship: { lock: true },
  foe: { evade: 0 },
  aim: "none"
}) === 0, "proche et verrouillé, sans visée : 0");
check(suggestedModifier({
  postId: "pilot",
  range: "long",
  ship: { lock: false, commanderPost: "pilot", pilotBonus: true },
  foe: { evade: -30 },
  aim: "module"
}) === 20, "le pilote prend le +10 du commandant et celui du navigateur, pas le malus de tir");
check(suggestedModifier({
  postId: "gunner",
  range: "close",
  ship: {},
  foe: {},
  aim: "section"
}) === -20, "hors combat la portée est proche : seule la visée compte");

const closeOnly = { category: "weapon", condition: "intact", rangeClose: true, rangeMedium: false, rangeLong: false };
check(weaponCanFire(closeOnly, "close") === true && weaponCanFire(closeOnly, "medium") === false, "une arme de portée proche ne tire pas à moyenne");
check(weaponCanFire({ ...closeOnly, condition: "out" }, "close") === false, "hors service : pas de tir");
check(weaponCanFire({ ...closeOnly, condition: "unset" }, "close") === false, "non renseigné : pas de tir");
check(weaponCanFire({ ...closeOnly, condition: "degraded" }, "close") === true, "dégradé : le tir reste possible, le −20 n'est pas dans cette fonction");
const missile = { category: "weapon", condition: "intact", rangeClose: false, rangeMedium: true, rangeLong: true };
check(weaponCanFire(missile, "medium") === true && weaponCanFire(missile, "long") === true && weaponCanFire(missile, "close") === false, "missile : moyenne et lointaine");
check(weaponCanFire({ category: "propulsion", condition: "intact", rangeClose: true }, "close") === false, "un moteur n'est pas une arme");

check(shiftRange("close", "closer") === "close", "déjà proche : on ne se rapproche plus");
check(shiftRange("long", "farther") === "long", "déjà lointaine : on ne s'éloigne plus");
check(shiftRange("medium", "closer") === "close" && shiftRange("medium", "farther") === "long", "une portée de chaque côté");

check(compareOpposed({ success: true, dr: 1, score: 10 }, { success: false, dr: 0, score: 90 }) === "a", "une réussite bat un échec");
check(compareOpposed({ success: true, dr: 2, score: 40 }, { success: true, dr: 4, score: 40 }) === "b", "deux réussites : le plus gros DR");
check(compareOpposed({ success: true, dr: 2, score: 40 }, { success: true, dr: 2, score: 65 }, { useScore: true }) === "b", "même DR : le score, à l'ouverture");
check(compareOpposed({ success: true, dr: 2, score: 50 }, { success: true, dr: 2, score: 50 }, { useScore: true }) === "tie", "scores égaux : le MJ choisit");
check(compareOpposed({ success: false, dr: 0, de: 4, score: 80 }, { success: false, dr: 0, de: 1, score: 40 }, { useScore: true }) === "a", "deux échecs : le score, pas les DE");
check(compareOpposed({ success: true, dr: 1, score: 80 }, { success: true, dr: 1, score: 40 }, { useScore: true }) === "a", "changement de portée : à DR égal, le meilleur score");
check(compareOpposed({ success: true, dr: 1, score: 40 }, { success: true, dr: 1, score: 40 }, { useScore: true }) === "tie", "scores égaux : la portée ne bouge pas");
check(compareOpposed({ success: false, de: 5, score: 90 }, { success: false, de: 1, score: 10 }) === "tie", "les DE ne départagent pas");

check(blocksCharacterCombat("ship") === true && blocksCharacterCombat("vehicle") === true, "vaisseau et véhicule : pas le tracker des personnages");
check(blocksCharacterCombat("character") === false && blocksCharacterCombat("npc") === false, "personnage et PNJ restent dans le tracker");

check(duplicateActors([{ uuid: "A" }, { uuid: "" }, { uuid: "A" }, { uuid: "B" }]).join() === "A", "un acteur sur deux postes");
check(duplicateActors([{ uuid: "A" }, { uuid: "B" }]).length === 0, "postes distincts");

const two = normalizeCombat({ ships: ["A", "B"], range: "long", firstSide: null });
check(SHIP_POST_IDS.join() === "commander,operator,navigator,pilot,gunner,engineer,medic", "ordre des postes");
const schedule = turnSchedule(two);
check(schedule.length === 14, "quatorze créneaux");
check(schedule[0].postId === "commander" && schedule[0].uuid === "A" && schedule[0].side === 0, "commandant du premier");
check(schedule[1].postId === "commander" && schedule[1].uuid === "B" && schedule[1].side === 1, "puis le commandant de l'autre");
check(schedule[4].postId === "navigator" && schedule[5].postId === "navigator", "le navigateur passe avant le pilote");
check(schedule[6].postId === "pilot" && schedule[7].postId === "pilot", "le pilote exécute après le calcul");
check(schedule[13].postId === "medic" && schedule[13].uuid === "B", "le médecin du second ferme le tour");
check(actingOrder({ ships: ["A", "B"], firstSide: 1 }).join() === "B,A", "le vainqueur de l'ouverture passe devant");
const swapped = turnSchedule(normalizeCombat({ ships: ["A", "B"], firstSide: 1 }));
check(swapped[0].uuid === "B" && swapped[1].uuid === "A", "à chaque poste, le premier désigné puis l'autre");

let cursor = two;
const seen = [];
for ( let step = 0; step < 20; step++ ) {
  const here = currentStep(cursor);
  seen.push(`${here.postId}:${here.side}:${here.shipUuid}`);
  const stepped = nextPost(cursor);
  if ( stepped.done ) break;
  cursor = stepped.state;
}
check(seen.length === 14 && seen[0] === "commander:0:A" && seen[1] === "commander:1:B" && seen[2] === "operator:0:A" && seen[4] === "navigator:0:A" && seen[6] === "pilot:0:A", "le poste suivant avance, sans boucler");

let kept = normalizeCombat({
  ships: ["A", "B"],
  postIndex: SHIP_POST_IDS.indexOf("navigator"),
  side: 0,
  turns: { A: { lock: true, pilotBonus: true } }
});
kept = nextPost(kept).state;
kept = nextPost(kept).state;
check(currentStep(kept).postId === "pilot" && currentStep(kept).shipUuid === "A", "après le navigateur, on arrive au pilote");
check(turnOf(kept, "A").pilotBonus === true && suggestedModifier({ postId: "pilot", ship: turnOf(kept, "A") }) === 10, "le +10 de Calculer tient jusqu'au jet du pilote");
const cleared = finishRound(kept);
check(cleared.state.turns.A.pilotBonus === false && cleared.state.turns.A.lock === true, "le +10 part à la fin du tour, le verrouillage reste");
check(nextPost(cursor).done === true, "après le dernier médecin, le tour est fini");

const skip = nextPost(normalizeCombat({ ships: ["A", ""], postIndex: 0, side: 0 }));
check(skip.done === false && skip.state.postIndex === 1 && skip.state.side === 0 && currentStep(skip.state).shipUuid === "A", "un côté vide est sauté");
check(nextPost(normalizeCombat({ ships: ["", ""] })).done === true, "deux côtés vides : rien à jouer");
const settled = settle(normalizeCombat({ ships: ["", "B"], postIndex: 0, side: 0 }));
check(settled.done === false && settled.state.side === 1 && currentStep(settled.state).shipUuid === "B", "le créneau courant vide avance");

const round = finishRound(normalizeCombat({
  round: 2,
  ships: ["A", "B"],
  turns: {
    A: { thrust: true, lock: true, evade: -20, commanderPost: "gunner", pilotBonus: true },
    B: { thrust: false, lock: false, evade: -10, commanderPost: "pilot", pilotBonus: true }
  }
}), {
  A: { acceleration: 21, deltaV: 3.6 },
  B: { acceleration: 0, deltaV: 3.6 }
});
check(round.state.round === 3 && round.state.postIndex === 0 && round.state.side === 0, "tour suivant : compteur + 1, retour au commandant");
check(round.state.turns.A.lock === true && round.state.turns.A.thrust === false, "le verrouillage reste, la poussée s'efface");
check(round.state.turns.A.evade === 0 && round.state.turns.A.commanderPost === "" && round.state.turns.A.pilotBonus === false, "esquive et bonus du tour s'effacent");
check(round.state.turns.B.evade === 0 && round.state.turns.B.pilotBonus === false, "l'autre vaisseau aussi");
check(round.deductions.length === 1 && round.deductions[0].uuid === "A" && near(round.deductions[0].value, 3.6 - expectedCost), "seule la poussée cochée enlève du delta-v");

check(blankCombat().range === "medium" && blankCombat().ships.join() === ",", "combat vide : portée moyenne, deux côtés");

const pilot = skillsForPost("pilot", [{
  name: "Pilotage : fusion",
  system: { characteristic: "coo", trainingRequired: true, untrainedAllowed: false, training: 0 }
}]);
check(pilot.length === 1 && pilot[0].virtual === false && pilot[0].system.untrainedAllowed === false, "la fusion garde l'interdiction sans formation");
check(matchesSkillSpec("Mécanique", { kind: "exact", name: "Mécanique" }) === true, "Mécanique exacte");
check(matchesSkillSpec("Mécanique orbitale", { kind: "exact", name: "Mécanique" }) === false, "Mécanique orbitale n'est pas Mécanique");
const engineer = skillsForPost("engineer", [
  { name: "Mécanique orbitale", system: { characteristic: "int" } },
  { name: "Mécanique", system: { characteristic: "int", trainingRequired: false } }
]);
check(engineer.some(skill => skill.name === "Mécanique" && skill.virtual === false), "l'ingénieur peut jeter Mécanique");
check(!engineer.some(skill => skill.name === "Mécanique orbitale"), "Mécanique orbitale ne s'offre pas à l'ingénieur");
check(engineer.some(skill => skill.name === "Réacteurs et propulsion" && skill.virtual === true), "sans réacteurs sur la fiche, la spécialité reste proposable");
const medic = skillsForPost("medic", [{ name: "Médecine : trauma", system: { characteristic: "int" } }]);
check(medic.some(skill => skill.name === "Médecine : trauma") && medic.some(skill => skill.name === "Premiers secours"), "médecin : médecine ou premiers secours");

for ( const key of ["title", "notInTracker", "hitLater", "incident", "tie", "thrustLine", "duplicate"] ) {
  check(typeof fr.SOL.Space[key] === "string" && fr.SOL.Space[key].length > 0, `libellé SOL.Space.${key}`);
}

if ( failed ) {
  console.error(`${failed} échec(s)`);
  process.exit(1);
}
console.log("tests/space.test.mjs : ordre, esquive, portée et delta-v ok.");
