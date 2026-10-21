/**
 * Constructeurs courts pour les champs de données.
 *
 * Les modèles de `module/data/` passent par ici pour que chaque champ ait
 * les mêmes options de base (`required`, libellé i18n) et que les listes
 * de choix viennent de `module/config.mjs`.
 *
 * Les libellés sont des clés de `lang/fr.json`. `{{formGroup}}` les résout
 * quand le gabarit passe `localize=true`.
 */
const { HTMLField, StringField, NumberField, BooleanField, SchemaField } = foundry.data.fields;

/**
 * Texte enrichi. Doit aussi figurer dans `htmlFields` de `system.json`
 * pour la sanitation serveur. Réf. Foundry, ServerSanitizationFields.
 *
 * @param {string} label Clé i18n.
 * @returns {foundry.data.fields.HTMLField}
 */
export function htmlField(label) {
  return new HTMLField({ required: true, blank: true, initial: "", label });
}

/**
 * Chaîne. `choices` est un objet valeur stockée → clé i18n, recopié tel quel.
 *
 * La validation Foundry ne regarde que les clés : elle ne doit jamais
 * appeler `game.i18n`. Le gabarit traduit les libellés (`formGroup` /
 * `formInput` avec `localize=true`).
 *
 * Ne pas passer une fonction qui fait `const localize = game.i18n.localize` :
 * la méthode détachée n'a plus `this`, et `this.translations` lève un
 * TypeError à chaque validation (Véhicule, Vaisseau, Arme, etc.).
 * Réf. revue étape 2.
 *
 * @param {string} label
 * @param {{ initial?: string, choices?: Record<string, string>, blank?: boolean, hint?: string }} [options]
 * @returns {foundry.data.fields.StringField}
 */
export function stringField(label, { initial = "", choices, blank = true, hint } = {}) {
  const field = { required: true, blank, initial, label };
  if ( hint ) field.hint = hint;
  if ( choices ) field.choices = { ...choices };
  return new StringField(field);
}

/**
 * Nombre. `integer: true` est un choix du modèle (voir chaque appelant) :
 * un pas de 1 arrondit déjà les décimales, autant le dire dans le schéma.
 * Pas de min/max inventé au-delà de ce que les docs écrivent.
 *
 * `nullable: true` et `initial: null` : le champ absent reste vide.
 * On ne s'en sert pas pour injecter 0 (un seuil de brèche à 0 percerait
 * au premier point de dégâts).
 *
 * @param {string} label
 * @param {{ initial?: number|null, min?: number, max?: number, integer?: boolean, step?: number, hint?: string, nullable?: boolean }} [options]
 * @returns {foundry.data.fields.NumberField}
 */
export function numberField(label, { initial = 0, min, max, integer = false, step, hint, nullable = false } = {}) {
  const field = { required: true, nullable, initial, label };
  if ( integer ) field.integer = true;
  if ( min !== undefined ) field.min = min;
  if ( max !== undefined ) field.max = max;
  if ( step !== undefined ) field.step = step;
  if ( hint ) field.hint = hint;
  return new NumberField(field);
}

/**
 * Booléen.
 *
 * @param {string} label
 * @param {boolean} [initial=false]
 * @returns {foundry.data.fields.BooleanField}
 */
export function boolField(label, initial = false) {
  return new BooleanField({ required: true, initial, label });
}

/**
 * Paire stockée `{ value, max }`, comme les munitions ou la réserve d'air.
 * Réf. Fiche v0.2 §4.
 *
 * @param {string} label Clé i18n du groupe.
 * @param {{ initialValue?: number, initialMax?: number, integer?: boolean, min?: number, max?: number, hint?: string }} [options]
 * @returns {foundry.data.fields.SchemaField}
 */
export function valueMaxField(label, { initialValue = 0, initialMax = 0, integer = false, min, max, hint } = {}) {
  return new SchemaField({
    value: numberField("SOL.Field.value", { initial: initialValue, integer, min, max, hint }),
    max: numberField("SOL.Field.max", { initial: initialMax, integer, min, max, hint })
  }, { label });
}

export { SchemaField };
