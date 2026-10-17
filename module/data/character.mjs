/**
 * Modèle de données du type d'acteur `character` (Personnage).
 *
 * Déclaré dans `system.json` (`documentTypes.Actor.character`) et associé
 * dans `module/sol.mjs` par `CONFIG.Actor.dataModels.character`.
 * Foundry instancie cette classe dans `actor.system`.
 *
 * Étape 1, inchangée : neuf caractéristiques, chacune avec `base`, `origin`,
 * `advance`, `temp`. `value` est dérivée, jamais stockée.
 * Les noms et les bornes viennent de `SOL.characteristicFields`
 * (pas de nombres en dur ici).
 *
 * Étape 2, ajouté (Fiche v0.2 §4) : `identity`, `contacts`, `flaws`,
 * `biography`, `notes`. Les champs nouveaux ont une valeur `initial` :
 * un personnage déjà créé (Ilka) n'a pas besoin de migration.
 * Vice et Lueur n'existent pas (Fiche v0.2 §5 : supprimés le 17/10/2026).
 *
 * Hors étape 2, donc absents : valeurs dérivées (seuil de blessure,
 * tolérance aux g, initiative, Endurance, Sang-froid), ressources, XP, etc.
 */
import { SOL } from "../config.mjs";
import { htmlField, numberField, SchemaField, stringField } from "./fields.mjs";

const { NumberField } = foundry.data.fields;

/**
 * Données `system` du Personnage.
 *
 * @extends foundry.abstract.TypeDataModel
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
 */
export class CharacterData extends foundry.abstract.TypeDataModel {

  /**
   * Schéma du champ `system`.
   *
   * @override
   * @returns {foundry.data.fields.DataSchema}
   */
  static defineSchema() {
    const characteristics = {};
    for ( const key of Object.keys(SOL.characteristics) ) {
      const fields = {};
      for ( const [name, cfg] of Object.entries(SOL.characteristicFields) ) {
        // Bornes lues dans CONFIG.SOL : les changer ici ne suffit pas,
        // il faut les changer dans characteristicFields.
        const options = {
          required: true,
          nullable: false,
          integer: true,
          initial: cfg.initial,
          label: cfg.label
        };
        if ( cfg.min !== undefined ) options.min = cfg.min;
        if ( cfg.max !== undefined ) options.max = cfg.max;
        fields[name] = new NumberField(options);
      }
      characteristics[key] = new SchemaField(fields);
    }

    return {
      // Réf. Fiche v0.2 §4, identité. `gravityNative` min 0, défaut 1.
      // `height` est une chaîne : l'exemple de la maquette est « 1,86 m ».
      identity: new SchemaField({
        concept: stringField("SOL.Character.concept"),
        birthplace: stringField("SOL.Character.birthplace"),
        // Décision Marc 17/10/2026 : cette case fait foi (pas de gravité
        // sur l'objet Origine). Décimale, en g.
        gravityNative: numberField("SOL.Character.gravityNative", {
          initial: 1,
          min: 0,
          step: 0.01,
          hint: "SOL.Hint.g"
        }),
        polity: stringField("SOL.Character.polity"),
        faction: stringField("SOL.Character.faction"),
        bloc: stringField("SOL.Character.bloc"),
        // Décision Marc 17/10/2026 : l'âge est un entier.
        age: numberField("SOL.Character.age", {
          initial: 25,
          integer: true,
          step: 1,
          hint: "SOL.Hint.years"
        }),
        height: stringField("SOL.Character.height"),
        // Entier ou décimal : choix provisoire, à valider par Marc. Masse en kg, décimale.
        mass: numberField("SOL.Character.mass", {
          initial: 70,
          step: 0.01,
          hint: "SOL.Hint.kg"
        })
      }, { label: "SOL.Character.identity" }),

      characteristics: new SchemaField(characteristics, { label: "SOL.Sheet.Characteristics" }),

      // Texte libre, pas une liste ni un type d'objet.
      // Décision de Marc (étape 2) : un seul champ, pas le tableau
      // `{ name, note }` de la Fiche v0.2 §4. Réf. aussi LdR v0.2 §15.
      contacts: stringField("SOL.Character.contacts"),

      // Réf. Fiche v0.2 §4 et Onglet 1 : « Défauts, texte libre, sans mécanique ».
      flaws: stringField("SOL.Character.flaws"),

      // Réf. LdR v0.2 §15 (biographie HTML), Fiche v0.2 §4 (`biography`, `notes`).
      biography: htmlField("SOL.Character.biography"),
      notes: htmlField("SOL.Character.notes")
    };
  }

  /**
   * Calcule la valeur actuelle de chaque caractéristique.
   *
   * `value` n'est pas dans le schéma : il n'est pas persisté.
   * Formule : base + origin + advance + temp, puis bornée par
   * `SOL.characteristicValueBounds` (0 à 100). Les champs stockés
   * ne sont pas modifiés.
   * Réf. Fiche v0.2 §4 « total dérivé ». Décision Marc 17/10/2026.
   *
   * @override
   * @returns {void}
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const { min, max } = SOL.characteristicValueBounds;
    for ( const key of Object.keys(SOL.characteristics) ) {
      const c = this.characteristics[key];
      const sum = c.base + c.origin + c.advance + c.temp;
      // Décision Marc 17/10/2026 : valeur Actuelle bornée 0 à 100.
      // Math.clamp existe dans Foundry v13/v14. Repli min/max si absent.
      c.value = typeof Math.clamp === "function"
        ? Math.clamp(sum, min, max)
        : Math.min(max, Math.max(min, sum));
    }
  }
}
