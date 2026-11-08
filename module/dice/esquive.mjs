/**
 * Esquive personnelle opposée. Sans Foundry.
 *
 * Réf. LdR v0.2 §2, §6 et §7. Réf. LdR v0.2 §11 : Sonné garde sa réaction.
 * Décision Marc 08/11/2026.
 * L'opposition est `compareOpposed` (réussite, puis DR, puis score).
 * Ce n'est pas l'esquive de vaisseau (−10 par DR).
 * Égalité parfaite ou double échec : le défenseur, pas de touche.
 * Le critique ne départage pas.
 * Le score comparé est le score modifié du jet (la cible du D100).
 * Les dégâts gardent le DR du jet d'attaque, pas une marge d'opposition.
 */
import { compareOpposed } from "../ships/combat.mjs";

/** Compétence du catalogue. Caractéristique RÉF. */
export const DODGE_SKILL = "Esquive";

/**
 * @param {{ success?: boolean, dr?: unknown, score?: unknown }} attack
 * @param {{ success?: boolean, dr?: unknown, score?: unknown }} defender
 * @returns {"attack"|"defender"}
 */
export function personalOpposed(attack, defender) {
  const verdict = compareOpposed(
    { success: attack?.success === true, dr: attack?.dr, score: attack?.score },
    { success: defender?.success === true, dr: defender?.dr, score: defender?.score },
    { useScore: true, scoreOnFailure: false }
  );
  // « a » est l'attaque. « b » ou « tie » : le défenseur.
  return verdict === "a" ? "attack" : "defender";
}

/**
 * Touche conservée : dégâts de l'arme + DR initial de l'attaque.
 * Victoire de l'esquive : rien.
 *
 * @param {unknown} attackDr
 * @param {unknown} weaponDamage
 * @param {"attack"|"defender"} verdict
 * @returns {{ dr: number, damage: number }|null}
 */
export function keptAttackDamage(attackDr, weaponDamage, verdict) {
  if ( verdict !== "attack" ) return null;
  const dr = Number(attackDr);
  const base = Number(weaponDamage);
  if ( !Number.isFinite(dr) || !Number.isFinite(base) ) return null;
  return { dr, damage: base + dr };
}

/**
 * @param {{ uuid?: string, name?: string, hasRef?: boolean, tracked?: boolean, reactionSpent?: boolean }} defender
 * @returns {object}
 */
export function dodgeEntry(defender) {
  const name = typeof defender?.name === "string" ? defender.name : "";
  // Pas de RÉF sur la fiche : pas de jet inventé. Le MJ n'est pas bloqué.
  if ( defender?.hasRef !== true ) return { state: "no-ref", name, applied: false };
  if ( defender?.tracked === true && defender?.reactionSpent === true ) {
    return { state: "unavailable", name, applied: false };
  }
  return { state: "pending", name, applied: false };
}

/**
 * @param {Array<{ uuid?: string }>|null|undefined} defenders
 * @returns {Record<string, object>}
 */
export function openDodge(defenders) {
  /** @type {Record<string, object>} */
  const map = {};
  for ( const defender of defenders ?? [] ) {
    const uuid = defender?.uuid;
    if ( typeof uuid !== "string" || !uuid || map[uuid] ) continue;
    map[uuid] = dodgeEntry(defender);
  }
  return map;
}

/**
 * Ajoute les cibles absentes. Ne réécrit pas une esquive déjà ouverte.
 *
 * @param {Record<string, object>|null|undefined} existing
 * @param {Array<{ uuid?: string }>|null|undefined} defenders
 * @returns {{ map: Record<string, object>, changed: boolean }}
 */
export function mergeDodgeTargets(existing, defenders) {
  const map = { ...(existing ?? {}) };
  let changed = false;
  for ( const defender of defenders ?? [] ) {
    const uuid = defender?.uuid;
    if ( typeof uuid !== "string" || !uuid || map[uuid] ) continue;
    map[uuid] = dodgeEntry(defender);
    changed = true;
  }
  return { map, changed };
}

/**
 * Sonné ne retire pas la réaction : `stunned` est accepté et ignoré.
 * Décision Marc 08/11/2026. Réf. LdR v0.2 §11.
 *
 * @param {object} input
 * @returns {boolean}
 */
export function canRollDodge({ entry, isGM, isOwner, reactionSpent, tracked }) {
  if ( !entry || entry.state !== "pending" ) return false;
  if ( isGM !== true && isOwner !== true ) return false;
  if ( tracked === true && reactionSpent === true ) return false;
  return true;
}

/**
 * @param {object|null|undefined} entry
 * @param {boolean} isGM
 * @returns {boolean}
 */
export function canSkipDodge(entry, isGM) {
  return isGM === true && entry?.state === "pending";
}

/**
 * @param {object|null|undefined} entry
 * @param {string} userId
 * @returns {{ ok: boolean, entry: object|null }}
 */
export function claimDodge(entry, userId) {
  if ( !entry || entry.state !== "pending" ) return { ok: false, entry: entry ?? null };
  if ( typeof userId !== "string" || !userId ) return { ok: false, entry };
  return { ok: true, entry: { ...entry, state: "rolling", roller: userId } };
}

/**
 * @param {Record<string, object>|null|undefined} map
 * @param {string} uuid
 * @param {string} userId
 * @returns {{ ok: boolean, map: Record<string, object> }}
 */
export function commitDodgeClaim(map, uuid, userId) {
  const source = map ?? {};
  const claim = claimDodge(source[uuid], userId);
  if ( !claim.ok || !claim.entry ) return { ok: false, map: { ...source } };
  return { ok: true, map: { ...source, [uuid]: claim.entry } };
}

/**
 * @param {object|null|undefined} entry
 * @param {string} userId
 * @returns {boolean}
 */
export function holdsDodge(entry, userId) {
  return entry?.state === "rolling" && entry.roller === userId;
}

/**
 * Annuler la fenêtre : retour à « en attente », réaction non dépensée.
 *
 * @param {object|null|undefined} entry
 * @param {string} userId
 * @returns {{ ok: boolean, entry: object|null, spent: boolean }}
 */
export function releaseDodge(entry, userId) {
  if ( !holdsDodge(entry, userId) ) return { ok: false, entry: entry ?? null, spent: false };
  const next = { ...entry, state: "pending" };
  delete next.roller;
  return { ok: true, entry: next, spent: false };
}

/**
 * Le MJ passe. Seulement depuis « en attente ». La réaction n'est pas dépensée.
 *
 * @param {object|null|undefined} entry
 * @param {boolean} isGM
 * @returns {{ ok: boolean, entry: object|null, spent: boolean }}
 */
export function skipDodge(entry, isGM) {
  if ( !canSkipDodge(entry, isGM) ) return { ok: false, entry: entry ?? null, spent: false };
  return { ok: true, entry: { ...entry, state: "skipped" }, spent: false };
}

/**
 * Le dé a été lancé. L'attaque qui gagne laisse la touche.
 *
 * @param {object|null|undefined} entry
 * @param {string} userId
 * @param {"attack"|"defender"} verdict
 * @returns {{ ok: boolean, entry: object|null }}
 */
export function finishDodge(entry, userId, verdict) {
  if ( !holdsDodge(entry, userId) ) return { ok: false, entry: entry ?? null };
  const next = { ...entry, state: verdict === "attack" ? "failed" : "evaded" };
  delete next.roller;
  return { ok: true, entry: next };
}

/**
 * @param {Record<string, object>|null|undefined} entries
 * @returns {boolean}
 */
export function attackDamageGate(entries) {
  return !Object.values(entries ?? {}).some(entry => entry?.state === "pending" || entry?.state === "rolling");
}

/**
 * @param {object|null|undefined} entry
 * @param {{ dr?: unknown }} attack
 * @returns {{ write: boolean, reason: string, dr: number }}
 */
export function defenderDamage(entry, attack) {
  const dr = Number(attack?.dr);
  const kept = Number.isFinite(dr) ? dr : 0;
  if ( !entry ) return { write: false, reason: "missing", dr: kept };
  if ( entry.applied === true ) return { write: false, reason: "already", dr: kept };
  if ( entry.state === "evaded" ) return { write: false, reason: "evaded", dr: kept };
  if ( entry.state === "failed" || entry.state === "skipped" || entry.state === "no-ref" || entry.state === "unavailable" ) {
    return { write: true, reason: entry.state, dr: kept };
  }
  return { write: false, reason: "open", dr: kept };
}

/**
 * @param {object|null|undefined} entry
 * @returns {object|null|undefined}
 */
export function markDefenderApplied(entry) {
  if ( !entry ) return entry;
  return { ...entry, applied: true };
}

/**
 * Confirmer une réapplication ne rouvre pas une esquive réussie.
 *
 * @param {Record<string, object>|null|undefined} entries
 * @returns {Record<string, object>}
 */
export function reopenDamage(entries) {
  /** @type {Record<string, object>} */
  const map = {};
  for ( const [uuid, entry] of Object.entries(entries ?? {}) ) {
    if ( entry?.state === "evaded" ) map[uuid] = { ...entry };
    else map[uuid] = { ...entry, applied: false };
  }
  return map;
}

/**
 * @param {Record<string, object>|null|undefined} entries
 * @returns {boolean}
 */
export function attackFullyApplied(entries) {
  const list = Object.values(entries ?? {});
  if ( !list.length ) return false;
  return list.every(entry => entry?.state === "evaded" || entry?.applied === true);
}

/**
 * @returns {{ spent: boolean, spentNonce: null, turnNonce: number, lastStart: null }}
 */
export function blankReaction() {
  return { spent: false, spentNonce: null, turnNonce: 0, lastStart: null };
}

/**
 * @param {object|null|undefined} state
 * @returns {{ ok: boolean, state: object }}
 */
export function markSpent(state) {
  const current = state && typeof state === "object" ? state : blankReaction();
  if ( current.spent === true ) return { ok: false, state: current };
  const nonce = Number.isFinite(current.turnNonce) ? current.turnNonce : 0;
  return { ok: true, state: { ...current, spent: true, spentNonce: nonce } };
}

/**
 * Hors combat suivi : pas d'écriture de réaction.
 * En combat : dépensée au lancement effectif, même si l'esquive rate.
 *
 * @param {{ tracked?: boolean, state?: object|null }} input
 * @returns {{ spend: boolean, remind: boolean, refused: boolean, state: object }}
 */
export function reactionOnLaunch({ tracked, state }) {
  if ( tracked !== true ) {
    return { spend: false, remind: true, refused: false, state: state && typeof state === "object" ? state : blankReaction() };
  }
  const marked = markSpent(state);
  if ( !marked.ok ) return { spend: false, remind: false, refused: true, state: marked.state };
  return { spend: true, remind: false, refused: false, state: marked.state };
}

/**
 * @param {{ round?: unknown, turn?: unknown, combatantId?: unknown }|null|undefined} lastStart
 * @param {{ round?: unknown, turn?: unknown, combatantId?: unknown }|null|undefined} start
 * @returns {boolean}
 */
export function sameTurnStart(lastStart, start) {
  if ( !lastStart || !start ) return false;
  return lastStart.round === start.round
    && lastStart.turn === start.turn
    && lastStart.combatantId === start.combatantId;
}

/**
 * Prochain tour du défenseur seulement. Le même début de tour rejoué
 * ne rend pas la réaction.
 *
 * @param {object|null|undefined} state
 * @param {{ round: number, turn: number, combatantId: string }} start
 * @returns {{ state: object, cleared: boolean, replay: boolean }}
 */
export function reactionOnTurnStart(state, start) {
  const current = state && typeof state === "object" ? state : blankReaction();
  if ( sameTurnStart(current.lastStart, start) ) {
    return { state: current, cleared: false, replay: true };
  }
  const nonce = (Number.isFinite(current.turnNonce) ? current.turnNonce : 0) + 1;
  const clear = current.spent === true && (current.spentNonce ?? 0) < nonce;
  return {
    replay: false,
    cleared: clear,
    state: {
      turnNonce: nonce,
      lastStart: {
        round: start.round,
        turn: start.turn,
        combatantId: start.combatantId
      },
      spent: clear ? false : current.spent === true,
      spentNonce: clear ? null : (current.spentNonce ?? null)
    }
  };
}
