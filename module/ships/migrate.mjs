/**
 * Migrations des vaisseaux et des modules, sans Foundry.
 *
 * Un diff partiel ne reçoit aucun défaut : on ne réécrit une clé que
 * si elle est déjà dans l'objet. Réf. revue des modèles (un `migrateData`
 * qui injecte écrase une valeur saisie).
 */
import { SHIP_MODULE_CATEGORIES } from "./hull.mjs";

const MODULE_CATEGORY = new Set(SHIP_MODULE_CATEGORIES);

/**
 * @param {unknown} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Ancienne catégorie d'acteur.
 *
 * Décision Marc 21/10/2026 : « station » devient « fixed » (objet fixe).
 * Décision Marc 21/10/2026 : l'ancienne clé « ship » devient « void ».
 *
 * @param {object|null|undefined} source
 * @returns {object|null|undefined}
 */
export function migrateShipSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  if ( Object.hasOwn(source, "category") ) {
    if ( source.category === "station" ) source.category = "fixed";
    else if ( source.category === "ship" ) source.category = "void";
  }
  // Décision Marc 21/10/2026 : seule l'Intégrité du module Radiateurs compte.
  // `-=integrity` est la suppression Foundry : un diff qui n'a pas la clé
  // ne la crée pas, et on n'ajoute pas `sections` s'il n'y est pas.
  dropRadiatorSectionIntegrity(source);
  // Décision Marc 23/10/2026 : delta-v au dixième, sans suivi exact.
  // On n'ajoute ni `propulsion`, ni `deltaV`, ni `range`.
  roundPresentDeltaV(source);
  return source;
}

/**
 * « 3,5 » devient 3.5. Sans virgule, la valeur est rendue telle quelle.
 * Une chaîne illisible (« x ») n'est pas remplacée.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §2.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function normalizeDecimalText(value) {
  if ( typeof value !== "string" || !value.includes(",") ) return value;
  const text = value.trim().replace(",", ".");
  if ( text === "" ) return value;
  const number = Number(text);
  return Number.isFinite(number) ? number : value;
}

/**
 * Arrondit `value` et `max` au dixième, seulement si la clé est déjà là.
 * Une valeur illisible n'est pas remplacée par 0. Une virgule est lue.
 * Décision Marc 23/10/2026. Pas d'autre clé : `exact` et `exactValue`
 * n'ont jamais été écrites.
 *
 * @param {object|null|undefined} source
 * @returns {void}
 */
export function roundPresentDeltaV(source) {
  if ( !source || typeof source !== "object" || !Object.hasOwn(source, "propulsion") ) return;
  const propulsion = source.propulsion;
  if ( !propulsion || typeof propulsion !== "object" || !Object.hasOwn(propulsion, "deltaV") ) return;
  const delta = propulsion.deltaV;
  if ( !delta || typeof delta !== "object" ) return;
  if ( Object.hasOwn(delta, "value") ) {
    const rounded = roundTenth(delta.value);
    if ( rounded !== undefined ) delta.value = rounded;
  }
  if ( Object.hasOwn(delta, "max") ) {
    const rounded = roundTenth(delta.max);
    if ( rounded !== undefined ) delta.max = rounded;
  }
}

/**
 * @param {unknown} value
 * @returns {number|undefined}
 */
function roundTenth(value) {
  const normalized = normalizeDecimalText(value);
  const number = typeof normalized === "number" ? normalized : Number(normalized);
  if ( !Number.isFinite(number) ) return undefined;
  return Math.round(number * 10) / 10;
}

/**
 * @param {object} source
 * @returns {void}
 */
function dropRadiatorSectionIntegrity(source) {
  if ( !Object.hasOwn(source, "sections") ) return;
  const sections = source.sections;
  if ( !sections || typeof sections !== "object" || !Object.hasOwn(sections, "radiators") ) return;
  const radiators = sections.radiators;
  if ( !radiators || typeof radiators !== "object" || !Object.hasOwn(radiators, "integrity") ) return;
  delete radiators.integrity;
  radiators["-=integrity"] = null;
}

/**
 * Ancien module de l'étape 2 : `category` et `state` étaient du texte libre.
 * L'état n'est plus stocké (il découle de l'Intégrité). On ne recopie pas
 * ce texte dans l'Intégrité.
 *
 * // À confirmer par Marc : une catégorie qui n'est pas une des onze clés
 * devient `other`. Si `effects` est dans le même objet, l'ancien libellé
 * y est gardé. Un diff qui n'a pas `effects` ne le crée pas : le libellé
 * de ce diff-là est perdu.
 *
 * @param {object|null|undefined} source
 * @returns {object|null|undefined}
 */
export function migrateShipModuleSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  if ( Object.hasOwn(source, "state") ) delete source.state;
  if ( !Object.hasOwn(source, "category") ) return source;
  const category = source.category;
  if ( typeof category !== "string" ) return source;
  if ( MODULE_CATEGORY.has(category) ) return source;
  if ( category !== "" && Object.hasOwn(source, "effects") ) {
    const previous = escapeHtml(category);
    const effects = typeof source.effects === "string" ? source.effects : "";
    if ( !effects.includes(previous) ) {
      source.effects = `<p>Ancienne catégorie : ${previous}</p>${effects}`;
    }
  }
  source.category = "other";
  return source;
}
