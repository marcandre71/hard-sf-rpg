/**
 * Vaisseau (`ship`). Une seule fiche pour les vaisseaux et les objets fixes.
 *
 * Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §2.
 * Pas de carte vectorielle : postes et portées abstraites.
 * Pas de caractéristiques. Décision Marc 18/10/2026 : véhicules et
 * vaisseaux n'ont pas d'initiative. L'ordre des postes est pour 0.7.1.
 * Pas de garde de combat dans cette version.
 * Le combat (jets, dégâts, chaleur, réparations) n'est pas joué ici.
 *
 * Décision Marc 21/10/2026 : abri anti-radiation, position, cap et
 * champs de station ne sont pas codés.
 *
 * Le nom du document Foundry est le nom du vaisseau. On ne le redouble
 * pas dans `system`.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
 */
import { SOL } from "../config.mjs";
import { clampShipDiff, departureMass } from "../ships/hull.mjs";
import { migrateShipSource } from "../ships/migrate.mjs";
import { htmlField, numberField, SchemaField, stringField, valueMaxField } from "./fields.mjs";

/**
 * Intégrité {valeur, maximum}, entier, plancher 0.
 * Réf. Vaisseaux v0.1 §2 et §5.
 *
 * @param {string} label
 * @returns {foundry.data.fields.SchemaField}
 */
function integrityField(label) {
  return valueMaxField(label, { integer: true, min: 0 });
}

/**
 * Une section. Les radiateurs n'ont pas de plaque.
 *
 * @param {string} label
 * @param {{ plate?: boolean }} [options]
 * @returns {foundry.data.fields.SchemaField}
 */
function sectionField(label, { plate = true } = {}) {
  const fields = {
    integrity: integrityField("SOL.Ship.integrity")
  };
  if ( plate ) fields.armor = integrityField("SOL.Ship.armor");
  return new SchemaField(fields, { label });
}

/**
 * Un poste : uuid d'un acteur, ou vide (équipage PNJ).
 * Réf. Vaisseaux v0.1 §2 et §3.
 *
 * @param {string} label
 * @returns {foundry.data.fields.SchemaField}
 */
function postField(label) {
  return new SchemaField({
    actorUuid: stringField("SOL.Ship.post.actor")
  }, { label });
}

/**
 * @extends foundry.abstract.TypeDataModel
 */
export class ShipData extends foundry.abstract.TypeDataModel {
  /**
   * Décision Marc 21/10/2026 : `station` → `fixed`, `ship` → `void`.
   * Aucun autre champ n'est ajouté ici.
   *
   * @override
   * @param {object} source
   * @returns {object}
   */
  static migrateData(source) {
    migrateShipSource(source);
    return super.migrateData(source);
  }

  /** @override */
  static defineSchema() {
    const sections = {};
    for ( const id of SOL.shipSectionOrder ) {
      sections[id] = sectionField(SOL.shipSections[id], { plate: id !== "radiators" });
    }
    const posts = {};
    for ( const id of SOL.shipPostOrder ) {
      posts[id] = postField(SOL.shipPosts[id]);
    }

    return {
      // // À confirmer par Marc : un vaisseau neuf n'est pas un prospecteur.
      shipType: stringField("SOL.Ship.type.label", {
        initial: "other",
        blank: false,
        choices: SOL.shipTypes
      }),
      shipTypeOther: stringField("SOL.Ship.type.otherText"),
      // Défaut `void`. Décision Marc 21/10/2026 : trois catégories,
      // et l'ancienne clé `ship` migre vers `void`.
      category: stringField("SOL.Actor.category", {
        initial: "void",
        blank: false,
        choices: SOL.shipCategories
      }),
      identity: new SchemaField({
        classBuilder: stringField("SOL.Ship.identity.classBuilder"),
        faction: stringField("SOL.Ship.identity.faction"),
        economy: stringField("SOL.Ship.identity.economy"),
        transponderReal: stringField("SOL.Ship.identity.transponderReal"),
        transponderDisplayed: stringField("SOL.Ship.identity.transponderDisplayed")
      }, { label: "SOL.Ship.identity.label" }),
      mass: new SchemaField({
        dry: numberField("SOL.Ship.mass.dry", { initial: 0, min: 0 }),
        reaction: numberField("SOL.Ship.mass.reaction", { initial: 0, min: 0 }),
        // Chaîne vide admise : on n'invente pas « eau » pour un objet fixe.
        reactionNature: stringField("SOL.Ship.mass.reactionNature", {
          initial: "",
          blank: true,
          choices: SOL.reactionNatures
        })
      }, { label: "SOL.Ship.mass.label" }),
      propulsion: new SchemaField({
        type: stringField("SOL.Ship.propulsion.type"),
        // Un seul nombre, milli-g au plein. Décision Marc 21/10/2026.
        // Le chiffre presque à vide reste dans le texte du module moteur.
        acceleration: numberField("SOL.Ship.propulsion.acceleration", {
          initial: 0,
          min: 0,
          integer: true,
          step: 1,
          hint: "SOL.Ship.propulsion.accelerationHint"
        }),
        // km/s. Décision Marc 21/10/2026. Pas `integer` : 3,6 est accepté.
        deltaV: valueMaxField("SOL.Ship.propulsion.deltaV", { min: 0, hint: "SOL.Ship.propulsion.deltaVHint" })
      }, { label: "SOL.Ship.propulsion.label" }),
      reserves: new SchemaField({
        air: numberField("SOL.Ship.reserves.air", { initial: 0, min: 0, integer: true, step: 1 }),
        water: numberField("SOL.Ship.reserves.water", { initial: 0, min: 0, integer: true, step: 1 }),
        food: numberField("SOL.Ship.reserves.food", { initial: 0, min: 0, integer: true, step: 1 })
      }, { label: "SOL.Ship.reserves.label" }),
      // Jauge du réacteur du vaisseau seul, 0 à 10. Réf. Vaisseaux v0.1 §6.
      // Décision Marc 21/10/2026 : pas de lien avec la surchauffe du
      // blindage (tests de CON par heure, LdR §8). Pas d'automatisation.
      heat: new SchemaField({
        value: numberField("SOL.Ship.heat.value", { initial: 0, min: 0, max: 10, integer: true, step: 1 })
      }, { label: "SOL.Ship.heat.label" }),
      spareParts: numberField("SOL.Ship.spareParts", { initial: 0, min: 0, integer: true, step: 1 }),
      // // À confirmer par Marc : « entraîné » est le défaut de la Petite Fortune (§8),
      // pas forcément celui de chaque vaisseau neuf.
      npcCrew: stringField("SOL.Ship.npcCrew.label", {
        initial: "trained",
        blank: false,
        choices: SOL.npcCrewLevels
      }),
      sections: new SchemaField(sections, { label: "SOL.Ship.sections" }),
      posts: new SchemaField(posts, { label: "SOL.Ship.posts" }),
      // Description déjà publiée à l'étape 2 : on la garde à côté des notes.
      // // À confirmer par Marc : un seul texte suffirait peut-être.
      description: htmlField("SOL.Actor.description"),
      notes: htmlField("SOL.Actor.notes")
    };
  }

  /**
   * Total au départ, affiché, pas stocké.
   *
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.departureMass = departureMass(this.mass?.dry, this.mass?.reaction);
  }

  /**
   * Valeur ≤ maximum, sans inventer de champ dans un diff partiel.
   * `changes` est le diff du document, déjà déplié. On ne touche que
   * `changes.system`.
   *
   * @override
   * @param {object} changes
   * @param {object} options
   * @param {string} user
   * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html#_preUpdate
   */
  _preUpdate(changes, options, user) {
    if ( changes?.system && typeof changes.system === "object" ) {
      clampShipDiff(changes.system, this._source);
    }
    if ( typeof super._preUpdate === "function" ) return super._preUpdate(changes, options, user);
  }
}
