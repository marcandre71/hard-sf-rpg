/**
 * Augmentation (`augmentation`).
 *
 * Cybernétique et génétique sont un seul type. Le genre (`kind`) vaut
 * thérapie, prothèse, organe cultivé ou héréditaire — pas une séparation
 * cyber / génétique. Réf. LdR v0.2 §15, Fiche v0.2 §4.
 *
 * `effect` est du HTML seulement. L'ActiveEffect associé (Fiche v0.2 §4)
 * n'est pas branché à l'étape 2.
 */
import { SOL } from "../config.mjs";
import { BaseItemData } from "./base-item.mjs";
import { htmlField, numberField, SchemaField, stringField } from "./fields.mjs";

/** @extends BaseItemData */
export class AugmentationData extends BaseItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      kind: stringField("SOL.Augmentation.kind.label", {
        initial: "therapy",
        blank: false,
        choices: SOL.augmentationKinds
      }),
      effect: htmlField("SOL.Item.effect"),
      // Décision Marc 17/10/2026 : le coût est un entier.
      cost: numberField("SOL.Augmentation.cost", { initial: 0, integer: true, step: 1 }),
      legality: new SchemaField({
        earth: stringField("SOL.Augmentation.legality.earth"),
        mars: stringField("SOL.Augmentation.legality.mars"),
        elsewhere: stringField("SOL.Augmentation.legality.elsewhere")
      }, { label: "SOL.Augmentation.legality.label" }),
      sideEffects: htmlField("SOL.Augmentation.sideEffects")
    };
  }
}
