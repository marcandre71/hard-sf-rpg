/**
 * Valide un document de chacun des 21 types (7 acteurs, 14 objets)
 * avec les valeurs par défaut.
 *
 * Foundry n'est pas dans ce dépôt, et on ne le télécharge pas.
 * Sans la variable d'environnement FOUNDRY_PATH (dossier d'installation
 * FoundryVTT, celui qui contient resources/app), le script s'arrête
 * tout de suite avec le code 0.
 *
 *   FOUNDRY_PATH=/chemin/vers/FoundryVTT node tests/models.test.mjs
 *
 * Le faux `game.i18n.localize` utilise `this`. Une méthode détachée
 * (`const localize = game.i18n.localize`) lève TypeError : c'est le
 * piège qui empêchait de créer un Véhicule ou une Arme. La validation
 * des choix ne doit pas appeler `game.i18n`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Arrêt propre : Foundry n'est pas là, ce n'est pas un échec du système.
 *
 * @param {string} reason
 * @returns {never}
 */
function skip(reason) {
  console.log(`tests/models.test.mjs : test ignoré (${reason}).`);
  process.exit(0);
}

const foundryRoot = process.env.FOUNDRY_PATH;
if ( !foundryRoot ) {
  skip("FOUNDRY_PATH absent — Foundry n'est pas dans ce dépôt, on ne le télécharge pas");
}

/**
 * Fichiers de bibliothèque possibles. On n'importe jamais main.js :
 * ce serait lancer le serveur Foundry.
 *
 * @type {string[]}
 */
const CANDIDATES = [
  "dist/data/foundry.mjs",
  "common/data/module.mjs",
  "common/data/fields.mjs",
  "client/data/module.mjs"
];

/**
 * Cherche le code commun et l'importe. Vrai seulement si `foundry.data.fields`
 * et `foundry.abstract.TypeDataModel` sont ensuite disponibles.
 *
 * @param {string} root
 * @returns {Promise<boolean>}
 */
async function tryLoadFoundry(root) {
  const bases = [root, path.join(root, "resources", "app")];
  for ( const base of bases ) {
    for ( const relative of CANDIDATES ) {
      const file = path.join(base, relative);
      if ( !existsSync(file) ) continue;
      try {
        await import(pathToFileURL(file).href);
      } catch (error) {
        console.log(`tests/models.test.mjs : import impossible (${file}) : ${error.message}`);
      }
      if ( globalThis.foundry?.data?.fields && globalThis.foundry?.abstract?.TypeDataModel ) return true;
    }
  }
  return false;
}

if ( !(await tryLoadFoundry(foundryRoot)) ) {
  skip("code commun Foundry introuvable sous FOUNDRY_PATH");
}

const i18n = {
  translations: {},
  /**
   * @param {string} key
   * @returns {string}
   */
  localize(key) {
    if ( !this?.translations ) throw new TypeError("this.translations undefined");
    return this.translations[key] ?? key;
  }
};
globalThis.game = { i18n };

const unbound = i18n.localize;
let detachedThrows = false;
try {
  unbound("SOL.Sheet.Name");
} catch (error) {
  detachedThrows = error instanceof TypeError;
}
if ( !detachedThrows ) {
  console.error("Le faux localize devrait lever TypeError lorsqu'il est détaché.");
  process.exit(1);
}
if ( i18n.localize("SOL.Sheet.Name") !== "SOL.Sheet.Name" ) {
  console.error("localize lié devrait renvoyer la clé telle quelle.");
  process.exit(1);
}

const { CharacterData } = await import("../module/data/character.mjs");
const { CreatureData, DroneData, NpcData, ShipData, SyntheticData, VehicleData } = await import("../module/data/actors.mjs");
const { SkillData } = await import("../module/data/skill.mjs");
const { TalentData, OriginData, BackgroundData, ProfessionData, SequelData, ShipModuleData } = await import("../module/data/provisional.mjs");
const { WeaponData } = await import("../module/data/weapon.mjs");
const { ArmorData } = await import("../module/data/armor.mjs");
const { GearData } = await import("../module/data/gear.mjs");
const { AugmentationData } = await import("../module/data/augmentation.mjs");
const { InjuryData } = await import("../module/data/injury.mjs");
const { SoftwareData, SubstanceData } = await import("../module/data/base-item.mjs");

/**
 * Appelle les fonctions `choices` s'il en reste : elles ne doivent pas
 * dépendre d'un `game.i18n.localize` détaché.
 *
 * @param {Record<string, foundry.data.fields.DataField>} fields
 * @param {string} label
 * @returns {void}
 */
function walkChoices(fields, label) {
  for ( const [key, field] of Object.entries(fields ?? {}) ) {
    if ( typeof field.choices === "function" ) {
      const choices = field.choices();
      if ( !choices || typeof choices !== "object" ) {
        throw new Error(`${label}.${key} : choices() n'a pas renvoyé un objet`);
      }
    }
    if ( field.fields ) walkChoices(field.fields, `${label}.${key}`);
  }
}

/**
 * Nettoie, construit et valide un modèle avec les défauts.
 *
 * @param {typeof foundry.abstract.TypeDataModel} Model
 * @param {string} label
 * @returns {foundry.abstract.TypeDataModel}
 */
function checkModel(Model, label) {
  const data = Model.cleanData({});
  const model = new Model(data);
  const failure = model.validate();
  if ( failure ) throw new Error(`${label} : validation refusée (${failure.message ?? failure})`);
  walkChoices(model.schema.fields, label);
  return model;
}

const models = [
  ["character", CharacterData],
  ["npc", NpcData],
  ["creature", CreatureData],
  ["synthetic", SyntheticData],
  ["drone", DroneData],
  ["vehicle", VehicleData],
  ["ship", ShipData],
  ["skill", SkillData],
  ["talent", TalentData],
  ["origin", OriginData],
  ["background", BackgroundData],
  ["profession", ProfessionData],
  ["weapon", WeaponData],
  ["armor", ArmorData],
  ["gear", GearData],
  ["augmentation", AugmentationData],
  ["substance", SubstanceData],
  ["injury", InjuryData],
  ["sequel", SequelData],
  ["software", SoftwareData],
  ["shipModule", ShipModuleData]
];

if ( models.length !== 21 ) {
  console.error(`21 types attendus, ${models.length} listés.`);
  process.exit(1);
}

try {
  for ( const [label, Model] of models ) checkModel(Model, label);
  const sequel = checkModel(SequelData, "sequel");
  const shipModule = checkModel(ShipModuleData, "shipModule");
  if ( sequel.schema.fields.type || shipModule.schema.fields.type ) {
    throw new Error("sequel et shipModule ne doivent plus avoir de champ system.type");
  }
  if ( !sequel.schema.fields.category || !shipModule.schema.fields.category ) {
    throw new Error("sequel et shipModule doivent avoir un champ category");
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}

console.log("tests/models.test.mjs : 21 modèles validés.");
