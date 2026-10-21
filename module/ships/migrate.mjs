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
  return source;
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
