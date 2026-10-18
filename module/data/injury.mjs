/**
 * Blessure (`injury`).
 *
 * Réf. Fiche v0.2 §4 pour les clés et les valeurs de `location` / `severity`.
 * Libellés de gravité : LdR v0.2 §7. Les défauts ne sont pas écrits dans les
 * docs : chaînes vides, 0 et false, pour que le schéma ait une valeur initiale.
 * Pénalités citées au LdR (légère −10, grave −20) : ce sont des exemples,
 * pas le défaut du champ `penalty`.
 *
 * Décision Marc 18/10/2026 : `endOfOrder` envoie en fin d'ordre.
 * `activeRoundOne` ne compte au round 1 que pour une blessure déjà
 * présente au démarrage, et seulement si les deux cases sont cochées.
 * Les deux partent décochées.
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
      // Entier ou décimal : choix provisoire, à valider par Marc.
      penalty: numberField("SOL.Injury.penalty", { initial: 0, integer: true, step: 1 }),
      treated: boolField("SOL.Injury.treated", false),
      // Décision Marc 18/10/2026. Le déplacement suit cette case.
      endOfOrder: boolField("SOL.Injury.endOfOrder", false),
      // Décision Marc 18/10/2026. Décochée : la blessure déjà là
      // ne compte pas au round 1.
      activeRoundOne: boolField("SOL.Injury.activeRoundOne", false),
      healingTime: stringField("SOL.Injury.healingTime"),
      source: stringField("SOL.Injury.source")
    };
  }
}
