/**
 * Arme portative (`weapon`). Les armes de vaisseau sont des `shipModule`.
 *
 * Réf. Fiche v0.2 §4 pour les autres champs. Décision Marc 17/10/2026 :
 * la portée est un palier (LdR v0.2 §15 : courte, moyenne, longue),
 * pas l'objet `{ short, medium, long }` en mètres de la Fiche.
 * La distance réelle, indicative, se note dans la description.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, numberField, stringField, valueMaxField } from "./fields.mjs";

/** @extends BaseItemData */
export class WeaponData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Nom de la compétence sur l'acteur (pas un id).
      // Décision Marc 18/10/2026. Réf. Fiche v0.2 §4 (String).
      skill: stringField("SOL.Weapon.skill"),
      // Décision Marc 17/10/2026 : les dégâts sont un entier.
      damage: numberField("SOL.Weapon.damage", { initial: 0, integer: true, step: 1 }),
      // Décision Marc 17/10/2026. Réf. LdR v0.2 §15. Défaut « short » (Courte).
      // Décision Marc 30/10/2026. Réf. Armes v0.3 §1.
      // Courte : jusqu'à 100 m. Moyenne : jusqu'à 200 m. Longue : au-delà.
      // Les mètres restent dans la description. Le malus du jet est ailleurs.
      range: stringField("SOL.Weapon.range.label", {
        initial: "short",
        blank: false,
        choices: SOL.weaponRanges
      }),
      recoil: boolField("SOL.Weapon.recoil", false),
      ammo: valueMaxField("SOL.Weapon.ammo"),
      ammoType: stringField("SOL.Weapon.ammoType.label", {
        initial: "frangible",
        blank: false,
        choices: SOL.ammoTypes
      }),
      burst: boolField("SOL.Weapon.burst", false),
      hullSafe: boolField("SOL.Weapon.hullSafe", true),
      // Entier ou décimal : choix provisoire, à valider par Marc. Masse et encombrement décimaux.
      mass: numberField("SOL.Field.mass", { initial: 0, step: 0.01, hint: "SOL.Hint.kg" }),
      enc: numberField("SOL.Field.enc", { initial: 0, step: 0.01 }),
      equipped: boolField("SOL.Field.equipped", false)
    };
  }

  /**
   * L'ancienne portée stockée était `{ short, medium, long }` en mètres.
   * Pas de règle pour convertir ces mètres en palier : on retombe sur
   * `short`. La distance se réécrit dans la description.
   * Décision Marc 17/10/2026.
   *
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    // Seulement l'ancienne forme objet. Un diff sans `range`, ou déjà un palier, n'est pas modifié.
    if ( source?.range && typeof source.range === "object" ) source.range = "short";
    return super.migrateData(source);
  }
}
