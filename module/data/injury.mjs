/**
 * Blessure (`injury`).
 *
 * Réf. Fiche v0.2 §4 pour les clés et les valeurs de `location` / `severity`.
 * Libellés de gravité : LdR v0.2 §7. Les défauts ne sont pas écrits dans les
 * docs : chaînes vides, 0 et false, pour que le schéma ait une valeur initiale.
 * Pénalités citées au LdR (légère −10, grave −20) : ce sont des exemples,
 * pas le défaut du champ `penalty`.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, numberField, stringField } from "./fields.mjs";

/** @extends BaseItemData */
export class InjuryData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Défaut non défini dans Fiche v0.2 §4 : chaîne vide autorisée.
      location: stringField("SOL.Injury.location", { initial: "", blank: true, choices: SOL.bodyLocations }),
      severity: stringField("SOL.Injury.severity.label", { initial: "", blank: true, choices: SOL.injurySeverities }),
      bleeding: boolField("SOL.Injury.bleeding", false),
      penalty: numberField("SOL.Injury.penalty", { initial: 0, integer: true, step: 1 }),
      treated: boolField("SOL.Injury.treated", false),
      healingTime: stringField("SOL.Injury.healingTime"),
      source: stringField("SOL.Injury.source")
    };
  }
}
