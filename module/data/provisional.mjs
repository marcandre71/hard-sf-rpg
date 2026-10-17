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
import { BaseItemData } from "./base-item.mjs";
import { boolField, htmlField, numberField, stringField } from "./fields.mjs";

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
 * Champs retenus par la Fiche v0.2 §4 : gravityNative, characteristicModifiers,
 * gToleranceModifier, culturalSkill, trait.
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
      gravityNative: numberField("SOL.Character.gravityNative", { initial: 0, step: 0.01, hint: "SOL.Hint.g" }),
      // À préciser : types non définis dans LdR v0.2.
      characteristicModifiers: stringField("SOL.Origin.characteristicModifiers"),
      // À préciser : types non définis dans LdR v0.2.
      gToleranceModifier: numberField("SOL.Origin.gToleranceModifier", { initial: 0, step: 1 }),
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
 * Les clés anglaises des valeurs de `type` ne sont pas définies : texte libre,
 * pas une liste fermée.
 *
 * @extends BaseItemData
 */
export class SequelData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // À préciser : types non définis dans LdR v0.2.
      type: stringField("SOL.Sequel.type"),
      // À préciser : types non définis dans LdR v0.2.
      effect: htmlField("SOL.Item.effect"),
      // À préciser : types non définis dans LdR v0.2. Défaut neutre false.
      permanent: boolField("SOL.Sequel.permanent", false)
    };
  }
}

/**
 * Module de vaisseau (`shipModule`). Porté par l'acteur `ship`, pas par
 * le personnage. Réf. LdR v0.2 §15, Fiche v0.2 §4.
 * LdR : type (arme de bord, blindage, propulsion…), état, effets.
 * Clés anglaises des valeurs non définies : `type` et `state` sont du texte.
 * `state` est le nom anglais provisoire de « état ».
 *
 * @extends BaseItemData
 */
export class ShipModuleData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      // À préciser : types non définis dans LdR v0.2.
      type: stringField("SOL.ShipModule.type"),
      // À préciser : types non définis dans LdR v0.2. Clé « state » pour « état ».
      state: stringField("SOL.ShipModule.state"),
      // À préciser : types non définis dans LdR v0.2.
      effects: htmlField("SOL.ShipModule.effects")
    };
  }
}
