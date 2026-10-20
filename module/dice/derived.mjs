/**
 * Valeurs dérivées et arrondis. Sans Foundry.
 *
 * Réf. LdR v0.2 §2 : tout arrondi se fait au supérieur.
 * Réf. LdR v0.2 §3 : Endurance = CON/5, tolérance aux g = CON/20,
 * Sang-froid = VOL/5, Seuil de blessure = (FOR + CON)/20
 * (le Seuil est dans `damage.mjs`).
 * Réf. LdR v0.2 §4 : moitié de caractéristique sans formation,
 * dans `skill-score.mjs`.
 * La dizaine du DR et du DE n'est pas un arrondi : `tens` dans
 * `d100.mjs` garde la partie entière (`Math.floor`).
 */

/**
 * Quotient arrondi au supérieur. `null` si le nombre n'est pas fini.
 *
 * @param {number} value
 * @param {number} divisor
 * @returns {number|null}
 */
export function roundUpQuotient(value, divisor) {
  const n = Number(value);
  if ( !Number.isFinite(n) || !Number.isFinite(divisor) || divisor === 0 ) return null;
  return Math.ceil(n / divisor);
}

/**
 * Endurance maximale. Réf. LdR v0.2 §3. Ce n'est pas la valeur actuelle
 * stockée sur la fiche : le champ peut rester vide.
 *
 * @param {number} constitution
 * @returns {number|null}
 */
export function endurancePoints(constitution) {
  return roundUpQuotient(constitution, 5);
}

/**
 * Tolérance aux g. Réf. LdR v0.2 §3. Pas encore un champ d'acteur.
 *
 * @param {number} constitution
 * @returns {number|null}
 */
export function gTolerance(constitution) {
  return roundUpQuotient(constitution, 20);
}

/**
 * Sang-froid. Réf. LdR v0.2 §3. Pas encore un champ d'acteur.
 *
 * @param {number} volonte
 * @returns {number|null}
 */
export function sangFroid(volonte) {
  return roundUpQuotient(volonte, 5);
}

/**
 * Moitié arrondie au supérieur. Réf. LdR v0.2 §2 et §7 (visière).
 *
 * @param {number} value
 * @returns {number}
 */
export function ceilHalf(value) {
  return Math.ceil(Number(value) / 2);
}

/**
 * Endurance actuelle affichée et, le cas échéant, à écrire.
 * Un nombre stocké, y compris 0, reste. Seule l'absence (null,
 * undefined) prend le maximum. Décision Marc 19/10/2026 : un seul
 * nombre, le maximum est calculé. Réf. LdR v0.2 §3 et §15.
 *
 * @param {unknown} stored
 * @param {unknown} constitution
 * @returns {{ current: number|null, max: number|null, filled: boolean }}
 */
export function resolveEndurance(stored, constitution) {
  const max = endurancePoints(typeof constitution === "number" ? constitution : Number.NaN);
  if ( typeof stored === "number" && Number.isFinite(stored) ) {
    return { current: stored, max, filled: false };
  }
  return { current: max, max, filled: max != null };
}

/**
 * Passage de l'Endurance à 0. Réf. LdR v0.2 §3 et §11.
 * On propose le test seulement au moment où la valeur devient 0.
 * Rester à 0 ne le relance pas. Repasser au-dessus de 0 retire
 * le drapeau, pour qu'un nouveau passage à 0 puisse proposer.
 *
 * @param {number|null|undefined} previous
 * @param {number|null|undefined} next
 * @param {boolean} alreadyOffered
 * @returns {"offer"|"clear"|"none"}
 */
export function enduranceZeroOffer(previous, next, alreadyOffered) {
  const was = finite(previous);
  const now = finite(next);
  if ( now != null && now > 0 ) return alreadyOffered || was === 0 ? "clear" : "none";
  if ( now === 0 && was !== 0 && alreadyOffered !== true ) return "offer";
  return "none";
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Cartes d'Endurance déjà résolues. On retire les messages disparus
 * pour que le drapeau ne grossisse pas. L'id qu'on vient d'écrire reste,
 * même s'il n'est pas encore dans la liste des messages.
 *
 * @param {unknown} cards
 * @param {Iterable<string>|null|undefined} existingIds
 * @param {string|null|undefined} keepId
 * @returns {Record<string, boolean>}
 */
export function pruneResolvedCards(cards, existingIds, keepId) {
  const live = existingIds instanceof Set ? existingIds : new Set(existingIds ?? []);
  /** @type {Record<string, boolean>} */
  const next = {};
  if ( cards && typeof cards === "object" ) {
    for ( const [id, value] of Object.entries(cards) ) {
      if ( !id ) continue;
      if ( id === keepId || live.has(id) ) next[id] = value === true;
    }
  }
  if ( typeof keepId === "string" && keepId ) next[keepId] = true;
  return next;
}
