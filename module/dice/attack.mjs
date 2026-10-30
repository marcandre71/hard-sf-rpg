/**
 * Tir visé et actions de visée. Sans Foundry.
 *
 * Réf. LdR v0.2 §7 « Localisation des coups » et « Actions ».
 * Le malus de zone, le bonus de visée et le malus de portée sont des
 * modificateurs de situation : ils entrent dans le plafond ±50 avec
 * la difficulté et le modificateur libre (`cappedModifier`).
 * Décision Marc 30/10/2026 : portée courte 0, moyenne −10, longue −20.
 */
import { hitLocation } from "./d100.mjs";

/**
 * Zone visée. `none` : le dé inversé décide.
 * Bras et jambe : le côté est choisi ici.
 * La visière n'est pas une zone de blessure : la localisation reste
 * la tête, avec un indicateur.
 *
 * @type {Array<{ id: string, penalty: number, zone: string|null, visor: boolean }>}
 */
export const CALLED_SHOTS = [
  { id: "none", penalty: 0, zone: null, visor: false },
  { id: "torso", penalty: -10, zone: "torso", visor: false },
  { id: "rightArm", penalty: -20, zone: "rightArm", visor: false },
  { id: "leftArm", penalty: -20, zone: "leftArm", visor: false },
  { id: "rightLeg", penalty: -20, zone: "rightLeg", visor: false },
  { id: "leftLeg", penalty: -20, zone: "leftLeg", visor: false },
  { id: "head", penalty: -30, zone: "head", visor: false },
  { id: "visor", penalty: -40, zone: "head", visor: true }
];

/**
 * Modificateurs de visée nommés. Un assistant futur s'ajoute à cette
 * liste (id, bonus par action, plafond, nombre d'actions).
 * Pour l'instant, seulement « Viser » : +10 par action, 3 actions, +30.
 * Réf. LdR v0.2 §7.
 *
 * @type {Array<{ id: string, per: number, max: number, maxActions: number, label: string }>}
 */
export const AIM_MODIFIERS = [
  { id: "aim", per: 10, max: 30, maxActions: 3, label: "SOL.Roll.aim" }
];

/**
 * Malus de portée d'un jet d'attaque de personnage.
 * Courte 0, moyenne −10, longue −20. Un autre palier vaut 0.
 * Décision Marc 30/10/2026. Réf. LdR v0.2 §5 : ce malus entre dans le plafond ±50.
 * Réf. Armes v0.3 §1 : le palier stocké sur l'arme n'est pas ce malus.
 *
 * @type {Record<"short"|"medium"|"long", number>}
 */
export const ATTACK_RANGE_PENALTIES = {
  short: 0,
  medium: -10,
  long: -20
};

/**
 * @param {string|null|undefined} band
 * @returns {number}
 */
export function attackRangePenalty(band) {
  if ( typeof band === "string" && Object.hasOwn(ATTACK_RANGE_PENALTIES, band) ) {
    return ATTACK_RANGE_PENALTIES[band];
  }
  return 0;
}

/**
 * Palier retenu pour le jet. Inconnu ou absent : courte.
 * Décision Marc 30/10/2026 : courte par défaut.
 *
 * @param {string|null|undefined} band
 * @returns {"short"|"medium"|"long"}
 */
export function attackRangeBand(band) {
  if ( typeof band === "string" && Object.hasOwn(ATTACK_RANGE_PENALTIES, band) ) {
    return /** @type {"short"|"medium"|"long"} */ (band);
  }
  return "short";
}

/**
 * @param {string|null|undefined} id
 * @returns {{ id: string, penalty: number, zone: string|null, visor: boolean }}
 */
export function calledShot(id) {
  return CALLED_SHOTS.find(shot => shot.id === id) ?? CALLED_SHOTS[0];
}

/**
 * Bonus total des actions de visée.
 * `actions` est un nombre (le modificateur « aim ») ou une table id → nombre.
 *
 * @param {number|Record<string, number>|null|undefined} actions
 * @param {typeof AIM_MODIFIERS} [modifiers]
 * @returns {{ total: number, parts: Array<{ id: string, actions: number, bonus: number }> }}
 */
export function aimModifier(actions, modifiers = AIM_MODIFIERS) {
  const map = typeof actions === "number" ? { aim: actions } : (actions ?? {});
  let total = 0;
  /** @type {Array<{ id: string, actions: number, bonus: number }>} */
  const parts = [];
  for ( const mod of modifiers ) {
    const raw = Number(map[mod.id] ?? 0);
    const count = Number.isFinite(raw)
      ? Math.max(0, Math.min(mod.maxActions, Math.trunc(raw)))
      : 0;
    const uncapped = count * mod.per;
    const bonus = mod.per >= 0
      ? Math.min(mod.max, uncapped)
      : Math.max(mod.max, uncapped);
    parts.push({ id: mod.id, actions: count, bonus });
    total += bonus;
  }
  return { total, parts };
}

/**
 * Malus de la zone visée + bonus de visée, avant le plafond ±50.
 *
 * @param {string|null|undefined} calledId
 * @param {number|Record<string, number>|null|undefined} actions
 * @param {typeof AIM_MODIFIERS} [modifiers]
 * @param {string|null|undefined} [rangeBand] Courte si absent. Décision Marc 30/10/2026.
 * @returns {{ called: ReturnType<typeof calledShot>, aim: ReturnType<typeof aimModifier>, range: "short"|"medium"|"long", rangePenalty: number, situation: number }}
 */
export function attackSituation(calledId, actions, modifiers = AIM_MODIFIERS, rangeBand = "short") {
  const called = calledShot(calledId);
  const aim = aimModifier(actions, modifiers);
  const range = attackRangeBand(rangeBand);
  const rangePenalty = attackRangePenalty(range);
  return { called, aim, range, rangePenalty, situation: called.penalty + aim.total + rangePenalty };
}

/**
 * Zone retenue quand le coup touche.
 * Sans tir visé, le dé inversé. Avec un tir visé, la zone choisie.
 * Réf. LdR v0.2 §7.
 *
 * @param {number} die
 * @param {string|null|undefined} calledId
 * @returns {{ zone: string, visor: boolean, called: boolean }}
 */
export function struckZone(die, calledId) {
  const shot = calledShot(calledId);
  if ( !shot.zone ) return { zone: hitLocation(die), visor: false, called: false };
  return { zone: shot.zone, visor: shot.visor, called: true };
}
