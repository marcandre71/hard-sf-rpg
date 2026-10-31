/**
 * État des modules et blindage de section, sans Foundry.
 * Réf. Vaisseaux v0.1 §4 et §5. Décision Marc 21/10/2026.
 */
import { readdirSync, readFileSync } from "node:fs";
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
  keepGmChecks,
  moduleCondition,
  normalizeAmmoEdit,
  requesterIsGm,
  parsedNumber,
  sectionHasPlate
} from "../module/ships/hull.mjs";
import { applySheetDeltaV, formatStoredDeltaV, migrateShipModuleSource, migrateShipSource, nextDeltaVWarning, normalizeDecimalText, roundPresentDeltaV, writeDeltaVInput } from "../module/ships/migrate.mjs";
import { markGroupDisabled, prepareFieldGroups } from "../module/sheets/prepare-fields.mjs";
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
check(!("propulsion" in descriptionOnly) && !("range" in descriptionOnly), "un diff de description ne gagne ni delta-v ni portée");

const exactDelta = { propulsion: { deltaV: { value: 3.587644, max: 3.64 } } };
migrateShipSource(exactDelta);
check(exactDelta.propulsion.deltaV.value === 3.6 && exactDelta.propulsion.deltaV.max === 3.6, "le delta-v existant est arrondi au dixième");
const valueOnly = { propulsion: { deltaV: { value: 3.54 } } };
migrateShipSource(valueOnly);
check(valueOnly.propulsion.deltaV.value === 3.5 && !("max" in valueOnly.propulsion.deltaV), "sans max, on n'en ajoute pas");
const typeOnlyDelta = { propulsion: { type: "eau" } };
migrateShipSource(typeOnlyDelta);
check(!("deltaV" in typeOnlyDelta.propulsion), "un type de propulsion ne gagne pas de delta-v");
const alreadyTenth = { propulsion: { deltaV: { value: 3.6, max: 3.6 } } };
migrateShipSource(alreadyTenth);
check(alreadyTenth.propulsion.deltaV.value === 3.6 && alreadyTenth.propulsion.deltaV.max === 3.6, "Petite Fortune : 3,6 / 3,6 reste 3,6 / 3,6");
const unreadable = { propulsion: { deltaV: { value: "x" } } };
roundPresentDeltaV(unreadable);
check(unreadable.propulsion.deltaV.value === "x", "une valeur illisible n'est pas remplacée par 0");
const typed = { propulsion: { deltaV: { value: 1.26 } } };
roundPresentDeltaV(typed);
check(typed.propulsion.deltaV.value === 1.3, "une saisie 1,26 est arrondie au dixième");

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

const ammoMass = { mass: 1 };
migrateShipModuleSource(ammoMass);
check(!("weapon" in ammoMass), "un diff de masse ne gagne pas de munitions");
const damageOnly = { weapon: { damage: 8 } };
migrateShipModuleSource(damageOnly);
check(!("ammo" in damageOnly.weapon) && !("ammunition" in damageOnly.weapon) && !("class" in damageOnly.weapon), "un diff de dégâts ne gagne ni compteur ni type d'arme");
const four = { weapon: { ammunition: "4", damage: 20 } };
migrateShipModuleSource(four);
check(four.weapon.ammo.value === 4 && four.weapon.ammo.max === 4 && four.weapon.damage === 20 && !("ammunition" in four.weapon), "« 4 » devient 4/4");
const asNumber = { weapon: { ammunition: 4 } };
migrateShipModuleSource(asNumber);
check(asNumber.weapon.ammo.value === 4 && asNumber.weapon.ammo.max === 4, "un entier déjà nombre devient 4/4");
const energy = { weapon: { ammunition: "énergie" }, effects: "<p>x</p>" };
migrateShipModuleSource(energy);
check(!("ammo" in energy.weapon) && !("ammunition" in energy.weapon) && energy.effects.includes("énergie") && energy.effects.includes("<p>x</p>"), "énergie n'écrit pas 0");
const projectiles = { weapon: { ammunition: "20 projectiles" } };
migrateShipModuleSource(projectiles);
check(!("ammo" in projectiles.weapon) && !("effects" in projectiles), "sans effects, le texte non numérique n'est pas injecté");
const keptAmmo = { weapon: { ammunition: "4", ammo: { value: 1, max: 4 } } };
migrateShipModuleSource(keptAmmo);
check(keptAmmo.weapon.ammo.value === 1 && keptAmmo.weapon.ammo.max === 4 && !("ammunition" in keptAmmo.weapon), "un compteur déjà là n'est pas écrasé");
const alreadyText = { weapon: { ammunition: "énergie" }, effects: "énergie" };
migrateShipModuleSource(alreadyText);
check(alreadyText.effects === "énergie", "le texte déjà présent n'est pas recopié");
const clearedAmmo = normalizeAmmoEdit({ value: 4, max: 4 }, "value", null);
check(clearedAmmo.value === null && clearedAmmo.max === 4, "vider la valeur ne vide pas le maximum");
const clearedMax = normalizeAmmoEdit({ value: 4, max: 4 }, "max", null);
check(clearedMax.value === 4 && clearedMax.max === null, "vider le maximum ne vide pas la valeur");
const clampedAmmo = normalizeAmmoEdit({ value: 2, max: 4 }, "value", 10);
check(clampedAmmo.value === 4 && clampedAmmo.max === 4, "une valeur au-dessus du maximum est ramenée");
const loweredMax = normalizeAmmoEdit({ value: 4, max: 4 }, "max", 2);
check(loweredMax.value === 2 && loweredMax.max === 2, "baisser le maximum ramène la valeur");
check(requesterIsGm({ isGM: true }) === true && requesterIsGm({ isGM: false }) === false && requesterIsGm("UserId") === false, "le garde-fou lit l'objet User, pas un id");
const playerSheet = { twisted: false, sections: { stern: { destroyed: false } } };
keepGmChecks(playerSheet, { twisted: true, sections: { stern: { destroyed: true } } });
check(!("twisted" in playerSheet) && !("destroyed" in playerSheet.sections.stern), "un joueur ne décoche pas Structure tordue ni Section détruite");
const gmSheet = { twisted: false, sections: { bow: { destroyed: false } } };
const gmUser = { isGM: true };
if ( !requesterIsGm(gmUser) ) keepGmChecks(gmSheet, { twisted: true, sections: { bow: { destroyed: true } } });
check(gmSheet.twisted === false && gmSheet.sections.bow.destroyed === false, "le MJ peut décocher");

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
check(!fortune.items.some(item => item.name === "Laser de défense" || item.name === "Laser de défense (tourelle)"), "les repères d'armes ne sont pas sur le vaisseau");
const drill = fortune.items.find(item => item._id === "ModPFLaserFor001");
check(drill?.name === "Laser de forage (outil civil)", "laser de forage : nom du catalogue, id déjà là");
check(drill?.system.category === "weapon" && drill.system.weapon.class === "laser" && drill.system.weapon.damage === 6 && drill.system.weapon.rangeClose === true && drill.system.weapon.rangeMedium === false && drill.system.weapon.heatPerShot === 1, "laser de forage");
const tanks = fortune.items.filter(item => item.name === "Réservoir d'eau de masse de réaction (75 t)");
check(tanks.length === 2 && tanks.some(item => item.system.section === "port") && tanks.some(item => item.system.section === "starboard"), "deux réservoirs, nom du catalogue, sections gardées");
const moduleFiles = readdirSync(new URL("../packs/_source/ship-modules/", import.meta.url)).filter(name => name.endsWith(".json"));
check(moduleFiles.length === 39, `39 modules dans le pack, reçu ${moduleFiles.length}`);
for (const gone of ["ModLaserForageC1", "ModLaserDefense1", "ModCasierMissile", "ModAntenneRadio1", "ModCapteursCivil", "ModNucleaireEau1", "ModRadiatPanneau", "ModFissionBimod1", "ModReservoirEau1", "ModSasEvaDrones1", "ModSondesForeuse", "ModSouteMinerai1"]) {
  check(!moduleFiles.some(name => name.includes(gone)), `${gone} : doublon retiré`);
}
const massSum = fortune.items.reduce((sum, item) => sum + item.system.mass, 0);
check(massSum === 52, `masse des modules 52 t, reçu ${massSum}`);
const embeddedEngine = fortune.items.find(item => item._id === "ModPFMoteur00001");
const looseEngine = JSON.parse(readFileSync(new URL("../packs/_source/ship-modules/ModPFMoteur00001.json", import.meta.url), "utf8"));
check(embeddedEngine?.system.effects.includes("350 s") && embeddedEngine.system.effects.includes("21 milli-g") && embeddedEngine.system.effects.includes("47 kN") && embeddedEngine.system.effects.includes("2,9 h") && !embeddedEngine.system.effects.includes("49 kN"), "texte moteur embarqué");
check(looseEngine.system.effects === embeddedEngine.system.effects && looseEngine._stats.systemVersion === "0.7.1" && fortune._stats.systemVersion === "0.7.1", "les deux textes moteur et la version des documents changés");
check(embeddedEngine.system.effects === looseEngine.system.effects, "le module moteur des deux packs a le même texte");
check(fortune.system.description.includes("21 milli-g") && fortune.system.description.includes("3,6") && !fortune.system.description.includes("380"), "texte de l'acteur aligné");
for ( const file of ["ModExLaserDef001.json", "ModExMissile0001.json"] ) {
  const weapon = JSON.parse(readFileSync(new URL(`../packs/_source/ship-modules/${file}`, import.meta.url), "utf8"));
  check(weapon.system.integrity.value === 4 && weapon.system.integrity.max === 4, `${file} : intégrité 4/4`);
  check(weapon.system.effects.includes("Intégrité provisoire, ajustable en jeu"), `${file} : effets décidés`);
  check(weapon.system.mass === 0, `${file} : masse de la Petite Fortune conservée`);
  check(!("ammunition" in weapon.system.weapon), `${file} : plus d'ancien texte de munitions`);
}
const cannonPack = JSON.parse(readFileSync(new URL("../packs/_source/ship-modules/ModExCanonEM0001.json", import.meta.url), "utf8"));
const missilePack = JSON.parse(readFileSync(new URL("../packs/_source/ship-modules/ModExMissile0001.json", import.meta.url), "utf8"));
const laserPack = JSON.parse(readFileSync(new URL("../packs/_source/ship-modules/ModExLaserDef001.json", import.meta.url), "utf8"));
const drillPack = JSON.parse(readFileSync(new URL("../packs/_source/ship-modules/ModPFLaserFor001.json", import.meta.url), "utf8"));
check(cannonPack.system.weapon.ammo.value === 20 && cannonPack.system.weapon.ammo.max === 20, "canon : 20/20");
check(cannonPack.system.mass === 5 && cannonPack.system.weapon.class === "railgun", "canon : masse 5 t, type railgun");
check(cannonPack.system.integrity.value === 4 && !("ammunition" in cannonPack.system.weapon), "canon : intégrité 4, sans ancien texte de munitions");
check(missilePack.system.weapon.ammo.value === 4 && missilePack.system.weapon.ammo.max === 4, "missile : 4/4");
check(missilePack.system.effects.includes("est automatisé") && !missilePack.system.effects.includes("n'est pas automatisé"), "missile : le temps de vol est automatisé");
check(missilePack.system.mass === 0 && missilePack.system.weapon.class === "missile", "missile : masse 0 conservée, type missile");
check(missilePack.name === "Casier lance-missiles (4 missiles)", "missile : nom du catalogue, id conservé");
check(laserPack.system.mass === 0 && laserPack.system.weapon.class === "laser", "laser de défense : masse 0 conservée, type laser");
check(laserPack.system.weapon.ammo.value === null && laserPack.system.weapon.ammo.max === null, "laser de défense : compteur vide");
check(drillPack.system.weapon.ammo.value === null && drillPack.system.weapon.ammo.max === null, "laser de forage : compteur vide");
const shipModel = readFileSync(new URL("../module/data/ship.mjs", import.meta.url), "utf8");
const deltaAt = shipModel.indexOf("deltaV:");
const deltaBlock = shipModel.slice(deltaAt, deltaAt + 280);
check(deltaAt >= 0 && !deltaBlock.includes("integer") && deltaBlock.includes("step: 0.1"), "le delta-v accepte 3,6, au pas de 0,1");
check(shipModel.includes("choices: SOL.shipRanges"), "la fiche a un champ Portée");
check(!shipModel.includes("keepExactDeltaV"), "le stockage exact du delta-v est retiré");

// Schémas factices : objets simples, pas des DataField Foundry.
// Le vrai ShipData est vérifié dans tests/models.test.mjs, seulement si FOUNDRY_PATH est défini.
const number = (label, step) => ({ label, number: true, options: { step } });
const schema = (label, fields) => ({ label, fields });
const sheetFields = {
  propulsion: schema("SOL.Ship.propulsion.label", {
    type: { label: "SOL.Ship.propulsion.type" },
    acceleration: number("SOL.Ship.propulsion.acceleration", 1),
    deltaV: schema("SOL.Ship.propulsion.deltaV", {
      value: number("SOL.Field.value", 0.1),
      max: number("SOL.Field.max", 0.1)
    })
  }),
  integrity: schema("SOL.Ship.integrity", {
    value: number("SOL.Field.value", 1),
    max: number("SOL.Field.max", 1)
  }),
  ammo: schema("SOL.Weapon.ammo", {
    value: number("SOL.Field.value", 1),
    max: number("SOL.Field.max", 1)
  }),
  airReserve: schema("SOL.Armor.airReserve", {
    value: number("SOL.Field.value"),
    max: number("SOL.Field.max")
  }),
  reserve: schema("SOL.Gear.reserve.label", {
    type: { label: "SOL.Gear.reserve.type" },
    value: number("SOL.Field.value"),
    max: number("SOL.Field.max")
  })
};
const prepared = prepareFieldGroups(sheetFields, {
  propulsion: { type: "fusion", acceleration: 21, deltaV: { value: 3.6, max: 3.6 } },
  integrity: { value: 4, max: 4 },
  ammo: { value: 12, max: 20 },
  airReserve: { value: 0.5, max: 1 },
  reserve: { type: "air", value: 1, max: 2 }
});
/**
 * @param {{ rows?: { name: string, decimal?: boolean, value?: unknown, disabled?: boolean }[], groups?: object[] }[]} groups
 * @returns {{ name: string, decimal?: boolean, value?: unknown, disabled?: boolean }[]}
 */
function flatRows(groups) {
  /** @type {{ name: string, decimal?: boolean, value?: unknown, disabled?: boolean }[]} */
  const rows = [];
  for ( const group of groups ?? [] ) {
    rows.push(...(group.rows ?? []));
    rows.push(...flatRows(group.groups));
  }
  return rows;
}
const byName = Object.fromEntries(flatRows(prepared).map(line => [line.name, line]));
check(byName["system.propulsion.deltaV.value"]?.value === 3.6 && byName["system.propulsion.deltaV.value"]?.decimal === true, "propulsion : delta-v actuel, saisie au dixième");
check(byName["system.propulsion.deltaV.max"]?.value === 3.6 && byName["system.propulsion.deltaV.max"]?.decimal === true, "propulsion : delta-v maximum");
check(byName["system.propulsion.type"] && byName["system.propulsion.acceleration"]?.decimal !== true, "type et accélération restent dans le bloc");
check(byName["system.integrity.value"]?.value === 4 && byName["system.integrity.max"]?.value === 4, "intégrité value/max déjà au premier niveau");
check(byName["system.ammo.value"] && byName["system.ammo.max"], "munitions value/max");
check(byName["system.airReserve.value"] && byName["system.airReserve.max"], "réserve d'air value/max");
check(byName["system.reserve.value"] && byName["system.reserve.max"], "réserve d'équipement value/max");
const propulsion = prepared.find(group => group.label === "SOL.Ship.propulsion.label");
check(propulsion?.groups?.some(group => group.label === "SOL.Ship.propulsion.deltaV") === true, "le delta-v est un groupe dans Propulsion");
markGroupDisabled(prepared.filter(group => group.label === "SOL.Ship.propulsion.label"), "SOL.Ship.propulsion.fixedHint");
check(byName["system.propulsion.deltaV.value"].disabled === true && byName["system.propulsion.acceleration"].disabled === true, "objet fixe : propulsion et delta-v grisés");
const sectionsTemplate = readFileSync(new URL("../templates/actor/ship-tab-sections.hbs", import.meta.url), "utf8");
check(sectionsTemplate.includes("integrity.value") && sectionsTemplate.includes("integrity.max") && sectionsTemplate.includes("armor.value") && sectionsTemplate.includes("armor.max"), "sections : intégrité et blindage déjà saisis");
check(sectionsTemplate.includes("system.integrity.value") && sectionsTemplate.includes("system.integrity.max"), "modules sur la fiche vaisseau : intégrité déjà saisie");
check(normalizeDecimalText("3,5") === 3.5 && normalizeDecimalText(" 1,26 ") === 1.26, "la virgule devient un point");
check(normalizeDecimalText("3.5") === "3.5" && normalizeDecimalText("x") === "x" && normalizeDecimalText(3.6) === 3.6, "sans virgule, ou illisible, on ne réécrit pas");
const commaDelta = { propulsion: { deltaV: { value: "3,5" } } };
roundPresentDeltaV(commaDelta);
check(commaDelta.propulsion.deltaV.value === 3.5 && !("max" in commaDelta.propulsion.deltaV), "saisie 3,5 : 3,5, sans ajouter max");
const commaFine = { propulsion: { deltaV: { value: "1,26", max: "3,64" } } };
roundPresentDeltaV(commaFine);
check(commaFine.propulsion.deltaV.value === 1.3 && commaFine.propulsion.deltaV.max === 3.6, "virgule puis arrondi au dixième");
const nullDelta = { propulsion: { deltaV: { value: null, max: "" } } };
roundPresentDeltaV(nullDelta);
check(nullDelta.propulsion.deltaV.value === 0 && nullDelta.propulsion.deltaV.max === 0, "migration : null ou vide donne 0");
const sheetOk = { system: { propulsion: { deltaV: { value: "3,5", max: "3.6" } } } };
check(applySheetDeltaV(sheetOk).length === 0 && sheetOk.system.propulsion.deltaV.value === 3.5 && sheetOk.system.propulsion.deltaV.max === 3.6, "fiche : 3,5 donne 3.5");
const sheetBlank = { system: { propulsion: { deltaV: { value: "", max: 3.6 } } } };
const blankIgnored = applySheetDeltaV(sheetBlank);
check(blankIgnored.length === 1 && blankIgnored[0].key === "value" && !("value" in sheetBlank.system.propulsion.deltaV) && sheetBlank.system.propulsion.deltaV.max === 3.6, "fiche : case vide, clé absente, le max reste");
const sheetJunk = { system: { propulsion: { deltaV: { value: "abc" } } } };
const junkIgnored = applySheetDeltaV(sheetJunk);
check(junkIgnored.length === 1 && junkIgnored[0].raw === "abc" && !("value" in sheetJunk.system.propulsion.deltaV) && !("max" in sheetJunk.system.propulsion.deltaV), "fiche : abc ignoré, max non ajouté");
const sheetTenth = { system: { propulsion: { deltaV: { value: "1,26" } } } };
const tenthIgnored = applySheetDeltaV(sheetTenth);
check(sheetTenth.system.propulsion.deltaV.value === 1.3 && tenthIgnored.adjusted?.[0]?.value === 1.3, "fiche : 1,26 arrondi, et réécrit dans la case");
const sheetExact = { system: { propulsion: { deltaV: { value: "3.5" } } } };
const exactIgnored = applySheetDeltaV(sheetExact);
check(sheetExact.system.propulsion.deltaV.value === 3.5 && (exactIgnored.adjusted ?? []).length === 0, "3.5 est déjà la valeur affichée");
const sheetNull = { system: { propulsion: { deltaV: { value: null, max: "0" } } } };
applySheetDeltaV(sheetNull);
check(!("value" in sheetNull.system.propulsion.deltaV) && sheetNull.system.propulsion.deltaV.max === 0, "fiche : null retiré, 0 reste 0");
for ( const bad of ["-1", "1e3", "0x10", "Infinity"] ) {
  const refused = { system: { propulsion: { deltaV: { value: bad, max: 3.6 } } } };
  const refusedIgnored = applySheetDeltaV(refused);
  check(refusedIgnored.length === 1 && refusedIgnored[0].raw === bad && !("value" in refused.system.propulsion.deltaV) && refused.system.propulsion.deltaV.max === 3.6, `fiche : ${bad} ignoré`);
}
const keptNegative = { propulsion: { deltaV: { value: -1 } } };
roundPresentDeltaV(keptNegative);
check(keptNegative.propulsion.deltaV.value === -1 && !("max" in keptNegative.propulsion.deltaV), "migration : un nombre déjà stocké reste, max non injecté");
const noDelta = { description: "<p>x</p>" };
roundPresentDeltaV(noDelta);
check(!("propulsion" in noDelta), "migration : un diff sans propulsion n'en gagne pas");
const restored = { value: "abc" };
writeDeltaVInput({ elements: { "system.propulsion.deltaV.value": restored } }, "value", 3.64);
check(restored.value === "3.6" && formatStoredDeltaV(3.6) === "3.6", "saisie ignorée : l'ancienne valeur réapparaît, au dixième");
check(writeDeltaVInput({ elements: {} }, "value", null) === false, "rien à remettre : la case n'est pas inventée");
const firstWarn = nextDeltaVWarning(undefined, "abc");
const secondWarn = nextDeltaVWarning(firstWarn.token, " abc ");
const otherWarn = nextDeltaVWarning(firstWarn.token, "-1");
const againWarn = nextDeltaVWarning(undefined, "abc");
check(firstWarn.warn === true && secondWarn.warn === false && otherWarn.warn === true && againWarn.warn === true, "une saisie invalide n'avertit qu'une fois");
const fieldRow = readFileSync(new URL("../templates/shared/field-row.hbs", import.meta.url), "utf8");
check(fieldRow.includes('type="text"') && fieldRow.includes('inputmode="decimal"') && fieldRow.includes("createNumberInput"), "delta-v : input texte écrit à la main");

if ( failed ) {
  console.error(`${failed} échec(s)`);
  process.exit(1);
}
console.log("tests/ship.test.mjs : état, blindage et migrations ok.");
