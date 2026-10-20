/**
 * Malus de statut qui entrent dans le plafond ±50.
 * Sans Foundry.
 *
 * Réf. LdR v0.2 §5 et §11.
 * Décision Marc 20/10/2026 : Épuisé (−20) s'applique à tous les jets
 * tant que le statut est actif. Un seul point d'entrée : les autres
 * malus de statut s'ajoutent ici.
 */

/** Id du statut Épuisé. Réf. LdR v0.2 §11. */
export const EXHAUSTED_STATUS = "sol-nouvelle-ere.exhausted";

/** Réf. LdR v0.2 §11. */
export const EXHAUSTED_MODIFIER = -20;

/**
 * @param {Iterable<string>|null|undefined} statusIds
 * @returns {Array<{ id: string, value: number, labelKey: string }>}
 */
export function statusRollModifiers(statusIds) {
  const ids = statusIds ? [...statusIds] : [];
  if ( !ids.includes(EXHAUSTED_STATUS) ) return [];
  return [{
    id: EXHAUSTED_STATUS,
    value: EXHAUSTED_MODIFIER,
    labelKey: "SOL.Status.exhaustedMod"
  }];
}

/**
 * Somme des malus de statut. 0 s'il n'y en a pas.
 *
 * @param {Iterable<string>|null|undefined} statusIds
 * @returns {number}
 */
export function statusSituation(statusIds) {
  return statusRollModifiers(statusIds).reduce((sum, entry) => sum + entry.value, 0);
}
