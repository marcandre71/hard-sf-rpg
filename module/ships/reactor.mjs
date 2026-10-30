/**
 * Chaleur, Pousser et réparations, sans Foundry.
 *
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 * // Réf. Vaisseaux v0.1 §7
 * Pas d'autre refroidissement que celui-ci.
 */

/** Plafond de la jauge. // Réf. Vaisseaux v0.1 §6 */
export const HEAT_MAX = 10;

/** À partir de 7 : −10 à tous les postes. // Réf. Vaisseaux v0.1 §6 */
export const HEAT_STRAIN = 7;

/** Malus de chaleur. // Réf. Vaisseaux v0.1 §6 */
export const HEAT_POST_PENALTY = -10;

/** À 9, Pousser est refusé. // Réf. Vaisseaux v0.1 §6 */
export const PUSH_BLOCK = 9;

/** Redémarrer seulement à 5 ou moins. // Décision Marc 30/10/2026 */
export const RESTART_MAX = 5;

/** Réparation de fortune : Mécanique −20. // Réf. Vaisseaux v0.1 §7 */
export const FIELD_REPAIR_PENALTY = -20;

/** Intégrité après une réparation de fortune réussie. */
export const FIELD_REPAIR_VALUE = 1;

/**
 * Jauge bornée, 0 à 10. Elle ne dépasse jamais 10.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {unknown} value
 * @returns {number}
 */
export function clampHeat(value) {
  const number = Math.trunc(Number(value));
  if ( !Number.isFinite(number) || number < 0 ) return 0;
  return Math.min(HEAT_MAX, number);
}

/**
 * Ajoute de la chaleur sans dépasser 10.
 *
 * @param {unknown} current
 * @param {unknown} delta
 * @returns {number}
 */
export function addHeat(current, delta) {
  const step = Math.trunc(Number(delta));
  const gain = Number.isFinite(step) ? step : 0;
  return clampHeat(clampHeat(current) + gain);
}

/**
 * −10 si la jauge est à 7 ou plus. Sinon 0.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {unknown} heat
 * @returns {number}
 */
export function heatPenalty(heat) {
  return clampHeat(heat) >= HEAT_STRAIN ? HEAT_POST_PENALTY : 0;
}

/**
 * Refroidissement d'un round.
 * Intact −3, dégradé −2, hors service −1.
 * Plusieurs modules : le meilleur (celui qui retire le plus).
 * Aucun module : −1. Repliés : −1 seulement.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * // À confirmer par Marc : un module Radiateurs « non renseigné »
 * (maximum 0) ne compte pas. S'il n'y a que ça, on retire 1.
 *
 * @param {Array<string|null|undefined>|null|undefined} conditions
 * @param {boolean} folded
 * @returns {number} Points retirés, toujours positifs.
 */
export function coolingDrop(conditions, folded) {
  if ( folded === true ) return 1;
  const ranked = { intact: 3, degraded: 2, out: 1 };
  let best = 0;
  for ( const condition of conditions ?? [] ) {
    const drop = ranked[condition] ?? 0;
    if ( drop > best ) best = drop;
  }
  return best || 1;
}

/**
 * Pousser refusé : réacteur coupé, ou chaleur ≥ 9.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {unknown} heat
 * @param {boolean} reactorDown
 * @returns {"down"|"heat"|""}
 */
export function pushRefusal(heat, reactorDown) {
  if ( reactorDown === true ) return "down";
  if ( clampHeat(heat) >= PUSH_BLOCK ) return "heat";
  return "";
}

/**
 * Chaleur de Pousser. Réussite : +1.
 * Échec : +2 au total. À 3 DE ou plus, ou échec critique : +2 et le critique.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {{ success?: boolean, de?: unknown, critical?: string|null }} outcome
 * @returns {{ heat: number, crit: boolean }}
 */
export function pushHeatGain(outcome) {
  if ( outcome?.success === true ) return { heat: 1, crit: false };
  const de = Math.trunc(Number(outcome?.de));
  const severe = outcome?.critical === "failure" || (Number.isFinite(de) && de >= 3);
  return { heat: 2, crit: severe };
}

/**
 * +10 par DR au Pilote, au moins +10.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {unknown} dr
 * @returns {number}
 */
export function pushPilotBonus(dr) {
  const steps = Math.trunc(Number(dr));
  const tens = Number.isFinite(steps) ? Math.max(0, steps) : 0;
  return Math.max(10, 10 * tens);
}

/**
 * Incident du Pilote : échec à 3 DE ou plus.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {unknown} de
 * @returns {boolean}
 */
export function pilotIncident(de) {
  const steps = Math.trunc(Number(de));
  return Number.isFinite(steps) && steps >= 3;
}

/**
 * Un jet terminé, touché ou raté. Un jet annulé ne compte pas.
 *
 * @param {null|undefined|{ success?: boolean }} outcome
 * @returns {boolean}
 */
export function shotFinished(outcome) {
  if ( !outcome || typeof outcome !== "object" ) return false;
  return outcome.success === true || outcome.success === false;
}

/**
 * Ce qu'un jet terminé change : chaleur, canon, incident, laser gratuit.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {{ action?: string, laser?: boolean, cannon?: boolean, heatPerShot?: unknown, coolLaser?: unknown, success?: boolean, de?: unknown }} input
 * @returns {{ heat: number, cannon: boolean, incident: boolean, coolLaser: boolean }|null}
 */
export function shotAftermath(input) {
  if ( !shotFinished(input) ) return null;
  const plan = { heat: 0, cannon: false, incident: false, coolLaser: false };
  if ( input?.action === "evade" || input?.action === "changeRange" ) {
    plan.heat += 1;
    if ( input.success !== true && pilotIncident(input.de) ) plan.incident = true;
  }
  if ( input?.laser === true ) {
    const free = Math.trunc(Number(input.coolLaser));
    if ( Number.isFinite(free) && free > 0 ) plan.coolLaser = true;
    else {
      const per = Math.trunc(Number(input.heatPerShot));
      if ( Number.isFinite(per) && per > 0 ) plan.heat += per;
    }
  }
  if ( input?.cannon === true ) plan.cannon = true;
  if ( !plan.heat && !plan.cannon && !plan.incident && !plan.coolLaser ) return null;
  return plan;
}

/**
 * Canon électromagnétique : le nom contient « canon ».
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * // À confirmer par Marc : un autre nom d'arme à énergie,
 * qui n'est ni un laser ni un missile, n'est pas coupé avec le réacteur.
 *
 * @param {{ name?: string }|null|undefined} weapon
 * @returns {boolean}
 */
export function isCannonWeapon(weapon) {
  return typeof weapon?.name === "string" && /canon/i.test(weapon.name);
}

/**
 * Réacteur coupé, ou un module réacteur hors service.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * // À confirmer par Marc : s'il y a plusieurs modules réacteur,
 * un seul hors service coupe tout le vaisseau.
 * Sans module réacteur, seule la case compte.
 *
 * @param {boolean} shutdown
 * @param {Array<{ category?: string, integrity?: unknown, integrityMax?: unknown, condition?: string }>|null|undefined} modules
 * @returns {boolean}
 */
export function reactorIsDown(shutdown, modules) {
  if ( shutdown === true ) return true;
  return (modules ?? []).some(entry => {
    if ( entry?.category !== "reactor" ) return false;
    if ( entry.condition === "out" ) return true;
    const max = Number(entry.integrityMax);
    if ( !Number.isFinite(max) || max <= 0 ) return false;
    const value = Number(entry.integrity);
    return !Number.isFinite(value) || value <= 0;
  });
}

/**
 * Redémarrer : chaleur ≤ 5, et aucun module réacteur hors service.
 * // Décision Marc 30/10/2026
 *
 * @param {unknown} heat
 * @param {boolean} moduleDown Un module réacteur est hors service.
 * @returns {"module"|"heat"|""}
 */
export function restartRefusal(heat, moduleDown) {
  if ( moduleDown === true ) return "module";
  if ( clampHeat(heat) > RESTART_MAX ) return "heat";
  return "";
}

/**
 * Points rendus : 5, plus 5 par DR.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §7
 *
 * @param {unknown} dr
 * @returns {number}
 */
export function repairGain(dr) {
  const steps = Math.trunc(Number(dr));
  const tens = Number.isFinite(steps) ? Math.max(0, steps) : 0;
  return 5 + (5 * tens);
}

/**
 * Nouvelle Intégrité après réparation.
 * Une plaque, hors chantier, s'arrête à la moitié du maximum (vers le bas).
 * On ne baisse jamais une valeur déjà au-dessus de ce plafond.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §7
 *
 * // À confirmer par Marc : la case « Au chantier » lève seulement
 * le plafond de moitié. Le jet écrit quand même, jusqu'au maximum.
 * Le MJ peut ensuite corriger la fiche à la main.
 *
 * @param {unknown} current
 * @param {unknown} max
 * @param {unknown} gain
 * @param {{ plate?: boolean, yard?: boolean }} [options]
 * @returns {number}
 */
export function repairedValue(current, max, gain, options = {}) {
  const ceiling = Math.trunc(Number(max));
  const cap = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 0;
  const present = Math.trunc(Number(current));
  const base = Number.isFinite(present) && present > 0 ? present : 0;
  const added = Math.trunc(Number(gain));
  const bonus = Number.isFinite(added) && added > 0 ? added : 0;
  let limit = cap;
  if ( options.plate === true && options.yard !== true ) limit = Math.floor(cap / 2);
  if ( base >= limit ) return base;
  return Math.min(limit, base + bonus);
}

/**
 * Sans Pièces, on ne répare pas.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §7
 *
 * @param {unknown} spareParts
 * @returns {boolean}
 */
export function noSpareParts(spareParts) {
  const number = Number(spareParts);
  return !Number.isFinite(number) || number <= 0;
}
