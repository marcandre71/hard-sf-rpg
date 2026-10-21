/**
 * Calculs de coque, sans Foundry.
 *
 * Réf. Vaisseaux v0.1 §4 (état dérivé) et §5 (plaque + module de blindage).
 * Décision Marc 21/10/2026 : l'Intégrité remplace le SA et le tableau d'avaries.
 * Pas de jets, pas de dégâts : 0.7.1 à 0.7.3.
 *
 * Les clés sont en anglais. Les libellés français sont dans `lang/fr.json`.
 */

/** Jauge du réacteur seul. Réf. Vaisseaux v0.1 §2 et §6. */
export const REACTOR_HEAT_MAX = 10;

/**
 * Score unique d'un équipage PNJ. Réf. Vaisseaux v0.1 §3.
 * Bleu 35, entraîné 50, vétéran 65, élite 80.
 *
 * @type {Record<string, number>}
 */
export const NPC_CREW_SCORES = {
  blue: 35,
  trained: 50,
  veteran: 65,
  elite: 80
};

/** Cinq sections fixes. Réf. Vaisseaux v0.1 §5. */
export const SHIP_SECTION_IDS = ["bow", "port", "starboard", "stern", "radiators"];

/** Sept postes, dans l'ordre du tour (non joué en 0.7.0). Réf. Vaisseaux v0.1 §3. */
export const SHIP_POST_IDS = ["commander", "operator", "pilot", "navigator", "gunner", "engineer", "medic"];

/**
 * Onze catégories d'un module, armes comprises.
 * Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §4.
 */
export const SHIP_MODULE_CATEGORIES = [
  "weapon",
  "propulsion",
  "reactor",
  "radiators",
  "sensors",
  "communications",
  "lifeSupport",
  "cabins",
  "cargo",
  "armor",
  "other"
];

/** État dérivé. Réf. Vaisseaux v0.1 §4. */
export const MODULE_INTACT = "intact";
export const MODULE_DEGRADED = "degraded";
export const MODULE_OUT = "out";

/**
 * Maximum absent ou nul : le MJ n'a pas encore saisi l'Intégrité.
 * Ce n'est pas « hors service ». Décision Marc 21/10/2026.
 */
export const MODULE_UNSET = "unset";

/**
 * État d'un module d'après son Intégrité.
 *
 * - non renseigné si le maximum n'est pas un nombre, ou est 0 ou moins
 *   (même si la valeur est déjà positive) ;
 * - hors service si la valeur est 0 ou moins, ou n'est pas un nombre,
 *   et que le maximum est un nombre positif ;
 * - intact si la valeur est strictement supérieure à la moitié du maximum ;
 * - dégradé sinon (moitié ou moins), tant que la valeur est encore positive.
 *
 * « Plus de la moitié » est lu tel quel : pas d'arrondi. Un maximum 5 a
 * sa moitié à 2,5 ; une valeur 3 est intacte. Le malus −20 du dégradé
 * est affiché, pas appliqué (pas de jets en 0.7.0).
 *
 * @param {unknown} value
 * @param {unknown} max
 * @returns {"intact"|"degraded"|"out"|"unset"}
 */
export function moduleCondition(value, max) {
  const ceiling = Number(max);
  if ( !Number.isFinite(ceiling) || ceiling <= 0 ) return MODULE_UNSET;
  const current = Number(value);
  if ( !Number.isFinite(current) || current <= 0 ) return MODULE_OUT;
  if ( current > ceiling / 2 ) return MODULE_INTACT;
  return MODULE_DEGRADED;
}

/**
 * Les radiateurs n'ont pas de plaque. Réf. Vaisseaux v0.1 §5.
 *
 * @param {string} sectionId
 * @returns {boolean}
 */
export function sectionHasPlate(sectionId) {
  return sectionId !== "radiators";
}

/**
 * Points ajoutés par les modules « blindage » de la section.
 *
 * Un module hors service n'ajoute rien : à 0, il ne fonctionne plus
 * (Réf. Vaisseaux v0.1 §5, critique de module).
 * Un maximum à 0 est « non renseigné » : on n'ajoute pas ses points
 * avant que le MJ ait saisi l'Intégrité.
 * Décision Marc 21/10/2026 : un module dégradé ajoute encore tous ses points.
 *
 * @param {Array<{ category?: string, section?: string, armorPoints?: unknown, integrity?: { value?: unknown, max?: unknown }, condition?: string }>} modules
 * @param {string} sectionId
 * @returns {number}
 */
export function armorBonus(modules, sectionId) {
  let sum = 0;
  for ( const module of modules ?? [] ) {
    if ( module?.category !== "armor" || module?.section !== sectionId ) continue;
    const condition = module.condition ?? moduleCondition(module.integrity?.value, module.integrity?.max);
    if ( condition === MODULE_OUT || condition === MODULE_UNSET ) continue;
    const points = Number(module.armorPoints);
    if ( !Number.isFinite(points) || points <= 0 ) continue;
    sum += points;
  }
  return sum;
}

/**
 * Plaque affichée : valeur stockée + bonus des modules de blindage.
 * `null` pour les radiateurs (pas de plaque à montrer).
 *
 * @param {string} sectionId
 * @param {unknown} plateValue
 * @param {Parameters<typeof armorBonus>[0]} modules
 * @returns {number|null}
 */
export function displayedArmor(sectionId, plateValue, modules) {
  if ( !sectionHasPlate(sectionId) ) return null;
  const plate = Number(plateValue);
  const base = Number.isFinite(plate) ? plate : 0;
  return base + armorBonus(modules, sectionId);
}

/**
 * Total au départ : à vide + masse de réaction.
 * Décision Marc 21/10/2026 : le total n'est pas un champ saisi.
 * 80 + 150 = 230 pour la Petite Fortune (Réf. Vaisseaux v0.1 §8).
 * La soute n'est pas ajoutée : le reste de coque est déjà dans la masse à vide.
 *
 * @param {unknown} dry
 * @param {unknown} reaction
 * @returns {number}
 */
export function departureMass(dry, reaction) {
  const empty = Number(dry);
  const propellant = Number(reaction);
  const a = Number.isFinite(empty) ? empty : 0;
  const b = Number.isFinite(propellant) ? propellant : 0;
  return a + b;
}

/**
 * Intégrité des modules Radiateurs posés dans la section Radiateurs.
 * Réf. Vaisseaux v0.1 §5 : on suit l'Intégrité du module, pas une plaque.
 * Plusieurs modules : on les liste tous.
 * // À confirmer par Marc : la section ne devrait en contenir qu'un.
 *
 * @param {Array<{ name?: string, category?: string, section?: string, integrity?: { value?: unknown, max?: unknown }, condition?: string }>} modules
 * @returns {{ name: string, value: unknown, max: unknown, condition: string }[]}
 */
export function followedRadiatorIntegrity(modules) {
  const followed = [];
  for ( const module of modules ?? [] ) {
    if ( module?.category !== "radiators" || module?.section !== "radiators" ) continue;
    followed.push({
      name: typeof module.name === "string" ? module.name : "",
      value: module.integrity?.value,
      max: module.integrity?.max,
      condition: module.condition ?? moduleCondition(module.integrity?.value, module.integrity?.max)
    });
  }
  return followed;
}

/**
 * Nombre fini, ou `null`.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Ramène `value` au plus à `max`, dans une paire déjà présente.
 *
 * Ni la paire, ni une clé absente du diff, ne sont créées. Exception :
 * si seul `max` est dans le diff et passe sous la valeur déjà stockée,
 * on écrit `value` dans cette paire. Si seule `value` dépasse le maximum
 * stocké, on la rabaisse et on n'ajoute pas `max`.
 *
 * @param {object|null|undefined} diffPair
 * @param {{ value?: unknown, max?: unknown }|null|undefined} current
 * @returns {void}
 */
export function clampValueMax(diffPair, current) {
  if ( !diffPair || typeof diffPair !== "object" ) return;
  const hasValue = Object.hasOwn(diffPair, "value");
  const hasMax = Object.hasOwn(diffPair, "max");
  if ( !hasValue && !hasMax ) return;
  const max = finiteNumber(hasMax ? diffPair.max : current?.max);
  if ( max === null ) return;
  const value = finiteNumber(hasValue ? diffPair.value : current?.value);
  if ( value === null ) return;
  if ( value > max ) diffPair.value = max;
}

/**
 * Intégrité de section, plaque et delta-v. Un diff sans ces clés
 * (une description seule, par exemple) n'en reçoit pas.
 *
 * @param {object|null|undefined} diff Diff `system`, pas le document entier.
 * @param {object|null|undefined} current Source déjà stockée.
 * @returns {object|null|undefined}
 */
export function clampShipDiff(diff, current) {
  if ( !diff || typeof diff !== "object" ) return diff;
  const propulsion = diff.propulsion;
  if ( Object.hasOwn(diff, "propulsion") && propulsion && typeof propulsion === "object" && Object.hasOwn(propulsion, "deltaV") ) {
    clampValueMax(propulsion.deltaV, current?.propulsion?.deltaV);
  }
  if ( Object.hasOwn(diff, "sections") && diff.sections && typeof diff.sections === "object" ) {
    for ( const id of Object.keys(diff.sections) ) {
      const section = diff.sections[id];
      if ( !section || typeof section !== "object" ) continue;
      const stored = current?.sections?.[id];
      if ( Object.hasOwn(section, "integrity") ) clampValueMax(section.integrity, stored?.integrity);
      if ( Object.hasOwn(section, "armor") ) clampValueMax(section.armor, stored?.armor);
    }
  }
  return diff;
}

/**
 * Intégrité d'un module. Un diff qui n'a pas `integrity` ne le gagne pas.
 *
 * @param {object|null|undefined} diff Diff `system`.
 * @param {object|null|undefined} current
 * @returns {object|null|undefined}
 */
export function clampModuleDiff(diff, current) {
  if ( !diff || typeof diff !== "object" ) return diff;
  if ( !Object.hasOwn(diff, "integrity") ) return diff;
  clampValueMax(diff.integrity, current?.integrity);
  return diff;
}
