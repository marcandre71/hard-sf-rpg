/**
 * Migration du PNJ de l'étape 2 vers le schéma partagé avec le personnage.
 *
 * L'étape 2 ne stockait que `description` et `notes`. L'étape 3 reprend
 * le schéma du personnage (`biography`, `notes`, identité, caractéristiques).
 * On déplace `description` dans `biography` quand biography est vide, pour
 * ne pas perdre le texte. Les notes restent. Ce n'est pas une règle de jeu :
 * seulement la conservation des fiches déjà créées. Réf. consigne étape 3.
 *
 * Les caractéristiques absentes ne sont pas écrites ici : le schéma leur
 * donne le défaut (Base 25, les autres à 0).
 *
 * @param {object} source Donnée `system` stockée.
 * @returns {object}
 */
export function migrateNpcSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  // Biography déjà remplie : on ne l'écrase pas.
  if ( source.description && !source.biography ) source.biography = source.description;
  if ( "description" in source ) delete source.description;
  return source;
}
