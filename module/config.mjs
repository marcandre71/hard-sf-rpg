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
 * Objets interdits sur un vaisseau ou un véhicule.
 * Consigne de l'étape 2 — pas une table du LdR. À valider par Marc.
 *
 * @type {string[]}
 */
const NOT_ON_SHIP_OR_VEHICLE = [
  "skill",
  "talent",
  "origin",
  "background",
  "profession",
  "injury",
  "sequel",
  "augmentation",
  "substance"
];

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
   * Réf. Fiche v0.2 §4 ; bornes de `base` aussi au LdR v0.2 §9 (1 à 100,
   * 60 max avant origine — le plafond de 60 n'est pas appliqué ici).
   * `temp` n'a pas de borne dans les docs.
   */
  characteristicFields: {
    base: { label: "SOL.Field.base", initial: 25, min: 1, max: 100 },
    origin: { label: "SOL.Field.origin", initial: 0, min: -10, max: 15 },
    advance: { label: "SOL.Field.advance", initial: 0, min: 0, max: 10 },
    temp: { label: "SOL.Field.temp", initial: 0 }
  },

  /** Types d'acteurs déclarés. Réf. LdR v0.2 §15, Fiche v0.2 §4. */
  actorTypes: ["character", "npc", "creature", "synthetic", "drone", "vehicle", "ship"],

  /** Types d'objets déclarés. Réf. Fiche v0.2 §4. */
  itemTypes: ITEM_TYPES,

  /**
   * Au plus un de chaque sur un personnage.
   * Réf. Fiche v0.2 §4 : « origin, background, profession : objets embarqués
   * uniques (un seul de chaque type) ».
   */
  uniqueOnCharacter: ["origin", "background", "profession"],

  /**
   * Objets qu'un type d'acteur a le droit de porter.
   *
   * Carte provisoire, à valider par Marc. Ce n'est pas une matrice écrite
   * dans le LdR v0.2. Règles appliquées (consigne de l'étape 2) :
   * - `shipModule` uniquement sur `ship` (Fiche v0.2 §4, LdR v0.2 §15) ;
   * - `ship` et `vehicle` ne portent pas skill, talent, origin, background,
   *   profession, injury, sequel, augmentation, substance ;
   * - `drone` ne porte pas origin, background, profession, talent ;
   * - origin, background, profession uniquement sur `character`.
   * Le reste (ce que npc, créature, synthétique, drone, véhicule et vaisseau
   * peuvent encore porter) n'est pas détaillé dans les docs : on autorise
   * tout ce que les règles ci-dessus n'interdisent pas.
   */
  allowedItems: {
    character: without(ITEM_TYPES, ["shipModule"]),
    npc: without(ITEM_TYPES, ["origin", "background", "profession", "shipModule"]),
    creature: without(ITEM_TYPES, ["origin", "background", "profession", "shipModule"]),
    synthetic: without(ITEM_TYPES, ["origin", "background", "profession", "shipModule"]),
    drone: without(ITEM_TYPES, ["origin", "background", "profession", "talent", "shipModule"]),
    vehicle: without(ITEM_TYPES, [...NOT_ON_SHIP_OR_VEHICLE, "shipModule"]),
    ship: without(ITEM_TYPES, NOT_ON_SHIP_OR_VEHICLE)
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
