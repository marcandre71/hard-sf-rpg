/**
 * Feuille du Personnage et du PNJ (ApplicationV2).
 *
 * Trois onglets, en-tête commun (portrait, nom, type) :
 * - principal : identité courte, Origine / Milieu / Profession,
 *   caractéristiques, compétences, atouts, état physique ;
 * - inventory : armes, armures, équipement, augmentations, substances, logiciels ;
 * - roleplay : taille, masse, âge, lieu de naissance, gravité, contacts,
 *   défauts, biographie, notes.
 *
 * Un clic sur le libellé d'une caractéristique lance un D100.
 * Réf. LdR v0.2 §15, consigne étape 4.
 * La colonne Actuelle est lue sur la donnée préparée (`value`).
 * Les saisies lisent `document._source` ou `system._source`.
 *
 * Onglets : `static TABS` / `static PARTS`, groupe `main`.
 * `tabGroups.main` mémorise l'onglet actif entre deux rendus
 * (un champ modifié ne ramène pas à Principal).
 * Navigation : gabarit du cœur `templates/generic/tab-navigation.hbs`.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 * @see https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html
 */
import { characteristicRollLabel, SOL } from "../config.mjs";
import { breachContext, stopBreachClock } from "../dice/breach-countdown.mjs";
import { performRoll } from "../dice/chat.mjs";
import { resolveEndurance } from "../dice/derived.mjs";
import { itemListActions, prepareSections } from "./item-list.mjs";
import { prepareFieldGroups } from "./prepare-fields.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Groupe d'onglets. La clé est celle de `static TABS`. */
const TAB_GROUP = "main";

/** Identité de l'onglet Principal, dans l'ordre d'affichage. */
const PRINCIPAL_IDENTITY = ["concept", "faction", "polity", "bloc"];

/** Identité de l'onglet Roleplay, dans l'ordre d'affichage. */
const ROLEPLAY_IDENTITY = ["height", "mass", "age", "birthplace", "gravityNative"];

/** Emplacements uniques, onglet Principal. */
const SLOT_TYPES = ["origin", "background", "profession"];

/** Listes de l'onglet Principal, sous les caractéristiques. */
const PRINCIPAL_LISTS = ["skill", "talent", "injury", "sequel"];

/** Listes de l'onglet Inventaire. */
const INVENTORY_TYPES = ["weapon", "armor", "gear", "augmentation", "substance", "software"];

const PARTIALS = [
  "systems/sol-nouvelle-ere/templates/shared/field-groups.hbs",
  "systems/sol-nouvelle-ere/templates/shared/characteristics-table.hbs",
  "systems/sol-nouvelle-ere/templates/actor/item-section.hbs"
];

/**
 * @see https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.ApplicationTabsConfiguration.html
 */
export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /**
   * Onglet affiché au premier rendu. `changeTab` met à jour cette valeur,
   * et le rendu suivant relit `tabGroups` : l'onglet reste.
   * Réf. ApplicationV2#tabGroups.
   */
  tabGroups = { [TAB_GROUP]: "principal" };

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "sol-nouvelle-ere", "actor", "character"],
    position: { width: 720, height: 800 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { ...itemListActions, rollCharacteristic, stopBreachClock }
  };

  /**
   * Un seul groupe. `_prepareContext` du cœur prépare aussi `context.tabs`
   * dans ce cas ; on le refait explicitement pour le groupe `main`.
   *
   * @override
   */
  static TABS = {
    [TAB_GROUP]: {
      tabs: [
        { id: "principal", label: "SOL.Tab.principal" },
        { id: "inventory", label: "SOL.Tab.inventory" },
        { id: "roleplay", label: "SOL.Tab.roleplay" }
      ],
      initial: "principal"
    }
  };

  /**
   * En-tête et navigation toujours rendus. Chaque onglet est une part
   * dont la racine porte `data-group` et `data-tab`.
   *
   * @override
   */
  static PARTS = {
    header: {
      template: "systems/sol-nouvelle-ere/templates/actor/header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    principal: {
      template: "systems/sol-nouvelle-ere/templates/actor/tab-principal.hbs",
      scrollable: [""],
      templates: PARTIALS
    },
    inventory: {
      template: "systems/sol-nouvelle-ere/templates/actor/tab-inventory.hbs",
      scrollable: [""],
      templates: PARTIALS
    },
    roleplay: {
      template: "systems/sol-nouvelle-ere/templates/actor/tab-roleplay.hbs",
      scrollable: [""],
      templates: PARTIALS
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
    const stored = actor.system._source ?? {};
    context.actor = actor;
    context.docSource = actor._source;
    context.systemSource = stored;
    context.typeLabel = `TYPES.Actor.${actor.type}`;
    // Personnage : base max 60. PNJ : base max 100. Décision Marc 18/10/2026.
    const fieldBounds = actor.system.constructor.characteristicFieldBounds();
    context.bounds = fieldBounds;
    context.characteristics = Object.entries(SOL.characteristics).map(([key, cfg]) => {
      const source = stored.characteristics?.[key] ?? {};
      const prepared = actor.system.characteristics[key];
      return {
        key,
        label: cfg.label,
        abbr: cfg.abbr,
        base: source.base ?? fieldBounds.base.initial,
        origin: source.origin ?? fieldBounds.origin.initial,
        advance: source.advance ?? fieldBounds.advance.initial,
        temp: source.temp ?? fieldBounds.temp.initial,
        // Seule colonne dérivée : pas un input.
        value: prepared.value,
        path: `system.characteristics.${key}`
      };
    });

    const identityFields = actor.system.schema.fields.identity.fields;
    const identitySource = stored.identity ?? {};
    context.identityMain = prepareFieldGroups(pickFields(identityFields, PRINCIPAL_IDENTITY), identitySource, {
      prefix: "system.identity",
      rootId: context.rootId
    });
    context.identityRoleplay = prepareFieldGroups(pickFields(identityFields, ROLEPLAY_IDENTITY), identitySource, {
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

    const byType = Object.fromEntries(
      prepareSections(actor, [...SLOT_TYPES, ...PRINCIPAL_LISTS, ...INVENTORY_TYPES]).map(section => [section.type, section])
    );
    context.slotSections = SLOT_TYPES.map(type => byType[type]).filter(Boolean);
    context.skillSection = byType.skill;
    context.talentSection = byType.talent;
    context.injurySection = byType.injury;
    const enduranceField = actor.system.schema.fields.endurance;
    context.enduranceGroups = enduranceField
      ? prepareFieldGroups({ endurance: enduranceField }, { endurance: stored.endurance ?? null }, {
        rootId: context.rootId
      })
      : [];
    const con = actor.system.characteristics?.con?.value;
    const endurance = resolveEndurance(stored.endurance ?? null, con);
    context.showEndurance = endurance.max != null;
    context.enduranceCurrent = endurance.current;
    context.enduranceMax = endurance.max;
    const breach = breachContext(actor);
    context.breachText = breach.text;
    context.breachAir = breach.air;
    context.breachStop = breach.stop;
    context.sequelSection = byType.sequel;
    context.inventorySections = INVENTORY_TYPES.map(type => byType[type]).filter(Boolean);

    // Groupe `main`. Le cœur le fait aussi s'il n'y a qu'un groupe ;
    // on le pose ici pour que le gabarit de navigation ait `tabs` et `group`.
    context.group = TAB_GROUP;
    context.tabs = this._prepareTabs(TAB_GROUP);
    return context;
  }

  /**
   * Chaque part d'onglet reçoit `tab` (classe `active` ou non).
   * Réf. https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
   *
   * @override
   * @param {string} partId
   * @param {object} context
   * @param {object} options
   * @returns {Promise<object>}
   */
  async _preparePartContext(partId, context, options) {
    const part = await super._preparePartContext(partId, context, options);
    if ( part.tabs?.[partId] ) part.tab = part.tabs[partId];
    if ( partId === "tabs" ) part.group = TAB_GROUP;
    return part;
  }
}

/**
 * Jet de caractéristique. Le score est l'Actuelle, avant difficulté.
 * Réf. LdR v0.2 §2 et §15.
 *
 * @this {CharacterSheet}
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function rollCharacteristic(event, target) {
  if ( event?.detail > 1 ) return;
  const key = target.closest("[data-characteristic]")?.dataset.characteristic;
  const cfg = SOL.characteristics[key];
  if ( !cfg ) return;
  const label = characteristicRollLabel(cfg, text => game.i18n.localize(text));
  if ( !label ) return;
  const actor = this.document;
  const score = actor.system.characteristics[key]?.value ?? 0;
  await performRoll({ actor, label, score, type: "characteristic" });
}

/**
 * Sous-ensemble du schéma, dans l'ordre des clés demandées.
 *
 * @param {Record<string, foundry.data.fields.DataField>} schemaFields
 * @param {string[]} keys
 * @returns {Record<string, foundry.data.fields.DataField>}
 */
function pickFields(schemaFields, keys) {
  const picked = {};
  for ( const key of keys ) {
    if ( schemaFields[key] ) picked[key] = schemaFields[key];
  }
  return picked;
}
