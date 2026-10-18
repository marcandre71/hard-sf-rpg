/**
 * Dégâts, Seuil de blessure, gravité et brèche. Sans Foundry.
 *
 * Réf. LdR v0.2 §7.
 * Décision Marc 18/10/2026 : des dégâts nets ≤ 0 ne créent ni blessure
 * ni brèche. Les protections de toutes les armures équipées de la zone
 * s'additionnent. Critique et mortelle : pas de pénalité chiffrée, la
 * conséquence est le texte de la blessure, le MJ et les joueurs
 * réagissent à la main. Les effets de zone sont des rappels, sans
 * automatisation.
 *
 * À confirmer par Marc : une armure pressurisée équipée « couvre » la
 * zone dès que cette zone est une clé de `protection`, même à 0. La
 * tête suit la même règle de brèche.
 */

/** Pénalité stockée sur la blessure. Décision Marc 18/10/2026 : critique et mortelle à 0. */
export const INJURY_PENALTY = {
  light: -10,
  serious: -20,
  critical: 0,
  mortal: 0
};

// Décision Marc 18/10/2026 : combat très dangereux, SB divisé par 2 (LdR v0.2 §3 disait /10, LdR à mettre à jour).
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
 * Somme des protections de la zone, armures équipées seulement.
 *
 * @param {Array<{ equipped?: boolean, protection?: object }>} armors
 * @param {string} zone
 * @returns {number}
 */
export function sumZoneArmour(armors, zone) {
  let sum = 0;
  for ( const armor of armors ) {
    if ( armor?.equipped !== true ) continue;
    const value = armor.protection?.[zone];
    if ( typeof value !== "number" || !Number.isFinite(value) ) continue;
    sum += value;
  }
  return sum;
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
 * @param {object} input
 * @param {number} input.gross Dégâts de l'arme + DR.
 * @param {number} input.armour Protection totale de la zone.
 * @param {number|null} input.sb
 * @param {boolean} input.pressurized Une armure pressurisée équipée couvre la zone.
 * @returns {{ net: number, severity: string|null, penalty: number, bleeding: boolean, breach: boolean }}
 */
export function resolveStrike({ gross, armour, sb, pressurized }) {
  const net = gross - armour;
  const severity = classifyInjury(net, sb);
  if ( !severity ) {
    return { net, severity: null, penalty: 0, bleeding: false, breach: false };
  }
  return {
    net,
    severity,
    penalty: INJURY_PENALTY[severity],
    bleeding: severity === "serious",
    // Réf. LdR v0.2 §7 : toute blessure qui traverse une combinaison pressurisée.
    breach: pressurized === true
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
