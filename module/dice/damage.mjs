/**
 * Dégâts, Seuil de blessure, gravité et brèche. Sans Foundry.
 *
 * Réf. LdR v0.2 §3 et §7.
 * Les protections de toutes les armures équipées de la zone
 * s'additionnent. Des dégâts nets ≤ 0 ne créent pas de blessure.
 * La brèche ne dépend pas de la blessure : une armure pressurisée
 * équipée qui couvre la zone est percée quand les dégâts bruts
 * (avant armure) dépassent son seuil. Pas d'usure.
 * Le compte à rebours de perforation est hors périmètre (0.6.1) :
 * `resolveBreaches` renvoie une entrée par armure pour s'y brancher.
 * Critique et mortelle : pas de pénalité chiffrée. Les effets de zone
 * sont des rappels, sans automatisation.
 *
 * À confirmer par Marc : une armure pressurisée équipée « couvre » la
 * zone dès que cette zone est une clé de `protection`, même à 0.
 * À confirmer par Marc : visière sur plusieurs couches, chaque
 * protection de tête est divisée par 2 (arrondi supérieur) puis
 * les couches s'additionnent. L'exemple du LdR n'a qu'une armure.
 */
import { ceilHalf } from "./derived.mjs";

/** Pénalité stockée sur la blessure. Décision Marc 18/10/2026 : critique et mortelle à 0. */
export const INJURY_PENALTY = {
  light: -10,
  serious: -20,
  critical: 0,
  mortal: 0
};

/** Réf. LdR v0.2 §3 : (FOR + CON) / 20, arrondi au supérieur. */
export const SEUIL_DIVISOR = 20;

/**
 * Seuil de blessure. Les deux nombres sont les valeurs actuelles.
 * Diviseur : `SEUIL_DIVISOR`.
 *
 * @param {number} force
 * @param {number} constitution
 * @returns {number}
 */
export function seuilBlessure(force, constitution) {
  return Math.ceil((force + constitution) / SEUIL_DIVISOR);
}

/**
 * Lit FOR et CON actuelles. `null` s'il en manque une (véhicule, vaisseau,
 * ou fiche incomplète).
 *
 * @param {object|null|undefined} characteristics
 * @returns {number|null}
 */
export function seuilFromCharacteristics(characteristics) {
  const force = characteristics?.for?.value;
  const constitution = characteristics?.con?.value;
  if ( typeof force !== "number" || typeof constitution !== "number" ) return null;
  if ( !Number.isFinite(force) || !Number.isFinite(constitution) ) return null;
  return seuilBlessure(force, constitution);
}

/**
 * Un Seuil utilisable est un entier ≥ 1.
 * À confirmer par Marc : 0 (FOR et CON à 0) refuse l'application.
 *
 * @param {number|null} sb
 * @returns {boolean}
 */
export function isUsableSeuil(sb) {
  return typeof sb === "number" && Number.isInteger(sb) && sb >= 1;
}

/**
 * Protection d'une armure sur la zone.
 * Visière : moitié de la tête, arrondie au supérieur, puis les couches
 * s'additionnent. Réf. LdR v0.2 §7.
 *
 * @param {number} value
 * @param {string} zone
 * @param {boolean} visor
 * @returns {number}
 */
function zoneValue(value, zone, visor) {
  if ( visor && zone === "head" ) return ceilHalf(value);
  return value;
}

/**
 * Somme des protections de la zone, armures équipées seulement.
 *
 * @param {Array<{ equipped?: boolean, protection?: object }>} armors
 * @param {string} zone
 * @param {{ visor?: boolean }} [options]
 * @returns {number}
 */
export function sumZoneArmour(armors, zone, { visor = false } = {}) {
  let sum = 0;
  for ( const armor of armors ) {
    if ( armor?.equipped !== true ) continue;
    const value = armor.protection?.[zone];
    if ( typeof value !== "number" || !Number.isFinite(value) ) continue;
    sum += zoneValue(value, zone, visor);
  }
  return sum;
}

/**
 * Seuil utilisé pour cette armure. `null` s'il n'y a pas de nombre :
 * pas de brèche (on n'invente pas un seuil 0).
 * Visière, tête : moitié arrondie au supérieur. Réf. LdR v0.2 §7.
 *
 * @param {unknown} threshold
 * @param {string} zone
 * @param {boolean} visor
 * @returns {number|null}
 */
export function effectiveThreshold(threshold, zone, visor) {
  if ( typeof threshold !== "number" || !Number.isFinite(threshold) ) return null;
  if ( visor && zone === "head" ) return ceilHalf(threshold);
  return threshold;
}

/**
 * Une entrée par armure pressurisée équipée qui couvre la zone et
 * qui a un seuil numérique. `breached` si les dégâts bruts sont
 * strictement supérieurs au seuil. Réf. LdR v0.2 §7.
 * Le compte à rebours (0.6.1) se branche sur chaque entrée percée.
 *
 * @param {Array<object>} armors
 * @param {string} zone
 * @param {number} gross
 * @param {{ visor?: boolean }} [options]
 * @returns {Array<{ id: string|null, threshold: number, breached: boolean, zone: string, visor: boolean }>}
 */
export function resolveBreaches(armors, zone, gross, { visor = false } = {}) {
  /** @type {Array<{ id: string|null, threshold: number, breached: boolean, zone: string, visor: boolean }>} */
  const results = [];
  for ( const armor of pressurizedCovers(armors, zone) ) {
    const threshold = effectiveThreshold(armor.breachThreshold, zone, visor);
    if ( threshold == null ) continue;
    results.push({
      id: typeof armor.id === "string" ? armor.id : null,
      threshold,
      breached: gross > threshold,
      zone,
      visor: visor === true && zone === "head"
    });
  }
  return results;
}

/**
 * Armures équipées, pressurisées, qui portent la zone.
 *
 * @param {Array<{ equipped?: boolean, pressurized?: boolean, protection?: object }>} armors
 * @param {string} zone
 * @returns {Array<object>}
 */
export function pressurizedCovers(armors, zone) {
  return armors.filter(armor => {
    if ( armor?.equipped !== true || armor.pressurized !== true ) return false;
    const protection = armor.protection;
    if ( !protection || typeof protection !== "object" ) return false;
    return Object.prototype.hasOwnProperty.call(protection, zone);
  });
}

/**
 * Gravité, ou `null` s'il n'y a pas de blessure.
 * < SB légère, SB à 2 SB − 1 grave, 2 SB à 3 SB − 1 critique, ≥ 3 SB mortelle.
 *
 * @param {number} net
 * @param {number|null} sb
 * @returns {"light"|"serious"|"critical"|"mortal"|null}
 */
export function classifyInjury(net, sb) {
  if ( net <= 0 || !isUsableSeuil(sb) ) return null;
  if ( net < sb ) return "light";
  if ( net < 2 * sb ) return "serious";
  if ( net < 3 * sb ) return "critical";
  return "mortal";
}

/**
 * Blessure et brèches d'un coup.
 * La brèche est indépendante de la gravité : des nets ≤ 0, ou un Seuil
 * inutilisable, n'empêchent pas une brèche si les bruts dépassent un seuil.
 * À confirmer par Marc : un Seuil inférieur à 1 refuse encore l'écriture
 * côté application (`apply-damage.mjs`), pas ce calcul.
 *
 * @param {object} input
 * @param {number} input.gross Dégâts de l'arme + DR, avant armure.
 * @param {number|null} input.sb
 * @param {Array<object>} [input.armors]
 * @param {string} [input.zone]
 * @param {boolean} [input.visor]
 * @returns {{ net: number, armour: number, severity: string|null, penalty: number, bleeding: boolean, breach: boolean, breaches: Array<object> }}
 */
export function resolveStrike({ gross, sb, armors = [], zone = "torso", visor = false }) {
  const armour = sumZoneArmour(armors, zone, { visor });
  const net = gross - armour;
  const breaches = resolveBreaches(armors, zone, gross, { visor });
  const breach = breaches.some(entry => entry.breached);
  const severity = classifyInjury(net, sb);
  if ( !severity ) {
    return { net, armour, severity: null, penalty: 0, bleeding: false, breach, breaches };
  }
  return {
    net,
    armour,
    severity,
    penalty: INJURY_PENALTY[severity],
    bleeding: severity === "serious",
    breach,
    breaches
  };
}

/**
 * Clé de conséquence écrite dans la description. Légère et grave : aucune
 * (la pénalité et le saignement sont des champs).
 *
 * @param {string|null} severity
 * @param {string} zone
 * @returns {"critical"|"criticalVital"|"mortal"|null}
 */
export function consequenceKey(severity, zone) {
  if ( severity === "mortal" ) return "mortal";
  if ( severity !== "critical" ) return null;
  // Tête ou torse : risque de mort en quelques minutes. Réf. LdR v0.2 §7.
  if ( zone === "head" || zone === "torso" ) return "criticalVital";
  return "critical";
}

const ARMS = new Set(["rightArm", "leftArm"]);
const LEGS = new Set(["rightLeg", "leftLeg"]);

/**
 * Rappels affichés sur la carte de résultat.
 * Décision Marc 18/10/2026 : texte seulement, rien n'est automatisé.
 * À confirmer par Marc : le rappel « réserve d'air » n'apparaît que
 * si une blessure est créée.
 *
 * @param {object} input
 * @param {string|null} input.severity
 * @param {string} input.zone
 * @param {boolean} input.attackerCritical
 * @returns {string[]}
 */
export function cardReminders({ severity, zone, attackerCritical }) {
  if ( !severity ) return [];
  /** @type {string[]} */
  const keys = [];
  // Réf. LdR v0.2 §7, tableau des zones.
  if ( severity === "critical" && zone === "head" ) keys.push("unconscious");
  if ( severity === "serious" && ARMS.has(zone) ) keys.push("drop");
  if ( severity === "serious" && LEGS.has(zone) ) keys.push("slow");
  if ( zone === "torso" && attackerCritical ) keys.push("air");
  if ( severity === "serious" ) {
    keys.push("bleeding");
    keys.push("vol");
  }
  if ( severity === "critical" ) keys.push("con");
  return keys;
}
