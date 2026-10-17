/**
 * Armure / vêtement (`armor`), combinaison comprise.
 *
 * Réf. Fiche v0.2 §4. `mass`, `enc` et `equipped` y sont nommés sans type :
 * on reprend les types de l'arme (Number, Number, Boolean), mêmes noms.
 * Les valeurs de protection citées au LdR v0.2 §7 (souple 1, renforcée 3,
 * armure de pont 6) sont des exemples, pas des choix imposés au champ.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, numberField, SchemaField, stringField, valueMaxField } from "./fields.mjs";

/** @extends BaseItemData */
export class ArmorData extends BaseItemData {
  /** @override */
  static defineSchema() {
    const protection = {};
    for ( const [key, label] of Object.entries(SOL.bodyLocations) ) {
      // Entier ou décimal : choix provisoire, à valider par Marc.
      protection[key] = numberField(label, { initial: 0, integer: true, step: 1 });
    }

    return {
      ...super.defineSchema(),
      protection: new SchemaField(protection, { label: "SOL.Armor.protection" }),
      pressurized: boolField("SOL.Armor.pressurized", false),
      // Heures, décimal. Réf. Fiche v0.2 §4 `{ value, max }` ; le LdR disait un simple nombre.
      airReserve: valueMaxField("SOL.Armor.airReserve", { hint: "SOL.Hint.hours" }),
      sealState: stringField("SOL.Armor.sealState.label", {
        initial: "intact",
        blank: false,
        choices: SOL.sealStates
      }),
      penalty: new SchemaField({
        // Entier ou décimal : choix provisoire, à valider par Marc.
        manipulation: numberField("SOL.Armor.penalty.manipulation", { initial: 0, integer: true, step: 1 }),
        perception: numberField("SOL.Armor.penalty.perception", { initial: 0, integer: true, step: 1 })
      }, { label: "SOL.Armor.penalty.label" }),
      dosimeter: boolField("SOL.Armor.dosimeter", false),
      radio: boolField("SOL.Armor.radio", false),
      // Types non écrits dans la Fiche : alignés sur weapon. Masse et encombrement décimaux.
      // Entier ou décimal : choix provisoire, à valider par Marc.
      mass: numberField("SOL.Field.mass", { initial: 0, step: 0.01, hint: "SOL.Hint.kg" }),
      enc: numberField("SOL.Field.enc", { initial: 0, step: 0.01 }),
      equipped: boolField("SOL.Field.equipped", false)
    };
  }
}
