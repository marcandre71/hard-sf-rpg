/**
 * Dégâts, Seuil de blessure, gravité et brèche. Sans Foundry.
 *
 * Réf. LdR v0.2 §3 et §7.
 * Les protections de toutes les armures équipées de la zone
 * s'additionnent. Des dégâts nets ≤ 0 ne créent pas de blessure.
 * La brèche ne dépend pas de la blessure : une armure pressurisée
 * équipée qui couvre la zone est percée quand les dégâts bruts
 * (avant armure) dépassent son seuil. Pas d'usure.
 * `resolveBreaches` renvoie une entrée par armure : le compte à rebours
 * s'y branche. Critique et mortelle : pas de pénalité chiffrée.
 * Les effets de zone sont des rappels, sans automatisation.
 *
 * À confirmer par Marc : une armure pressurisée équipée « couvre » la
 * zone dès que cette zone est une clé de `protection`, même à 0.
 * Décision Marc 20/10/2026 : visière, on additionne d'abord la
 * protection de tête des couches équipées, puis on divise le total
 * par 2 (arrondi supérieur). 1 + 3 = 4 → 2.
 * Décision Marc 20/10/2026 : le seuil de tête de chaque couche
 * équipée est divisé par 2 (arrondi supérieur), et la brèche est
 * vérifiée couche par couche. Les seuils ne s'additionnent pas.
 */
import { SOL } from "../config.mjs";
import { ceilHalf } from "./derived.mjs";
import { newInjuryEndsOrder } from "./initiative.mjs";

/** Statut biologique. Une machine ne le reçoit pas. Décision 08/11/2026. */
export const BIOLOGICAL_BLEEDING_STATUS = "sol-nouvelle-ere.bleeding";

/** Synthétique et drone. Décision 08/11/2026. Réf. Blessures et Séquelles v0.3 corrigée §3. */
const MACHINE_ACTOR_TYPES = new Set(["synthetic", "drone"]);

/**
 * @param {unknown} actorType
 * @returns {boolean}
 */
export function isMachineActorType(actorType) {
  return typeof actorType === "string" && MACHINE_ACTOR_TYPES.has(actorType);
}

/**
 * Le statut Saignement et le rappel biologique ne vont pas sur une machine.
 * Le champ `bleeding` de la blessure peut rester vrai : c'est l'indicateur
 * de fuite, sans retrait d'Endurance ni d'autonomie.
 * Décision 08/11/2026.
 *
 * @param {unknown} actorType
 * @returns {boolean}
 */
export function shouldApplyBiologicalBleeding(actorType) {
  return !isMachineActorType(actorType);
}

/**
 * Grave : VOL pour un humain, un PNJ ou une créature. Pas pour une machine.
 * Critique : CON, y compris pour une machine. Pas de jet d'explosion.
 * Décision 08/11/2026.
 *
 * @param {string|null} severity
 * @param {unknown} actorType
 * @returns {"vol"|"con"|null}
 */
export function damageFollowup(severity, actorType) {
  if ( isMachineActorType(actorType) && severity === "serious" ) return null;
  if ( severity === "serious" ) return "vol";
  if ( severity === "critical" ) return "con";
  return null;
}

/**
 * Zone écrite. Personnage, PNJ et créature : la zone du tir, le choix est ignoré.
 * Synthétique ou drone, toutes les cibles : le choix du MJ, parmi les six clés.
 * Annulation ou valeur hors liste : null, rien n'est écrit.
 * Décision 08/11/2026.
 *
 * @param {{ actorTypes?: unknown, rolledZone?: unknown, chosen?: unknown, cancelled?: boolean }} input
 * @returns {string|null}
 */
export function resolveAppliedZone({ actorTypes, rolledZone, chosen, cancelled = false }) {
  const types = Array.isArray(actorTypes) ? actorTypes : [];
  const allowed = Object.keys(SOL.bodyLocations);
  const machines = types.length > 0 && types.every(isMachineActorType);
  if ( !machines ) {
    return typeof rolledZone === "string" && allowed.includes(rolledZone) ? rolledZone : null;
  }
  if ( cancelled ) return null;
  if ( typeof chosen !== "string" || !allowed.includes(chosen) ) return null;
  return chosen;
}

/**
 * Résultat du dialogue, puis zone écrite. C'est cette fonction que
 * l'application des dégâts appelle. Annuler, fermer, ou la valeur
 * hors des six clés : null, rien n'est écrit.
 * Décision 08/11/2026.
 *
 * @param {unknown} dialogResult
 * @param {{ actorTypes?: unknown, rolledZone?: unknown }} input
 * @returns {string|null}
 */
export function commitDamageZone(dialogResult, { actorTypes, rolledZone }) {
  if ( dialogResult == null || dialogResult === "cancel" || dialogResult === "apply" ) return null;
  return resolveAppliedZone({
    actorTypes,
    rolledZone,
    chosen: dialogResult,
    cancelled: false
  });
}

/**
 * Blessure à créer, et statut biologique éventuel. Pas d'écriture ici.
 * Le champ `bleeding` reste pour la fuite. Le statut ne part pas sur une machine.
 * Décision 08/11/2026.
 *
 * @param {object} input
 * @param {unknown} input.actorType
 * @param {boolean} input.alreadyBleeding
 * @param {string} input.zone
 * @param {{ severity: string|null, bleeding: boolean, penalty: number }} input.strike
 * @param {string} input.label
 * @param {boolean} input.attackerCritical
 * @returns {object|null}
 */
export function planTargetInjury({
  actorType,
  alreadyBleeding,
  zone,
  strike,
  label,
  attackerCritical
}) {
  if ( !strike?.severity ) return null;
  const machine = isMachineActorType(actorType);
  const statusId = strike.bleeding === true && shouldApplyBiologicalBleeding(actorType) && alreadyBleeding !== true
    ? BIOLOGICAL_BLEEDING_STATUS
    : null;
  return {
    type: "injury",
    system: {
      location: zone,
      severity: strike.severity,
      bleeding: strike.bleeding,
      penalty: strike.penalty,
      source: label,
      endOfOrder: newInjuryEndsOrder(strike.severity)
    },
    statusId,
    followup: damageFollowup(strike.severity, actorType),
    reminders: cardReminders({
      severity: strike.severity,
      zone,
      attackerCritical,
      machine
    })
  };
}

/**
 * Crée la blessure prévue et, seulement si le plan le dit, le statut.
 * `actor` peut être un double : `createEmbeddedDocuments`, `toggleStatusEffect`.
 *
 * @param {{ createEmbeddedDocuments: Function, toggleStatusEffect: Function }} actor
 * @param {object|null} plan
 * @param {{ name?: string, description?: string }} [extra]
 * @returns {Promise<object|null>}
 */
export async function applyPlannedInjury(actor, plan, extra = {}) {
  if ( !plan ) return null;
  const system = { ...plan.system };
  if ( extra.description ) system.description = extra.description;
  const data = {
    name: extra.name ?? "",
    type: plan.type,
    system
  };
  if ( extra.flags ) data.flags = extra.flags;
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  if ( plan.statusId && extra.status !== false ) await actor.toggleStatusEffect(plan.statusId, { active: true });
  return created ?? null;
}

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
 * Un Seuil utilisable est un entier ≥ 1. En dessous, pas de blessure.
 * La brèche, elle, s'applique quand même (0.6.1).
 *
 * @param {number|null} sb
 * @returns {boolean}
 */
export function isUsableSeuil(sb) {
  return typeof sb === "number" && Number.isInteger(sb) && sb >= 1;
}

/**
 * Nombre fini, ou chaîne numérique (« 3 »). Sinon `null`.
 * Une protection stockée en chaîne ne doit pas compter pour 0.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function numeric(value) {
  if ( typeof value === "number" && Number.isFinite(value) ) return value;
  if ( typeof value === "string" && value.trim() !== "" ) {
    const parsed = Number(value);
    if ( Number.isFinite(parsed) ) return parsed;
  }
  return null;
}

/**
 * Protection de tête à la visière.
 * Décision Marc 20/10/2026 : somme des couches équipées, puis
 * une seule division par 2, arrondie au supérieur.
 * Réf. LdR v0.2 §7. C'est le seul endroit de ce calcul.
 *
 * @param {Array<{ equipped?: boolean, protection?: object }>} armors
 * @returns {number}
 */
export function visorHeadProtection(armors) {
  let sum = 0;
  for ( const armor of armors ) {
    if ( armor?.equipped !== true ) continue;
    const value = numeric(armor.protection?.head);
    if ( value == null ) continue;
    sum += value;
  }
  return ceilHalf(sum);
}

/**
 * Somme des protections de la zone, armures équipées seulement.
 * Visière : `visorHeadProtection`, pas une moitié par couche.
 *
 * @param {Array<{ equipped?: boolean, protection?: object }>} armors
 * @param {string} zone
 * @param {{ visor?: boolean }} [options]
 * @returns {number}
 */
export function sumZoneArmour(armors, zone, { visor = false } = {}) {
  if ( visor && zone === "head" ) return visorHeadProtection(armors);
  let sum = 0;
  for ( const armor of armors ) {
    if ( armor?.equipped !== true ) continue;
    const value = numeric(armor.protection?.[zone]);
    if ( value == null ) continue;
    sum += value;
  }
  return sum;
}

/**
 * Seuil utilisé pour cette armure. `null` s'il n'y a pas de nombre :
 * pas de brèche (on n'invente pas un seuil 0).
 * // Décision Marc 20/10/2026 : visière, tête, chaque couche est
 * divisée par 2 (arrondi supérieur). La brèche se vérifie couche
 * par couche. Réf. LdR v0.2 §7.
 *
 * @param {unknown} threshold
 * @param {string} zone
 * @param {boolean} visor
 * @returns {number|null}
 */
export function effectiveThreshold(threshold, zone, visor) {
  const value = numeric(threshold);
  if ( value == null ) return null;
  if ( visor && zone === "head" ) return ceilHalf(value);
  return value;
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
 * Un Seuil inférieur à 1 n'écrit pas de blessure. La brèche, si.
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
 * @param {boolean} [input.machine] Synthétique ou drone : fuite, pas saignement.
 * @returns {string[]}
 */
export function cardReminders({ severity, zone, attackerCritical, machine = false }) {
  if ( !severity ) return [];
  /** @type {string[]} */
  const keys = [];
  // Réf. LdR v0.2 §7, tableau des zones.
  if ( severity === "critical" && zone === "head" ) keys.push("unconscious");
  if ( severity === "serious" && ARMS.has(zone) ) keys.push("drop");
  if ( severity === "serious" && LEGS.has(zone) ) keys.push("slow");
  if ( zone === "torso" && attackerCritical ) keys.push("air");
  if ( severity === "serious" ) {
    // Décision 08/11/2026 : fuite narrative. Pas de retrait biologique.
    keys.push(machine ? "leak" : "bleeding");
    if ( !machine ) keys.push("vol");
  }
  if ( severity === "critical" ) keys.push("con");
  return keys;
}
