/**
 * Armure / vêtement (`armor`), combinaison comprise.
 *
 * Réf. Fiche v0.2 §4. `mass`, `enc` et `equipped` y sont nommés sans type :
 * on reprend les types de l'arme (Number, Number, Boolean), mêmes noms.
 * Réf. LdR v0.2 §7 et §15 : protection par zone, pressurisée,
 * seuil de brèche, joints. Les nombres du compendium (souple 1/1/1/1
 * seuil 4, renforcée 3/3/2/2 seuil 8, pont 6/5/4/4 seuil 12) sont
 * des objets, pas les défauts du champ.
 * `breachThreshold` part à `null` : un 0 inventé percerait dès que
 * les dégâts bruts sont positifs.
 * Réserve d'air en heures. L'armure de pont du compendium stocke 0,5
 * (30 minutes) ; la fourchette du LdR est 30 à 60 minutes. Pas
 * d'automatisme, ni de surchauffe jouée par le logiciel.
 */
import { SOL } from "../config.mjs";
import { migrateArmorSource } from "./armor-migrate.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, numberField, SchemaField, stringField, valueMaxField } from "./fields.mjs";

/** @extends BaseItemData */
export class ArmorData extends BaseItemData {
  /** @override */
  static defineSchema() {
    const protection = {};
    for ( const [key, label] of Object.entries(SOL.bodyLocations) ) {
      // Décision Marc 17/10/2026 : les protections sont des entiers.
      protection[key] = numberField(label, { initial: 0, integer: true, step: 1 });
    }

    return {
      ...super.defineSchema(),
      protection: new SchemaField(protection, { label: "SOL.Armor.protection" }),
      pressurized: boolField("SOL.Armor.pressurized", false),
      // Réf. LdR v0.2 §15. null : pas de seuil, donc pas de brèche.
      breachThreshold: numberField("SOL.Armor.breachThreshold", {
        initial: null,
        nullable: true,
        integer: true,
        min: 0,
        step: 1
      }),
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
      // À confirmer par Marc : équipée par défaut au glisser-déposer.
      // Une clé absente devient true. Un false déjà stocké reste false.
      equipped: boolField("SOL.Field.equipped", true)
    };
  }

  /**
   * Valeur unique historique → une zone par clé. Rien d'autre.
   *
   * @override
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    migrateArmorSource(source);
    return super.migrateData(source);
  }
}
