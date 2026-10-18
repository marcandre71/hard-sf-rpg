/**
 * Ancienne armure à valeur unique. Sans Foundry.
 *
 * On ne transforme que si `protection` est encore un nombre.
 * Un objet de zones déjà présent n'est pas réécrit, et on n'injecte
 * ni `breachThreshold` ni `pressurized`.
 * Réf. LdR v0.2 §7 et §15.
 */
import { SOL } from "../config.mjs";

/**
 * @param {object|null|undefined} source
 * @returns {object|null|undefined}
 */
export function migrateArmorSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  const protection = source.protection;
  if ( typeof protection !== "number" || !Number.isFinite(protection) ) return source;
  /** @type {Record<string, number>} */
  const zones = {};
  for ( const key of Object.keys(SOL.bodyLocations) ) zones[key] = protection;
  source.protection = zones;
  return source;
}
