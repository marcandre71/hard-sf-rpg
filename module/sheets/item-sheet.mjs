/**
 * Feuille unique pour tous les types d'objets.
 *
 * Le même gabarit parcourt le schéma du type : pas une feuille par objet.
 * `description` est rendue à part, en bas. Les autres champs passent par
 * `{{formGroup}}` / `{{formInput}}` (nombre, case, liste, texte enrichi).
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ItemSheetV2.html
 * @see https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.formGroup.html
 */
import { prepareFieldGroups } from "./prepare-fields.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/** @extends {ItemSheetV2} */
export class GenericItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "sol-nouvelle-ere", "item"],
    position: { width: 560, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/sol-nouvelle-ere/templates/item/item-sheet.hbs",
      templates: [
        "systems/sol-nouvelle-ere/templates/shared/field-groups.hbs",
        "systems/sol-nouvelle-ere/templates/shared/field-row.hbs"
      ]
    }
  };

  /**
   * @override
   * @param {object} options
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    context.item = item;
    context.docSource = item._source;
    context.typeLabel = `TYPES.Item.${item.type}`;
    context.groups = prepareFieldGroups(item.system.schema.fields, item.system._source, {
      skip: ["description"],
      prefix: "system",
      rootId: context.rootId
    });
    if ( item.type === "shipModule" ) {
      // Arme et blindage : champs affichés seulement pour leur catégorie.
      // Les valeurs restent stockées quand on change de catégorie.
      // Réf. Vaisseaux v0.1 §4. Décision Marc 21/10/2026.
      const category = item.system._source?.category;
      context.groups = context.groups.flatMap(group => {
        const weapon = group.rows.some(line => line.name.startsWith("system.weapon."));
        if ( weapon && category !== "weapon" ) return [];
        return [{
          ...group,
          rows: group.rows.filter(line => line.name !== "system.armorPoints" || category === "armor")
        }];
      }).filter(group => group.rows.length);
    }
    if ( item.type === "armor" && item.system?.pressurized !== true ) {
      // Décision Marc 20/10/2026 : joints sans effet si l'armure n'est pas pressurisée.
      for ( const group of context.groups ) {
        for ( const line of group.rows ) {
          if ( line.name !== "system.sealState" ) continue;
          line.disabled = true;
          line.hint = game.i18n.localize("SOL.Armor.sealState.inert");
        }
      }
    }
    const description = item.system.schema.fields.description;
    context.description = description
      ? {
        field: description,
        name: "system.description",
        label: description.label ?? description.options?.label ?? "",
        value: item.system._source.description ?? "",
        rootId: context.rootId
      }
      : null;
    return context;
  }
}
