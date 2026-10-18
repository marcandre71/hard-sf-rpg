/**
 * Compétence (`skill`).
 *
 * Réf. LdR v0.2 §4 et §15, Fiche v0.2 §4.
 * Score (caractéristique + formation, ou moitié si (F) sans formation) :
 * `module/dice/skill-score.mjs`. Il a besoin de l'acteur, donc il n'est
 * pas calculé dans ce modèle.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, numberField, stringField } from "./fields.mjs";

/** @extends BaseItemData */
export class SkillData extends BaseItemData {
  /** @override */
  static defineSchema() {
    // Choix = les neuf clés de SOL.characteristics. Défaut « int » : Fiche v0.2 §4.
    const characteristicChoices = Object.fromEntries(
      Object.keys(SOL.characteristics).map(key => [key, SOL.characteristics[key].label])
    );

    return {
      ...super.defineSchema(),
      characteristic: stringField("SOL.Skill.characteristic", {
        initial: "int",
        blank: false,
        choices: characteristicChoices
      }),
      // 0 à 60. Réf. Fiche v0.2 §4, LdR v0.2 §15.
      training: numberField("SOL.Skill.training", { initial: 0, min: 0, max: 60, integer: true, step: 1 }),
      // Marqueur (F). Réf. LdR v0.2 §4 et §15.
      trainingRequired: boolField("SOL.Skill.trainingRequired", false),
      // Faux seulement quand la description interdit le jet sans formation.
      untrainedAllowed: boolField("SOL.Skill.untrainedAllowed", true),
      // Marqueur (Sp). Réf. LdR v0.2 §4. Chaque spécialité reste un objet.
      perSpecialty: boolField("SOL.Skill.perSpecialty", false),
      // Spécialité, ou spécificité libre de Culture. Réf. LdR v0.2 §4.
      specialty: stringField("SOL.Skill.specialty"),
      domain: stringField("SOL.Skill.domain.label", {
        initial: "technique",
        blank: false,
        choices: SOL.skillDomains
      }),
      used: boolField("SOL.Skill.used", false)
    };
  }

  /**
   * L'étape 2 stockait `specialized` (ancien marqueur S).
   * On le recopie dans `trainingRequired` (marqueur F), puis on retire
   * l'ancienne clé pour qu'elle ne soit plus relue.
   * Réf. LdR v0.2 §4, consigne étape 4.
   *
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    // Décision Marc 18/10/2026 : l'ancien marqueur (S) devient Formation requise (F).
    // Seulement si `specialized` est dans la source. Un diff sans cette clé
    // ne reçoit pas `trainingRequired` : le schéma a déjà son défaut.
    if ( source && typeof source === "object" && ("specialized" in source) ) {
      if ( !("trainingRequired" in source) ) source.trainingRequired = Boolean(source.specialized);
      delete source.specialized;
    }
    return super.migrateData(source);
  }
}
