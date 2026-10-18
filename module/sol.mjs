/**
 * Sol, Nouvelle Ère — point d'entrée du système (FoundryVTT v14).
 *
 * Chargé par `esmodules` dans `system.json`. Ne fait rien à l'import :
 * tout l'enregistrement a lieu une fois, sur le hook `init`, avant que
 * les documents du monde ne soient préparés.
 *
 * Enchaînement : publier `CONFIG.SOL`, lier chaque TypeDataModel, retirer
 * les feuilles V1 du cœur, poser nos feuilles par défaut, armer le
 * garde-fou `preCreateItem`, enregistrer les conditions, et l'initiative.
 */
import { SOL } from "./config.mjs";
import { CreatureData, DroneData, NpcData, ShipData, SyntheticData, VehicleData } from "./data/actors.mjs";
import { ArmorData } from "./data/armor.mjs";
import { AugmentationData } from "./data/augmentation.mjs";
import { SoftwareData, SubstanceData } from "./data/base-item.mjs";
import { CharacterData } from "./data/character.mjs";
import { GearData } from "./data/gear.mjs";
import { InjuryData } from "./data/injury.mjs";
import { BackgroundData, OriginData, ProfessionData, SequelData, ShipModuleData, TalentData } from "./data/provisional.mjs";
import { SkillData } from "./data/skill.mjs";
import { WeaponData } from "./data/weapon.mjs";
import { registerInitiative } from "./combat/initiative.mjs";
import { registerDamage } from "./dice/apply-damage.mjs";
import { registerEndurance } from "./dice/endurance.mjs";
import { registerItemGuard } from "./guards.mjs";
import { registerNpcReadyMigration } from "./npc-ready-migration.mjs";
import { GenericActorSheet } from "./sheets/actor-sheet.mjs";
import { CharacterSheet } from "./sheets/character-sheet.mjs";
import { GenericItemSheet } from "./sheets/item-sheet.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";

/**
 * Retire les feuilles Application V1 enregistrées par le cœur.
 * Sans ça, le sélecteur de feuille propose encore l'ancienne ActorSheet /
 * ItemSheet, inutilisable avec nos types. Réf. revue étape 1.
 * On ne retire pas ActorSheetV2 / ItemSheetV2 : ce sont les classes mères
 * des nôtres, et elles ne sont pas proposées comme feuilles « core » V1.
 *
 * @returns {void}
 */
function unregisterCoreV1Sheets() {
  const v1 = foundry.appv1?.sheets;
  if ( !v1 ) return;
  if ( v1.ActorSheet ) foundry.documents.collections.Actors.unregisterSheet("core", v1.ActorSheet);
  if ( v1.ItemSheet ) foundry.documents.collections.Items.unregisterSheet("core", v1.ItemSheet);
}

/**
 * Enregistre la configuration, les modèles, les feuilles et le garde-fou.
 *
 * @returns {void}
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html#once
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Actors.html#registerSheet
 */
function initializeSystem() {
  // Repère attendu par TESTER.md. Ne pas changer ce texte sans mettre le guide à jour.
  console.log("Sol, Nouvelle Ère | Initialisation du système");

  CONFIG.SOL = SOL;

  // Pas de CONFIG.Actor.trackableAttributes : l'Endurance est un champ
  // de fiche, pas une barre de pion. Sang-froid n'est pas un champ.

  // Modèles d'acteurs. La clé est le type déclaré dans system.json.
  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterData,
    npc: NpcData,
    creature: CreatureData,
    synthetic: SyntheticData,
    drone: DroneData,
    vehicle: VehicleData,
    ship: ShipData
  });

  // Modèles d'objets.
  Object.assign(CONFIG.Item.dataModels, {
    skill: SkillData,
    talent: TalentData,
    origin: OriginData,
    background: BackgroundData,
    profession: ProfessionData,
    weapon: WeaponData,
    armor: ArmorData,
    gear: GearData,
    augmentation: AugmentationData,
    substance: SubstanceData,
    injury: InjuryData,
    sequel: SequelData,
    software: SoftwareData,
    shipModule: ShipModuleData
  });

  unregisterCoreV1Sheets();

  // Même feuille pour le personnage et le PNJ (onglets). Réf. consigne étape 3.
  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, CharacterSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "SOL.Sheet.Person"
  });

  foundry.documents.collections.Actors.registerSheet(SYSTEM_ID, GenericActorSheet, {
    types: SOL.actorTypes.filter(type => type !== "character" && type !== "npc"),
    makeDefault: true,
    label: "SOL.Sheet.Actor"
  });

  foundry.documents.collections.Items.registerSheet(SYSTEM_ID, GenericItemSheet, {
    types: [...SOL.itemTypes],
    makeDefault: true,
    label: "SOL.Sheet.Item"
  });

  registerItemGuard();
  registerNpcReadyMigration(SYSTEM_ID);
  registerDamage();
  registerEndurance();
  registerInitiative();
}

Hooks.once("init", initializeSystem);
