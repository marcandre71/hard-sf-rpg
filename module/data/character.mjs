/**
 * Modèle de données du type d'acteur `character` (Personnage).
 *
 * Place dans le système : déclaré comme sous-type dans `system.json`
 * (`documentTypes.Actor.character`) et associé dans `module/sol.mjs` par
 * `CONFIG.Actor.dataModels.character = CharacterData`. Foundry instancie
 * cette classe dans `actor.system`.
 *
 * Étape 1 : uniquement les caractéristiques listées dans `module/config.mjs`.
 * Stocké pour chacune : `base`, `origin`, `advance`, `temp`.
 * Dérivé, jamais stocké : `value = base + origin + advance + temp`.
 */
import { SOL } from "../config.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Données `system` du Personnage.
 *
 * @extends foundry.abstract.TypeDataModel
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
 */
export class CharacterData extends foundry.abstract.TypeDataModel {

  /**
   * Schéma du champ `system`.
   *
   * Une entrée {@link SchemaField} par clé de `SOL.characteristics`, chacune
   * composée de quatre {@link NumberField}. L'ordre des clés suit celui de
   * la configuration.
   *
   * @override
   * @returns {foundry.data.fields.DataSchema} Schéma validé côté client par Foundry.
   * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html#defineSchema
   * @see https://foundryvtt.com/api/v14/classes/foundry.data.fields.SchemaField.html
   * @see https://foundryvtt.com/api/v14/classes/foundry.data.fields.NumberField.html
   */
  static defineSchema() {
    const characteristics = {};
    for ( const key of Object.keys(SOL.characteristics) ) {
      characteristics[key] = new SchemaField({
        // Base : 25 + points de création (1 à 100).
        base: new NumberField({ required: true, nullable: false, integer: true, initial: 25, min: 1, max: 100 }),
        // Modificateur d'origine (lieu de naissance), de -10 à +15.
        origin: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -10, max: 15 }),
        // Progression de carrière (XP), plafonnée à +10.
        advance: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 10 }),
        // Modificateur temporaire (déconditionnement, etc.), sans borne.
        temp: new NumberField({ required: true, nullable: false, integer: true, initial: 0 })
      });
    }
    return {
      characteristics: new SchemaField(characteristics)
    };
  }

  /**
   * Calcule la valeur actuelle de chaque caractéristique.
   *
   * Appelé par Foundry avant `ClientDocument#prepareDerivedData`.
   * `value` n'est pas dans le schéma : il n'est pas persisté.
   * Non borné pour l'instant (question ouverte : borner à 1-100 ?).
   *
   * @override
   * @returns {void}
   * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html#prepareDerivedData
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    for ( const key of Object.keys(SOL.characteristics) ) {
      const c = this.characteristics[key];
      c.value = c.base + c.origin + c.advance + c.temp;
    }
  }
}
