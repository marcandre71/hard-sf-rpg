/**
 * Objets dont les docs donnent des noms de champs, mais pas les types
 * ni les défauts. Chaque champ est un String, un Number ou un HTML,
 * avec une valeur neutre (chaîne vide, 0 ou false).
 *
 * Réf. LdR v0.2 §15 et Fiche v0.2 §4. La Fiche dit « comme au LdR » pour
 * talent, sequel, origin, background et profession, et précise en plus
 * les champs d'origin (culturalSkill, trait plutôt que skillBonuses, traits).
 * On suit cette liste de la Fiche pour origin, et la liste du LdR pour
 * les autres. Pas d'ActiveEffect, pas de calcul.
 */
import { SOL } from "../config.mjs";
import { clampModuleDiff, moduleCondition } from "../ships/hull.mjs";
import { migrateShipModuleSource } from "../ships/migrate.mjs";
import { BaseItemData } from "./base-item.mjs";
import { boolField, htmlField, numberField, SchemaField, stringField, valueMaxField } from "./fields.mjs";

/**
 * Atout (`talent`). LdR v0.2 §15 : coût XP, prérequis, effet (texte).
 * Le coût de 15 XP (LdR v0.2 §10) est le prix d'achat d'un atout, pas
 * le défaut du champ : le défaut neutre est 0.
 * Clés anglaises non écrites dans les docs : xpCost, prerequisites, effect.
 *
 * @extends BaseItemData
 */
export class TalentData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // À préciser : types non définis dans LdR v0.2.
      // Décision Marc 17/10/2026 : le coût en XP est un entier.
      xpCost: numberField("SOL.Talent.xpCost", { initial: 0, integer: true, step: 1 }),
      // À préciser : types non définis dans LdR v0.2.
      prerequisites: stringField("SOL.Talent.prerequisites"),
      // À préciser : types non définis dans LdR v0.2. Texte seulement (pas d'ActiveEffect).
      effect: htmlField("SOL.Item.effect")
    };
  }
}

/**
 * Origine (`origin`).
 *
 * Champs retenus par la Fiche v0.2 §4 : characteristicModifiers,
 * gToleranceModifier, culturalSkill, trait.
 * Décision Marc 17/10/2026 : pas de `gravityNative` ici. La gravité natale
 * fait foi sur le personnage (`identity.gravityNative`). Rien à migrer.
 * Le LdR v0.2 §15 disait skillBonuses et traits à la place de culturalSkill
 * et trait : on ne crée pas les deux jeux de champs.
 * `characteristicModifiers` est une chaîne libre : la structure (quelle
 * caractéristique, quelle valeur) n'est pas typée dans les docs.
 *
 * @extends BaseItemData
 */
export class OriginData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // À préciser : types non définis dans LdR v0.2.
      characteristicModifiers: stringField("SOL.Origin.characteristicModifiers"),
      // À préciser : types non définis dans LdR v0.2.
      // Entier ou décimal : choix provisoire, à valider par Marc.
      gToleranceModifier: numberField("SOL.Origin.gToleranceModifier", { initial: 0, integer: true, step: 1 }),
      // À préciser : types non définis dans LdR v0.2.
      culturalSkill: stringField("SOL.Origin.culturalSkill"),
      // À préciser : types non définis dans LdR v0.2. Libellé « Particularité » : maquette Onglet 1.
      trait: stringField("SOL.Origin.trait")
    };
  }
}

/**
 * Milieu (`background`). LdR v0.2 §15 : skillBonuses (3), link (texte).
 * « 3 » est le nombre de bonus à la création, pas un type de champ.
 * `skillBonuses` reste une chaîne libre.
 *
 * @extends BaseItemData
 */
export class BackgroundData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // À préciser : types non définis dans LdR v0.2.
      skillBonuses: stringField("SOL.Background.skillBonuses"),
      // À préciser : types non définis dans LdR v0.2.
      link: stringField("SOL.Background.link")
    };
  }
}

/**
 * Profession (`profession`).
 * LdR v0.2 §15 : careerSkills (8), startingGear, network.
 * « 8 » est un effectif de création, pas un type. Chaînes libres.
 *
 * @extends BaseItemData
 */
export class ProfessionData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // À préciser : types non définis dans LdR v0.2.
      careerSkills: stringField("SOL.Profession.careerSkills"),
      // À préciser : types non définis dans LdR v0.2.
      startingGear: stringField("SOL.Profession.startingGear"),
      // À préciser : types non définis dans LdR v0.2.
      network: stringField("SOL.Profession.network")
    };
  }
}

/**
 * Séquelle (`sequel`).
 * LdR v0.2 §15 : type (radiation, déconditionnement, trauma), effet, permanent.
 * Décision Marc 17/10/2026 : liste fermée. Chaque séquelle reste son objet.
 * Le champ s'appelle `category` et non `type`, pour ne pas le confondre
 * avec le type d'objet Foundry. Le libellé reste « Type ».
 *
 * @extends BaseItemData
 */
export class SequelData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Décision Marc 17/10/2026. Réf. LdR v0.2 §15. Clé `category` (pas `type`).
      // Défaut « radiation ». Pas de migrateData : un texte libre déjà saisi
      // n'a pas de correspondance sûre avec la liste.
      category: stringField("SOL.Sequel.category.label", {
        initial: "radiation",
        blank: false,
        choices: SOL.sequelCategories
      }),
      // À préciser : types non définis dans LdR v0.2.
      effect: htmlField("SOL.Item.effect"),
      // À préciser : types non définis dans LdR v0.2. Défaut neutre false.
      permanent: boolField("SOL.Sequel.permanent", false)
    };
  }
}

/**
 * Module de vaisseau (`shipModule`). Armes comprises.
 *
 * Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §4.
 * Un seul type d'objet. On peut le retirer, le remplacer, le déplacer
 * de section. L'état n'est pas stocké : `prepareDerivedData` le calcule.
 * L'ancien texte libre `state` est retiré par `migrateData`, pas recopié.
 *
 * @extends BaseItemData
 */
export class ShipModuleData extends BaseItemData {
  /**
   * @override
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    migrateShipModuleSource(source);
    return super.migrateData(source);
  }

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // Onze clés. L'ancien texte libre qui n'en est pas une devient `other`.
      category: stringField("SOL.ShipModule.category.label", {
        initial: "other",
        blank: false,
        choices: SOL.shipModuleCategories
      }),
      // Un module neuf part en proue. Décision Marc 21/10/2026.
      // Le MJ change la section sur cette fiche et sur la fiche du vaisseau.
      section: stringField("SOL.ShipModule.section", {
        initial: "bow",
        blank: false,
        choices: SOL.shipSections
      }),
      integrity: valueMaxField("SOL.Ship.integrity", { integer: true, min: 0 }),
      effects: htmlField("SOL.ShipModule.effects"),
      mass: numberField("SOL.ShipModule.mass", { initial: 0, min: 0 }),
      weapon: new SchemaField({
        damage: numberField("SOL.ShipModule.weapon.damage", { initial: 0, min: 0, integer: true, step: 1 }),
        rangeClose: boolField("SOL.ShipModule.range.close", false),
        rangeMedium: boolField("SOL.ShipModule.range.medium", false),
        rangeLong: boolField("SOL.ShipModule.range.long", false),
        // Compteur. Vide (null) : le MJ n'a pas saisi. 0 : l'arme ne tire plus.
        // Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4. La migration
        // ne remplit pas un diff qui n'a pas l'ancien texte.
        ammo: valueMaxField("SOL.ShipModule.weapon.ammunition", {
          integer: true,
          min: 0,
          nullable: true,
          initialValue: null,
          initialMax: null
        }),
        heatPerShot: numberField("SOL.ShipModule.weapon.heat", { initial: 0, min: 0, integer: true, step: 1 })
      }, { label: "SOL.ShipModule.weapon.label" }),
      armorPoints: numberField("SOL.ShipModule.armorPoints", { initial: 0, min: 0, integer: true, step: 1 })
    };
  }

  /**
   * `condition` : intact, dégradé, hors service, ou non renseigné
   * (maximum à 0). Jamais écrit dans `_source`.
   *
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.condition = moduleCondition(this.integrity?.value, this.integrity?.max);
  }

  /**
   * Valeur ≤ maximum. Un diff sans `integrity` n'en reçoit pas.
   * `changes` est le diff du document. On ne touche que `changes.system`.
   *
   * @override
   * @param {object} changes
   * @param {object} options
   * @param {string} user
   * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html#_preUpdate
   */
  _preUpdate(changes, options, user) {
    if ( changes?.system && typeof changes.system === "object" ) {
      clampModuleDiff(changes.system, this._source);
    }
    if ( typeof super._preUpdate === "function" ) return super._preUpdate(changes, options, user);
  }
}
