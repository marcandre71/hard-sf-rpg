/**
 * Équipement (`gear`).
 *
 * Réf. Fiche v0.2 §4 : mass, enc, quantity, reserve { type, value, max },
 * toolBonus, description. Le LdR v0.2 §15 dit la même chose en français
 * (masse, encombrement, quantité, réserve, description) sans les clés.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { numberField, SchemaField, stringField } from "./fields.mjs";

/** @extends BaseItemData */
export class GearData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Entier ou décimal : choix provisoire, à valider par Marc.
      // Décimal : masse, encombrement, réserve (value / max).
      mass: numberField("SOL.Field.mass", { initial: 0, step: 0.01, hint: "SOL.Hint.kg" }),
      enc: numberField("SOL.Field.enc", { initial: 0, step: 0.01 }),
      // Décision Marc 17/10/2026 : la quantité est un entier.
      quantity: numberField("SOL.Gear.quantity", { initial: 1, integer: true, step: 1 }),
      reserve: new SchemaField({
        // Défaut "" (Fiche). Chaîne vide autorisée : pas dans les choix.
        type: stringField("SOL.Gear.reserve.type", { initial: "", blank: true, choices: SOL.reserveTypes }),
        value: numberField("SOL.Field.value", { initial: 0 }),
        max: numberField("SOL.Field.max", { initial: 0 })
      }, { label: "SOL.Gear.reserve.label" }),
      // Entier ou décimal : choix provisoire, à valider par Marc.
      toolBonus: numberField("SOL.Gear.toolBonus", { initial: 0, integer: true, step: 1 })
    };
  }
}
