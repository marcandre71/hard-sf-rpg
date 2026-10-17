/**
 * Base commune de tous les objets : un champ `description` (HTML).
 *
 * Réf. Fiche v0.2 §4 (gear a une description HTML ; la consigne de l'étape 2
 * l'étend à chaque type d'objet). Substance et Logiciel n'ont aucun autre
 * champ : « champs à définir » (LdR v0.2 §15, Fiche v0.2 §4).
 */
import { htmlField } from "./fields.mjs";

/**
 * Données `system` partagées. Les sous-classes étendent le schéma
 * avec `...super.defineSchema()`.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export class BaseItemData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: htmlField("SOL.Item.description")
    };
  }
}

/**
 * Substance : médicaments et drogues. Pas une augmentation.
 * Réf. LdR v0.2 §15, Fiche v0.2 §4. Aucun champ propre dans les docs.
 *
 * @extends BaseItemData
 */
export class SubstanceData extends BaseItemData {}

/**
 * Logiciel. Réf. LdR v0.2 §15 « champs à définir », Fiche v0.2 §4.
 *
 * @extends BaseItemData
 */
export class SoftwareData extends BaseItemData {}
