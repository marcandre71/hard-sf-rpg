/**
 * Chaleur, refroidissement, Pousser, critique réacteur, réparations, canon.
 * Sans Foundry. Décision Marc 30/10/2026. Réf. Vaisseaux v0.1 §6 et §7.
 */
import { readFileSync } from "node:fs";
import { incidentModuleValue, resolveReactorCrit } from "../module/ships/damage.mjs";
import {
  FIELD_REPAIR_VALUE,
  addHeat,
  clampHeat,
  coolingDrop,
  heatPenalty,
  combatIdForShip,
  isCannonWeapon,
  noSpareParts,
  repairAlreadyCapped,
  shouldCoolRound,
  uniqueShipIds,
  weaponClass,
  pilotIncident,
  pushHeatGain,
  pushPilotBonus,
  pushRefusal,
  repairGain,
  repairedValue,
  restartRefusal,
  shotAftermath,
  shotFinished
} from "../module/ships/reactor.mjs";

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
 * @param {number[]} sixes
 * @returns {{ d6: () => number, d10: () => number, pick: () => number }}
 */
function scripted(sixes) {
  let at = 0;
  return {
    d6() {
      return sixes[at++] ?? 1;
    },
    d10() {
      return 1;
    },
    pick() {
      return 0;
    }
  };
}

/**
 * @param {object} [partial]
 * @returns {import("../module/ships/damage.mjs").HullState}
 */
function hull(partial = {}) {
  return {
    twisted: false,
    sections: {
      bow: { integrity: 20, integrityMax: 20, armor: 8, destroyed: false },
      port: { integrity: 20, integrityMax: 20, armor: 8, destroyed: false },
      starboard: { integrity: 20, integrityMax: 20, armor: 8, destroyed: false },
      stern: { integrity: 20, integrityMax: 20, armor: 8, destroyed: false, ...(partial.stern ?? {}) },
      radiators: {}
    },
    modules: partial.modules ?? []
  };
}

check(clampHeat(-3) === 0 && clampHeat(12) === 10 && clampHeat(4.8) === 4, "la jauge reste entre 0 et 10");
check(addHeat(9, 1) === 10 && addHeat(10, 4) === 10, "la chaleur ne dépasse pas 10");
check(heatPenalty(6) === 0 && heatPenalty(7) === -10 && heatPenalty(10) === -10, "à 7 : −10");

check(coolingDrop(["intact"], false) === 3, "radiateurs intacts : −3");
check(coolingDrop(["degraded"], false) === 2, "radiateurs dégradés : −2");
check(coolingDrop(["out"], false) === 1, "radiateurs hors service : −1");
check(coolingDrop(["out", "intact"], false) === 3, "plusieurs modules : le meilleur");
check(coolingDrop(["out", "degraded"], false) === 2, "dégradé bat hors service");
check(coolingDrop([], false) === 1 && coolingDrop(["unset"], false) === 1, "sans radiateurs : −1");
check(coolingDrop(["intact"], true) === 1, "repliés : −1 seulement");

check(pushRefusal(8, false) === "" && pushRefusal(9, false) === "heat", "Pousser refusé à 9");
check(pushRefusal(2, true) === "down", "Pousser refusé si le réacteur est coupé");
check(pushHeatGain({ success: true, dr: 2 }).heat === 1 && pushHeatGain({ success: true }).crit === false, "Pousser réussi : +1");
check(pushHeatGain({ success: false, de: 1 }).heat === 2 && pushHeatGain({ success: false, de: 1 }).crit === false, "échec simple : +2, pas de critique");
check(pushHeatGain({ success: false, de: 3 }).heat === 2 && pushHeatGain({ success: false, de: 3 }).crit === true, "3 DE : +2 et le critique");
check(pushHeatGain({ success: false, de: 0, critical: "failure" }).crit === true, "échec critique : le critique réacteur");
check(pushPilotBonus(0) === 10 && pushPilotBonus(2) === 20, "+10 par DR, au moins +10");
check(pilotIncident(2) === false && pilotIncident(3) === true, "incident du Pilote à 3 DE");
check(shotFinished({ success: false }) === true && shotFinished(null) === false, "un jet annulé ne consomme pas");
const laserShot = shotAftermath({ action: "fire", laser: true, heatPerShot: 1, success: false, coolLaser: 0 });
check(laserShot?.heat === 1 && laserShot.cannon === false, "un laser raté chauffe de heatPerShot");
const freeLaser = shotAftermath({ action: "fire", laser: true, heatPerShot: 1, success: true, coolLaser: 1 });
check(freeLaser?.heat === 0 && freeLaser.coolLaser === true, "le second laser de Pousser ne chauffe pas");
const cannonShot = shotAftermath({ action: "fire", cannon: true, success: true });
check(cannonShot?.cannon === true && cannonShot.heat === 0, "un canon retire une munition, sans chaleur");
const hardTurn = shotAftermath({ action: "evade", success: false, de: 3 });
check(hardTurn?.heat === 1 && hardTurn.incident === true, "Esquiver ratée : +1, et l'incident à 3 DE");
check(isCannonWeapon({ name: "Canon électromagnétique" }) === true && isCannonWeapon({ name: "Laser de forage" }) === false, "le canon se reconnaît au nom");
check(weaponClass({ name: "Canon laser" }) === "laser" && isCannonWeapon({ name: "Canon laser" }) === false, "un canon laser est un laser");
check(weaponClass({ kind: "cannon", name: "Laser de forage" }) === "cannon", "un champ explicite gagne sur le nom");
check(shouldCoolRound(undefined, 1) === true && shouldCoolRound(3, 4) === true, "le refroidissement part quand le round avance");
check(shouldCoolRound(3, 3) === false && shouldCoolRound(3, 2) === false, "reculer puis revenir ne refroidit pas deux fois");
check(uniqueShipIds([{ uuid: "A" }, { uuid: "A" }, { uuid: "B" }]).join() === "A,B", "deux jetons du même vaisseau ne refroidissent qu'une fois");
check(combatIdForShip([
  { id: "shown", combatants: [{ actorUuid: "other" }] },
  { id: "ship", combatants: [{ actorUuid: "vessel" }] }
], "vessel") === "ship", "le drapeau vise le combat du vaisseau");
check(repairAlreadyCapped(6, 10, { plate: true }) === true, "plaque déjà à la moitié : pas de jet");
check(repairAlreadyCapped(4, 10, { plate: true }) === false, "plaque sous la moitié : le jet part");
check(repairAlreadyCapped(5, 10, { plate: true, yard: true }) === false, "au chantier, la moitié n'est pas le plafond");
check(repairAlreadyCapped(10, 10, {}) === true, "déjà au maximum : pas de jet");
check(restartRefusal(5, false) === "" && restartRefusal(6, false) === "heat", "redémarrer à 5 ou moins");
check(restartRefusal(1, true) === "module", "module réacteur hors service : pas de redémarrage");

const stop = resolveReactorCrit(hull(), 1, 0, scripted([]));
check(stop.shutdown === true && stop.logs.some(entry => entry.key === "SOL.Ship.reactor.critStop"), "1-2 : arrêt d'urgence");
const leak = resolveReactorCrit(hull(), 4, 0, scripted([]));
check(leak.shutdown === false && leak.logs.some(entry => entry.key === "SOL.Ship.reactor.critLeak"), "3-4 : fuite, rappel seulement");
const boom = resolveReactorCrit(hull({
  stern: { integrity: 12 },
  modules: [{ id: "r", name: "Cœur", category: "reactor", section: "stern", integrity: 4, integrityMax: 4 }]
}), 5, 4, scripted([]));
check(boom.state.modules[0].integrity === 0 && boom.state.sections.stern.integrity === 8, "5 : module à 0, 1D10 sans blindage");
check(!boom.logs.some(entry => entry.key === "SOL.Ship.crit.moduleOut"), "5 : pas de critique de module en plus");
let critDice = 0;
const down = resolveReactorCrit(hull({
  stern: { integrity: 3 },
  modules: [
    { id: "r", name: "Cœur", category: "reactor", section: "stern", integrity: 4, integrityMax: 4 },
    { id: "m", name: "Moteur", category: "propulsion", section: "stern", integrity: 2, integrityMax: 4 }
  ]
}), 5, 9, {
  d6() {
    critDice += 1;
    return 6;
  },
  d10() {
    critDice += 1;
    return 4;
  },
  pick() {
    critDice += 1;
    return 0;
  }
});
check(down.state.sections.stern.integrity === 0 && down.state.sections.stern.destroyed === true, "poupe à 0 : critique de section");
check(down.state.modules.find(entry => entry.id === "m").integrity === 0, "rupture : le module passe hors service");
check(!down.logs.some(entry => entry.key === "SOL.Ship.crit.moduleOut") && critDice === 1, "rupture du réacteur : pas de jet de critique de module");
const dose = resolveReactorCrit(hull(), 6, 0, scripted([]));
check(dose.logs.some(entry => entry.key === "SOL.Ship.reactor.critRadiation") && dose.state.sections.stern.integrity === 20, "6 : rappel de dose, rien d'écrit");

check(repairGain(0) === 5 && repairGain(2) === 15, "5 points, plus 5 par DR");
check(repairedValue(0, 10, 15, { plate: true }) === 5, "plaque : moitié du maximum");
check(repairedValue(0, 10, 15, { plate: true, yard: true }) === 10, "au chantier : jusqu'au maximum");
check(repairedValue(8, 10, 15, { plate: true }) === 8, "déjà au-dessus de la moitié : on ne baisse pas");
check(repairedValue(0, 20, 5, { plate: false }) === 5, "section : +5, plafonné au maximum");
check(repairedValue(18, 20, 15, {}) === 20, "le gain ne dépasse pas le maximum");
check(noSpareParts(0) === true && noSpareParts(1) === false, "sans Pièces, la réparation est refusée");
check(FIELD_REPAIR_VALUE === 1, "réparation de fortune : Intégrité 1");
const degraded = incidentModuleValue(8, 10);
check(degraded?.integrity === 5 && degraded.out === false, "incident : le module devient dégradé");
const thin = incidentModuleValue(1, 1);
check(thin?.integrity === 0 && thin.out === true, "incident, max 1 : hors service");
check(incidentModuleValue(5, 10) === null, "incident : déjà dégradé, on ne change pas");
check(fr.SOL.Ship.incidentModuleOut.includes("hors service"), "incident max 1 : le texte dit hors service");

check(fr.SOL.Ship.reactor.critStop.includes("coupé"), "texte d'arrêt du réacteur");
check(fr.SOL.Ship.repair.bricolage.includes("Bricolage"), "texte sans Pièces");
check(fr.SOL.Ship.cannonSpent.includes("munition"), "texte du canon");

if ( failed ) {
  console.error(`${failed} échec(s)`);
  process.exit(1);
}
console.log("reactor ok");
