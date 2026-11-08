/**
 * Cibles présentes au moment de la carte. Jetons ciblés, sinon sélectionnés.
 * Même ordre que l'application des dégâts.
 * Décision Marc 08/11/2026.
 */

import { findSkillByName, skillScore } from "./skill-score.mjs";
import { DODGE_SKILL, esquiveScore } from "./esquive.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";

/**
 * Compétence Esquive réellement sur la fiche, score calculé exploitable.
 * Décision Didier 08/11/2026.
 *
 * @param {Actor|null|undefined} actor
 * @returns {boolean}
 */
export function actorHasEsquive(actor) {
  const skills = actor?.items?.filter?.(item => item.type === "skill") ?? [];
  const found = findSkillByName(skills, DODGE_SKILL);
  if ( !found ) return false;
  return typeof esquiveScore({
    characteristics: actor?.system?.characteristics,
    skill: found.system ?? {}
  }) === "number" && skillScore(actor?.system?.characteristics, found.system ?? {}).impossible !== true;
}

/**
 * @param {Actor|null|undefined} actor
 * @returns {{ uuid: string, name: string, hasRef: boolean, hasEsquive: boolean, tracked: boolean, reactionSpent: boolean }|null}
 */
export function defenderFromActor(actor) {
  const uuid = actor?.uuid;
  if ( typeof uuid !== "string" || !uuid ) return null;
  const ref = actor.system?.characteristics?.ref?.value;
  const combat = globalThis.game?.combat;
  const tracked = combat?.started === true
    && Array.from(combat.combatants ?? []).some(combatant => combatant.actor?.uuid === uuid);
  const reaction = actor.getFlag?.(SYSTEM_ID, "reaction");
  return {
    uuid,
    name: typeof actor.name === "string" ? actor.name : "",
    hasRef: typeof ref === "number",
    actorType: actor.type,
    hasEsquive: actor.type === "synthetic" && actorHasEsquive(actor),
    tracked,
    reactionSpent: tracked && reaction?.spent === true
  };
}

/**
 * @returns {Array<{ uuid: string, name: string, hasRef: boolean, tracked: boolean, reactionSpent: boolean }>}
 */
export function defenderOffers() {
  const user = globalThis.game?.user;
  if ( !user ) return [];
  const targeted = Array.from(user.targets ?? []);
  const tokens = targeted.length ? targeted : Array.from(globalThis.canvas?.tokens?.controlled ?? []);
  const seen = new Set();
  /** @type {ReturnType<typeof defenderFromActor>[]} */
  const offers = [];
  for ( const token of tokens ) {
    const offer = defenderFromActor(token?.actor);
    if ( !offer || seen.has(offer.uuid) ) continue;
    seen.add(offer.uuid);
    offers.push(offer);
  }
  return offers;
}
