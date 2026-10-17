/**
 * Migration du PNJ de l'étape 2 vers le schéma partagé avec le personnage.
 *
 * L'étape 2 ne stockait que `description` et `notes`. L'étape 3 reprend
 * le schéma du personnage. On ne recopie `description` dans `biography`
 * que pour cette forme-là : les deux clés présentes, et pas encore de
 * `biography`.
 *
 * `migrateData` tourne aussi sur une mise à jour partielle. Un objet qui
 * n'a que `description` n'est pas une fiche de l'étape 2 : on ne doit pas
 * lui inventer une biographie. La clé `description` est toujours retirée,
 * pour ne plus être relue (elle peut sinon rester en base).
 *
 * Les notes restent. Les caractéristiques absentes ne sont pas écrites ici :
 * le schéma leur donne le défaut (Base 25, les autres à 0).
 * Ce n'est pas une règle de jeu. Réf. consigne étape 3, revue de b2ac7e1.
 *
 * @param {object} source Donnée `system` stockée, ou fragment d'une mise à jour.
 * @returns {object}
 */
export function migrateNpcSource(source) {
  if ( !source || typeof source !== "object" ) return source;
  // Fiche étape 2 seulement : description + notes, sans biography.
  const legacy = ("description" in source) && ("notes" in source) && !("biography" in source);
  if ( legacy && source.description ) source.biography = source.description;
  delete source.description;
  return source;
}
