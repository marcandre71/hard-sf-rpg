/**
 * Compte à rebours d'une combinaison percée. Sans Foundry.
 *
 * Réf. LdR v0.2 §7 : 5 minutes de survie, puis perte de connaissance,
 * puis mort 2 minutes plus tard si la brèche n'est pas colmatée.
 * Le temps est celui du monde, en secondes.
 */

/** Jusqu'à l'inconscience. Réf. LdR v0.2 §7. */
export const BREACH_UNCONSCIOUS_SECONDS = 5 * 60;

/** Jusqu'à la mort : 5 minutes, puis 2. Réf. LdR v0.2 §7. */
export const BREACH_DEATH_SECONDS = BREACH_UNCONSCIOUS_SECONDS + 2 * 60;

/**
 * Phase du compte à rebours.
 * `survival` avant 5 minutes, `unconscious` ensuite, `death` à 7 minutes.
 * L'instant pile appartient à la phase qui commence.
 *
 * @param {number} now Secondes du monde.
 * @param {number} startedAt Secondes du monde au moment de la brèche.
 * @returns {{ elapsed: number, remainingSurvival: number, remainingDeath: number, phase: "survival"|"unconscious"|"death" }|null}
 */
export function breachClock(now, startedAt) {
  if ( typeof now !== "number" || typeof startedAt !== "number" ) return null;
  if ( !Number.isFinite(now) || !Number.isFinite(startedAt) ) return null;
  const elapsed = now - startedAt;
  let phase = "survival";
  if ( elapsed >= BREACH_DEATH_SECONDS ) phase = "death";
  else if ( elapsed >= BREACH_UNCONSCIOUS_SECONDS ) phase = "unconscious";
  return {
    elapsed,
    remainingSurvival: Math.max(0, BREACH_UNCONSCIOUS_SECONDS - elapsed),
    remainingDeath: Math.max(0, BREACH_DEATH_SECONDS - elapsed),
    phase
  };
}

/**
 * Minutes et secondes affichées. On arrondit la seconde affichée
 * au supérieur pour ne pas montrer 0 avant l'échéance.
 *
 * @param {number} seconds
 * @returns {{ min: number, sec: number }}
 */
export function clockParts(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds)));
  if ( !Number.isFinite(total) ) return { min: 0, sec: 0 };
  return { min: Math.floor(total / 60), sec: total % 60 };
}

/**
 * Horloge arrêtée par le MJ. Le statut peut rester.
 * Décision Marc 20/10/2026.
 *
 * @param {unknown} clock
 * @returns {boolean}
 */
export function clockIsStopped(clock) {
  return Boolean(clock && typeof clock === "object" && clock.stopped === true);
}

/**
 * Uuids à suivre. Un acteur du monde et un jeton non lié sont distincts.
 * Un jeton lié a le même uuid que l'acteur : `linked` l'écarte.
 * Deux fois le même uuid ne compte qu'une fois.
 *
 * @param {Array<{ uuid?: string, clock?: { startedAt?: number }|null, linked?: boolean }>|null|undefined} entries
 * @returns {string[]}
 */
export function collectClockUuids(entries) {
  /** @type {string[]} */
  const result = [];
  const seen = new Set();
  for ( const entry of entries ?? [] ) {
    const uuid = entry?.uuid;
    if ( typeof uuid !== "string" || uuid.length === 0 ) continue;
    if ( entry.linked === true ) continue;
    const startedAt = entry.clock?.startedAt;
    if ( typeof startedAt !== "number" || !Number.isFinite(startedAt) ) continue;
    if ( seen.has(uuid) ) continue;
    seen.add(uuid);
    result.push(uuid);
  }
  return result;
}
