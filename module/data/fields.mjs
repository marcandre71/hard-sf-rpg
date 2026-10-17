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
 * Choix d'un {@link StringField} dont les libellés sont des clés i18n.
 *
 * La fonction n'est appelée qu'au rendu (ou à la validation), quand
 * `game.i18n` est disponible. Si ce n'est pas le cas, la clé est renvoyée
 * telle quelle : la valeur stockée reste la clé anglaise, pas le libellé.
 *
 * @param {Record<string, string>} choices Valeur stockée → clé i18n.
 * @returns {() => Record<string, string>}
 */
export function i18nChoices(choices) {
  return () => {
    const localize = globalThis.game?.i18n?.localize;
    return Object.fromEntries(
      Object.entries(choices).map(([value, key]) => [value, localize ? localize(key) : key])
    );
  };
}

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
 * Chaîne. `choices` est un objet valeur → clé i18n (voir {@link i18nChoices}).
 *
 * @param {string} label
 * @param {{ initial?: string, choices?: Record<string, string>, blank?: boolean, hint?: string }} [options]
 * @returns {foundry.data.fields.StringField}
 */
export function stringField(label, { initial = "", choices, blank = true, hint } = {}) {
  const field = { required: true, blank, initial, label };
  if ( hint ) field.hint = hint;
  if ( choices ) field.choices = i18nChoices(choices);
  return new StringField(field);
}

/**
 * Nombre. `integer: true` n'est posé que lorsque les docs donnent une
 * borne entière ou un pas entier explicite. Pas de min/max inventé.
 *
 * @param {string} label
 * @param {{ initial?: number, min?: number, max?: number, integer?: boolean, step?: number, hint?: string }} [options]
 * @returns {foundry.data.fields.NumberField}
 */
export function numberField(label, { initial = 0, min, max, integer = false, step, hint } = {}) {
  const field = { required: true, nullable: false, initial, label };
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
 * @param {{ initialValue?: number, initialMax?: number, integer?: boolean, hint?: string }} [options]
 * @returns {foundry.data.fields.SchemaField}
 */
export function valueMaxField(label, { initialValue = 0, initialMax = 0, integer = false, hint } = {}) {
  return new SchemaField({
    value: numberField("SOL.Field.value", { initial: initialValue, integer, hint }),
    max: numberField("SOL.Field.max", { initial: initialMax, integer, hint })
  }, { label });
}

export { SchemaField };
