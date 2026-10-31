/**
 * Base commune de tous les objets : un champ `description` (HTML).
 *
 * Réf. Fiche v0.2 §4 (gear a une description HTML ; la consigne de l'étape 2
 * l'étend à chaque type d'objet). Le LdR v0.2 §15 disait « champs à définir »
 * pour Substance et Logiciel. Décision Marc 30/10/2026 : les champs du
 * catalogue v0.3, effets en texte seulement.
 */
import { SOL } from "../config.mjs";
import { fullDosesValue } from "./substance-doses.mjs";
import { boolField, htmlField, numberField, stringField, valueMaxField } from "./fields.mjs";

/**
 * Données `system` partagées. Les sous-classes étendent le schéma
 * avec `...super.defineSchema()`.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class BaseItemData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: htmlField("SOL.Item.description")
    };
  }
}

/**
 * Substance : médicaments et drogues. Pas une augmentation.
 * Réf. LdR v0.2 §15, Fiche v0.2 §4. Réf. Substances v0.3 §1.
 * Décision Marc 30/10/2026 : effets en texte. Pas de migrateData :
 * un diff partiel ne reçoit pas les champs nouveaux.
 * Décision Marc 31/10/2026 : doses actuelles pleines à la création.
 *
 * @extends BaseItemData
 */
export class SubstanceData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Vide par défaut. Réf. Substances v0.3 §2 à §5.
      category: stringField("SOL.Substance.category.label", {
        initial: "",
        blank: true,
        choices: SOL.substanceCategories
      }),
      // Décision Marc 30/10/2026 : chaîne libre, pas de liste fermée.
      // Décision Marc 31/10/2026 : une clé connue s'affiche traduite.
      // Le texte saisi à la main reste tel quel. Pas de `choices`.
      administration: stringField("SOL.Substance.administration"),
      // Décision Marc 30/10/2026 : chaîne libre (« 1 h », « 1D10 × 5 min »).
      duration: stringField("SOL.Substance.duration"),
      // Le catalogue donne le maximum. Décision Marc 31/10/2026 :
      // la valeur actuelle le copie à la création (_preCreate), pas dans un diff.
      doses: valueMaxField("SOL.Substance.doses", {
        integer: true,
        min: 0,
        nullable: true,
        initialValue: null,
        initialMax: null
      }),
      effect: htmlField("SOL.Item.effect"),
      sideEffects: htmlField("SOL.Substance.sideEffects"),
      // Décision Marc 30/10/2026 : chaîne libre, vide quand elle n'est pas connue.
      legality: stringField("SOL.Substance.legality")
    };
  }

  /**
   * Valeur actuelle = maximum, si elle n'est pas déjà posée.
   * Une fiche faite à la main, sans maximum, reste vide.
   * Un diff partiel ne passe pas ici.
   *
   * @override
   * @param {object} data
   * @param {object} options
   * @param {foundry.documents.BaseUser} user
   * @returns {Promise<boolean|void>|boolean|void}
   * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.DataModel.html#_preCreate
   */
  _preCreate(data, options, user) {
    // Décision Marc 31/10/2026. Le document parent, pas le modèle.
    const next = fullDosesValue(this.doses);
    if ( next !== undefined ) this.parent.updateSource({ "system.doses.value": next });
    if ( typeof super._preCreate === "function" ) return super._preCreate(data, options, user);
  }
}

/**
 * Logiciel. Réf. LdR v0.2 §15 « champs à définir », Fiche v0.2 §4.
 * Réf. Logiciels v0.3 §1. Décision Marc 30/10/2026.
 * Pas de migrateData : un diff partiel ne reçoit pas les champs nouveaux.
 * Le score autonome est affiché, sans bouton de jet.
 *
 * @extends BaseItemData
 */
export class SoftwareData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Liste fermée de 5. Défaut utilitaire. Décision Marc 30/10/2026.
      category: stringField("SOL.Software.category.label", {
        initial: "utility",
        blank: false,
        choices: SOL.softwareCategories
      }),
      // Un seul support. Vide par défaut. Décision Marc 30/10/2026.
      host: stringField("SOL.Software.host.label", {
        initial: "",
        blank: true,
        choices: SOL.softwareHosts
      }),
      // Plusieurs compétences : une chaîne, pas une liste d'objets.
      assistedSkill: stringField("SOL.Software.assistedSkill"),
      // Aide du LdR §5 : 0 ou 10 dans le catalogue. Entier.
      skillBonus: numberField("SOL.Software.skillBonus", { initial: 0, integer: true, min: 0, step: 1 }),
      // Affiché seulement. Décision Marc 30/10/2026. Pas de jet.
      autonomousScore: numberField("SOL.Software.autonomousScore", {
        initial: 0,
        integer: true,
        min: 0,
        max: 100,
        step: 1,
        hint: "SOL.Software.autonomousScoreHint"
      }),
      // Réf. Logiciels v0.3 §1 : true par défaut (Règle Sereguine).
      sereguineLock: boolField("SOL.Software.sereguineLock", true),
      legality: stringField("SOL.Software.legality")
    };
  }
}
