/**
 * Schéma commun du Personnage et du PNJ.
 *
 * Étape 3 : le PNJ a la même feuille et les mêmes champs que le personnage.
 * Ce n'est pas une règle nouvelle du LdR (LdR v0.2 §15 ne détaille pas le PNJ) :
 * c'est la mise en page demandée. Réf. consigne étape 3, Fiche v0.2 §4
 * pour les champs du personnage.
 *
 * Neuf caractéristiques (`base`, `origin`, `advance`, `temp`). `value`
 * est dérivée, jamais stockée. Bornes : `SOL.characteristicFields` et
 * `SOL.characteristicValueBounds`.
 *
 * Identité, contacts, défauts, biographie, notes : Fiche v0.2 §4.
 * Vice et Lueur n'existent pas (Fiche v0.2 §5 : supprimés le 17/10/2026).
 *
 * Endurance actuelle : champ nullable, pas de `migrateData`.
 * Le maximum dérivé (CON/5, arrondi supérieur, LdR v0.2 §3) n'est
 * pas stocké. Tolérance aux g et Sang-froid ne sont pas des champs.
 * Hors périmètre ici : ressources, XP.
 * Décision Marc 18/10/2026 : pas de valeur dérivée Initiative (RÉF/10).
 * L'initiative glissante (test de Vigilance, LdR v0.2 §7) est dans
 * `module/dice/initiative.mjs` et `module/combat/initiative.mjs`.
 * Ce n'est pas un champ de la fiche.
 */
import { characteristicFieldsFor, SOL } from "../config.mjs";
import { htmlField, numberField, SchemaField, stringField } from "./fields.mjs";

const { NumberField } = foundry.data.fields;

/**
 * Champs stockés d'une caractéristique, aux bornes données.
 *
 * @param {typeof SOL.characteristicFields} bounds
 * @returns {Record<string, foundry.data.fields.NumberField>}
 */
function storedCharacteristicFields(bounds) {
  /** @type {Record<string, foundry.data.fields.NumberField>} */
  const fields = {};
  for ( const [name, cfg] of Object.entries(bounds) ) {
    // Bornes lues dans CONFIG.SOL : les changer ici ne suffit pas,
    // il faut les changer dans characteristicFields.
    /** @type {foundry.data.fields.NumberFieldOptions} */
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
  return fields;
}

/**
 * Schéma `characteristics` pour les clés demandées.
 * Personnage et PNJ : les neuf. Créature, synthétique, drone : FOR, CON et PER.
 *
 * @param {string[]} keys
 * @param {typeof SOL.characteristicFields} bounds
 * @returns {foundry.data.fields.SchemaField}
 */
export function characteristicSchema(keys, bounds) {
  /** @type {Record<string, foundry.data.fields.SchemaField>} */
  const characteristics = {};
  for ( const key of keys ) {
    characteristics[key] = new SchemaField(storedCharacteristicFields(bounds));
  }
  return new SchemaField(characteristics, { label: "SOL.Sheet.Characteristics" });
}

/**
 * Actuelle = base + origin + advance + temp, bornée 0 à 100.
 * Les champs stockés ne sont pas modifiés.
 *
 * @param {Record<string, { base: number, origin: number, advance: number, temp: number, value?: number }>|undefined} characteristics
 * @param {string[]} keys
 * @returns {void}
 */
export function deriveCharacteristicValues(characteristics, keys) {
  const { min, max } = SOL.characteristicValueBounds;
  for ( const key of keys ) {
    const c = characteristics?.[key];
    if ( !c ) continue;
    const sum = c.base + c.origin + c.advance + c.temp;
    // Décision Marc 17/10/2026 : valeur Actuelle bornée 0 à 100.
    // Math.clamp existe dans Foundry v13/v14. Repli min/max si absent.
    c.value = typeof Math.clamp === "function"
      ? Math.clamp(sum, min, max)
      : Math.min(max, Math.max(min, sum));
  }
}

/**
 * Données `system` partagées par `character` et `npc`.
 *
 * @extends foundry.abstract.TypeDataModel
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
 */
export class PersonData extends foundry.abstract.TypeDataModel {

  /**
   * Bornes des champs stockés. Le PNJ redéfinit cette méthode :
   * sa Base va jusqu'à 100. Décision Marc 18/10/2026.
   *
   * @returns {typeof SOL.characteristicFields}
   */
  static characteristicFieldBounds() {
    return characteristicFieldsFor("character");
  }

  /**
   * Schéma du champ `system`.
   *
   * @override
   * @returns {foundry.data.fields.DataSchema}
   */
  static defineSchema() {
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

      characteristics: characteristicSchema(Object.keys(SOL.characteristics), this.characteristicFieldBounds()),

      // Réf. LdR v0.2 §3. null : pas encore suivie. Pas de migrateData.
      endurance: numberField("SOL.Actor.endurance", {
        initial: null,
        nullable: true,
        integer: true,
        min: 0,
        step: 1,
        hint: "SOL.Actor.enduranceHint"
      }),

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
    deriveCharacteristicValues(this.characteristics, Object.keys(SOL.characteristics));
  }
}
