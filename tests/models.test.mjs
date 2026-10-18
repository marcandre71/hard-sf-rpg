/**
 * Valide un document de chacun des 21 types (7 acteurs, 14 objets)
 * avec les valeurs par défaut.
 *
 * Foundry n'est pas dans ce dépôt, et on ne le télécharge pas.
 * Sans la variable d'environnement FOUNDRY_PATH (dossier d'installation
 * FoundryVTT, celui qui contient resources/app), le script s'arrête
 * tout de suite avec le code 0. Si FOUNDRY_PATH est défini mais que
 * rien ne se charge, le script s'arrête avec le code 1.
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
import { characteristicFieldsFor } from "../module/config.mjs";
import { migrateNpcSource } from "../module/data/npc-migrate.mjs";

/**
 * La migration du PNJ ne dépend pas de Foundry : on la joue toujours.
 * Seulement une fiche étape 2 (description + notes, sans biography).
 *
 * @param {object} input
 * @param {{ biography?: string, notes?: string, hasBiography: boolean }} expected
 * @param {string} message
 * @returns {void}
 */
function checkNpcMigration(input, expected, message) {
  const result = migrateNpcSource({ ...input });
  const hasBiography = "biography" in result;
  const biographyOk = hasBiography === expected.hasBiography
    && result.biography === expected.biography;
  if ( !biographyOk || ("description" in result) || result.notes !== expected.notes ) {
    console.error(message, result);
    process.exit(1);
  }
}

checkNpcMigration(
  { description: "x" },
  { hasBiography: false, notes: undefined },
  "{description} seul ne doit pas créer biography"
);
checkNpcMigration(
  { description: "x", notes: "", biography: "" },
  { biography: "", notes: "", hasBiography: true },
  "biography vide déjà présente doit le rester"
);
checkNpcMigration(
  { description: "x", notes: "" },
  { biography: "x", notes: "", hasBiography: true },
  "fiche étape 2 : description doit devenir biography"
);
checkNpcMigration(
  { description: "<p>Texte</p>", notes: "<p>Note</p>" },
  { biography: "<p>Texte</p>", notes: "<p>Note</p>", hasBiography: true },
  "notes HTML conservées"
);
checkNpcMigration(
  { description: "ancien", biography: "déjà", notes: "n" },
  { biography: "déjà", notes: "n", hasBiography: true },
  "biography déjà remplie ne doit pas être écrasée"
);

const characterBase = characteristicFieldsFor("character").base;
const npcBase = characteristicFieldsFor("npc").base;
if ( characterBase.max !== 60 || characterBase.min !== 1 || npcBase.min !== 1 || npcBase.max !== 100 ) {
  console.error("Base personnage 1–60, Base PNJ 1–100.", { characterBase, npcBase });
  process.exit(1);
}
if ( characteristicFieldsFor("character").base.max !== 60 ) {
  console.error("Les bornes du PNJ ont modifié celles du personnage.");
  process.exit(1);
}

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
  "common/server.mjs",
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
        const mod = await import(pathToFileURL(file).href);
        if ( mod?.data?.fields && mod?.abstract ) {
          globalThis.foundry ??= mod;
          globalThis.CONST ??= mod.CONST;
        }
      } catch (error) {
        console.log(`tests/models.test.mjs : import impossible (${file}) : ${error.message}`);
      }
      if ( globalThis.foundry?.data?.fields && globalThis.foundry?.abstract?.TypeDataModel ) return true;
    }
  }
  return false;
}

if ( !(await tryLoadFoundry(foundryRoot)) ) {
  console.error("tests/models.test.mjs : FOUNDRY_PATH est défini mais le code commun Foundry n'a pas pu être chargé.");
  process.exit(1);
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
  if ( model.validate() !== true ) throw new Error(`${label} : validation refusée`);
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
  const migratedNpc = new NpcData({ description: "x", notes: "" });
  if ( ("description" in migratedNpc._source) || migratedNpc._source.biography !== "x" ) {
    throw new Error("NpcData : _source ne doit plus avoir description, et biography doit valoir « x »");
  }
  const npcBaseMax = new NpcData({}).schema.fields.characteristics.fields.for.fields.base.max;
  const characterBaseMax = new CharacterData({}).schema.fields.characteristics.fields.for.fields.base.max;
  if ( npcBaseMax !== 100 || characterBaseMax !== 60 ) {
    throw new Error(`Base : personnage ${characterBaseMax}, PNJ ${npcBaseMax}`);
  }
  const migratedSkill = new SkillData({ specialized: true, training: 0 });
  if ( migratedSkill._source.trainingRequired !== true || ("specialized" in migratedSkill._source) ) {
    throw new Error("specialized doit devenir trainingRequired");
  }
  for ( const [label, Model] of models ) checkModel(Model, label);
  const sequel = checkModel(SequelData, "sequel");
  const shipModule = checkModel(ShipModuleData, "shipModule");
  if ( sequel.schema.fields.type || shipModule.schema.fields.type ) {
    throw new Error("sequel et shipModule ne doivent plus avoir de champ system.type");
  }
  if ( !sequel.schema.fields.category || !shipModule.schema.fields.category ) {
    throw new Error("sequel et shipModule doivent avoir un champ category");
  }
  for ( const Model of [CreatureData, SyntheticData, DroneData] ) {
    const keys = Object.keys(new Model({}).schema.fields.characteristics.fields);
    if ( keys.length !== 2 || !keys.includes("for") || !keys.includes("con") ) {
      throw new Error(`${Model.name} : seulement FOR et CON, reçu ${keys.join(", ")}`);
    }
    const baseMax = new Model({}).schema.fields.characteristics.fields.for.fields.base.max;
    if ( baseMax !== 100 ) throw new Error(`${Model.name} : Base max ${baseMax}, 100 attendu`);
    const legacy = new Model({ description: "<p>a</p>", notes: "b" });
    legacy.prepareDerivedData();
    if ( legacy._source.description !== "<p>a</p>" || legacy._source.notes !== "b" ) {
      throw new Error(`${Model.name} : description ou notes perdues`);
    }
    if ( legacy.characteristics.for.base !== 25 || legacy.characteristics.for.value !== 25 ) {
      throw new Error(`${Model.name} : FOR par défaut attendue`);
    }
    if ( legacy.characteristics.con.value !== 25 ) {
      throw new Error(`${Model.name} : CON actuelle attendue`);
    }
    const kept = new Model({
      description: "",
      notes: "",
      characteristics: {
        for: { base: 80, origin: 5, advance: 0, temp: 0 },
        con: { base: 40, origin: 0, advance: 0, temp: 0 }
      }
    });
    kept.prepareDerivedData();
    if ( kept.characteristics.for.value !== 85 || kept.characteristics.con.base !== 40 ) {
      throw new Error(`${Model.name} : une FOR déjà stockée a été réécrite`);
    }
    const stored = {
      description: "<p>a</p>",
      notes: "b",
      characteristics: {
        for: { base: 70, origin: 5, advance: 0, temp: 0 },
        con: { base: 60, origin: 0, advance: 0, temp: 0 }
      }
    };
    const diff = { description: "<p>autre</p>" };
    const migrated = Model.migrateData(foundry.utils.deepClone(diff));
    if ( migrated.characteristics ) {
      throw new Error(`${Model.name} : migrateData a injecté des caractéristiques dans un diff`);
    }
    const cleanedDiff = Model.cleanData(foundry.utils.deepClone(diff), { partial: true });
    if ( cleanedDiff.characteristics ) {
      throw new Error(`${Model.name} : un nettoyage partiel a injecté des caractéristiques`);
    }
    const merged = foundry.utils.mergeObject(stored, cleanedDiff, { inplace: false });
    if ( merged.characteristics.for.base !== 70 || merged.characteristics.for.origin !== 5 ) {
      throw new Error(`${Model.name} : un diff de description a écrasé la Force`);
    }
    if ( merged.characteristics.con.base !== 60 ) {
      throw new Error(`${Model.name} : un diff de description a écrasé la Constitution`);
    }
    const old = Model.cleanData({ description: "<p>a</p>", notes: "b" });
    if ( old.characteristics?.for?.base !== 25 || old.characteristics?.for?.origin !== 0 ) {
      throw new Error(`${Model.name} : le nettoyage ne pose pas la Force par défaut`);
    }
    if ( old.characteristics?.con?.base !== 25 || old.characteristics?.con?.temp !== 0 ) {
      throw new Error(`${Model.name} : le nettoyage ne pose pas la Constitution par défaut`);
    }
    if ( old.description !== "<p>a</p>" || old.notes !== "b" ) {
      throw new Error(`${Model.name} : le nettoyage a perdu description ou notes`);
    }
  }
  const skillDiff = { training: 20 };
  SkillData.migrateData(skillDiff);
  if ( "trainingRequired" in skillDiff || "specialized" in skillDiff ) {
    throw new Error("un diff de formation ne doit pas recevoir trainingRequired");
  }
  const skillOld = { specialized: true };
  SkillData.migrateData(skillOld);
  if ( skillOld.trainingRequired !== true || ("specialized" in skillOld) ) {
    throw new Error("specialized présent doit devenir trainingRequired");
  }
  const weaponDiff = { damage: 4 };
  WeaponData.migrateData(weaponDiff);
  if ( "range" in weaponDiff ) throw new Error("un diff de dégâts ne doit pas recevoir de portée");
  const weaponOld = { range: { short: 10, medium: 50, long: 200 } };
  WeaponData.migrateData(weaponOld);
  if ( weaponOld.range !== "short" ) throw new Error("l'ancienne portée objet doit devenir short");
  if ( new VehicleData({}).schema.fields.characteristics || new ShipData({}).schema.fields.characteristics ) {
    throw new Error("véhicule et vaisseau n'ont pas de caractéristiques");
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}

console.log("tests/models.test.mjs : 21 modèles validés.");
