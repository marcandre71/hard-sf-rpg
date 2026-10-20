/**
 * Colmatage. Sans Foundry.
 *
 * Réf. LdR v0.2 §7 et §8. Rustine est la première méthode.
 * D'autres (mousse expansive, etc.) s'ajoutent au registre,
 * elles ne sont pas inventées ici.
 * // À confirmer par Marc : un test raté ne consomme pas l'objet.
 */

/**
 * Méthode dont le nom correspond à l'objet, insensible à la casse.
 *
 * @param {string} name
 * @param {Array<{ id: string, name: string }>|null|undefined} methods
 * @returns {{ id: string, name: string }|null}
 */
export function findSealMethod(name, methods) {
  const wanted = String(name ?? "").trim().toLocaleLowerCase("fr");
  if ( !wanted || !methods ) return null;
  return methods.find(method => String(method?.name ?? "").trim().toLocaleLowerCase("fr") === wanted) ?? null;
}

/**
 * Une quantité inférieure à 1 ne colmate pas.
 *
 * @param {unknown} quantity
 * @returns {boolean}
 */
export function canSeal(quantity) {
  return typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 1;
}
