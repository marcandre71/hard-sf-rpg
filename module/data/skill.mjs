/**
 * Compétence (`skill`).
 *
 * Réf. Fiche v0.2 §4 (champs et défauts) et LdR v0.2 §15 (même liste, sans
 * `untrainedAllowed` ni `used`, qui viennent de la Fiche seule).
 *
 * Le score n'est pas calculé à l'étape 2. Formule prévue, pour plus tard
 * (Fiche v0.2 §4) : total de la caractéristique + training, ou
 * ceil(total / 2) si specialized et training = 0. La caractéristique liée
 * vit sur l'acteur ; la calculer ici lierait l'objet au porteur.
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
      specialized: boolField("SOL.Skill.specialized", false),
      specialty: stringField("SOL.Skill.specialty"),
      domain: stringField("SOL.Skill.domain.label", {
        initial: "technique",
        blank: false,
        choices: SOL.skillDomains
      }),
      untrainedAllowed: boolField("SOL.Skill.untrainedAllowed", true),
      used: boolField("SOL.Skill.used", false)
    };
  }
}
