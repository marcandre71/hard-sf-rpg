import { findSkillByName, skillScore } from "./skill-score.mjs";

/**
 * Classement de l'initiative glissante. Sans Foundry.
 *
 * Réf. LdR v0.2 §7 « Le tour et l'initiative ».
 * Décision Marc 18/10/2026 : les réussites passent avant les échecs.
 * Parmi les échecs, le moins de degrés d'échec joue d'abord.
 * Une égalité de degré se départage à la RÉF la plus élevée.
 * L'avantage ne donne aucun bonus.
 *
 * Foundry trie les combattants par initiative décroissante
 * (`Combat._sortCombatants`), puis par identifiant en cas d'égalité.
 *
 * Encodage (un seul nombre) :
 *   réussite : 1_000_000 + min(DR, 999) × 1_000 + RÉF (0 à 100)
 *   échec    : (999 − min(DE, 999)) × 1_000 + RÉF
 * Toute réussite reste au-dessus de tout échec (le plus gros échec
 * vaut 999 × 1_000 + 100 = 999_100). Un DR plus haut, ou un DE plus
 * bas, donne un nombre plus haut. La RÉF départage dans la même case.
 * // À confirmer par Marc : un DR ou un DE au-dessus de 999 est ramené
 * à 999, pour ne pas déborder sur la case du dessus.
 * // À confirmer par Marc : DR et RÉF égaux, Foundry départage par
 * l'identifiant du combattant (`Combat._sortCombatants`).
 *
 * Fin d'ordre et recul d'une place n'encodent pas un nouveau jet :
 * ils écrivent un nombre strictement plus petit que ceux qui jouent
 * avant. Le DR, le DE et la RÉF du jet restent sur la carte.
 */

/** Case du degré, au-dessus de la RÉF (0 à 100). */
export const INITIATIVE_DEGREE_SLOT = 1000;

/** Plancher de toutes les réussites, au-dessus de tous les échecs. */
export const INITIATIVE_SUCCESS_BASE = 1_000_000;

/** Degré maximum stocké. Au-delà, on reste dans la case. */
export const INITIATIVE_DEGREE_CAP = 999;

/**
 * Score de Vigilance avant difficulté.
 * Réf. LdR v0.2 §4 : sans l'objet, et la compétence n'est pas (F),
 * on prend la PER actuelle (pas la moitié). Avec l'objet, c'est
 * `skillScore` (formation comprise).
 * // À confirmer par Marc : sans PER et sans l'objet (créature, drone),
 * le score est 0.
 *
 * @param {Record<string, { value?: number }>|undefined} characteristics
 * @param {Array<{ name?: string, system?: object }>} skills
 * @param {string} skillName
 * @returns {{ impossible: boolean, score: number|null, halved: boolean, missingPerception: boolean }}
 */
export function vigilanceBaseScore(characteristics, skills, skillName) {
  const found = findSkillByName(skills ?? [], skillName);
  if ( found ) {
    const rated = skillScore(characteristics, found.system ?? {});
    return { ...rated, missingPerception: false };
  }
  const perception = characteristics?.per?.value;
  if ( typeof perception === "number" && Number.isFinite(perception) ) {
    return { impossible: false, score: perception, halved: false, missingPerception: false };
  }
  return { impossible: false, score: 0, halved: false, missingPerception: true };
}

/**
 * RÉF actuelle, ou 0 si l'acteur n'a pas cette caractéristique.
 * // À confirmer par Marc : créature, synthétique et drone n'ont pas de RÉF.
 *
 * @param {Record<string, { value?: number }>|undefined} characteristics
 * @returns {number}
 */
export function reflexScore(characteristics) {
  const reflex = characteristics?.ref?.value;
  if ( typeof reflex !== "number" || !Number.isFinite(reflex) ) return 0;
  return reflex;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  const n = Math.trunc(Number(value));
  if ( !Number.isFinite(n) ) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * @param {{ success: boolean, dr?: number, de?: number, ref?: number }} rank
 * @returns {number}
 */
export function encodeInitiative({ success, dr = 0, de = 0, ref = 0 }) {
  const reflex = clamp(ref, 0, 100);
  if ( success ) {
    const degree = clamp(dr, 0, INITIATIVE_DEGREE_CAP);
    return INITIATIVE_SUCCESS_BASE + degree * INITIATIVE_DEGREE_SLOT + reflex;
  }
  const degree = clamp(de, 0, INITIATIVE_DEGREE_CAP);
  return (INITIATIVE_DEGREE_CAP - degree) * INITIATIVE_DEGREE_SLOT + reflex;
}

/**
 * Blessure grave ou pire : fin d'ordre au tour suivant.
 * Réf. LdR v0.2 §7. La légère ne déplace pas.
 *
 * @param {string|null|undefined} severity
 * @returns {boolean}
 */
export function severityDefers(severity) {
  return severity === "serious" || severity === "critical" || severity === "mortal";
}

/**
 * Place `ids` en fin d'ordre. L'ordre relatif de ceux qui restent,
 * et celui de ceux qui partent, sont conservés.
 * `sorted` est déjà trié : index 0 joue en premier.
 * Renvoie seulement les initiatives à écrire pour les déplacés.
 * // À confirmer par Marc : plusieurs départs le même round gardent
 * leur ordre relatif. Si tout le monde part, rien ne change.
 *
 * @param {Array<{ id: string, initiative: number|null }>} sorted
 * @param {string[]} ids
 * @returns {Array<{ id: string, initiative: number }>}
 */
export function deferToEnd(sorted, ids) {
  const moving = new Set(ids);
  const stay = sorted.filter(entry => !moving.has(entry.id));
  const go = sorted.filter(entry => moving.has(entry.id));
  if ( !go.length || !stay.length ) return [];
  const values = stay
    .map(entry => entry.initiative)
    .filter(value => typeof value === "number" && Number.isFinite(value));
  const floor = values.length ? Math.min(...values) : 0;
  return go.map((entry, index) => ({
    id: entry.id,
    initiative: floor - 1 - index
  }));
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isRank(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Recule `id` d'une place. `sorted` : index 0 joue en premier.
 * Renvoie les initiatives à écrire, ou null si `id` est déjà dernier,
 * introuvable, ou sans initiative numérique.
 * // À confirmer par Marc : déjà dernier, on ne fait rien.
 * // À confirmer par Marc : à initiative égale, on ne recule que d'une
 * place dans ce groupe, sans passer devant ceux d'avant ni derrière
 * ceux d'après.
 *
 * @param {Array<{ id: string, initiative: number|null }>} sorted
 * @param {string} id
 * @returns {Array<{ id: string, initiative: number }>|null}
 */
export function stepBack(sorted, id) {
  const index = sorted.findIndex(entry => entry.id === id);
  if ( index < 0 || index >= sorted.length - 1 ) return null;
  const current = sorted[index].initiative;
  const next = sorted[index + 1].initiative;
  if ( !isRank(current) || !isRank(next) ) return null;
  if ( current !== next ) {
    const higher = Math.max(current, next);
    const lower = Math.min(current, next);
    return [
      { id: sorted[index + 1].id, initiative: higher },
      { id, initiative: lower }
    ];
  }

  // Même nombre : Foundry départagerait par identifiant. On écarte
  // seulement ce groupe, d'un pas assez petit pour rester entre le
  // combattant d'avant (valeur plus haute) et celui d'après.
  let start = index;
  while ( start > 0 && sorted[start - 1].initiative === current ) start -= 1;
  let end = index + 1;
  while ( end + 1 < sorted.length && sorted[end + 1].initiative === current ) end += 1;
  const group = sorted.slice(start, end + 1).map(entry => entry.id);
  const local = index - start;
  const swapped = group.slice();
  const moved = swapped[local];
  swapped[local] = swapped[local + 1];
  swapped[local + 1] = moved;
  const after = sorted[end + 1]?.initiative;
  const gap = isRank(after) ? current - after : 1;
  const raw = gap / (swapped.length + 1);
  const step = raw > 0 ? Math.min(0.001, raw) : 0.001;
  return swapped.map((entryId, place) => ({
    id: entryId,
    initiative: current - place * step
  }));
}
