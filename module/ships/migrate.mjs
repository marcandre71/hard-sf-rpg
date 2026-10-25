/**
 * Migrations des vaisseaux et des modules, sans Foundry.
 *
 * Un diff partiel ne reçoit aucun défaut : on ne réécrit une clé que
 * si elle est déjà dans l'objet. Réf. revue des modèles (un `migrateData`
 * qui injecte écrase une valeur saisie).
 */
import { SHIP_MODULE_CATEGORIES } from "./hull.mjs";

const MODULE_CATEGORY = new Set(SHIP_MODULE_CATEGORIES);

/**
 * @param {unknown} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Ancienne catégorie d'acteur.
 *
 * Décision Marc 21/10/2026 : « station » devient « fixed » (objet fixe).
 * Décision Marc 21/10/2026 : l'ancienne clé « ship » devient « void ».
 *
 * @param {object|null|undefined} source
 * @returns {object|null|undefined}
 */
export function migrateShipSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  if ( Object.hasOwn(source, "category") ) {
    if ( source.category === "station" ) source.category = "fixed";
    else if ( source.category === "ship" ) source.category = "void";
  }
  // Décision Marc 21/10/2026 : seule l'Intégrité du module Radiateurs compte.
  // `-=integrity` est la suppression Foundry : un diff qui n'a pas la clé
  // ne la crée pas, et on n'ajoute pas `sections` s'il n'y est pas.
  dropRadiatorSectionIntegrity(source);
  // Décision Marc 23/10/2026 : delta-v au dixième, sans suivi exact.
  // On n'ajoute ni `propulsion`, ni `deltaV`, ni `range`.
  roundPresentDeltaV(source);
  return source;
}

/**
 * « 3,5 » devient 3.5. Sans virgule, la valeur est rendue telle quelle.
 * Une chaîne illisible (« x ») n'est pas remplacée.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §2.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function normalizeDecimalText(value) {
  if ( typeof value !== "string" || !value.includes(",") ) return value;
  const text = value.trim().replace(",", ".");
  if ( text === "" ) return value;
  const number = Number(text);
  return Number.isFinite(number) ? number : value;
}

/**
 * Arrondit `value` et `max` au dixième, seulement si la clé est déjà là.
 * Une valeur illisible n'est pas remplacée par 0. Une virgule est lue.
 * Décision Marc 23/10/2026. Pas d'autre clé : `exact` et `exactValue`
 * n'ont jamais été écrites.
 *
 * @param {object|null|undefined} source
 * @returns {void}
 */
export function roundPresentDeltaV(source) {
  if ( !source || typeof source !== "object" || !Object.hasOwn(source, "propulsion") ) return;
  const propulsion = source.propulsion;
  if ( !propulsion || typeof propulsion !== "object" || !Object.hasOwn(propulsion, "deltaV") ) return;
  const delta = propulsion.deltaV;
  if ( !delta || typeof delta !== "object" ) return;
  if ( Object.hasOwn(delta, "value") ) {
    const rounded = roundTenth(delta.value);
    if ( rounded !== undefined ) delta.value = rounded;
  }
  if ( Object.hasOwn(delta, "max") ) {
    const rounded = roundTenth(delta.max);
    if ( rounded !== undefined ) delta.max = rounded;
  }
}

/**
 * Au dixième. `null` ou une chaîne vide donne 0 :
 * `Number(null)` et `Number("")` valent 0.
 * Une valeur illisible (« x ») donne `undefined` : la clé n'est pas réécrite.
 * La fiche n'envoie pas ce cas : une case vide est retirée avant.
 *
 * @param {unknown} value
 * @returns {number|undefined}
 */
function roundTenth(value) {
  const normalized = normalizeDecimalText(value);
  const number = typeof normalized === "number" ? normalized : Number(normalized);
  if ( !Number.isFinite(number) ) return undefined;
  return Math.round(number * 10) / 10;
}

/**
 * Saisie de la fiche : un nombre simple, virgule ou point, rien d'autre.
 * « -1 », « 1e3 », « 0x10 », « Infinity » ne passent pas.
 * Le delta-v est une réserve, jamais négative. Le NumberField a déjà min 0.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §2.
 */
const SHEET_DELTA_V = /^\d+([.,]\d+)?$/;

/**
 * Delta-v soumis par la fiche, déjà expansé.
 * « 3,5 » devient 3.5, au dixième. Vide, null ou refusé : la clé
 * est retirée. On n'envoie ni null ni 0, sinon le nombre revient à 0.
 * Ceci ne change pas la migration : `roundTenth` garde les nombres déjà stockés.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §2.
 *
 * @param {object|null|undefined} data
 * @returns {{ key: "value"|"max", raw: unknown }[]} Clés ignorées.
 */
export function applySheetDeltaV(data) {
  /** @type {{ key: "value"|"max", raw: unknown }[]} */
  const ignored = [];
  const delta = data?.system?.propulsion?.deltaV;
  if ( !delta || typeof delta !== "object" ) return ignored;
  for ( const key of /** @type {const} */ (["value", "max"]) ) {
    if ( !Object.hasOwn(delta, key) ) continue;
    const raw = delta[key];
    const parsed = sheetDeltaV(raw);
    if ( parsed === undefined ) {
      delete delta[key];
      ignored.push({ key, raw });
    } else delta[key] = parsed;
  }
  return ignored;
}

/**
 * Le delta-v est une réserve, jamais négative.
 * Une chaîne doit coller à `SHEET_DELTA_V` après trim. Un nombre déjà
 * numérique (l'autre case, non retouchée) est gardé s'il est fini et ≥ 0.
 * `roundTenth` n'est pas appelé ici : la migration des données stockées
 * ne passe pas par ce filtre.
 *
 * @param {unknown} raw
 * @returns {number|undefined} `undefined` : ne pas écrire la clé.
 */
function sheetDeltaV(raw) {
  if ( typeof raw === "number" ) {
    if ( !Number.isFinite(raw) || raw < 0 ) return undefined;
    return Math.round(raw * 10) / 10;
  }
  if ( typeof raw !== "string" || !SHEET_DELTA_V.test(raw.trim()) ) return undefined;
  const number = Number(raw.trim().replace(",", "."));
  if ( !Number.isFinite(number) ) return undefined;
  return Math.round(number * 10) / 10;
}

/**
 * Valeur stockée, affichée au dixième dans la case.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function formatStoredDeltaV(value) {
  if ( typeof value !== "number" || !Number.isFinite(value) ) return "";
  return String(Math.round(value * 10) / 10);
}

/**
 * Remet la valeur enregistrée dans l'input. Le diff vide ne rerend pas
 * la fiche : sans ça, la case reste vide ou sur « abc ».
 *
 * @param {{ elements?: { namedItem?: (name: string) => { value?: string }|null, [key: string]: { value?: string }|undefined } }|null|undefined} form
 * @param {"value"|"max"} key
 * @param {unknown} stored
 * @returns {void}
 */
export function writeDeltaVInput(form, key, stored) {
  if ( typeof stored !== "number" || !Number.isFinite(stored) ) return;
  const name = `system.propulsion.deltaV.${key}`;
  const elements = form?.elements;
  if ( !elements ) return;
  const named = typeof elements.namedItem === "function" ? elements.namedItem(name) : null;
  const input = named ?? elements[name];
  if ( !input || !("value" in input) ) return;
  input.value = formatStoredDeltaV(stored);
}

/**
 * Une même saisie invalide ne prévient qu'une fois.
 * `previous` est le jeton déjà signalé pour cette case.
 *
 * @param {string|undefined} previous
 * @param {unknown} raw
 * @returns {{ warn: boolean, token: string }}
 */
export function nextDeltaVWarning(previous, raw) {
  const token = raw == null || String(raw).trim() === "" ? "" : String(raw).trim();
  return { warn: previous !== token, token };
}

/**
 * @param {object} source
 * @returns {void}
 */
function dropRadiatorSectionIntegrity(source) {
  if ( !Object.hasOwn(source, "sections") ) return;
  const sections = source.sections;
  if ( !sections || typeof sections !== "object" || !Object.hasOwn(sections, "radiators") ) return;
  const radiators = sections.radiators;
  if ( !radiators || typeof radiators !== "object" || !Object.hasOwn(radiators, "integrity") ) return;
  delete radiators.integrity;
  radiators["-=integrity"] = null;
}

/**
 * Ancien module de l'étape 2 : `category` et `state` étaient du texte libre.
 * L'état n'est plus stocké (il découle de l'Intégrité). On ne recopie pas
 * ce texte dans l'Intégrité.
 *
 * // À confirmer par Marc : une catégorie qui n'est pas une des onze clés
 * devient `other`. Si `effects` est dans le même objet, l'ancien libellé
 * y est gardé. Un diff qui n'a pas `effects` ne le crée pas : le libellé
 * de ce diff-là est perdu.
 *
 * @param {object|null|undefined} source
 * @returns {object|null|undefined}
 */
export function migrateShipModuleSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  if ( Object.hasOwn(source, "state") ) delete source.state;
  if ( !Object.hasOwn(source, "category") ) return source;
  const category = source.category;
  if ( typeof category !== "string" ) return source;
  if ( MODULE_CATEGORY.has(category) ) return source;
  if ( category !== "" && Object.hasOwn(source, "effects") ) {
    const previous = escapeHtml(category);
    const effects = typeof source.effects === "string" ? source.effects : "";
    if ( !effects.includes(previous) ) {
      source.effects = `<p>Ancienne catégorie : ${previous}</p>${effects}`;
    }
  }
  source.category = "other";
  return source;
}
