/**
 * Arme portative (`weapon`). Les armes de vaisseau sont des `shipModule`.
 *
 * Réf. Fiche v0.2 §4. La portée est l'objet `{ short, medium, long }` en
 * mètres (proposition ⚠ de la Fiche), pas l'énumération courte/moyenne/longue
 * du LdR v0.2 §15.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, numberField, SchemaField, stringField, valueMaxField } from "./fields.mjs";

/** @extends BaseItemData */
export class WeaponData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Nom ou id de compétence. Réf. Fiche v0.2 §4 (String, pas une référence).
      skill: stringField("SOL.Weapon.skill"),
      // Entier ou décimal : choix provisoire, à valider par Marc.
      // Entier : dégâts et portée (m). Décimal : munitions, masse, encombrement.
      damage: numberField("SOL.Weapon.damage", { initial: 0, integer: true, step: 1 }),
      // Réf. Fiche v0.2 §4 ⚠. Distances en mètres, entières (choix provisoire).
      range: new SchemaField({
        short: numberField("SOL.Weapon.range.short", { initial: 0, integer: true, step: 1, hint: "SOL.Hint.metres" }),
        medium: numberField("SOL.Weapon.range.medium", { initial: 0, integer: true, step: 1, hint: "SOL.Hint.metres" }),
        long: numberField("SOL.Weapon.range.long", { initial: 0, integer: true, step: 1, hint: "SOL.Hint.metres" })
      }, { label: "SOL.Weapon.range.label" }),
      recoil: boolField("SOL.Weapon.recoil", false),
      ammo: valueMaxField("SOL.Weapon.ammo"),
      ammoType: stringField("SOL.Weapon.ammoType.label", {
        initial: "frangible",
        blank: false,
        choices: SOL.ammoTypes
      }),
      burst: boolField("SOL.Weapon.burst", false),
      hullSafe: boolField("SOL.Weapon.hullSafe", true),
      mass: numberField("SOL.Field.mass", { initial: 0, step: 0.01, hint: "SOL.Hint.kg" }),
      enc: numberField("SOL.Field.enc", { initial: 0, step: 0.01 }),
      equipped: boolField("SOL.Field.equipped", false)
    };
  }
}
