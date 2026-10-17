/**
 * Modèle de données du type d'acteur `character` (Personnage).
 *
 * Le schéma est celui de `PersonData` (`module/data/person.mjs`), partagé
 * avec le PNJ depuis l'étape 3. Rien de propre au personnage ici : les
 * champs viennent de la Fiche v0.2 §4.
 *
 * Pas de `migrateData` : les personnages de l'étape 2 ont déjà ces champs.
 * Un champ ajouté plus tard, avec `initial`, n'a pas besoin de migration.
 */
import { PersonData } from "./person.mjs";

/**
 * Données `system` du Personnage.
 *
 * @extends PersonData
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
 */
export class CharacterData extends PersonData {}
