/**
 * Munitions d'une arme de personnage, au moment du tir.
 *
 * Décision Marc 31/10/2026. Chaque tir retire 1 à `system.ammo.value`,
 * comme le canon. Réf. Vaisseaux v0.1 §4. Le rechargement reste manuel.
 * Valeur 0 et maximum supérieur à 0 : le tir est refusé, rien n'est écrit.
 * Valeur null, maximum null, ou maximum 0 : le tir part, rien n'est écrit.
 */

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
