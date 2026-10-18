/**
 * FOR et CON des créatures, synthétiques et drones.
 *
 * Décision Marc 18/10/2026 : mêmes champs et mêmes bornes que le PNJ
 * (Base 1 à 100, défaut 25). Pas d'autre caractéristique.
 * Le fichier ne charge pas Foundry : les tests l'importent avec `node`.
 */
import { characteristicFieldsFor } from "../config.mjs";

/** Clés ajoutées. Pas les sept autres caractéristiques du personnage. */
export const FOR_CON_KEYS = ["for", "con"];

/**
 * Défauts stockés : Base 25, origine, acquis et temporaire à 0.
 *
 * @returns {Record<string, number>}
 */
function forConDefaults() {
  /** @type {Record<string, number>} */
  const blank = {};
  for ( const [name, cfg] of Object.entries(characteristicFieldsFor("npc")) ) {
    blank[name] = cfg.initial;
  }
  return blank;
}

/**
 * Complète FOR et CON manquantes. Un nombre déjà stocké n'est pas réécrit.
 * `description`, `notes` et toute autre clé restent.
 *
 * Seulement une fiche entière (elle a `description` et `notes`, forme
 * stockée de ces acteurs). Un fragment — mise à jour d'un seul champ, ou
 * `options.partial` (Foundry v14, `DataModelCleaningOptions`) — n'est pas
 * complété : sinon il écraserait la Force déjà saisie. Au chargement, la
 * fiche entière n'a pas `partial`. Les champs absents prennent le défaut.
 * Une fiche neuve `{}` est laissée au schéma, qui pose les mêmes défauts.
 *
 * @param {object} source Donnée `system` stockée, ou fragment d'une mise à jour.
 * @param {{ partial?: boolean }} [options]
 * @returns {object}
 */
export function migrateForConSource(source, options = {}) {
  if ( !source || typeof source !== "object" || Array.isArray(source) ) return source;
  if ( options.partial === true ) return source;
  if ( !("description" in source) || !("notes" in source) ) return source;
  if ( source.characteristics == null ) source.characteristics = {};
  const raw = source.characteristics;
  if ( typeof raw !== "object" || Array.isArray(raw) ) return source;
  const defaults = forConDefaults();
  for ( const key of FOR_CON_KEYS ) {
    if ( raw[key] == null ) {
      raw[key] = { ...defaults };
      continue;
    }
    const current = raw[key];
    if ( typeof current !== "object" || Array.isArray(current) ) continue;
    for ( const [name, initial] of Object.entries(defaults) ) {
      const value = current[name];
      if ( typeof value !== "number" || !Number.isFinite(value) ) current[name] = initial;
    }
  }
  return source;
}
