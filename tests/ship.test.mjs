/**
 * État des modules et blindage de section, sans Foundry.
 * Réf. Vaisseaux v0.1 §4 et §5. Décision Marc 21/10/2026.
 */
import { readFileSync } from "node:fs";
import {
  MODULE_DEGRADED,
  MODULE_INTACT,
  MODULE_OUT,
  MODULE_UNSET,
  NPC_CREW_SCORES,
  REACTOR_HEAT_MAX,
  SHIP_MODULE_CATEGORIES,
  SHIP_POST_IDS,
  SHIP_SECTION_IDS,
  armorBonus,
  clampModuleDiff,
  clampShipDiff,
  clampValueMax,
  departureMass,
  displayedArmor,
  effectiveClampCurrent,
  followedRadiatorIntegrity,
  moduleCondition,
  parsedNumber,
  sectionHasPlate
} from "../module/ships/hull.mjs";
import { migrateShipModuleSource, migrateShipSource } from "../module/ships/migrate.mjs";
import { SHIP_TYPE_GROUPS } from "../module/ships/types.mjs";

const fr = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));

/**
 * @param {string} key
 * @returns {boolean}
 */
function hasLabel(key) {
  let cursor = fr;
  for ( const part of key.split(".") ) {
    if ( !cursor || typeof cursor !== "object" || !(part in cursor) ) return false;
    cursor = cursor[part];
  }
  return typeof cursor === "string" && cursor.length > 0;
}

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

check(moduleCondition(10, 10) === MODULE_INTACT, "10/10 intact");
check(moduleCondition(6, 10) === MODULE_INTACT, "6/10 est plus que la moitié");
check(moduleCondition(5, 10) === MODULE_DEGRADED, "5/10 est la moitié : dégradé");
check(moduleCondition(1, 10) === MODULE_DEGRADED, "1/10 dégradé");
check(moduleCondition(0, 10) === MODULE_OUT, "0 hors service");
check(moduleCondition(-1, 10) === MODULE_OUT, "négatif hors service");
check(moduleCondition(3, 5) === MODULE_INTACT, "3 > 2,5 : intact, sans arrondi");
check(moduleCondition(2.5, 5) === MODULE_DEGRADED, "2,5 n'est pas plus que la moitié");
check(moduleCondition(2, 5) === MODULE_DEGRADED, "2/5 dégradé");
check(moduleCondition(0, 0) === MODULE_UNSET, "0/0 non renseigné");
check(moduleCondition(1, 0) === MODULE_UNSET, "maximum 0 : non renseigné, même avec une valeur");
check(moduleCondition(4, -1) === MODULE_UNSET, "maximum négatif : non renseigné");
check(moduleCondition("x", 10) === MODULE_OUT, "valeur non numérique hors service");
check(moduleCondition(4, "x") === MODULE_UNSET, "maximum non numérique : non renseigné");

const plate = [
  { category: "armor", section: "bow", armorPoints: 4, integrity: { value: 6, max: 6 } },
  { category: "armor", section: "bow", armorPoints: 2, integrity: { value: 2, max: 4 } },
  { category: "armor", section: "bow", armorPoints: 9, integrity: { value: 0, max: 4 } },
  { category: "armor", section: "stern", armorPoints: 5, integrity: { value: 5, max: 5 } },
  { category: "weapon", section: "bow", armorPoints: 100, integrity: { value: 4, max: 4 } }
];

check(armorBonus(plate, "bow") === 6, "blindage : intact 4 + dégradé 2, hors service ignoré");
check(displayedArmor("bow", 8, plate) === 14, "plaque 8 + bonus 6");
check(displayedArmor("bow", "non", plate) === 6, "plaque illisible : bonus seul");
check(displayedArmor("radiators", 0, plate) === null, "radiateurs : pas de plaque");
check(sectionHasPlate("stern") === true, "la poupe a une plaque");
check(sectionHasPlate("radiators") === false, "les radiateurs n'ont pas de plaque");
check(armorBonus([{ category: "armor", section: "port", armorPoints: 0, condition: MODULE_INTACT }], "port") === 0, "0 point n'ajoute rien");
check(armorBonus([{ category: "armor", section: "bow", armorPoints: 3, integrity: { value: 0, max: 0 } }], "bow") === 0, "blindage non renseigné n'ajoute rien");
check(armorBonus([{ category: "armor", section: "bow", armorPoints: 3, integrity: { value: 2, max: 4 } }], "bow") === 3, "blindage dégradé garde tous ses points");

check(departureMass(80, 150) === 230, "Petite Fortune : 80 + 150 = 230");
check(departureMass("80", "150") === 230, "masses numériques en chaîne");
check(departureMass(null, 10) === 10, "masse à vide absente");

const pair = { value: 5 };
clampValueMax(pair, { value: 1, max: 3.6 });
check(pair.value === 3.6 && !("max" in pair), "valeur seule rabattue au maximum stocké, sans écrire max");
const raised = { max: 2 };
clampValueMax(raised, { value: 3.6, max: 4 });
check(raised.value === 2 && raised.max === 2, "maximum seul sous la valeur stockée : la valeur est rabattue");
const both = { value: 9, max: 4 };
clampValueMax(both, { value: 0, max: 0 });
check(both.value === 4 && both.max === 4, "les deux clés : la valeur ne dépasse pas le maximum du diff");
const untouched = { value: 2, max: 4 };
clampValueMax(untouched, { value: 9, max: 1 });
check(untouched.value === 2 && untouched.max === 4, "une valeur déjà sous le maximum reste");
const emptyPair = {};
clampValueMax(emptyPair, { value: 9, max: 1 });
check(!("value" in emptyPair) && !("max" in emptyPair), "une paire sans clé n'est pas remplie");

const descriptionOnlyShip = { description: "<p>x</p>" };
clampShipDiff(descriptionOnlyShip, { propulsion: { deltaV: { value: 9, max: 1 } }, sections: { bow: { integrity: { value: 9, max: 1 } } } });
check(!("propulsion" in descriptionOnlyShip) && !("sections" in descriptionOnlyShip), "un diff de description ne gagne ni propulsion ni sections");
const typeOnly = { propulsion: { type: "eau" } };
clampShipDiff(typeOnly, { propulsion: { deltaV: { value: 9, max: 1 } } });
check(!("deltaV" in typeOnly.propulsion), "un type de propulsion ne gagne pas de delta-v");
const delta = { propulsion: { deltaV: { value: 5 } } };
clampShipDiff(delta, { propulsion: { deltaV: { value: 3.6, max: 3.6 } } });
check(delta.propulsion.deltaV.value === 3.6 && !("max" in delta.propulsion.deltaV), "delta-v : 5 ramené à 3,6, max non injecté");
const sectionClamp = { sections: { bow: { integrity: { value: 30, max: 20 } } } };
clampShipDiff(sectionClamp, {});
check(sectionClamp.sections.bow.integrity.value === 20 && !("armor" in sectionClamp.sections.bow) && !("port" in sectionClamp.sections), "intégrité de section ramenée, sans plaque ni autre section");

const massOnly = { mass: 2 };
clampModuleDiff(massOnly, { integrity: { value: 9, max: 1 } });
check(!("integrity" in massOnly), "un diff de masse ne gagne pas d'Intégrité");
const moduleValue = { integrity: { value: 9 } };
clampModuleDiff(moduleValue, { integrity: { value: 1, max: 4 } });
check(moduleValue.integrity.value === 4 && !("max" in moduleValue.integrity), "Intégrité : valeur ramenée au maximum stocké");
const moduleMax = { integrity: { max: 2 } };
clampModuleDiff(moduleMax, { integrity: { value: 6, max: 6 } });
check(moduleMax.integrity.value === 2 && moduleMax.integrity.max === 2, "baisser le maximum rabat aussi la valeur stockée");

const radiators = followedRadiatorIntegrity([
  { name: "Radiateurs repliables", category: "radiators", section: "radiators", integrity: { value: 6, max: 6 } },
  { name: "Autre", category: "radiators", section: "stern", integrity: { value: 1, max: 4 } },
  { name: "Moteur", category: "propulsion", section: "radiators", integrity: { value: 10, max: 10 } }
]);
check(radiators.length === 1 && radiators[0].condition === MODULE_INTACT && radiators[0].value === 6, "intégrité suivie : le module Radiateurs de la section");

check(REACTOR_HEAT_MAX === 10, "jauge 0–10");
check(NPC_CREW_SCORES.blue === 35 && NPC_CREW_SCORES.trained === 50 && NPC_CREW_SCORES.veteran === 65 && NPC_CREW_SCORES.elite === 80, "scores PNJ");

check(parsedNumber("") === null && parsedNumber("  ") === null && parsedNumber(null) === null, "une case vide n'est pas un nombre");
check(parsedNumber("0") === 0 && parsedNumber("4") === 4 && parsedNumber("abc") === null, "0 reste 0, un texte illisible est ignoré");

const unlinkedDelta = { propulsion: { deltaV: { value: 5 } } };
const unlinkedBase = { propulsion: { deltaV: { value: 3.6, max: 3.6 } } };
const unlinkedCurrent = effectiveClampCurrent(unlinkedDelta, unlinkedBase);
check(unlinkedCurrent.propulsion.deltaV.max === 3.6 && unlinkedCurrent.propulsion.deltaV.value === 5, "token non lié : le maximum se lit sur l'acteur de base");
const unlinkedDiff = { propulsion: { deltaV: { value: 5 } } };
clampShipDiff(unlinkedDiff, unlinkedCurrent);
check(unlinkedDiff.propulsion.deltaV.value === 3.6 && !("max" in unlinkedDiff.propulsion.deltaV), "token non lié : 5 ramené à 3,6, max non injecté");
const descriptionWithBase = { description: "<p>x</p>" };
clampShipDiff(descriptionWithBase, effectiveClampCurrent(descriptionWithBase, unlinkedBase));
check(!("propulsion" in descriptionWithBase) && !("sections" in descriptionWithBase), "lire le maximum de base n'écrit rien dans un diff de description");

const descriptionOnly = { description: "<p>x</p>" };
migrateShipSource(descriptionOnly);
check(!("category" in descriptionOnly) && !("shipType" in descriptionOnly) && !("sections" in descriptionOnly), "un diff sans catégorie n'en reçoit pas");

const oldRadiators = { sections: { radiators: { integrity: { value: 6, max: 6 } } } };
migrateShipSource(oldRadiators);
check(!("integrity" in oldRadiators.sections.radiators) && oldRadiators.sections.radiators["-=integrity"] === null, "l'intégrité de section des radiateurs est retirée");
const bowOnly = { sections: { bow: { integrity: { value: 1, max: 1 } } } };
migrateShipSource(bowOnly);
check(!("radiators" in bowOnly.sections) && bowOnly.sections.bow.integrity.value === 1, "une autre section ne gagne pas de radiateurs");

const station = { category: "station", description: "<p>a</p>" };
migrateShipSource(station);
check(station.category === "fixed" && station.description === "<p>a</p>" && !("sections" in station), "station devient objet fixe, sans autres champs");

const oldShip = { category: "ship" };
migrateShipSource(oldShip);
check(oldShip.category === "void" && !("npcCrew" in oldShip), "ancienne clé ship devient void, sans défauts");

const kept = { category: "atmospheric" };
migrateShipSource(kept);
check(kept.category === "atmospheric", "une catégorie déjà nouvelle reste");

const moduleDiff = { mass: 2 };
migrateShipModuleSource(moduleDiff);
check(!("state" in moduleDiff) && !("category" in moduleDiff) && !("integrity" in moduleDiff), "un diff de masse ne gagne ni état ni catégorie");

const known = { category: "propulsion", state: "usé" };
migrateShipModuleSource(known);
check(known.category === "propulsion" && !("state" in known) && !("integrity" in known), "l'état libre est retiré, pas recopié dans l'Intégrité");

const legacy = { category: "arme de bord", effects: "<p>x</p>" };
migrateShipModuleSource(legacy);
check(legacy.category === "other" && legacy.effects.includes("arme de bord") && legacy.effects.includes("<p>x</p>"), "texte libre gardé dans les effets");

const onlyCategory = { category: "arme de bord" };
migrateShipModuleSource(onlyCategory);
check(onlyCategory.category === "other" && !("effects" in onlyCategory), "sans effects, on n'injecte pas le champ");

const emptyCategory = { category: "" };
migrateShipModuleSource(emptyCategory);
check(emptyCategory.category === "other", "catégorie vide devenue other");

const hostile = { category: "<script>", effects: "" };
migrateShipModuleSource(hostile);
check(hostile.effects.includes("&lt;script&gt;") && !hostile.effects.includes("<script>"), "l'ancien libellé est échappé");

const typeIds = SHIP_TYPE_GROUPS.flatMap(group => group.types.map(type => type.id));
check(new Set(typeIds).size === typeIds.length, "types de vaisseau uniques");
check(typeIds.length === 61, `61 types attendus, ${typeIds.length}`);
for ( const id of typeIds ) check(hasLabel(`SOL.Ship.type.${id}`), `libellé type ${id}`);
for ( const id of SHIP_SECTION_IDS ) check(hasLabel(`SOL.Ship.section.${id}`), `libellé section ${id}`);
for ( const id of SHIP_POST_IDS ) check(hasLabel(`SOL.Ship.post.${id}`), `libellé poste ${id}`);
for ( const id of SHIP_MODULE_CATEGORIES ) check(hasLabel(`SOL.ShipModule.category.${id}`), `libellé catégorie ${id}`);
for ( const id of ["atmospheric", "void", "fixed"] ) check(hasLabel(`SOL.Ship.category.${id}`), `libellé catégorie vaisseau ${id}`);
for ( const id of ["intact", "degraded", "out", "unset"] ) check(hasLabel(`SOL.ShipModule.condition.${id}`), `libellé état ${id}`);
check(hasLabel("SOL.Ship.post.fromPack"), "libellé refus compendium");

const fortune = JSON.parse(readFileSync(new URL("../packs/_source/ships/PetiteFortune001.json", import.meta.url), "utf8"));
check(fortune.name === "Petite Fortune" && fortune.system.shipType === "prospector" && fortune.system.category === "void", "Petite Fortune : prospecteur du vide");
check(fortune.system.mass.dry === 80 && fortune.system.mass.reaction === 150 && fortune.system.mass.reactionNature === "water", "masses du §8");
check(departureMass(fortune.system.mass.dry, fortune.system.mass.reaction) === 230, "230 t au départ");
check(fortune.system.propulsion.acceleration === 21 && fortune.system.propulsion.deltaV.value === 3.6 && fortune.system.propulsion.deltaV.max === 3.6, "21 milli-g et delta-v 3,6");
check(fortune.system.reserves.air === 90 && fortune.system.reserves.water === 180 && fortune.system.reserves.food === 150, "réserves");
check(fortune.system.heat.value === 0 && fortune.system.spareParts === 6 && fortune.system.npcCrew === "trained", "chaleur, pièces, équipage");
check(fortune.system.sections.bow.integrity.value === 20 && fortune.system.sections.bow.armor.value === 8, "proue 20 / 8");
check(!fortune.system.sections.radiators.integrity && fortune.system.sections.radiators.armor === undefined, "radiateurs : pas d'intégrité de section stockée, pas de plaque");
check(fortune.items.length === 13, "13 modules embarqués");
check(!fortune.items.some(item => item.name === "Laser de défense"), "les repères d'armes ne sont pas sur le vaisseau");
const drill = fortune.items.find(item => item.name === "Laser de forage");
check(drill?.system.category === "weapon" && drill.system.weapon.damage === 6 && drill.system.weapon.rangeClose === true && drill.system.weapon.rangeMedium === false && drill.system.weapon.heatPerShot === 1, "laser de forage");
const massSum = fortune.items.reduce((sum, item) => sum + item.system.mass, 0);
check(massSum === 52, `masse des modules 52 t, reçu ${massSum}`);
const embeddedEngine = fortune.items.find(item => item._id === "ModPFMoteur00001");
const looseEngine = JSON.parse(readFileSync(new URL("../packs/_source/ship-modules/ModPFMoteur00001.json", import.meta.url), "utf8"));
check(embeddedEngine?.system.effects.includes("350 s") && embeddedEngine.system.effects.includes("21 milli-g") && embeddedEngine.system.effects.includes("47 kN") && embeddedEngine.system.effects.includes("2,9 h") && !embeddedEngine.system.effects.includes("49 kN"), "texte moteur embarqué");
check(looseEngine.system.effects === embeddedEngine.system.effects && looseEngine._stats.systemVersion === "0.7.1" && fortune._stats.systemVersion === "0.7.1", "les deux textes moteur et la version des documents changés");
check(embeddedEngine.system.effects === looseEngine.system.effects, "le module moteur des deux packs a le même texte");
check(fortune.system.description.includes("21 milli-g") && fortune.system.description.includes("3,6") && !fortune.system.description.includes("380"), "texte de l'acteur aligné");
for ( const file of ["ModExLaserDef001.json", "ModExCanonEM0001.json", "ModExMissile0001.json"] ) {
  const weapon = JSON.parse(readFileSync(new URL(`../packs/_source/ship-modules/${file}`, import.meta.url), "utf8"));
  check(weapon.system.integrity.value === 4 && weapon.system.integrity.max === 4, `${file} : intégrité 4/4`);
  check(weapon.system.effects.includes("Intégrité provisoire, ajustable en jeu"), `${file} : effets décidés`);
  check(weapon.system.mass === 0, `${file} : masse encore non écrite`);
}
const shipModel = readFileSync(new URL("../module/data/ship.mjs", import.meta.url), "utf8");
const deltaLine = shipModel.split("\n").find(line => line.includes("deltaV:"));
check(Boolean(deltaLine) && !deltaLine.includes("integer"), "le champ delta-v n'est pas entier : 3,6 est accepté");

if ( failed ) {
  console.error(`${failed} échec(s)`);
  process.exit(1);
}
console.log("tests/ship.test.mjs : état, blindage et migrations ok.");
