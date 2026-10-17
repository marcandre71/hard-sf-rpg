/**
 * Modèles des acteurs autres que le Personnage.
 *
 * PNJ, Créature, Synthétique et Drone : les docs ne donnent pas de champs
 * (LdR v0.2 §15 « champs à définir » pour la créature ; description qualitative
 * seulement pour les autres). On ne stocke que description et notes.
 * Aucune caractéristique, aucun score : ce serait inventer une règle.
 *
 * Véhicule et Vaisseau : la catégorie est le seul champ nommé, plus la
 * description demandée par la consigne de l'étape 2. Masse, delta-v, etc.
 * (LdR v0.2 §15) n'ont ni type ni défaut : ils ne sont pas créés ici.
 */
import { SOL } from "../config.mjs";
import { htmlField, stringField } from "./fields.mjs";

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
 * PNJ. Réf. LdR v0.2 §15. Champs chiffrés : non définis dans les docs.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class NpcData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    // Champs non définis dans LdR v0.2 §15 : description et notes seulement.
    return describedActorSchema();
  }
}

/**
 * Créature. Réf. LdR v0.2 §15 « champs à définir ».
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class CreatureData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    // À préciser : types non définis dans LdR v0.2.
    return describedActorSchema();
  }
}

/**
 * Synthétique (robot ou IA au sens commun, pas forcément sentient).
 * Réf. LdR v0.2 §15, Fiche v0.2 §4.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class SyntheticData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    // Champs non définis dans LdR v0.2 §15 : description et notes seulement.
    return describedActorSchema();
  }
}

/**
 * Drone (machine simple, intelligence très limitée).
 * Réf. LdR v0.2 §15, Fiche v0.2 §4.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class DroneData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    // Champs non définis dans LdR v0.2 §15 : description et notes seulement.
    return describedActorSchema();
  }
}

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

/**
 * Vaisseau : catégorie vaisseau ou station.
 * Réf. LdR v0.2 §15 (ship et habitat fusionnés), Fiche v0.2 §4.
 * Clés anglaises : consigne de l'étape 2.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class ShipData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      category: stringField("SOL.Actor.category", {
        initial: "ship",
        blank: false,
        choices: SOL.shipCategories
      }),
      description: htmlField("SOL.Actor.description")
    };
  }
}
