/**
 * Libellé d'une voie d'administration, à l'affichage seulement.
 *
 * Le champ reste un texte libre. Une valeur qui n'est pas une clé connue
 * s'affiche telle quelle. Décision Marc 31/10/2026.
 */
import { SOL } from "../config.mjs";

/**
 * Clé i18n, ou chaîne vide si le texte n'est pas une clé connue.
 *
 * « autoInjector » et « autoInjector ou timbre » sont les textes déjà stockés.
 * Décision Marc 31/10/2026.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function administrationReading(value) {
  if ( typeof value !== "string" || value === "" ) return "";
  return SOL.substanceAdministrationLabels[value] ?? "";
}
