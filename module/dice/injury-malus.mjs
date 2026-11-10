/**
 * Malus de blessure dans un jet de personnage.
 *
 * Réf. LdR v0.2 §7 : légère −10, grave −20, aux actions utilisant la zone.
 * Décision Didier 08/11/2026, délégation v1 de Marc.
 * Aucune notion de blessure « active » n'est lue dans le code.
 * Décision Marc/Didier 1.0.0 : une blessure marquée Soignée
 * (`treated`) est exclue des cases. La liste est chaque autre
 * blessure encore sur la fiche, dont le champ `penalty` n'est pas 0.
 * Critique et mortelle ont 0 : elles n'apparaissent pas.
 * Les cases partent décochées. Pas de détection de zone.
 * Un jet de poste de vaisseau ignore ces malus.
 */
import { cappedModifier, rollModifier } from "./d100.mjs";

/**
 * @param {Array<{ id?: string, _id?: string, name?: string, type?: string, penalty?: unknown, location?: string, system?: { penalty?: unknown, location?: string } }>|null|undefined} injuries
 * @returns {Array<{ id: string, name: string, zone: string, penalty: number }>}
 */
export function injuryMalusOptions(injuries) {
  /** @type {Array<{ id: string, name: string, zone: string, penalty: number }>} */
  const list = [];
  for ( const item of injuries ?? [] ) {
    if ( item?.type && item.type !== "injury" ) continue;
    if ( item?.system?.treated === true || item?.treated === true ) continue;
    const raw = item?.system?.penalty ?? item?.penalty;
    const penalty = Number(raw);
    if ( !Number.isFinite(penalty) || Math.trunc(penalty) === 0 ) continue;
    const id = String(item.id ?? item._id ?? "");
    if ( !id ) continue;
    const zone = String(item.system?.location ?? item.location ?? "");
    list.push({
      id,
      name: typeof item.name === "string" ? item.name : "",
      zone,
      penalty: Math.trunc(penalty)
    });
  }
  return list;
}

/**
 * Somme des cases cochées. Une id inconnue ne compte pas.
 * Décoché : 0.
 *
 * @param {Array<{ id: string, penalty: number }>|null|undefined} options
 * @param {Iterable<string>|null|undefined} selectedIds
 * @returns {number}
 */
export function injuryMalusTotal(options, selectedIds) {
  const chosen = new Set(selectedIds ?? []);
  let sum = 0;
  for ( const option of options ?? [] ) {
    if ( !chosen.has(option.id) ) continue;
    sum += Number(option.penalty) || 0;
  }
  return sum;
}

/**
 * Ids cochées dans le formulaire. Une seule case n'est pas une liste.
 *
 * @param {{ injuryPenalty?: { value?: string, checked?: boolean, tagName?: string, length?: number }|Array<{ value?: string, checked?: boolean }> }|null|undefined} elements
 * @returns {string[]}
 */
export function checkedInjuryIds(elements) {
  const nodes = elements?.injuryPenalty;
  if ( !nodes ) return [];
  const list = typeof nodes.length === "number" && nodes.tagName !== "INPUT"
    ? [...nodes]
    : [nodes];
  return list.filter(node => node?.checked === true).map(node => String(node.value));
}

/**
 * Total du jet. Les malus de blessure entrent dans le plafond ±50
 * avec la difficulté, le modificateur libre, la situation et Épuisé.
 * Un poste de vaisseau n'est pas borné, et ignore les blessures.
 *
 * @param {{ difficulty?: number, free?: number, situation?: number, status?: number, injury?: number, shipPost?: boolean }} input
 * @returns {number}
 */
export function personalRollModifier({
  difficulty = 0,
  free = 0,
  situation = 0,
  status = 0,
  injury = 0,
  shipPost = false
} = {}) {
  const wound = shipPost ? 0 : Number(injury) || 0;
  const stacked = Number(situation) || 0;
  const statusPart = Number(status) || 0;
  return shipPost
    ? rollModifier(difficulty, free, stacked + statusPart, { shipPost: true })
    : cappedModifier(difficulty, free, stacked + statusPart + wound);
}
