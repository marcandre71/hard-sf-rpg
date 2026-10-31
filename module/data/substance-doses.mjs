/**
 * Doses d'une substance à la création.
 *
 * Décision Marc 31/10/2026 : la valeur actuelle est pleine.
 * On copie le maximum seulement quand la valeur est absente (null)
 * et que le maximum est un entier. Un 0 stocké reste 0.
 * Une création sans maximum (fiche faite à la main) reste vide.
 * Pas de migrateData : un diff partiel ne reçoit pas cette valeur.
 */

/**
 * Valeur à écrire, ou undefined si on ne touche pas.
 *
 * @param {{ value?: number|null, max?: number|null }|null|undefined} doses
 * @returns {number|undefined}
 */
export function fullDosesValue(doses) {
  if ( !doses || typeof doses !== "object" ) return undefined;
  if ( doses.value !== null && doses.value !== undefined ) return undefined;
  if ( !Number.isInteger(doses.max) ) return undefined;
  return doses.max;
}

/**
 * Pose la valeur pleine sur le document en cours de création.
 * `parent` est l'objet, pas le TypeDataModel.
 *
 * @param {{ doses?: { value?: number|null, max?: number|null }, parent?: { updateSource: (changes: object) => unknown } }} model
 * @returns {void}
 */
export function applyFullDoses(model) {
  const value = fullDosesValue(model?.doses);
  if ( value === undefined ) return;
  model.parent.updateSource({ "system.doses.value": value });
}
