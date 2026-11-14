/**
 * Valeurs dérivées et arrondis. Sans Foundry.
 *
 * Réf. LdR v0.2 §2 : tout arrondi se fait au supérieur.
 * Réf. LdR v0.2 §3 : Endurance = CON/5, tolérance aux g = CON/20,
 * Sang-froid = VOL/5, Seuil de blessure = (FOR + CON)/20
 * (le Seuil est dans `damage.mjs`).
 * LdR v0.3 §3 : la tolérance aux g ajoute le modificateur d'origine.
 * La CON est l'actuelle, après origine, comme l'Endurance et le Seuil.
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
 * Tolérance aux g. CON actuelle / 20, arrondi au supérieur,
 * plus le modificateur de l'objet Origine (`gToleranceModifier`).
 * Sans origine, le modificateur est 0. Ce n'est pas un champ stocké.
 * LdR v0.3 §3 / §9. Réf. LdR v0.2 §3.
 *
 * @param {number} constitution Actuelle, après le champ `origin`.
 * @param {number} [originModifier]
 * @returns {number|null}
 */
export function gTolerance(constitution, originModifier = 0) {
  const base = roundUpQuotient(constitution, 20);
  if ( base === null ) return null;
  const extra = Number(originModifier);
  return base + (Number.isFinite(extra) ? Math.trunc(extra) : 0);
}

/**
 * Modificateur lu sur l'objet Origine de la fiche. Champ déjà dans le
 * compendium. Absent ou illisible : 0.
 *
 * @param {Iterable<{ type?: string, system?: { gToleranceModifier?: unknown } }>|null|undefined} items
 * @returns {number}
 */
export function originToleranceModifier(items) {
  let origin = null;
  for ( const item of items ?? [] ) {
    if ( item?.type === "origin" ) {
      origin = item;
      break;
    }
  }
  const raw = origin?.system?.gToleranceModifier;
  const number = Number(raw);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

/**
 * Paliers déjà écrits pour la dose aiguë. LdR v0.2 §8, journal États.
 * Le livre v0.3 ne donne pas une autre échelle pour la dose de toute une vie.
 * On les applique au cumul affiché.
 */
export const RADIATION_TIERS = [
  { id: "healthy", below: 250 },
  { id: "exposed", below: 1000 },
  { id: "irradiated", below: 3000 },
  { id: "condemned", below: Infinity }
];

/**
 * Dose cumulée affichée. Elle n'est pas stockée.
 * La dose de départ n'est pas recopiée dans la dose aiguë :
 * on les additionne une fois chacune. Une case vide compte 0.
 * LdR v0.3 §9.
 *
 * @param {unknown} starting
 * @param {unknown} acute
 * @returns {number}
 */
export function cumulativeDose(starting, acute) {
  return doseOrZero(starting) + doseOrZero(acute);
}

/**
 * @param {unknown} dose
 * @returns {"healthy"|"exposed"|"irradiated"|"condemned"}
 */
export function radiationTier(dose) {
  const number = doseOrZero(dose);
  if ( number < 250 ) return "healthy";
  if ( number < 1000 ) return "exposed";
  if ( number < 3000 ) return "irradiated";
  return "condemned";
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function doseOrZero(value) {
  const number = Number(value);
  if ( !Number.isFinite(number) ) return 0;
  return Math.trunc(number);
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
 * Valeur à écrire au `ready`, ou `null` pour ne rien écrire.
 * Seulement une fiche d'avant la 0.6.1, et seulement si l'Endurance
 * n'est pas déjà un nombre. Une fiche récente reste vide ici :
 * l'affichage lit le maximum dès que la CON est posée.
 * `isNewerVersion` est `foundry.utils.isNewerVersion`.
 *
 * @param {unknown} stored
 * @param {unknown} constitution
 * @param {unknown} systemVersion
 * @param {(left: string, right: string) => boolean} isNewerVersion
 * @returns {number|null}
 */
export function enduranceReadyFill(stored, constitution, systemVersion, isNewerVersion) {
  if ( typeof isNewerVersion !== "function" ) return null;
  const version = typeof systemVersion === "string" && systemVersion.length > 0 ? systemVersion : "0";
  if ( isNewerVersion("0.6.1", version) !== true ) return null;
  if ( typeof stored === "number" && Number.isFinite(stored) ) return null;
  const resolved = resolveEndurance(stored, constitution);
  if ( resolved.filled !== true || typeof resolved.current !== "number" ) return null;
  return resolved.current;
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
