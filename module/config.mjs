/**
 * Configuration centrale du système « Sol, Nouvelle Ère ».
 *
 * Publiée sous `CONFIG.SOL` par `module/sol.mjs` pendant le hook `init`.
 * Les modèles (`module/data/`) et les feuilles (`module/sheets/`) lisent cet
 * objet : ils ne recopient pas les clés, les bornes ni les listes de choix.
 *
 * Clés de code en anglais, libellés = clés de `lang/fr.json`.
 *
 * Étape 2 — clés retenues (celles des docs, pas les synonymes) :
 * acteur vaisseau = `ship` (LdR v0.2 §15, Fiche v0.2 §4) ;
 * atout = `talent` (LdR v0.2 §15 « talent (Atout) ») ;
 * milieu = `background` (LdR v0.2 §15 « background (Milieu) »).
 * Les libellés français sont ceux choisis par Marc (Vaisseau, Atout, Milieu).
 *
 * Renommer une clé déjà stockée (caractéristique, champ `base`/`origin`/…,
 * type d'acteur ou d'objet) change les données des fiches existantes.
 * Il faut alors une méthode statique `migrateData` sur le TypeDataModel
 * concerné. Ajouter un champ nouveau, avec une valeur `initial`, n'exige
 * pas de migration : Foundry complète les documents déjà créés.
 */

/**
 * Retire des types d'objets d'une liste, sans la modifier.
 *
 * @param {string[]} types
 * @param {string[]} excluded
 * @returns {string[]}
 */
function without(types, excluded) {
  const banned = new Set(excluded);
  return types.filter(type => !banned.has(type));
}

/**
 * Tous les types d'objets, dans l'ordre de la Fiche v0.2 §4.
 *
 * @type {string[]}
 */
const ITEM_TYPES = [
  "skill",
  "talent",
  "origin",
  "background",
  "profession",
  "weapon",
  "armor",
  "gear",
  "augmentation",
  "substance",
  "injury",
  "sequel",
  "software",
  "shipModule"
];

/**
 * Objets du personnage : tous, sauf le module de vaisseau.
 * Le PNJ a exactement la même liste. Décision Marc 17/10/2026.
 *
 * @type {string[]}
 */
const CHARACTER_ITEMS = without(ITEM_TYPES, ["shipModule"]);

/**
 * Exclus du synthétique, en plus du module de vaisseau.
 * Décision Marc 17/10/2026.
 *
 * @type {string[]}
 */
const SYNTHETIC_EXCLUDED = ["origin", "background", "profession", "substance"];

/**
 * Registre du système.
 *
 * @type {object}
 */
export const SOL = {
  /**
   * Neuf caractéristiques, dans l'ordre d'affichage.
   * Réf. LdR v0.2 §3 et §15, Fiche v0.2 §4.
   * `label` et `abbr` sont des clés i18n.
   */
  characteristics: {
    for: { label: "SOL.Characteristic.for.label", abbr: "SOL.Characteristic.for.abbr" },
    con: { label: "SOL.Characteristic.con.label", abbr: "SOL.Characteristic.con.abbr" },
    coo: { label: "SOL.Characteristic.coo.label", abbr: "SOL.Characteristic.coo.abbr" },
    ref: { label: "SOL.Characteristic.ref.label", abbr: "SOL.Characteristic.ref.abbr" },
    ada: { label: "SOL.Characteristic.ada.label", abbr: "SOL.Characteristic.ada.abbr" },
    per: { label: "SOL.Characteristic.per.label", abbr: "SOL.Characteristic.per.abbr" },
    int: { label: "SOL.Characteristic.int.label", abbr: "SOL.Characteristic.int.abbr" },
    vol: { label: "SOL.Characteristic.vol.label", abbr: "SOL.Characteristic.vol.abbr" },
    pre: { label: "SOL.Characteristic.pre.label", abbr: "SOL.Characteristic.pre.abbr" }
  },

  /**
   * Champs stockés de chaque caractéristique, et leurs bornes.
   * `value` (Actuelle) n'est pas ici : elle est dérivée, jamais stockée.
   * Réf. Fiche v0.2 §4. Décision Marc 17/10/2026 : `base` plafonne à 60
   * (LdR v0.2 §9, 60 max avant origine). Le défaut reste 25.
   * `temp` n'a pas de borne dans les docs.
   */
  characteristicFields: {
    base: { label: "SOL.Field.base", initial: 25, min: 1, max: 60 },
    origin: { label: "SOL.Field.origin", initial: 0, min: -10, max: 15 },
    advance: { label: "SOL.Field.advance", initial: 0, min: 0, max: 10 },
    temp: { label: "SOL.Field.temp", initial: 0 }
  },

  /**
   * Bornes de l'Actuelle dérivée. Ne modifie pas les champs stockés.
   * Décision Marc 17/10/2026.
   */
  characteristicValueBounds: { min: 0, max: 100 },

  /**
   * Huit difficultés. Réf. LdR v0.2 §5. Défaut : `normal` (0).
   * `label` est une clé i18n.
   */
  difficulties: {
    veryEasy: { modifier: 30, label: "SOL.Difficulty.veryEasy" },
    easy: { modifier: 20, label: "SOL.Difficulty.easy" },
    simple: { modifier: 10, label: "SOL.Difficulty.simple" },
    normal: { modifier: 0, label: "SOL.Difficulty.normal" },
    tricky: { modifier: -10, label: "SOL.Difficulty.tricky" },
    hard: { modifier: -20, label: "SOL.Difficulty.hard" },
    veryHard: { modifier: -30, label: "SOL.Difficulty.veryHard" },
    extreme: { modifier: -40, label: "SOL.Difficulty.extreme" }
  },

  /**
   * Compétence d'arme absente de la fiche : caractéristique de repli.
   * Décision Marc 18/10/2026. La clé est le nom français, la valeur une
   * caractéristique. Ces compétences ne sont pas (F). Réf. LdR v0.2 §4.
   */
  weaponSkillDefaults: {
    "Armes de poing": "coo",
    "Armes d'épaule": "coo",
    "Corps-à-corps": "for"
  },

  /**
   * Compétence du test d'initiative. Pas (F) : sans l'objet, le score
   * est la PER actuelle. Réf. LdR v0.2 §4 et §7.
   * Le nom est en français, comme `weaponSkillDefaults`.
   */
  vigilanceSkill: "Vigilance",

  /** Types d'acteurs déclarés. Réf. LdR v0.2 §15, Fiche v0.2 §4. */
  actorTypes: ["character", "npc", "creature", "synthetic", "drone", "vehicle", "ship"],

  /** Types d'objets déclarés. Réf. Fiche v0.2 §4. */
  itemTypes: ITEM_TYPES,

  /**
   * Au plus un de chaque.
   * Réf. Fiche v0.2 §4 pour le personnage. Décision Marc 17/10/2026 :
   * le PNJ suit la même règle (voir `uniqueItemActors`).
   */
  uniqueOnCharacter: ["origin", "background", "profession"],

  /**
   * Acteurs sur lesquels `uniqueOnCharacter` s'applique.
   * Décision Marc 17/10/2026.
   */
  uniqueItemActors: ["character", "npc"],

  /**
   * Objets qu'un type d'acteur a le droit de porter. Listes d'autorisation,
   * une par type. Décision Marc 17/10/2026.
   * `shipModule` reste réservé au vaisseau (Fiche v0.2 §4, LdR v0.2 §15).
   * Véhicule et vaisseau : listes inchangées (arme, armure, équipement,
   * logiciel, et module pour le vaisseau).
   */
  allowedItems: {
    character: CHARACTER_ITEMS,
    // Mêmes objets que le personnage, unicité comprise.
    npc: CHARACTER_ITEMS,
    // Pas faits pour être équipés. Blessure standard. Décision Marc 18/10/2026.
    creature: ["weapon", "armor", "injury", "talent"],
    // Décision Marc 17/10/2026. Exclusion : origin, background, profession, substance.
    // À confirmer par Marc : blessures propres aux machines (synthétique, drone) à définir.
    synthetic: without(CHARACTER_ITEMS, SYNTHETIC_EXCLUDED),
    // Décision Marc 17/10/2026. Blessure standard en attendant.
    // À confirmer par Marc : blessures propres aux machines (synthétique, drone) à définir.
    drone: ["weapon", "armor", "gear", "software", "injury"],
    vehicle: ["weapon", "armor", "gear", "software"],
    ship: ["weapon", "armor", "gear", "software", "shipModule"]
  },

  /**
   * Domaine d'une compétence.
   * Valeurs : Fiche v0.2 §4 (`espace`, `technique`, …).
   * Libellés longs : maquette Onglet 3 de la Fiche v0.2.
   */
  skillDomains: {
    espace: "SOL.Skill.domain.espace",
    technique: "SOL.Skill.domain.technique",
    sciences: "SOL.Skill.domain.sciences",
    combat: "SOL.Skill.domain.combat",
    corps: "SOL.Skill.domain.corps",
    relations: "SOL.Skill.domain.relations",
    savoirs: "SOL.Skill.domain.savoirs"
  },

  /**
   * Type de munition. Valeurs anglaises : Fiche v0.2 §4.
   * `none` n'a pas de libellé français dans les docs : « Aucune » est un
   * libellé d'interface provisoire, à valider par Marc.
   */
  ammoTypes: {
    frangible: "SOL.Weapon.ammoType.frangible",
    piercing: "SOL.Weapon.ammoType.piercing",
    flechette: "SOL.Weapon.ammoType.flechette",
    none: "SOL.Weapon.ammoType.none"
  },

  /**
   * Portée d'une arme portative, en paliers.
   * Décision Marc 17/10/2026. Réf. LdR v0.2 §15 (courte, moyenne, longue).
   * La distance en mètres n'est pas stockée : elle se note dans la description.
   */
  weaponRanges: {
    short: "SOL.Weapon.range.short",
    medium: "SOL.Weapon.range.medium",
    long: "SOL.Weapon.range.long"
  },

  /** Joints de combinaison. Valeurs : Fiche v0.2 §4 (`intact`, `breached`). */
  sealStates: {
    intact: "SOL.Armor.sealState.intact",
    breached: "SOL.Armor.sealState.breached"
  },

  /**
   * Type de réserve d'un équipement.
   * Valeurs : Fiche v0.2 §4 (`energy`, `air`, `doses`). La chaîne vide est
   * le défaut ; elle n'est pas dans les choix (champ `blank`).
   */
  reserveTypes: {
    energy: "SOL.Gear.reserveType.energy",
    air: "SOL.Gear.reserveType.air",
    doses: "SOL.Gear.reserveType.doses"
  },

  /**
   * Genre d'augmentation. Cybernétique et génétique sont fusionnées.
   * Valeurs : Fiche v0.2 §4. Libellés : LdR v0.2 §15
   * (thérapie, prothèse, organe cultivé, héréditaire).
   */
  augmentationKinds: {
    therapy: "SOL.Augmentation.kind.therapy",
    prosthesis: "SOL.Augmentation.kind.prosthesis",
    culturedOrgan: "SOL.Augmentation.kind.culturedOrgan",
    heritable: "SOL.Augmentation.kind.heritable"
  },

  /**
   * Zones du corps, partagées par l'armure et les blessures.
   * Clés : Fiche v0.2 §4. Libellés : LdR v0.2 §7 (localisation).
   */
  bodyLocations: {
    head: "SOL.Location.head",
    torso: "SOL.Location.torso",
    rightArm: "SOL.Location.rightArm",
    leftArm: "SOL.Location.leftArm",
    rightLeg: "SOL.Location.rightLeg",
    leftLeg: "SOL.Location.leftLeg"
  },

  /**
   * Gravité d'une blessure. Valeurs anglaises : Fiche v0.2 §4.
   * Libellés : LdR v0.2 §7 (légère, grave, critique, mortelle).
   */
  injurySeverities: {
    light: "SOL.Injury.severity.light",
    serious: "SOL.Injury.severity.serious",
    critical: "SOL.Injury.severity.critical",
    mortal: "SOL.Injury.severity.mortal"
  },

  /**
   * Type de séquelle. Chaque séquelle reste un objet à part.
   * Décision Marc 17/10/2026. Réf. LdR v0.2 §15
   * (radiation, déconditionnement, trauma).
   */
  sequelCategories: {
    radiation: "SOL.Sequel.category.radiation",
    deconditioning: "SOL.Sequel.category.deconditioning",
    trauma: "SOL.Sequel.category.trauma"
  },

  /**
   * Catégorie de véhicule. Libellés : LdR v0.2 §15.
   * Clés anglaises fixées par la consigne de l'étape 2
   * (les docs ne donnent que le libellé « catégorie »).
   */
  vehicleCategories: {
    terrestrial: "SOL.Vehicle.category.terrestrial",
    maritime: "SOL.Vehicle.category.maritime",
    aerial: "SOL.Vehicle.category.aerial"
  },

  /**
   * Catégorie de vaisseau. Réf. LdR v0.2 §15 (vaisseau ou station ;
   * les anciens types ship et habitat sont fusionnés).
   * Clés fixées par la consigne de l'étape 2.
   */
  shipCategories: {
    ship: "SOL.Ship.category.ship",
    station: "SOL.Ship.category.station"
  }
};

/**
 * Bornes des champs stockés d'une caractéristique.
 * Le personnage garde `base` à 60. Le PNJ va jusqu'à 100, même minimum.
 * Décision Marc 18/10/2026. Ne modifie pas l'objet partagé.
 *
 * @param {"character"|"npc"|string} actorType
 * @returns {typeof SOL.characteristicFields}
 */
export function characteristicFieldsFor(actorType) {
  if ( actorType !== "npc" ) return SOL.characteristicFields;
  return {
    ...SOL.characteristicFields,
    base: { ...SOL.characteristicFields.base, max: SOL.characteristicValueBounds.max }
  };
}

/**
 * Libellé d'un jet de caractéristique : « VOL — Volonté ».
 * `cfg` est `{ label, abbr }`, deux clés i18n. `localize` reçoit une
 * chaîne. Lui passer l'objet lève TypeError : on refuse avant.
 *
 * @param {{ label?: unknown, abbr?: unknown }|null|undefined} cfg
 * @param {(key: string) => string} localize
 * @returns {string|null}
 */
export function characteristicRollLabel(cfg, localize) {
  if ( typeof localize !== "function" ) return null;
  const abbr = cfg?.abbr;
  const label = cfg?.label;
  if ( typeof abbr !== "string" || typeof label !== "string" ) return null;
  return `${localize(abbr)} — ${localize(label)}`;
}
