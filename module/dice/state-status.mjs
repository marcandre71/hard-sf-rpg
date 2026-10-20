/**
 * Lien entre une page du compendium États et un statut du pion.
 * Sans Foundry. Le lien est le drapeau `statusId`, pas le nom de la page.
 */

/**
 * @param {unknown} flags
 * @returns {string|null}
 */
export function statusIdFromFlags(flags) {
  if ( !flags || typeof flags !== "object" ) return null;
  const block = flags["sol-nouvelle-ere"];
  const id = block && typeof block === "object" ? block.statusId : null;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Le statut existe dans `CONFIG.statusEffects` (objet v14 ou tableau v13).
 *
 * @param {unknown} id
 * @param {object|Array<{ id?: string }>|null|undefined} effects
 * @returns {boolean}
 */
export function statusEffectKnown(id, effects) {
  if ( typeof id !== "string" || id.length === 0 || !effects ) return false;
  if ( !Array.isArray(effects) && effects[id] ) return true;
  if ( typeof effects[Symbol.iterator] !== "function" ) return false;
  for ( const effect of effects ) {
    if ( effect?.id === id ) return true;
  }
  return false;
}
