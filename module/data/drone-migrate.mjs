/**
 * Migration du drone. Décision Didier/Marc 31/10/2026.
 *
 * COO, ADA et le score autonome arrivent par le défaut du schéma,
 * au chargement d'une fiche entière. Un diff partiel ne doit pas
 * les recevoir : `migrateData` tourne avant le nettoyage.
 *
 * @param {object} source Donnée `system`, ou fragment d'une mise à jour.
 * @returns {object}
 */
export function migrateDroneSource(source) {
  return source;
}
