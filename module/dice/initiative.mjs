import { findSkillByName, skillScore } from "./skill-score.mjs";

/**
 * Classement de l'initiative glissante. Sans Foundry.
 *
 * Réf. LdR v0.2 §7 « Le tour et l'initiative ».
 * Réf. LdR v0.2 §7 : les réussites passent avant les échecs.
 * Parmi les échecs, le moins de degrés d'échec joue d'abord.
 * Décision Marc 18/10/2026. Une égalité de degré se départage à la RÉF la plus élevée.
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
    // À confirmer par Marc : Vigilance des créatures, synthétiques et drones.
    // Avec l'objet, le score est celui de skillScore : la formation seule
    // si la caractéristique (PER) n'existe pas. Pas d'avertissement.
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
 * Réf. LdR v0.2 §7 : plusieurs départs le même round gardent
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
 * Moment du recul d'une place.
 * `turn` est l'index du combattant actif (`Combat.turn`), 0 en tête.
 * // À confirmer par Marc : effet immédiat ou au round suivant.
 * Actif ou déjà joué (index <= turn) : au round suivant, pour ne pas
 * sauter le suivant ni faire rejouer celui qu'on vient de dépasser.
 * Pas encore joué : tout de suite.
 *
 * @param {number} index
 * @param {number|null|undefined} turn
 * @returns {"defer"|"now"}
 */
export function interruptTiming(index, turn) {
  if ( typeof index !== "number" || index < 0 ) return "now";
  if ( typeof turn !== "number" || !Number.isFinite(turn) ) return "now";
  return index <= turn ? "defer" : "now";
}

/**
 * Index actuel de « se replacer », même règle que l'interruption.
 * Le rang d'arrivée est décidé par `repositionPlacement`.
 * // À confirmer par Marc : effet immédiat ou au round suivant.
 *
 * @param {number} index
 * @param {number|null|undefined} turn
 * @returns {"defer"|"now"}
 */
export function repositionTiming(index, turn) {
  return interruptTiming(index, turn);
}

/**
 * Index qu'aurait `id` si son initiative devenait `initiative`.
 *
 * @param {Array<{ id: string, initiative: number|null }>} sorted
 * @param {string} id
 * @param {number} initiative
 * @returns {number}
 */
export function indexAfterRoll(sorted, id, initiative) {
  const next = sortByInitiative(sorted.map(entry => (
    entry.id === id ? { id, initiative } : { id: entry.id, initiative: entry.initiative }
  )));
  return next.findIndex(entry => entry.id === id);
}

/**
 * « Se replacer », et « Relancer » du cœur en cours de round.
 * // À confirmer par Marc : effet immédiat ou au round suivant.
 * Actif ou déjà joué : au round suivant.
 * Pas encore joué, mais le nouveau rang tombe sur le tour actif ou
 * avant : au round suivant, sinon il prend le tour et l'actif rejoue.
 * Sinon : tout de suite.
 *
 * @param {number} currentIndex
 * @param {number} newIndex
 * @param {number|null|undefined} turn
 * @returns {"defer"|"now"}
 */
export function repositionPlacement(currentIndex, newIndex, turn) {
  if ( repositionTiming(currentIndex, turn) === "defer" ) return "defer";
  if ( typeof turn !== "number" || !Number.isFinite(turn) ) return "now";
  if ( typeof newIndex !== "number" || newIndex < 0 ) return "now";
  return newIndex <= turn ? "defer" : "now";
}

/** Portée des drapeaux d'initiative sur le combattant. */
export const INITIATIVE_FLAG_SCOPE = "sol-nouvelle-ere";

/**
 * Ce que `resetAll` doit retirer. Le cœur (v13) écrit le combat
 * avec `diff: false` : `Combatant._preUpdate` ne tourne pas, et un
 * `pendingInitiative` resté en place reposerait l'ancien jet.
 *
 * @returns {{ deferStep: false, deferEnd: false, delete: string[] }}
 */
export function flagsClearedByReset() {
  return {
    deferStep: false,
    deferEnd: false,
    delete: ["rank", "pendingInitiative"]
  };
}

/**
 * Suppression d'une clé de drapeau.
 * v14 : la valeur est `foundry.data.operators.ForcedDeletion`
 * (`-=` est déprécié, issue 13090, encore accepté jusqu'en v16).
 * Sans opérateur : repli v13 `-=`.
 *
 * @param {string} key
 * @param {object|null|undefined} operator
 * @returns {object}
 */
export function flagDeletionUpdate(key, operator) {
  if ( operator ) return { [`flags.${INITIATIVE_FLAG_SCOPE}.${key}`]: operator };
  return { [`flags.${INITIATIVE_FLAG_SCOPE}.-=${key}`]: null };
}

/**
 * Écriture des drapeaux pour `resetAll`, avant `super`.
 *
 * @param {object|null|undefined} operator `ForcedDeletion`, ou null en v13.
 * @returns {object}
 */
export function resetAllFlagUpdate(operator) {
  const spec = flagsClearedByReset();
  /** @type {object} */
  const data = {
    [`flags.${INITIATIVE_FLAG_SCOPE}.deferStep`]: spec.deferStep,
    [`flags.${INITIATIVE_FLAG_SCOPE}.deferEnd`]: spec.deferEnd
  };
  for ( const key of spec.delete ) Object.assign(data, flagDeletionUpdate(key, operator));
  return data;
}

/**
 * Tri du cœur : initiative décroissante, puis `a.id > b.id`
 * par code de caractère. Pas `localeCompare`.
 *
 * @param {{ id: string, initiative: number|null }} a
 * @param {{ id: string, initiative: number|null }} b
 * @returns {number}
 */
export function compareByFoundryInitiative(a, b) {
  const av = typeof a.initiative === "number" && Number.isFinite(a.initiative)
    ? a.initiative
    : Number.NEGATIVE_INFINITY;
  const bv = typeof b.initiative === "number" && Number.isFinite(b.initiative)
    ? b.initiative
    : Number.NEGATIVE_INFINITY;
  return (bv - av) || (a.id > b.id ? 1 : -1);
}

/**
 * @param {Array<{ id: string, initiative: number|null }>} entries
 * @returns {Array<{ id: string, initiative: number|null }>}
 */
export function sortByInitiative(entries) {
  return entries.slice().sort(compareByFoundryInitiative);
}

/**
 * Faut-il retirer le drapeau `rank`.
 * Un jet du système, ou une écriture qui pose `rank`, le garde.
 * Initiative effacée, ou nombre saisi à la main : on l'enlève.
 *
 * @param {boolean} initiativeChanged
 * @param {{ systemWrite?: boolean, setsRank?: boolean }} [context]
 * @returns {boolean}
 */
export function shouldClearRank(initiativeChanged, { systemWrite = false, setsRank = false } = {}) {
  if ( !initiativeChanged ) return false;
  if ( systemWrite || setsRank ) return false;
  return true;
}

/**
 * Le libellé « 2 DR · RÉF 57 » ne s'affiche que si l'initiative est un nombre.
 *
 * @param {unknown} initiative
 * @param {{ success?: boolean }|null|undefined} rank
 * @returns {boolean}
 */
export function showRankLabel(initiative, rank) {
  if ( typeof initiative !== "number" || !Number.isFinite(initiative) ) return false;
  return Boolean(rank && typeof rank.success === "boolean");
}

/**
 * Une passe : nouveau rang en attente, puis reculs, puis fin d'ordre.
 * Réf. LdR v0.2 §7. Renvoie les écritures à fusionner.
 *
 * @param {Array<{ id: string, initiative: number|null, deferStep?: boolean, deferEnd?: boolean, pendingInitiative?: { initiative?: number, rank?: object }|null }>} sorted
 * @returns {Array<{ id: string, initiative?: number, clearStep?: boolean, clearEnd?: boolean, clearPending?: boolean, rank?: object }>}
 */
export function resolveDeferred(sorted) {
  let order = sorted.map(entry => {
    const pending = entry.pendingInitiative?.initiative;
    const initiative = typeof pending === "number" && Number.isFinite(pending)
      ? pending
      : entry.initiative;
    return { id: entry.id, initiative };
  });
  order = sortByInitiative(order);

  const stepIds = new Set(sorted.filter(entry => entry.deferStep).map(entry => entry.id));
  // Copie figée : le tri après chaque recul ne doit pas changer qui est traité.
  for ( const id of order.map(entry => entry.id).reverse() ) {
    if ( !stepIds.has(id) ) continue;
    const changes = stepBack(order, id);
    if ( !changes ) continue;
    const byId = new Map(changes.map(change => [change.id, change.initiative]));
    order = sortByInitiative(order.map(entry => byId.has(entry.id)
      ? { ...entry, initiative: byId.get(entry.id) }
      : entry));
  }

  const endIds = sorted.filter(entry => entry.deferEnd).map(entry => entry.id);
  const moved = deferToEnd(order, endIds);
  if ( moved.length ) {
    const byId = new Map(moved.map(change => [change.id, change.initiative]));
    order = order.map(entry => byId.has(entry.id)
      ? { ...entry, initiative: byId.get(entry.id) }
      : entry);
  }

  const original = new Map(sorted.map(entry => [entry.id, entry.initiative]));
  const nextById = new Map(order.map(entry => [entry.id, entry.initiative]));
  /** @type {Map<string, object>} */
  const updates = new Map();
  for ( const entry of sorted ) {
    /** @type {object} */
    const data = { id: entry.id };
    let touched = false;
    if ( entry.deferStep ) {
      data.clearStep = true;
      touched = true;
    }
    if ( entry.deferEnd ) {
      data.clearEnd = true;
      touched = true;
    }
    if ( entry.pendingInitiative ) {
      data.clearPending = true;
      if ( entry.pendingInitiative.rank ) data.rank = entry.pendingInitiative.rank;
      touched = true;
    }
    const next = nextById.get(entry.id);
    if ( typeof next === "number" && next !== original.get(entry.id) ) {
      data.initiative = next;
      touched = true;
    }
    if ( touched ) updates.set(entry.id, data);
  }
  for ( const entry of order ) {
    if ( updates.has(entry.id) ) continue;
    if ( typeof entry.initiative === "number" && entry.initiative !== original.get(entry.id) ) {
      updates.set(entry.id, { id: entry.id, initiative: entry.initiative });
    }
  }
  return [...updates.values()];
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
    // Échanger les deux nombres ferait entrer le suivant dans le groupe
    // d'égalité de ceux qui précèdent. Le tri par id le remonterait
    // alors de plusieurs places. On les pose juste sous la valeur
    // actuelle, dans l'écart avec le combattant d'après.
    const after = sorted[index + 2]?.initiative;
    const gap = isRank(after) ? current - after : 1;
    const step = gap > 0 ? Math.min(0.001, gap / 3) : 0.001;
    return [
      { id: sorted[index + 1].id, initiative: current - step },
      { id, initiative: current - 2 * step }
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
