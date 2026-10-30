/**
 * Combat spatial simplifié. Sans Foundry.
 * Réf. Vaisseaux v0.1 §1 et §3. Réf. LdR v0.2 §6 et §7.
 */
import { readFileSync } from "node:fs";
import { encodeInitiative } from "../module/dice/initiative.mjs";
import { cappedModifier, rollModifier } from "../module/dice/d100.mjs";
import { SHIP_POST_IDS } from "../module/ships/hull.mjs";
import {
  POST_ACTIONS,
  actionBelongsToPost,
  blocksCharacterCombat,
  bonusesCleared,
  compareOpposed,
  duplicateActors,
  emptyPostScore,
  evadeFromDr,
  acceptedTokenScene,
  pickCombatant,
  rangeDifferWarning,
  isOwnTarget,
  lockAfterRoll,
  lockCleared,
  lockCovers,
  lockRollAllowed,
  mayAuthorStrike,
  refusesManeuver,
  roundAdvanced,
  roundClearRequested,
  sharedRange,
  targetIdentity,
  shiftRange,
  shipInitiativeBasis,
  ammoBlocksFire,
  linkedActorTwins,
  suggestedModifier,
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

check(evadeFromDr(1, true) === -10, "1 DR : −10");
check(evadeFromDr(2, true) === -20, "2 DR : −20");
check(evadeFromDr(4, true) === -30, "4 DR plafonnés à −30");
check(evadeFromDr(2, false) === 0, "un échec n'esquive pas");
check(evadeFromDr(0, true) === -10, "réussite à 0 DR : −10, max(10, 0)");

const gunner = {
  postId: "gunner",
  range: "medium",
  ship: { lock: false, commanderPost: "gunner" },
  foe: { evade: -30 },
  aim: "module"
};
check(suggestedModifier(gunner) === 10 - 20 - 30 - 40, "artilleur : +10, sans verrou −20, esquive −30, module −40");
const stacked = suggestedModifier({ ...gunner, weaponCondition: "degraded", range: "long" });
check(stacked === 10 - 20 - 30 - 40 - 20, "arme dégradée : −20 de plus, total au-delà de −50");
check(rollModifier(0, stacked, 0, { shipPost: true }) === stacked, "jet de poste : le total au-delà de ±50 n'est pas borné");
check(rollModifier(0, stacked, 0, { shipPost: false }) === -50, "jet de personnage : le même total est borné à −50");
check(cappedModifier(0, stacked) === -50, "cappedModifier reste le plafond des personnages");
check(rollModifier(30, 30, 0, { shipPost: true }) === 60, "jet de poste : +60 n'est pas ramené à +50");
check(rollModifier(30, 30) === 50, "jet de personnage : +60 est ramené à +50");
check(rollModifier(-30, -40, 0, { shipPost: true }) === -70, "initiative de vaisseau : un total au-delà de ±50 n'est pas borné");
check(rollModifier(-30, -40, 0, { shipPost: false }) === -50, "initiative de personnage : le même total est borné à −50");
check(suggestedModifier({ postId: "pilot", ship: { pilotBonus: true }, weaponCondition: "degraded" }) === 10, "le −20 dégradé ne s'ajoute pas au pilote");
check(suggestedModifier({
  postId: "gunner",
  range: "close",
  ship: { lock: true },
  foe: { evade: 0 },
  aim: "none"
}) === 0, "proche : pas de −20, même verrouillé");
check(suggestedModifier({
  postId: "gunner",
  range: "medium",
  ship: { lock: "Token.A" },
  fireTarget: "Token.A",
  foe: { evade: 0 },
  aim: "none"
}) === 0, "bonne cible : le −20 ne s'applique pas");
check(suggestedModifier({
  postId: "gunner",
  range: "long",
  ship: { lock: "Token.A" },
  fireTarget: "Token.B",
  foe: { evade: 0 },
  aim: "none"
}) === -20, "autre cible : −20 au-delà de Proche");
check(lockCovers("Token.A", "Token.A") === true && lockCovers("Token.A", "Token.B") === false, "le verrouillage ne couvre que cette cible");
check(lockCovers(true, "Token.A") === false && lockCovers("", "Token.A") === false, "sans identité, pas de couverture");
const replaced = lockAfterRoll({ lock: "Token.A", evade: -10 }, true, "Token.B");
check(replaced.lock === "Token.B" && replaced.evade === -10, "un nouveau verrouillage remplace l'ancien");
const kept = lockAfterRoll({ lock: "Token.A", evade: -10 }, false, "Token.B");
check(kept.lock === "Token.A", "un échec ne remplace pas le verrouillage");
const removed = lockCleared(replaced);
check(removed.lock === "" && removed.evade === -10, "le MJ retire le verrouillage, l'esquive reste");
check(targetIdentity({ tokenUuid: "Token.A", actorUuid: "Actor.1" }) === "Token.A", "l'identité préfère le jeton");
check(targetIdentity({ actorUuid: "Actor.1" }) === "Actor.1", "sans jeton, l'acteur");
check(isOwnTarget(
  { tokenUuid: "Token.A", actorUuid: "Actor.1" },
  { tokenUuid: "Token.B", actorUuid: "Actor.1" }
) === false, "même acteur, autre jeton : une autre cible");
check(isOwnTarget(
  { tokenUuid: "Token.A", actorUuid: "Actor.1" },
  { tokenUuid: "Token.A", actorUuid: "Actor.1" }
) === true, "le jeton qui manœuvre n'est pas une cible");
check(lockRollAllowed(1) === true && lockRollAllowed(0) === false && lockRollAllowed(2) === false, "verrouiller : une seule cible, sinon pas de jet");
check(suggestedModifier({
  postId: "pilot",
  range: "long",
  ship: { lock: false, commanderPost: "pilot", pilotBonus: true },
  foe: { evade: -30 },
  aim: "module"
}) === 20, "Calculer vaut pour le jet du pilote, avec le +10 du commandant");
check(suggestedModifier({
  postId: "pilot",
  ship: { pilotBonus: true }
}) === 10, "Changer de portée est un jet du pilote : le +10 de Calculer s'y ajoute aussi");
check(suggestedModifier({
  postId: "gunner",
  range: "close",
  ship: {},
  foe: {},
  aim: "section"
}) === -20, "visée d'une section : −20");
check(suggestedModifier({ postId: "operator", sensorsOut: true }) === -20, "capteurs hors service : −20 à l'opérateur");
check(suggestedModifier({
  postId: "gunner",
  range: "close",
  sensorsOut: true,
  aim: "none",
  foe: { evade: 0 }
}) === -20, "capteurs hors service : −20 à l'artilleur");
check(suggestedModifier({ postId: "pilot", ship: { pilotBonus: true }, twisted: true }) === -10, "structure tordue : −20 au pilote, avec Calculer");
check(suggestedModifier({
  postId: "gunner",
  range: "close",
  twisted: true,
  aim: "none",
  foe: { evade: 0 }
}) === 0, "structure tordue : pas de malus à l'artilleur");

const closeOnly = { category: "weapon", condition: "intact", rangeClose: true, rangeMedium: false, rangeLong: false };
check(weaponCanFire(closeOnly, "close") === true && weaponCanFire(closeOnly, "medium") === false, "une arme de portée proche ne tire pas à moyenne");
check(weaponCanFire({ ...closeOnly, condition: "out" }, "close") === false, "hors service : pas de tir");
check(weaponCanFire({ ...closeOnly, condition: "unset" }, "close") === false, "non renseigné : pas de tir");
check(weaponCanFire({ ...closeOnly, condition: "degraded" }, "close") === true, "dégradé : le tir reste possible");
const missile = { category: "weapon", condition: "intact", rangeClose: false, rangeMedium: true, rangeLong: true };
check(weaponCanFire(missile, "medium") === true && weaponCanFire(missile, "long") === true && weaponCanFire(missile, "close") === false, "missile : moyenne et lointaine");
check(weaponCanFire({ ...missile, ammo: null }, "medium") === true && weaponCanFire({ ...missile, ammo: { value: null, max: null } }, "long") === true, "munitions non saisies : le missile peut partir");
check(weaponCanFire({ ...closeOnly, ammo: 0 }, "close") === false && weaponCanFire({ ...closeOnly, ammo: { value: 0, max: 4 } }, "close") === false, "munitions à 0 : pas de tir");
check(weaponCanFire({ ...closeOnly, ammo: 1 }, "close") === true, "une munition : le tir part");
check(ammoBlocksFire({ value: 0 }) === true && ammoBlocksFire(null) === false, "le compteur vide ne bloque pas");
check(linkedActorTwins([{ actor: { uuid: "Actor.A" } }, { actorUuid: "Actor.A" }], "Actor.A") === true, "deux lignes du même acteur");
check(linkedActorTwins([{ actor: { uuid: "Actor.A" } }, { actor: { uuid: "Actor.B" } }], "Actor.A") === false, "un seul jeton : pas le message");
check(weaponCanFire({ category: "propulsion", condition: "intact", rangeClose: true }, "close") === false, "un moteur n'est pas une arme");

check(shiftRange("close", "closer") === "close", "déjà proche : on ne se rapproche plus");
check(shiftRange("long", "farther") === "long", "déjà lointaine : on ne s'éloigne plus");
check(shiftRange("medium", "closer") === "close" && shiftRange("medium", "farther") === "long", "une portée de chaque côté");
check(sharedRange("medium", "closer") === "close", "manœuvre gagnée : on part de la portée du vaisseau qui manœuvre");
check(sharedRange("long", "nope") === null, "sans direction, la portée n'est pas réécrite");
const differ = rangeDifferWarning("Proche", "Moyenne");
check(differ?.key === "SOL.Space.rangeDiffer" && differ.maneuver === "Proche" && differ.other === "Moyenne", "fiches différentes : clé i18n");
check(rangeDifferWarning("Moyenne", "Moyenne") === null, "mêmes portées : pas d'avertissement");
check(fr.SOL.Space.rangeDiffer === "les portées des deux fiches diffèrent : {maneuver} / {other}", "libellé des portées, français");

check(compareOpposed({ success: true, dr: 1, score: 10 }, { success: false, dr: 0, score: 90 }) === "a", "une réussite bat un échec");
check(compareOpposed({ success: true, dr: 2, score: 40 }, { success: true, dr: 4, score: 40 }) === "b", "deux réussites : le plus gros DR");
check(compareOpposed({ success: true, dr: 1, score: 80 }, { success: true, dr: 1, score: 40 }, { useScore: true, scoreOnFailure: false }) === "a", "changement de portée : deux réussites au même DR, le score");
check(compareOpposed({ success: true, dr: 1, score: 40 }, { success: true, dr: 1, score: 40 }, { useScore: true, scoreOnFailure: false }) === "tie", "scores égaux : la portée ne bouge pas");
check(compareOpposed({ success: false, dr: 0, score: 80 }, { success: false, dr: 0, score: 40 }, { useScore: true, scoreOnFailure: false }) === "tie", "changement de portée : deux échecs, personne ne gagne");
check(compareOpposed({ success: false, de: 5, score: 90 }, { success: false, de: 1, score: 10 }) === "tie", "les DE ne départagent pas");

check(blocksCharacterCombat("ship") === false, "le vaisseau entre dans le Combat Tracker");
check(blocksCharacterCombat("vehicle") === true, "le véhicule reste dehors");
check(blocksCharacterCombat("character") === false && blocksCharacterCombat("npc") === false, "personnage et PNJ restent dans le tracker");
check(refusesManeuver("fixed") === true && refusesManeuver("void") === false && refusesManeuver("atmospheric") === false, "seul l'objet fixe refuse la manœuvre");

check(duplicateActors([{ uuid: "A" }, { uuid: "" }, { uuid: "A" }, { uuid: "B" }]).join() === "A", "un acteur sur deux postes");
check(duplicateActors([{ uuid: "A" }, { uuid: "B" }]).length === 0, "postes distincts");

check(SHIP_POST_IDS.join() === "commander,operator,navigator,pilot,gunner,engineer,medic", "ordre des postes");
check(actionBelongsToPost("commander", "command") === true, "le +10 du commandant a l'id command");
check(actionBelongsToPost("gunner", "command") === false, "command n'appartient pas à l'artilleur");
check(actionBelongsToPost("pilot", "changeRange") === true && actionBelongsToPost("gunner", "changeRange") === false, "changer de portée est un jet de pilote");
check(actionBelongsToPost("toString", "valueOf") === false, "un id hors poste ne lit pas le prototype");
check(actionBelongsToPost("gunner", "fire") === true && actionBelongsToPost("pilot", "fire") === false, "tirer appartient à l'artilleur");
check(mayAuthorStrike({ gm: true }) === true, "le MJ peut valider une carte de tir");
check(mayAuthorStrike({ ownsShip: true }) === true, "un propriétaire du vaisseau peut valider une carte de tir");
check(mayAuthorStrike({ ownsPost: true }) === true, "le propriétaire du personnage au poste peut valider une carte de tir");
check(mayAuthorStrike({ gm: false, ownsShip: false, ownsPost: false }) === false, "un autre joueur ne valide pas la carte de tir");
check(POST_ACTIONS.engineer.join() === "simple,push,patch,repair,restart" && POST_ACTIONS.medic.join() === "simple", "ingénieur : Pousser et réparations ; médecin : un jet");
check(suggestedModifier({ postId: "engineer", heat: 7, ship: {} }) === -10, "chaleur à 7 : −10, y compris Pousser");
check(suggestedModifier({ postId: "pilot", heat: 8, ship: { pilotBonus: true, pushPilot: 20 } }) === 20, "Pousser s'ajoute à Calculer, puis la chaleur");

const cleared = bonusesCleared({
  lock: "Token.A",
  evade: -20,
  commanderPost: "gunner",
  pilotBonus: true,
  thrust: true
});
check(cleared.lock === "Token.A", "au round suivant, cette cible reste verrouillée");
check(cleared.evade === 0 && cleared.commanderPost === "" && cleared.pilotBonus === false, "esquive, commandant et Calculer sont vidés");
check(!Object.hasOwn(cleared, "thrust"), "la poussée du tour n'est plus un champ");
const fresh = bonusesCleared(null);
check(fresh.lock === "" && fresh.evade === 0 && fresh.pilotBonus === false, "tour vide : rien à garder");
check(roundAdvanced(1, 2) === true && roundAdvanced(0, 1) === true, "le round qui augmente vide les bonus");
check(roundAdvanced(2, 1) === false && roundAdvanced(2, 2) === false, "reculer ou rester ne vide pas les bonus");
check(roundAdvanced(undefined, 1) === false && roundAdvanced("x", 2) === false, "sans ancien round lisible, on ne vide pas");
check(roundClearRequested({ previous: { round: 1 } }, { round: 2 }) === true, "un joueur passe le round : previous est là, les bonus se vident");
check(roundClearRequested({ previous: { round: 2 } }, { round: 1 }) === false, "un joueur recule le round : les bonus restent");
check(roundClearRequested({ previous: { round: 1 } }, { turn: 1 }) === false, "changer de tour ne vide pas les bonus");
check(roundClearRequested({}, { round: 2 }) === false, "sans previous, on ne vide pas");

const tokenA = { id: "cA", tokenId: "tokA", actorId: "petite", actor: { uuid: "Actor.petite", id: "petite" } };
const tokenB = { id: "cB", tokenId: "tokB", actorId: "petite", actor: { uuid: "Actor.petite", id: "petite" } };
const shipA = { id: "petite", uuid: "Actor.petite", token: { id: "tokA" } };
check(pickCombatant([tokenA, tokenB], shipA)?.id === "cA", "deux jetons du même acteur, hors tour : A");
check(pickCombatant([tokenB, tokenA], shipA)?.id === "cA", "deux jetons du même acteur, pendant le tour de l'autre : toujours A");
check(pickCombatant([tokenA, tokenB], { id: "petite", uuid: "Actor.petite" }) === null, "barre latérale, deux jetons : on n'en choisit pas un");
check(pickCombatant([tokenA], { id: "petite", uuid: "Actor.sidebar" })?.id === "cA", "barre latérale, un seul candidat : actorId");
const freeA = { id: "cA", tokenId: "tokA", actorId: "base", actor: { uuid: "Scene.s.Token.tokA", id: "base" } };
const freeB = { id: "cB", tokenId: "tokB", actorId: "base", actor: { uuid: "Scene.s.Token.tokB", id: "base" } };
check(pickCombatant([freeB, freeA], { id: "base", uuid: "Scene.s.Token.tokA" })?.id === "cA", "acteur non lié : l'uuid du jeton, pas l'actorId commun");
check(pickCombatant([tokenA, tokenB], { id: "petite", uuid: "Actor.petite", token: { id: "absent" } }) === null, "jeton inconnu : on ne prend pas l'autre");
check(acceptedTokenScene({ documentName: "Token", parentId: "scene1" }, { sceneId: "scene1" }) === true, "jeton de la scène du combat");
check(acceptedTokenScene({ documentName: "Token", parentId: "scene2" }, { sceneId: "scene1" }) === false, "autre scène : refusé");
check(acceptedTokenScene({ documentName: "Actor", parentId: "scene1" }, { sceneId: "scene1" }) === false, "un acteur n'est pas un jeton");
check(acceptedTokenScene({ documentName: "Token" }, { sceneId: "scene1" }) === false, "sans scène du jeton : refusé");

check(emptyPostScore("trained") === 50 && emptyPostScore("blue") === 35 && emptyPostScore("veteran") === 65 && emptyPostScore("elite") === 80, "scores PNJ de 0.7.1");
check(emptyPostScore("nope") === 50 && emptyPostScore(undefined) === 50, "équipage inconnu : entraîné, comme un poste vide");
const npc = shipInitiativeBasis({ npcCrew: "trained" });
check(npc.npc === true && npc.score === 50 && npc.ref === 0, "poste Opérateur vide : 50, RÉF 0");
const operator = shipInitiativeBasis({ npcCrew: "trained", operatorScore: 64, operatorRef: 57 });
check(operator.npc === false && operator.score === 64 && operator.ref === 57, "l'acteur du poste donne son score et sa RÉF");
const shipRank = encodeInitiative({
  success: true, dr: 2, de: 0, ref: operator.ref, critical: "success", score: operator.score
});
const personRank = encodeInitiative({
  success: true, dr: 2, de: 0, ref: 57, critical: "success", score: 64
});
check(shipRank === personRank, "à égalité, même nombre : le vaisseau n'est pas décalé, le MJ réordonne");
const npcRank = encodeInitiative({ success: false, dr: 0, de: 3, ref: npc.ref, critical: null, score: npc.score });
const personNpc = encodeInitiative({ success: false, dr: 0, de: 3, ref: 0, critical: null, score: 50 });
check(npcRank === personNpc, "équipage PNJ : le départage est celui d'un échec à RÉF 0 et score 50");

const pilot = skillsForPost("pilot", [{
  name: "Pilotage : fusion",
  system: { characteristic: "coo", trainingRequired: true, untrainedAllowed: false, training: 0 }
}]);
check(pilot.length === 1 && pilot[0].virtual === false && pilot[0].system.untrainedAllowed === false, "la fusion garde l'interdiction sans formation");
check(matchesSkillSpec("Mécanique", { kind: "exact", name: "Mécanique" }) === true, "Mécanique exacte");
check(matchesSkillSpec("Mécanique orbitale", { kind: "exact", name: "Mécanique" }) === false, "Mécanique orbitale n'est pas Mécanique");
check(matchesSkillSpec("Opérations de bord", { kind: "exact", name: "Opérations de bord" }) === true, "initiative : Opérations de bord");
const engineer = skillsForPost("engineer", [
  { name: "Mécanique orbitale", system: { characteristic: "int" } },
  { name: "Mécanique", system: { characteristic: "int", trainingRequired: false } }
]);
check(engineer.some(skill => skill.name === "Mécanique" && skill.virtual === false), "l'ingénieur peut jeter Mécanique");
check(!engineer.some(skill => skill.name === "Mécanique orbitale"), "Mécanique orbitale ne s'offre pas à l'ingénieur");
check(engineer.some(skill => skill.name === "Réacteurs et propulsion" && skill.virtual === true), "sans réacteurs sur la fiche, la spécialité reste proposable");
const medic = skillsForPost("medic", [{ name: "Médecine : trauma", system: { characteristic: "int" } }]);
check(medic.some(skill => skill.name === "Médecine : trauma") && medic.some(skill => skill.name === "Premiers secours"), "médecin : médecine ou premiers secours");

for ( const key of ["notInTracker", "hitLater", "incident", "duplicate", "noTarget", "lockNoTarget", "lockOneTarget", "clearLock", "lockedOn", "fixedNoManeuver", "relayAction", "rangeDiffer"] ) {
  check(typeof fr.SOL.Space[key] === "string" && fr.SOL.Space[key].length > 0, `libellé SOL.Space.${key}`);
}
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
for ( const language of system.languages ) {
  const pack = JSON.parse(readFileSync(new URL(`../${language.path}`, import.meta.url), "utf8"));
  const sentence = pack.SOL?.Space?.rangeDiffer ?? "";
  check(sentence.includes("{maneuver}") && sentence.includes("{other}"), `SOL.Space.rangeDiffer en ${language.lang}`);
}
for ( const id of ["close", "medium", "long"] ) {
  check(typeof fr.SOL.Ship.range[id] === "string", `portée ${id}`);
}
check(!fr.SOL.Space.open && !fr.SOL.Space.thrust && !fr.SOL.Space.endCombat, "la fenêtre et la poussée du tour n'ont plus de libellé");

const postsTemplate = readFileSync(new URL("../templates/actor/ship-tab-posts.hbs", import.meta.url), "utf8");
check(postsTemplate.includes("clearLock") && postsTemplate.includes("SOL.Space.lockedOn"), "l'onglet Postes montre la cible et le bouton du MJ");
const actions = readFileSync(new URL("../module/ships/actions.mjs", import.meta.url), "utf8");
check(!/settings\.(get|set|register)/.test(actions), "le réglage spaceCombat n'est plus lu ni enregistré");
check(actions.includes("updateCombat") && actions.includes("roundClearRequested") && actions.includes("previous") && !actions.includes("preUpdateCombat"), "les bonus partent sur updateCombat, via previous, même si un joueur passe le round");
check(actions.includes("pickCombatant"), "deux jetons du même acteur passent par pickCombatant");
check(actions.includes("relayWarn") && actions.includes("acceptedTokenScene"), "verrouillage relayé : scène du combat, avertissement chez le joueur");
check(actions.includes("userId est déclaratif") || actions.includes("userId` est déclaratif"), "userId déclaratif est documenté");
const initiativeSrc = readFileSync(new URL("../module/combat/initiative.mjs", import.meta.url), "utf8");
check(/shipPost:\s*ship/.test(initiativeSrc), "l'initiative du vaisseau est un jet de poste, sans plafond");
check(initiativeSrc.includes("Décision Marc 25/10/2026"), "égalité d'initiative : décision du 25/10/2026");

if ( failed ) {
  console.error(`${failed} échec(s)`);
  process.exit(1);
}
console.log("tests/space.test.mjs : initiative, bonus de round, portée et plafond ok.");
