/**
 * Feuille minimale commune aux acteurs autres que le Personnage
 * (PNJ, Créature, Synthétique, Drone, Véhicule, Vaisseau).
 *
 * Nom, image, champs du modèle (catégorie, description, notes) via
 * `{{formGroup}}`, puis la liste des objets embarqués.
 * Pas de caractéristiques : les docs n'en donnent pas pour ces types.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 */
import { itemListActions, keepItemTypeSelectLocal, prepareItemList } from "./item-list.mjs";
import { prepareFieldGroups } from "./prepare-fields.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** @extends {ActorSheetV2} */
export class GenericActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "sol-nouvelle-ere", "actor"],
    position: { width: 640, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: itemListActions
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/sol-nouvelle-ere/templates/actor/actor-sheet.hbs",
      templates: [
        "systems/sol-nouvelle-ere/templates/shared/field-groups.hbs",
        "systems/sol-nouvelle-ere/templates/actor/item-list.hbs"
      ]
    }
  };

  /**
   * @override
   * @param {object} context
   * @param {object} options
   * @returns {Promise<void>}
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    keepItemTypeSelectLocal(this);
  }

  /**
   * @override
   * @param {object} options
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    context.actor = actor;
    // Nom : source du document. Champs system : source nettoyée du modèle
    // (les défauts des champs absents du JSON stocké y sont déjà posés).
    context.docSource = actor._source;
    context.typeLabel = `TYPES.Actor.${actor.type}`;
    context.groups = prepareFieldGroups(actor.system.schema.fields, actor.system._source, {
      prefix: "system",
      rootId: context.rootId
    });
    Object.assign(context, prepareItemList(actor));
    return context;
  }
}
