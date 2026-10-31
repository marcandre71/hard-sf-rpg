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
 * « autoInjector ou timbre » est le texte déjà stocké par le catalogue.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function administrationReading(value) {
  if ( typeof value !== "string" || value === "" ) return "";
  if ( value === "autoInjector ou timbre" ) return "SOL.Substance.administrationMode.autoInjectorOrPatch";
  return SOL.substanceAdministrationLabels[value] ?? "";
}
