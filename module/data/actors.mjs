/**
 * Modèles des acteurs autres que le Personnage.
 *
 * Le PNJ reprend le schéma du personnage (`PersonData`) : même feuille,
 * mêmes caractéristiques. Réf. consigne étape 3. Le LdR v0.2 §15 ne
 * détaille pas ces champs pour le PNJ ; on ne calcule rien de plus.
 *
 * Créature, Synthétique et Drone : description, notes, FOR, CON et PER.
 * Décision Marc 18/10/2026 : mêmes champs que le PNJ (Base jusqu'à 100,
 * Actuelle bornée 0 à 100). Pas les six autres caractéristiques.
 * Le Seuil en découle. La PER sert au test de Vigilance.
 * Véhicule et vaisseau n'en ont pas.
 *
 * Véhicule : la catégorie est le seul champ nommé, plus la description
 * demandée par la consigne de l'étape 2.
 * Vaisseau : fiche unique 0.7.0 (`module/data/ship.mjs`).
 */
import { characteristicFieldsFor, SOL } from "../config.mjs";
import { migrateNpcSource } from "./npc-migrate.mjs";
import { characteristicSchema, deriveCharacteristicValues, PersonData } from "./person.mjs";
import { htmlField, numberField, stringField } from "./fields.mjs";

export { ShipData } from "./ship.mjs";

/** FOR, CON et PER. Pas les six autres caractéristiques du personnage. */
export const FOR_CON_PER_KEYS = ["for", "con", "per"];

/**
 * Schéma commun : description + notes, toutes deux HTML.
 *
 * @returns {Record<string, foundry.data.fields.DataField>}
 */
function describedActorSchema() {
  return {
    description: htmlField("SOL.Actor.description"),
    notes: htmlField("SOL.Actor.notes")
  };
}

/**
 * PNJ. Même schéma que le personnage. Réf. consigne étape 3.
 * L'étape 2 ne stockait que description et notes, sans biography :
 * `migrateData` ne recopie que cette forme-là, et retire toujours
 * `description`. Les caractéristiques absentes prennent le défaut du
 * schéma (Base 25).
 *
 * @extends PersonData
 */
export class NpcData extends PersonData {
  /**
   * Base 1 à 100. Le personnage reste plafonné à 60.
   * Décision Marc 18/10/2026. Même minimum que `characteristicFields`.
   *
   * @override
   * @returns {typeof SOL.characteristicFields}
   */
  static characteristicFieldBounds() {
    return characteristicFieldsFor("npc");
  }

  /**
   * @override
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    migrateNpcSource(source);
    return super.migrateData(source);
  }
}

/**
 * Description, notes, FOR, CON et PER. Bornes du PNJ.
 * Décision Marc 18/10/2026 : la PER manquait, le test de Vigilance
 * tombait à 0. Pas de `migrateData` : le `initial` du schéma suffit.
 * Pas de `migrateData` : un diff client passe par `migrateData` (v13
 * `client-backend.mjs`, inchangé en v14). Y injecter les défauts écrase
 * une Force déjà saisie. Le nettoyage du schéma pose `initial` sur une
 * fiche ancienne qui n'a pas encore ces champs.
 *
 * @extends foundry.abstract.TypeDataModel
 */
class ForConActorData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      ...describedActorSchema(),
      characteristics: characteristicSchema(FOR_CON_PER_KEYS, characteristicFieldsFor("npc")),
      // Réf. LdR v0.2 §3. null : pas encore suivie. Pas de migrateData.
      endurance: numberField("SOL.Actor.endurance", {
        initial: null,
        nullable: true,
        integer: true,
        min: 0,
        step: 1,
        hint: "SOL.Actor.enduranceHint"
      })
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    deriveCharacteristicValues(this.characteristics, FOR_CON_PER_KEYS);
  }
}

/**
 * Créature. Réf. LdR v0.2 §15 « champs à définir ».
 * Décision Marc 18/10/2026 : FOR, CON, PER, et la blessure standard.
 *
 * @extends ForConActorData
 */
export class CreatureData extends ForConActorData {}

/**
 * Synthétique (robot ou IA au sens commun, pas forcément sentient).
 * Réf. LdR v0.2 §15, Fiche v0.2 §4.
 *
 * @extends ForConActorData
 */
// À confirmer par Marc : la liste nommée est [à compléter]. Réf. LdR v0.2 §7.
// Décision Marc 31/10/2026 : les repères du compendium restent, sans nom inventé.
export class SyntheticData extends ForConActorData {}

/**
 * Drone (machine simple, intelligence très limitée).
 * Réf. LdR v0.2 §15, Fiche v0.2 §4.
 *
 * @extends ForConActorData
 */
// À confirmer par Marc : la liste nommée est [à compléter]. Réf. LdR v0.2 §7.
// Décision Marc 31/10/2026 : Luciole, Crabe et TATI sont des acteurs, pas des coquilles.
export class DroneData extends ForConActorData {}

/**
 * Véhicule : catégorie terrestre, maritime ou aérien.
 * Réf. LdR v0.2 §15. Clés anglaises : consigne de l'étape 2.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class VehicleData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      category: stringField("SOL.Actor.category", {
        initial: "terrestrial",
        blank: false,
        choices: SOL.vehicleCategories
      }),
      description: htmlField("SOL.Actor.description")
    };
  }
}

