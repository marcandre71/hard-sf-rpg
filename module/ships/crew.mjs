/**
 * Qui tient un poste, et la base d'initiative du vaisseau.
 *
 * Décision Marc 21/10/2026 : un poste vide est l'équipage PNJ,
 * avec le même score qu'en 0.7.1. Pas de case en plus.
 * L'initiative est un jet d'Opérations de bord de cet acteur,
 * classé par `encodeInitiative` (même formule que Vigilance).
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.utils.html#fromUuid
 */
import { reflexScore } from "../dice/initiative.mjs";
import { skillScore } from "../dice/skill-score.mjs";
import { shipInitiativeBasis } from "./combat.mjs";
import { SHIP_POST_IDS } from "./hull.mjs";
import { skillsForPost } from "./post-skills.mjs";

/**
 * @param {Actor} ship
 * @param {string} postId
 * @returns {Promise<null|{ actor: Actor, npc: boolean, score: number, skills: { name: string, system: object }[], chosenPost?: string }>}
 */
export async function crewOf(ship, postId) {
  if ( !ship || ship.type !== "ship" || !SHIP_POST_IDS.includes(postId) ) return null;
  const npcCrew = ship.system?._source?.npcCrew ?? ship.system?.npcCrew;
  const npcScore = shipInitiativeBasis({ npcCrew }).score;
  const virtual = skillsForPost(postId, []);
  const uuid = ship.system?._source?.posts?.[postId]?.actorUuid
    ?? ship.system?.posts?.[postId]?.actorUuid
    ?? "";
  if ( !uuid ) return { actor: ship, npc: true, score: npcScore, skills: virtual };
  const crew = await foundry.utils.fromUuid(uuid);
  if ( !crew || crew.documentName !== "Actor" ) {
    ui.notifications?.warn(game.i18n.localize("SOL.Space.missingCrew"));
    return { actor: ship, npc: true, score: npcScore, skills: virtual };
  }
  const owned = crew.items
    .filter(item => item.type === "skill")
    .map(item => ({ name: item.name, system: item.system }));
  return { actor: crew, npc: false, score: 0, skills: skillsForPost(postId, owned) };
}

/**
 * Score et RÉF du jet d'initiative. Poste Opérateur.
 * Compétence impossible : null, le bouton ne lance pas un score inventé.
 *
 * @param {Actor} ship
 * @returns {Promise<null|{ score: number, ref: number, npc: boolean, actor: Actor, label: string }>}
 */
export async function prepareShipInitiative(ship) {
  const crew = await crewOf(ship, "operator");
  if ( !crew ) return null;
  const npcCrew = ship.system?._source?.npcCrew ?? ship.system?.npcCrew;
  const skillName = crew.skills[0]?.name || "Opérations de bord";
  const label = `${ship.name} — ${skillName}`;
  if ( crew.npc ) {
    const basis = shipInitiativeBasis({ npcCrew });
    return { ...basis, actor: ship, label };
  }
  const skill = crew.skills[0];
  if ( !skill ) return null;
  const rated = skillScore(crew.actor.system?.characteristics, skill.system);
  if ( rated.impossible || typeof rated.score !== "number" ) {
    ui.notifications?.warn(`${skill.name} — ${game.i18n.localize("SOL.Roll.impossible")}`);
    return null;
  }
  const basis = shipInitiativeBasis({
    npcCrew,
    operatorScore: rated.score,
    operatorRef: reflexScore(crew.actor.system?.characteristics)
  });
  return { ...basis, actor: crew.actor, label };
}
