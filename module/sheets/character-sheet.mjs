/**
 * Feuille de personnage (ApplicationV2).
 *
 * Étape 1 : nom, portrait, tableau des neuf caractéristiques.
 * Étape 2 : identité, contacts, défauts, biographie, notes, liste d'objets.
 * La colonne Actuelle est lue sur la donnée préparée (`value`).
 * Les saisies lisent `document._source` (nom) ou `system._source`
 * (champs stockés), jamais la valeur dérivée.
 *
 * Gabarit : `templates/actor/character-sheet.hbs`.
 */
import { SOL } from "../config.mjs";
import { itemListActions, keepItemTypeSelectLocal, prepareItemList } from "./item-list.mjs";
import { prepareFieldGroups } from "./prepare-fields.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 * @see https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html
 */
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "sol-nouvelle-ere", "actor", "character"],
    position: { width: 720, height: 800 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: itemListActions
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/sol-nouvelle-ere/templates/actor/character-sheet.hbs",
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
    const stored = actor.system._source;
    context.actor = actor;
    context.docSource = actor._source;
    context.systemSource = stored;
    context.bounds = SOL.characteristicFields;
    context.characteristics = Object.entries(SOL.characteristics).map(([key, cfg]) => {
      const source = stored.characteristics[key];
      const prepared = actor.system.characteristics[key];
      return {
        key,
        label: cfg.label,
        abbr: cfg.abbr,
        base: source.base,
        origin: source.origin,
        advance: source.advance,
        temp: source.temp,
        // Seule colonne dérivée : pas un input.
        value: prepared.value,
        path: `system.characteristics.${key}`
      };
    });
    context.identityGroups = prepareFieldGroups(actor.system.schema.fields.identity.fields, stored.identity, {
      prefix: "system.identity",
      rootId: context.rootId
    });
    const labelOf = field => field.label ?? field.options?.label ?? "";
    context.biography = {
      field: actor.system.schema.fields.biography,
      label: labelOf(actor.system.schema.fields.biography),
      value: stored.biography ?? ""
    };
    context.notes = {
      field: actor.system.schema.fields.notes,
      label: labelOf(actor.system.schema.fields.notes),
      value: stored.notes ?? ""
    };
    Object.assign(context, prepareItemList(actor));
    return context;
  }
}
