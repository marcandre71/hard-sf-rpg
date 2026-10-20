/**
 * Feuille minimale des acteurs qui ne sont ni Personnage ni PNJ
 * (Créature, Synthétique, Drone, Véhicule, Vaisseau).
 *
 * Nom, image, champs du modèle (catégorie, description, notes) via
 * `{{formGroup}}`, puis les objets groupés par type (même partiel
 * que la feuille du personnage).
 * Décision Marc 18/10/2026 : créature, synthétique et drone affichent
 * FOR, CON, PER et le Seuil. Le bouton de jet est celui du partiel.
 * Véhicule et vaisseau n'ont pas ces champs.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 */
import { characteristicFieldsFor, SOL } from "../config.mjs";
import { FOR_CON_PER_KEYS } from "../data/actors.mjs";
import { breachContext, stopBreachClock } from "../dice/breach-countdown.mjs";
import { seuilFromCharacteristics } from "../dice/damage.mjs";
import { resolveEndurance } from "../dice/derived.mjs";
import { rollCharacteristic } from "./character-sheet.mjs";
import { itemListActions, prepareSections } from "./item-list.mjs";
import { prepareFieldGroups } from "./prepare-fields.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** @extends {ActorSheetV2} */
export class GenericActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "sol-nouvelle-ere", "actor"],
    position: { width: 720, height: 800 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { ...itemListActions, rollCharacteristic, stopBreachClock }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/sol-nouvelle-ere/templates/actor/actor-sheet.hbs",
      templates: [
        "systems/sol-nouvelle-ere/templates/shared/field-groups.hbs",
        "systems/sol-nouvelle-ere/templates/shared/characteristics-table.hbs",
        "systems/sol-nouvelle-ere/templates/actor/item-section.hbs"
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
    const actor = this.document;
    context.actor = actor;
    // Nom : source du document. Champs system : source nettoyée du modèle
    // (les défauts des champs absents du JSON stocké y sont déjà posés).
    context.docSource = actor._source;
    context.typeLabel = `TYPES.Actor.${actor.type}`;
    const stored = actor.system._source ?? {};
    const prepared = actor.system.characteristics;
    if ( prepared?.for && prepared?.con ) {
      const fieldBounds = characteristicFieldsFor("npc");
      context.bounds = fieldBounds;
      context.characteristics = FOR_CON_PER_KEYS.map(key => {
        const cfg = SOL.characteristics[key];
        const source = stored.characteristics?.[key] ?? {};
        return {
          key,
          label: cfg.label,
          abbr: cfg.abbr,
          base: source.base ?? fieldBounds.base.initial,
          origin: source.origin ?? fieldBounds.origin.initial,
          advance: source.advance ?? fieldBounds.advance.initial,
          temp: source.temp ?? fieldBounds.temp.initial,
          value: prepared[key].value,
          path: `system.characteristics.${key}`
        };
      });
      context.seuil = seuilFromCharacteristics(prepared);
      const con = prepared.con?.value;
      const endurance = resolveEndurance(stored.endurance ?? null, con);
      context.showEndurance = endurance.max != null;
      context.enduranceCurrent = endurance.current;
      context.enduranceMax = endurance.max;
    }
    const breach = breachContext(actor);
    context.breachText = breach.text;
    context.breachAir = breach.air;
    context.breachStop = breach.stop;
    context.groups = prepareFieldGroups(actor.system.schema.fields, stored, {
      prefix: "system",
      rootId: context.rootId,
      skip: ["characteristics"]
    });
    context.sections = prepareSections(actor);
    return context;
  }
}
