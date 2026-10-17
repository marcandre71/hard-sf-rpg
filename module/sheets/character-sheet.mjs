/**
 * Feuille de personnage (ApplicationV2), étape 1.
 *
 * Place dans le système : enregistrée dans `module/sol.mjs` comme feuille par
 * défaut du type `character`. Elle n'écrit aucune donnée elle-même :
 * `submitOnChange` laisse DocumentSheetV2 enregistrer le formulaire, et la
 * colonne Actuelle est lue depuis `actor.system` (calculée par CharacterData).
 *
 * Gabarit : `templates/actor/character-sheet.hbs`.
 */
import { SOL } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Feuille minimale : nom, portrait, tableau des neuf caractéristiques.
 *
 * Hérite de {@link https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html ActorSheetV2}
 * enrichi par {@link https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html HandlebarsApplicationMixin}.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html
 */
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /**
   * Options de la fenêtre et du formulaire.
   *
   * `form.submitOnChange` enregistre chaque saisie dès que le champ perd
   * le focus ou change, sans bouton de validation.
   *
   * @override
   * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html#DEFAULT_OPTIONS
   * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html
   */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "actor", "character"],
    position: { width: 620, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  /**
   * Parties Handlebars de la feuille. Une seule partie, le gabarit entier.
   *
   * Le chemin est relatif au dossier `Data` de Foundry et reprend l'`id`
   * du système (`sol-nouvelle-ere`), pas le nom du dépôt.
   *
   * @override
   * @see https://foundryvtt.com/api/v14/classes/foundry.HandlebarsApplication.html#PARTS
   * @see https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html
   */
  static PARTS = {
    sheet: { template: "systems/sol-nouvelle-ere/templates/actor/character-sheet.hbs" }
  };

  /**
   * Prépare le contexte transmis au gabarit.
   *
   * Au contexte de DocumentSheetV2 (`actor` via `document`, `rootId`, etc.)
   * on ajoute `system` et `characteristics` : un tableau dans l'ordre de
   * `SOL.characteristics`, avec les quatre champs stockés, la valeur dérivée
   * et le chemin de formulaire `system.characteristics.<clé>`.
   *
   * @override
   * @param {object} options Options de rendu ApplicationV2.
   * @returns {Promise<object>} Contexte Handlebars de la feuille.
   * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html#_prepareContext
   * @see https://foundryvtt.com/api/v14/classes/foundry.HandlebarsApplication.html#_prepareContext
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    context.actor = actor;
    context.system = actor.system;
    context.characteristics = Object.entries(SOL.characteristics).map(([key, cfg]) => {
      const c = actor.system.characteristics[key];
      return {
        key,
        label: cfg.label,
        abbr: cfg.abbr,
        base: c.base,
        origin: c.origin,
        advance: c.advance,
        temp: c.temp,
        value: c.value,
        path: `system.characteristics.${key}`
      };
    });
    return context;
  }
}
