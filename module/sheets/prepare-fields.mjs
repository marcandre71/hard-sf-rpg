/**
 * Transforme un schéma Foundry en lignes pour `{{formGroup}}`.
 *
 * Un SchemaField devient un groupe (légende = son libellé). Les autres
 * champs s'accumulent dans un groupe sans légende. Un seul niveau
 * d'imbrication : les schémas de l'étape 2 ne vont pas plus loin
 * (portée, munitions, protection, identité…).
 *
 * La valeur affichée dans l'input vient de `_source` (donnée stockée),
 * pas de la donnée préparée : un champ dérivé ne doit pas être réécrit
 * dans le formulaire. Réf. revue étape 1.
 */
const { NumberField, SchemaField } = foundry.data.fields;

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
 * Une ligne de formulaire : champ, nom complet de l'input, valeur stockée.
 *
 * `number` force `<input type="number">`. Sans ça, un NumberField qui a
 * à la fois un min et un max (Formation, 0 à 60) s'affiche en curseur
 * plus une case. Réf. revue étape 2.
 *
 * @param {foundry.data.fields.DataField} field
 * @param {string} name Nom complet de l'input (`system.identity.concept`, …).
 * @param {*} value Valeur stockée.
 * @param {string} rootId
 * @returns {{ field: foundry.data.fields.DataField, name: string, label: string, value: *, rootId: string, number: boolean }}
 */
function row(field, name, value, rootId) {
  return {
    field,
    name,
    label: fieldLabel(field),
    value: value === undefined || value === null ? "" : value,
    rootId,
    number: field instanceof NumberField
  };
}

/**
 * @param {Record<string, foundry.data.fields.DataField>} schemaFields
 * @param {object} source Donnée stockée alignée sur ces champs.
 * @param {{ skip?: string[], prefix?: string, rootId?: string }} [options]
 * @returns {{ label: string|null, rows: object[] }[]}
 */
export function prepareFieldGroups(schemaFields, source = {}, { skip = [], prefix = "system", rootId = "" } = {}) {
  const groups = [];
  let scalars = [];

  const flush = () => {
    if ( !scalars.length ) return;
    groups.push({ label: null, rows: scalars });
    scalars = [];
  };

  for ( const [key, field] of Object.entries(schemaFields) ) {
    if ( skip.includes(key) ) continue;
    const path = `${prefix}.${key}`;
    if ( field instanceof SchemaField ) {
      flush();
      const childSource = source?.[key] ?? {};
      const rows = Object.entries(field.fields).map(([childKey, child]) =>
        row(child, `${path}.${childKey}`, childSource[childKey], rootId)
      );
      groups.push({ label: fieldLabel(field) || null, rows });
    } else {
      scalars.push(row(field, path, source?.[key], rootId));
    }
  }
  flush();
  return groups;
}
