/**
 * Feuille du Vaisseau (ApplicationV2). Une seule pour tout.
 *
 * Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §2.
 * Onglets : Général, Sections & modules, Postes, Notes.
 * Tout est visible et modifiable par le propriétaire (le MJ, sur ses fiches).
 * Objet fixe : propulsion et delta-v grisés, les valeurs restent stockées.
 * Jets de poste : 0.7.2. Réf. Vaisseaux v0.1 §3.
 * Décision Marc 23/10/2026 : initiative dans le Combat Tracker.
 * Un acteur encore dans un compendium ne tient pas un poste.
 *
 * Le glisser-déposer d'un personnage sur un poste écrit `actorUuid`.
 * Un module se déplace de section depuis cette fiche (pas de `name` sur
 * ces champs : sinon le formulaire de l'acteur les avalerait).
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 * @see https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html
 */
import { SOL } from "../config.mjs";
import {
  NPC_CREW_SCORES,
  REACTOR_HEAT_MAX,
  SHIP_POST_IDS,
  armorBonus,
  displayedArmor,
  followedRadiatorIntegrity,
  parsedNumber,
  sectionHasPlate
} from "../ships/hull.mjs";
import { POST_ACTIONS, clearShipLock, readLock, rollPostAction } from "../ships/actions.mjs";
import { duplicateActors } from "../ships/combat.mjs";
import { itemListActions, prepareSections } from "./item-list.mjs";
import { dragData } from "./states.mjs";
import { prepareFieldGroups } from "./prepare-fields.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Groupe d'onglets. */
const TAB_GROUP = "main";

/** Objets encore autorisés sur un vaisseau, hors modules (Fiche v0.2 §4). */
const OTHER_ITEMS = ["weapon", "armor", "gear", "software"];

const PARTIALS = [
  "systems/sol-nouvelle-ere/templates/shared/field-groups.hbs",
  "systems/sol-nouvelle-ere/templates/actor/item-section.hbs"
];

/**
 * @see https://foundryvtt.com/api/v14/interfaces/foundry.applications.types.ApplicationTabsConfiguration.html
 */
export class ShipSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** @override */
  tabGroups = { [TAB_GROUP]: "general" };

  /** Annule l'écoute du rendu précédent. */
  #changeAbort = null;

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sol", "sol-nouvelle-ere", "actor", "ship"],
    position: { width: 760, height: 860 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { ...itemListActions, clearPost, rollPost, clearLock }
  };

  /** @override */
  static TABS = {
    [TAB_GROUP]: {
      tabs: [
        { id: "general", label: "SOL.Tab.shipGeneral" },
        { id: "sections", label: "SOL.Tab.shipSections" },
        { id: "posts", label: "SOL.Tab.shipPosts" },
        { id: "notes", label: "SOL.Tab.shipNotes" }
      ],
      initial: "general"
    }
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/sol-nouvelle-ere/templates/actor/header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    general: {
      template: "systems/sol-nouvelle-ere/templates/actor/ship-tab-general.hbs",
      scrollable: [""],
      templates: PARTIALS
    },
    sections: {
      template: "systems/sol-nouvelle-ere/templates/actor/ship-tab-sections.hbs",
      scrollable: [""],
      templates: PARTIALS
    },
    posts: {
      template: "systems/sol-nouvelle-ere/templates/actor/ship-tab-posts.hbs",
      scrollable: [""]
    },
    notes: {
      template: "systems/sol-nouvelle-ere/templates/actor/ship-tab-notes.hbs",
      scrollable: [""]
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
    const fields = actor.system.schema.fields;
    context.actor = actor;
    context.docSource = actor._source;
    context.systemSource = stored;
    context.typeLabel = `TYPES.Actor.${actor.type}`;
    context.fixed = stored.category === "fixed";
    context.heatMax = REACTOR_HEAT_MAX;
    context.departureMass = actor.system.departureMass;

    const groupsOf = (keys) => prepareFieldGroups(pickFields(fields, keys), stored, {
      prefix: "system",
      rootId: context.rootId
    });
    context.categoryGroups = groupsOf(["category"]);
    context.rangeGroups = groupsOf(["range"]);
    context.identityGroups = groupsOf(["identity"]);
    context.massGroups = groupsOf(["mass"]);
    context.propulsionGroups = groupsOf(["propulsion"]);
    if ( context.fixed ) {
      for ( const group of context.propulsionGroups ) {
        group.inert = true;
        group.hint = "SOL.Ship.propulsion.fixedHint";
        for ( const line of group.rows ) {
          line.disabled = true;
          line.hint = "SOL.Ship.propulsion.fixedHint";
        }
      }
    }
    context.reserveGroups = groupsOf(["reserves"]);
    context.heatGroups = groupsOf(["heat"]);
    context.spareGroups = groupsOf(["spareParts"]);

    context.shipTypeGroups = SOL.shipTypeGroups.map(group => ({
      label: group.label,
      types: group.types.map(type => ({
        id: type.id,
        label: type.label,
        selected: type.id === stored.shipType
      }))
    }));
    context.shipTypeIsOther = stored.shipType === "other";
    context.shipTypeOther = stored.shipTypeOther ?? "";

    const npc = stored.npcCrew ?? "trained";
    context.npcCrewOptions = Object.keys(SOL.npcCrewLevels).map(id => ({
      id,
      label: SOL.npcCrewLevels[id],
      score: NPC_CREW_SCORES[id],
      selected: id === npc
    }));
    context.npcScore = NPC_CREW_SCORES[npc] ?? "";

    context.sections = presentSections(actor, stored);
    context.posts = presentPosts(actor, stored);
    context.lock = presentLock(actor, this.token);
    context.otherSections = prepareSections(actor, OTHER_ITEMS);

    const labelOf = field => field.label ?? field.options?.label ?? "";
    context.description = {
      field: fields.description,
      label: labelOf(fields.description),
      value: stored.description ?? ""
    };
    context.notes = {
      field: fields.notes,
      label: labelOf(fields.notes),
      value: stored.notes ?? ""
    };

    context.group = TAB_GROUP;
    context.tabs = this._prepareTabs(TAB_GROUP);
    return context;
  }

  /**
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

  /**
   * Les champs de module n'ont pas de `name`. On les écrit sur l'objet
   * avant que le formulaire de l'acteur ne parte (écoute en capture).
   *
   * @override
   * @param {object} context
   * @param {object} options
   * @returns {Promise<void>}
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#changeAbort?.abort();
    this.#changeAbort = new AbortController();
    this.element.addEventListener("change", event => {
      const input = event.target;
      if ( !input?.dataset?.field ) return;
      event.stopPropagation();
      void this.#updateModule(input);
    }, { capture: true, signal: this.#changeAbort.signal });
  }

  /**
   * Personnage (ou PNJ) déposé sur un poste. Le reste suit le cœur,
   * y compris un module glissé depuis le compendium.
   *
   * `_onDropDocument` ne reçoit pas un journal. On n'en a pas besoin ici :
   * la fiche vaisseau n'a pas de section États.
   *
   * @override
   * @param {DragEvent} event
   * @returns {Promise<void>}
   * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html#_onDropDocument
   */
  async _onDrop(event) {
    const data = dragData(event);
    const postId = event.target?.closest?.("[data-post]")?.dataset?.post;
    if ( postId && data?.type === "Actor" ) {
      await assignPost(this.document, postId, data.uuid);
      return;
    }
    return super._onDrop(event);
  }

  /**
   * @param {HTMLElement} input
   * @returns {Promise<void>}
   */
  async #updateModule(input) {
    const id = input.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(id);
    if ( !item || item.type !== "shipModule" ) return;
    const field = input.dataset.field;
    if ( !field ) return;
    if ( input.type === "number" ) {
      const parsed = parsedNumber(input.value);
      if ( parsed === null ) return;
      await item.update({ [field]: parsed });
      return;
    }
    await item.update({ [field]: input.value });
  }
}

/**
 * Sections et modules installés, avec la plaque calculée.
 *
 * @param {Actor} actor
 * @param {object} stored
 * @returns {object[]}
 */
function presentSections(actor, stored) {
  const items = actor.items.filter(item => item.type === "shipModule");
  const raw = items.map(item => ({
    name: item.name,
    category: item.system.category,
    section: item.system.section,
    armorPoints: item.system._source?.armorPoints,
    integrity: item.system._source?.integrity,
    condition: item.system.condition
  }));
  const followed = followedRadiatorIntegrity(raw);
  return SOL.shipSectionOrder.map(id => {
    const source = stored.sections?.[id] ?? {};
    const plate = source.armor?.value ?? 0;
    const hasPlate = sectionHasPlate(id);
    return {
      id,
      label: SOL.shipSections[id],
      hasPlate,
      integrityValue: source.integrity?.value ?? 0,
      integrityMax: source.integrity?.max ?? 0,
      armorValue: source.armor?.value ?? 0,
      armorMax: source.armor?.max ?? 0,
      armorBonus: hasPlate ? armorBonus(raw, id) : 0,
      displayedArmor: displayedArmor(id, plate, raw),
      followed: id === "radiators"
        ? followed.map(mod => ({
          ...mod,
          conditionLabel: SOL.shipModuleConditions[mod.condition] ?? mod.condition
        }))
        : [],
      modules: items
        .filter(item => item.system.section === id)
        .map(item => presentModule(item))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    };
  });
}

/**
 * @param {Item} item
 * @returns {object}
 */
function presentModule(item) {
  const source = item.system._source ?? {};
  const condition = item.system.condition;
  return {
    id: item.id,
    name: item.name,
    img: item.img,
    categoryLabel: SOL.shipModuleCategories[source.category] ?? source.category,
    condition,
    conditionLabel: SOL.shipModuleConditions[condition] ?? condition,
    degraded: condition === "degraded",
    integrityValue: source.integrity?.value ?? 0,
    integrityMax: source.integrity?.max ?? 0,
    mass: source.mass ?? 0,
    showArmor: source.category === "armor",
    armorPoints: source.armorPoints ?? 0,
    sections: SOL.shipSectionOrder.map(id => ({
      id,
      label: SOL.shipSections[id],
      selected: id === source.section
    }))
  };
}

/**
 * @param {Actor} actor
 * @param {object} stored
 * @returns {object[]}
 */
function presentPosts(actor, stored) {
  const score = NPC_CREW_SCORES[stored.npcCrew] ?? "";
  const rows = SOL.shipPostOrder.map(id => ({
    id,
    uuid: stored.posts?.[id]?.actorUuid ?? ""
  }));
  const doubled = new Set(duplicateActors(rows));
  return rows.map(row => {
    let name = "";
    if ( row.uuid && typeof foundry?.utils?.fromUuidSync === "function" ) {
      try {
        name = foundry.utils.fromUuidSync(row.uuid)?.name ?? "";
      } catch {
        name = "";
      }
    }
    return {
      id: row.id,
      label: SOL.shipPosts[row.id],
      uuid: row.uuid,
      name,
      empty: row.uuid === "",
      npcScore: score,
      unresolved: row.uuid !== "" && name === "",
      duplicate: row.uuid !== "" && doubled.has(row.uuid),
      actions: (POST_ACTIONS[row.id] ?? []).map(action => ({
        id: action,
        label: `SOL.Space.action.${action}`
      }))
    };
  });
}

/**
 * @param {DragEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function clearPost(event, target) {
  const postId = target.closest("[data-post]")?.dataset.post;
  if ( !SOL.shipPosts[postId] ) return;
  await this.document.update({ [`system.posts.${postId}.actorUuid`]: "" });
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string|undefined} uuid
 * @returns {Promise<void>}
 */
async function assignPost(ship, postId, uuid) {
  if ( !SOL.shipPosts[postId] || !uuid ) return;
  const dropped = await foundry.utils.fromUuid(uuid);
  if ( !dropped || dropped.documentName !== "Actor" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.post.notCrew"));
    return;
  }
  if ( dropped.pack ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.post.fromPack"));
    return;
  }
  // Décision Marc 21/10/2026 : un PNJ peut tenir un poste.
  if ( dropped.type !== "character" && dropped.type !== "npc" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.post.notCrew"));
    return;
  }
  if ( dropped.uuid === ship.uuid ) return;
  const posts = SHIP_POST_IDS.map(id => ({
    id,
    uuid: id === postId ? dropped.uuid : (ship.system._source?.posts?.[id]?.actorUuid ?? "")
  }));
  if ( duplicateActors(posts).includes(dropped.uuid) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.duplicate"));
  }
  await ship.update({ [`system.posts.${postId}.actorUuid`]: dropped.uuid });
}

/**
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function rollPost(event, target) {
  if ( event?.detail > 1 ) return;
  const postId = target.closest("[data-post]")?.dataset.post;
  const action = target.dataset.spaceAction;
  await rollPostAction(this.document, postId, action, this.token);
  if ( action === "lock" ) this.render();
}

/**
 * @returns {Promise<void>}
 */
async function clearLock() {
  await clearShipLock(this.document, this.token);
  this.render();
}

/**
 * @param {Actor} actor
 * @param {TokenDocument|null} token
 * @returns {{ uuid: string, name: string, gm: boolean }}
 */
function presentLock(actor, token) {
  const lock = readLock(actor, token);
  const name = lock.name || game.i18n.localize("SOL.Space.lockedUnknown");
  return { uuid: lock.uuid, name, gm: game.user?.isGM === true };
}

/**
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
