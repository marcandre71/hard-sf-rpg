/**
 * Transforme un schéma Foundry en lignes pour `{{formGroup}}`.
 *
 * Un SchemaField devient un groupe (légende = son libellé).
 * S'il en contient un autre (`propulsion.deltaV`, value/max),
 * celui-ci devient un groupe imbriqué. `{{formGroup}}` ne dessine
 * pas un SchemaField : `toFormGroup` ne descend pas.
 * Réf. Vaisseaux v0.1 §2. Correctif 0.7.2.1.
 * @see https://foundryvtt.com/api/v14/classes/foundry.data.fields.SchemaField.html#fields
 * @see https://foundryvtt.com/api/v14/classes/foundry.data.fields.SchemaField.html#toFormGroup
 *
 * La valeur affichée dans l'input vient de `_source` (donnée stockée),
 * pas de la donnée préparée : un champ dérivé ne doit pas être réécrit
 * dans le formulaire. Réf. revue étape 1.
 */
const NumberField = globalThis.foundry?.data?.fields?.NumberField ?? null;
const SchemaField = globalThis.foundry?.data?.fields?.SchemaField ?? null;

/**
 * Libellé i18n du champ (`options.label`, ou le getter `label` s'il existe).
 *
 * @param {foundry.data.fields.DataField} field
 * @returns {string}
 */
function fieldLabel(field) {
  return field.label ?? field.options?.label ?? "";
}

/**
 * Schéma Foundry, ou objet de test qui a `fields`.
 * Hors Foundry, `instanceof` n'existe pas : les tests passent un objet.
 *
 * @param {unknown} field
 * @returns {boolean}
 */
function isSchemaField(field) {
  if ( !field || typeof field !== "object" ) return false;
  if ( SchemaField ) return field instanceof SchemaField;
  const fields = /** @type {{ fields?: unknown }} */ (field).fields;
  return fields != null && typeof fields === "object" && !Array.isArray(fields);
}

/**
 * @param {unknown} field
 * @returns {boolean}
 */
function isNumberField(field) {
  if ( NumberField && field instanceof NumberField ) return true;
  return Boolean(field && typeof field === "object" && /** @type {{ number?: boolean }} */ (field).number === true);
}

/**
 * @param {foundry.data.fields.DataField} field
 * @returns {number|null}
 */
function fieldStep(field) {
  const step = field?.options?.step ?? /** @type {{ step?: unknown }} */ (field).step;
  return typeof step === "number" && Number.isFinite(step) ? step : null;
}

/**
 * Une ligne de formulaire : champ, nom complet de l'input, valeur stockée.
 *
 * `number` force `<input type="number">`. Sans ça, un NumberField qui a
 * à la fois un min et un max (Formation, 0 à 60) s'affiche en curseur
 * plus une case. Réf. revue étape 2.
 *
 * `decimal` : pas 0,1 (delta-v). Input texte, la virgule est acceptée.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §2.
 *
 * @param {foundry.data.fields.DataField} field
 * @param {string} name Nom complet de l'input (`system.identity.concept`, …).
 * @param {*} value Valeur stockée.
 * @param {string} rootId
 * @returns {{ field: foundry.data.fields.DataField, name: string, label: string, value: *, rootId: string, number: boolean, decimal: boolean }}
 */
function row(field, name, value, rootId) {
  const number = isNumberField(field);
  return {
    field,
    name,
    label: fieldLabel(field),
    value: value === undefined || value === null ? "" : value,
    rootId,
    number,
    decimal: number && fieldStep(field) === 0.1
  };
}

/**
 * @param {Record<string, foundry.data.fields.DataField>} schemaFields
 * @param {object} source Donnée stockée alignée sur ces champs.
 * @param {{ skip?: string[], prefix?: string, rootId?: string }} [options]
 * @returns {{ label: string|null, hint?: string, inert?: boolean, rows: object[], groups: object[] }[]}
 */
export function prepareFieldGroups(schemaFields, source = {}, { skip = [], prefix = "system", rootId = "" } = {}) {
  return collectGroups(schemaFields, source, { skip, prefix, rootId });
}

/**
 * @param {Record<string, foundry.data.fields.DataField>|undefined} schemaFields
 * @param {object} source
 * @param {{ skip: string[], prefix: string, rootId: string }} options
 * @returns {{ label: string|null, rows: object[], groups: object[] }[]}
 */
function collectGroups(schemaFields, source, { skip, prefix, rootId }) {
  /** @type {{ label: string|null, rows: object[], groups: object[] }[]} */
  const groups = [];
  /** @type {object[]} */
  let scalars = [];

  const flush = () => {
    if ( !scalars.length ) return;
    groups.push({ label: null, rows: scalars, groups: [] });
    scalars = [];
  };

  for ( const [key, field] of Object.entries(schemaFields ?? {}) ) {
    if ( skip.includes(key) ) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if ( isSchemaField(field) ) {
      flush();
      const nested = /** @type {{ fields: Record<string, foundry.data.fields.DataField> }} */ (field);
      const inner = collectGroups(nested.fields, source?.[key] ?? {}, { skip: [], prefix: path, rootId });
      groups.push(liftSchema(fieldLabel(field) || null, inner));
    } else {
      scalars.push(row(field, path, source?.[key], rootId));
    }
  }
  flush();
  return groups;
}

/**
 * Les scalaires du schéma restent les lignes du groupe.
 * Un schéma interne (delta-v) reste un groupe, avec sa légende.
 *
 * @param {string|null} label
 * @param {{ label: string|null, rows: object[], groups: object[] }[]} inner
 * @returns {{ label: string|null, rows: object[], groups: object[] }}
 */
function liftSchema(label, inner) {
  /** @type {object[]} */
  const rows = [];
  /** @type {object[]} */
  const groups = [];
  for ( const group of inner ) {
    if ( group.label ) groups.push(group);
    else {
      rows.push(...group.rows);
      if ( group.groups.length ) groups.push(...group.groups);
    }
  }
  return { label, rows, groups };
}

/**
 * Grise un bloc et ses groupes imbriqués. Les valeurs restent.
 * Même idée que `refusesManeuver` : l'objet fixe n'utilise pas la propulsion.
 * Réf. Vaisseaux v0.1 §2. Décision Marc 21/10/2026.
 *
 * @param {{ inert?: boolean, hint?: string, rows?: { disabled?: boolean, hint?: string }[], groups?: object[] }[]|undefined} groups
 * @param {string} hint Clé i18n.
 * @returns {void}
 */
export function markGroupDisabled(groups, hint) {
  for ( const group of groups ?? [] ) {
    group.inert = true;
    if ( hint ) group.hint = hint;
    for ( const line of group.rows ?? [] ) {
      line.disabled = true;
      if ( hint ) line.hint = hint;
    }
    markGroupDisabled(group.groups, hint);
  }
}
