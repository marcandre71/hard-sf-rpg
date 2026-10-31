/**
 * Munitions d'une arme de personnage, au moment du tir.
 *
 * Décision Marc 31/10/2026. Chaque tir retire 1 à `system.ammo.value`,
 * comme le canon. Réf. Vaisseaux v0.1 §4. Le rechargement reste manuel.
 * Valeur 0 et maximum supérieur à 0 : le tir est refusé, rien n'est écrit.
 * Valeur null, maximum null, ou maximum 0 : le tir part, rien n'est écrit.
 *
 * Après la fenêtre, on relit la valeur. On n'écrit pas le chiffre
 * calculé avant le jet. Décision Didier/Marc 31/10/2026.
 */

/** Un tir à la fois par arme (`item.uuid`). */
const shotsInFlight = new Set();

/**
 * Chargeur : maximum numérique supérieur à 0.
 * Décision Didier/Marc 31/10/2026. Maximum 0 : sans chargeur.
 *
 * @param {unknown} ammo
 * @returns {boolean}
 */
export function weaponHasMagazine(ammo) {
  if ( ammo === null || ammo === undefined || typeof ammo !== "object" ) return false;
  const max = /** @type {{ max?: unknown }} */ (ammo).max;
  if ( max === null || max === undefined || max === "" ) return false;
  const count = Number(max);
  return Number.isFinite(count) && count > 0;
}

/**
 * Avant le jet. Un non-propriétaire est refusé seulement s'il y a un chargeur.
 * Pas de relais au MJ. Décision Didier/Marc 31/10/2026.
 *
 * @param {unknown} ammo
 * @param {boolean} isOwner
 * @returns {boolean} `true` si le tir doit être refusé
 */
export function personalShotRefusedToNonOwner(ammo, isOwner) {
  return weaponHasMagazine(ammo) && isOwner !== true;
}

/**
 * Pose le verrou. `false` : un tir de cette arme est déjà ouvert.
 *
 * @param {string} uuid
 * @returns {boolean}
 */
export function beginPersonalShot(uuid) {
  if ( typeof uuid !== "string" || uuid === "" ) return false;
  if ( shotsInFlight.has(uuid) ) return false;
  shotsInFlight.add(uuid);
  return true;
}

/**
 * Libère le verrou. À appeler dans un `finally`.
 *
 * @param {string} uuid
 * @returns {void}
 */
export function endPersonalShot(uuid) {
  shotsInFlight.delete(uuid);
}

/**
 * @param {unknown} ammo `{ value, max }`, ou absent.
 * @returns {{ fire: boolean, next: number|null }}
 */
export function personalAmmoSpend(ammo) {
  if ( ammo === null || ammo === undefined || ammo === "" ) return { fire: true, next: null };
  if ( typeof ammo !== "object" ) return { fire: true, next: null };
  const row = /** @type {{ value?: unknown, max?: unknown }} */ (ammo);
  const valueEmpty = row.value === null || row.value === undefined || row.value === "";
  const maxEmpty = row.max === null || row.max === undefined || row.max === "";
  // Décision Didier/Marc 31/10/2026 (champ vide = rien retiré) ; max 0 = sans chargeur
  if ( valueEmpty || maxEmpty || row.max === 0 ) return { fire: true, next: null };
  const value = Number(row.value);
  if ( !Number.isFinite(value) ) return { fire: true, next: null };
  // 0 : comme le canon. Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
  if ( value <= 0 ) return { fire: false, next: null };
  return { fire: true, next: Math.max(0, Math.trunc(value) - 1) };
}

/**
 * Après la fenêtre. `next` est la valeur relue, moins 1.
 * Valeur 0 et maximum supérieur à 0 : on n'écrit rien, on notifie.
 *
 * @param {unknown} ammo Valeur relue, pas le chiffre d'avant le jet.
 * @returns {{ write: boolean, next: number|null, notify: boolean }}
 */
export function personalAmmoAfterRoll(ammo) {
  if ( ammo === null || ammo === undefined || ammo === "" || typeof ammo !== "object" ) {
    return { write: false, next: null, notify: false };
  }
  const row = /** @type {{ value?: unknown, max?: unknown }} */ (ammo);
  const valueEmpty = row.value === null || row.value === undefined || row.value === "";
  const maxEmpty = row.max === null || row.max === undefined || row.max === "";
  // Décision Didier/Marc 31/10/2026 (champ vide = rien retiré) ; max 0 = sans chargeur
  if ( valueEmpty || maxEmpty || row.max === 0 ) return { write: false, next: null, notify: false };
  const value = Number(row.value);
  const max = Number(row.max);
  if ( !Number.isFinite(value) || !Number.isFinite(max) || max <= 0 ) {
    return { write: false, next: null, notify: false };
  }
  if ( value <= 0 ) return { write: false, next: null, notify: true };
  return { write: true, next: Math.max(0, Math.trunc(value) - 1), notify: false };
}
