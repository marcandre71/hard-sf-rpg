/**
 * Fiches préremplies des trois personnages d'essai.
 *
 * Décision Didier, délégation v1 de Marc, 11/11/2026.
 * LdR v0.3 §3 / §9 / §15. Le texte du livre n'est pas recopié.
 * Si le livre et le code divergent, le code gagne.
 *
 * Le code ne lit pas la chaîne `characteristicModifiers` de l'origine :
 * le bonus est un champ `origin` sur la caractéristique.
 * Pas de champ Dose stocké sur ces fiches d'essai : la case reste vide.
 * La tolérance aux g affichée ajoute le modificateur d'origine.
 */
import { SOL } from "./config.mjs";
import { seuilBlessure } from "./dice/damage.mjs";
import { endurancePoints, gTolerance, sangFroid } from "./dice/derived.mjs";
import { skillScore } from "./dice/skill-score.mjs";

/** Départ de chaque caractéristique, puis 130 points, plafond 60. LdR v0.3 §9. */
export const POINT_BUY_START = 25;
export const POINT_BUY_POOL = 130;
export const POINT_BUY_CAP = 60;

/** Formation libre : 40 points, +10 au plus par compétence. LdR v0.3 §9. */
export const FREE_TRAINING_POOL = 40;
export const FREE_TRAINING_CAP = 10;

/**
 * Marque de fiche. Absente en 1.0.1.
 * `2` : préremplie. `"user"` : déjà modifiée, on n'y touche plus.
 */
export const SHEET_FLAG = "testSheet";
export const SHEET_VERSION = 2;

/** Réglage de monde : la passe de mise à jour a déjà eu lieu. */
export const CAST_SETTING = "testCastVersion";

/**
 * Répartition choisie pour un garde moyen compétent.
 * Le livre fixe le total et le plafond, pas la colonne.
 * +25 +20 +25 +20 +0 +10 +15 +0 +15 = 130. Aucune base au-dessus de 60.
 */
export const HUMAN_BASES = {
  for: 50,
  con: 45,
  coo: 50,
  ref: 45,
  ada: 25,
  per: 35,
  int: 40,
  vol: 25,
  pre: 40
};

/**
 * Terre, mêmes chiffres que le compendium Origines et LdR v0.3 §9.
 * ADA −10 est la borne basse du champ `origin` dans le code.
 */
export const TERRE_MODIFIERS = { for: 5, con: 10, ada: -10 };

/**
 * Adversaire : bases 35, valeur moyenne choisie. Un peu sous l'humain.
 * L'origine Terre s'ajoute ensuite dans le champ `origin`.
 */
export const NPC_BASE = 35;

/**
 * Synthétique : le livre ne donne pas de création. 40 est dans la
 * bande d'un humain ordinaire (LdR v0.3 §3, 25 à 45).
 */
export const SYNTHETIC_BASE = 40;

/** Exemple demandé : formation 20, RÉF lue 0, score 20. LdR v0.3 §15. */
export const SYNTHETIC_ESQUIVE_TRAINING = 20;

const PERSON_KEYS = ["for", "con", "coo", "ref", "ada", "per", "int", "vol", "pre"];

/**
 * @param {Record<string, number>} bases
 * @returns {number}
 */
export function pointBuySpent(bases) {
  return Object.values(bases).reduce((sum, base) => sum + (Number(base) - POINT_BUY_START), 0);
}

/**
 * @param {Record<string, number>} bases
 * @returns {boolean}
 */
export function pointBuyValid(bases) {
  const values = PERSON_KEYS.map(key => bases?.[key]);
  return values.length === 9
    && values.every(value => Number.isInteger(value) && value >= POINT_BUY_START && value <= POINT_BUY_CAP)
    && pointBuySpent(bases) === POINT_BUY_POOL;
}

/**
 * @param {Record<string, number>} bases
 * @param {Record<string, number>} modifiers
 * @returns {Record<string, { base: number, origin: number, advance: number, temp: number }>}
 */
export function characteristicsFrom(bases, modifiers = {}) {
  /** @type {Record<string, { base: number, origin: number, advance: number, temp: number }>} */
  const out = {};
  for ( const [key, base] of Object.entries(bases) ) {
    out[key] = { base, origin: modifiers[key] ?? 0, advance: 0, temp: 0 };
  }
  return out;
}

/**
 * Milieu + profession + libre. Le libre est plafonné à +10.
 *
 * @param {{ milieu?: number, profession?: number, free?: number }} parts
 * @returns {number}
 */
export function stackTraining(parts) {
  const free = Number(parts?.free ?? 0);
  const milieu = Number(parts?.milieu ?? 0);
  const profession = Number(parts?.profession ?? 0);
  const capped = Math.min(FREE_TRAINING_CAP, Math.max(0, free));
  return milieu + profession + capped;
}

/**
 * Cinq compétences gardées. Les trois +20 de profession sont
 * Armes de poing, Esquive et Corps-à-corps.
 * Les 40 points libres : +10 sur Armes de poing, Esquive,
 * Commandement et Opérations de bord. Corps-à-corps reste à 20.
 * Choix de répartition, le total libre est celui du livre.
 */
export const HUMAN_SKILLS = [
  { name: "Armes de poing", characteristic: "coo", milieu: 0, profession: 20, free: 10 },
  { name: "Esquive", characteristic: "ref", milieu: 0, profession: 20, free: 10 },
  { name: "Corps-à-corps", characteristic: "for", milieu: 0, profession: 20, free: 0 },
  { name: "Commandement", characteristic: "pre", milieu: 0, profession: 10, free: 10 },
  { name: "Opérations de bord", characteristic: "int", milieu: 10, profession: 0, free: 10 }
];

/**
 * Valeurs moyennes choisies. Tir à +20, le reste à +10.
 * Le PNJ du livre est allégé ; le code lui donne pourtant les neuf caractéristiques.
 */
export const NPC_SKILLS = [
  { name: "Armes de poing", characteristic: "coo", training: 20 },
  { name: "Esquive", characteristic: "ref", training: 10 },
  { name: "Corps-à-corps", characteristic: "for", training: 10 },
  { name: "Vigilance", characteristic: "per", training: 10 }
];

export const SYNTHETIC_SKILLS = [
  { name: "Esquive", characteristic: "ref", training: SYNTHETIC_ESQUIVE_TRAINING },
  { name: "Corps-à-corps", characteristic: "for", training: 10 },
  { name: "Vigilance", characteristic: "per", training: 10 }
];

/**
 * @param {Array<{ free?: number }>} skills
 * @returns {number}
 */
export function freeTrainingSpent(skills) {
  return (skills ?? []).reduce((sum, skill) => sum + Number(skill.free ?? 0), 0);
}

/**
 * @param {string} role
 * @returns {{ system: object, items: object[] }|null}
 */
export function castProfile(role) {
  if ( role === "pc-human" ) {
    return {
      system: { characteristics: characteristicsFrom(HUMAN_BASES, TERRE_MODIFIERS) },
      items: [
        catalogItem("origins", "Terre", "origin"),
        catalogItem("backgrounds", "Enfant de la Veille", "background"),
        catalogItem("professions", "Garde ou soldat", "profession"),
        ...HUMAN_SKILLS.map(skill => skillItem(skill, stackTraining(skill)))
      ]
    };
  }
  if ( role === "npc-armed" ) {
    const bases = Object.fromEntries(PERSON_KEYS.map(key => [key, NPC_BASE]));
    return {
      system: { characteristics: characteristicsFrom(bases, TERRE_MODIFIERS) },
      items: [
        catalogItem("origins", "Terre", "origin"),
        ...NPC_SKILLS.map(skill => skillItem(skill, skill.training))
      ]
    };
  }
  if ( role === "pc-synthetic" ) {
    return {
      system: {
        characteristics: characteristicsFrom({
          for: SYNTHETIC_BASE,
          con: SYNTHETIC_BASE,
          per: SYNTHETIC_BASE
        })
      },
      items: SYNTHETIC_SKILLS.map(skill => skillItem(skill, skill.training))
    };
  }
  return null;
}

/**
 * @param {string} pack
 * @param {string} name
 * @param {string} type
 * @returns {object}
 */
function catalogItem(pack, name, type) {
  return {
    pack,
    name,
    fallback: { type, system: {} }
  };
}

/**
 * @param {{ name: string, characteristic: string }} skill
 * @param {number} training
 * @returns {object}
 */
function skillItem(skill, training) {
  return {
    pack: "skills",
    name: skill.name,
    training,
    fallback: {
      type: "skill",
      system: {
        characteristic: skill.characteristic,
        training,
        trainingRequired: false,
        untrainedAllowed: true
      }
    }
  };
}

/**
 * Dérivées par les fonctions déjà utilisées sur la fiche.
 * `originModifier` est celui de l'objet Origine (Terre : +1).
 *
 * @param {object} system
 * @param {number} [originModifier]
 * @returns {{ characteristics: object, sb: number|null, endurance: number|null, sangFroid: number|null, gTolerance: number|null }}
 */
export function previewSheet(system, originModifier = 0) {
  const characteristics = structuredClone(system?.characteristics ?? {});
  // Même formule que `deriveCharacteristicValues` : base + origin + advance + temp, bornée.
  const { min, max } = SOL.characteristicValueBounds;
  for ( const block of Object.values(characteristics) ) {
    if ( !block ) continue;
    const sum = Number(block.base) + Number(block.origin) + Number(block.advance) + Number(block.temp);
    block.value = Math.min(max, Math.max(min, sum));
  }
  const force = characteristics.for?.value;
  const constitution = characteristics.con?.value;
  const volonte = characteristics.vol?.value;
  return {
    characteristics,
    sb: typeof force === "number" && typeof constitution === "number" ? seuilBlessure(force, constitution) : null,
    endurance: typeof constitution === "number" ? endurancePoints(constitution) : null,
    sangFroid: typeof volonte === "number" ? sangFroid(volonte) : null,
    gTolerance: typeof constitution === "number" ? gTolerance(constitution, originModifier) : null
  };
}

/**
 * Score d'Esquive si la RÉF n'est pas sur la fiche. LdR v0.3 §15.
 *
 * @param {number} training
 * @returns {number|null}
 */
export function esquiveWithoutReflex(training) {
  return skillScore({}, {
    characteristic: "ref",
    training,
    trainingRequired: false,
    untrainedAllowed: true
  }).score;
}

const STARTER_ITEMS = {
  "pc-human": ["Pistolet de bord 9 mm basse vélocité", "Combinaison souple « Peau de quart »"],
  "pc-synthetic": ["Esquive"],
  "npc-armed": ["Pistolet de bord 9 mm basse vélocité"]
};

const DEFAULT_BLOCK = { base: 25, origin: 0, advance: 0, temp: 0 };

/**
 * Vrai si la fiche est encore celle de la 1.0.1 : défauts du schéma,
 * et seulement les objets posés alors. Pas d'empreinte à cette version.
 *
 * @param {{ system?: object, items?: object[] }|null|undefined} actor
 * @param {string} role
 * @returns {boolean}
 */
export function isPristineTestActor(actor, role) {
  const allowed = STARTER_ITEMS[role];
  if ( !allowed ) return false;
  const system = actor?.system ?? {};
  const characteristics = system.characteristics ?? {};
  for ( const block of Object.values(characteristics) ) {
    if ( !block || typeof block !== "object" ) continue;
    for ( const key of Object.keys(DEFAULT_BLOCK) ) {
      if ( block[key] == null ) continue;
      if ( block[key] !== DEFAULT_BLOCK[key] ) return false;
    }
  }
  if ( typeof system.endurance === "number" ) return false;
  for ( const key of ["biography", "notes", "flaws", "contacts"] ) {
    if ( typeof system[key] === "string" && system[key].trim() ) return false;
  }
  if ( typeof system.identity?.concept === "string" && system.identity.concept.trim() ) return false;
  const names = new Set(allowed);
  for ( const item of actor?.items ?? [] ) {
    if ( !names.has(item?.name) ) return false;
    if ( item.type === "skill" && Number(item.system?.training ?? 0) !== 0 ) return false;
  }
  return true;
}
