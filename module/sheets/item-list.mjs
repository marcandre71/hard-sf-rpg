/**
 * Listes d'objets embarqués, partagées par les feuilles d'acteur.
 *
 * Une section = un type : titre, lignes (nom cliquable, 1 à 3 champs
 * en lecture seule, modifier, retirer), bouton « Créer » de ce type.
 * Le score d'une compétence n'est pas calculé. Réf. consigne étape 3,
 * Fiche v0.2 §4.
 *
 * Glisser-déposer : ActorSheetV2 traite les éléments `.draggable` qui ont
 * `data-item-id`. Le refus d'un type interdit est fait dans
 * `module/guards.mjs` (hook `preCreateItem`), pas ici.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 */
import { SOL } from "../config.mjs";

/**
 * Titre de section et phrase vide, par type d'objet.
 * La clé du code est le type ; le libellé français est souvent au pluriel.
 */
const SECTION_TEXT = {
  origin: { title: "SOL.Section.origin", empty: "SOL.Empty.origin" },
  background: { title: "SOL.Section.background", empty: "SOL.Empty.background" },
  profession: { title: "SOL.Section.profession", empty: "SOL.Empty.profession" },
  skill: { title: "SOL.Section.skill", empty: "SOL.Empty.skill" },
  talent: { title: "SOL.Section.talent", empty: "SOL.Empty.talent" },
  injury: { title: "SOL.Section.injury", empty: "SOL.Empty.injury" },
  sequel: { title: "SOL.Section.sequel", empty: "SOL.Empty.sequel" },
  weapon: { title: "SOL.Section.weapon", empty: "SOL.Empty.weapon" },
  armor: { title: "SOL.Section.armor", empty: "SOL.Empty.armor" },
  gear: { title: "SOL.Section.gear", empty: "SOL.Empty.gear" },
  augmentation: { title: "SOL.Section.augmentation", empty: "SOL.Empty.augmentation" },
  substance: { title: "SOL.Section.substance", empty: "SOL.Empty.substance" },
  software: { title: "SOL.Section.software", empty: "SOL.Empty.software" },
  shipModule: { title: "SOL.Section.shipModule", empty: "SOL.Empty.shipModule" }
};

/**
 * Libellé d'un choix (clé i18n), ou la valeur brute si elle n'est pas dans la liste.
 *
 * @param {Record<string, string>|undefined} choices
 * @param {string} key
 * @returns {string}
 */
function choiceLabel(choices, key) {
  const i18nKey = choices?.[key];
  if ( !i18nKey ) return key ? String(key) : "";
  return game.i18n.localize(i18nKey);
}

/**
 * Champs affichés en lecture seule sur la ligne. Pas de français en dur :
 * `label` est une clé i18n, `value` est déjà le texte à montrer.
 *
 * @param {Item} item
 * @returns {{ label: string, value: string|number }[]}
 */
function itemFields(item) {
  const source = item.system._source ?? {};
  switch ( item.type ) {
    case "skill": {
      // Pas de score : nom, abréviation de caractéristique, formation. Réf. consigne étape 3.
      const abbrKey = SOL.characteristics[source.characteristic]?.abbr;
      return [
        { label: "SOL.Skill.characteristic", value: abbrKey ? game.i18n.localize(abbrKey) : "" },
        { label: "SOL.Skill.training", value: source.training ?? 0 }
      ];
    }
    case "talent":
      return [{ label: "SOL.Talent.xpCost", value: source.xpCost ?? 0 }];
    case "weapon":
      return [
        { label: "SOL.Weapon.damage", value: source.damage ?? 0 },
        { label: "SOL.Weapon.range.label", value: choiceLabel(SOL.weaponRanges, source.range) }
      ];
    case "armor":
      // Protection du torse seulement : un repère, pas le détail des six zones.
      return [{ label: "SOL.Location.torso", value: source.protection?.torso ?? 0 }];
    case "gear":
      return [{ label: "SOL.Gear.quantity", value: source.quantity ?? 0 }];
    case "augmentation":
      return [{ label: "SOL.Augmentation.kind.label", value: choiceLabel(SOL.augmentationKinds, source.kind) }];
    case "injury":
      return [
        { label: "SOL.Injury.location", value: choiceLabel(SOL.bodyLocations, source.location) },
        { label: "SOL.Injury.severity.label", value: choiceLabel(SOL.injurySeverities, source.severity) }
      ];
    case "sequel":
      return [{ label: "SOL.Sequel.category.label", value: choiceLabel(SOL.sequelCategories, source.category) }];
    case "shipModule":
      return [
        { label: "SOL.ShipModule.category", value: source.category ?? "" },
        { label: "SOL.ShipModule.state", value: source.state ?? "" }
      ];
    default:
      // Substance et logiciel : description seulement, rien à résumer sur la ligne.
      return [];
  }
}

/**
 * Ligne prête pour le gabarit.
 *
 * @param {Item} item
 * @returns {{ id: string, name: string, img: string, type: string, fields: { label: string, value: string|number }[] }}
 */
function presentItem(item) {
  return {
    id: item.id,
    name: item.name,
    img: item.img,
    type: item.type,
    fields: itemFields(item)
  };
}

/**
 * Sections dans l'ordre demandé. Un type autorisé apparaît même vide
 * (le bouton Créer). Un type déjà posé mais plus autorisé reste visible,
 * sans bouton Créer.
 *
 * Origine, Milieu et Profession : pas de second Créer si l'acteur n'en
 * a droit qu'à un (le hook refuserait de toute façon).
 *
 * @param {Actor} actor
 * @param {string[]} [types] Ordre des sections. Défaut : `SOL.itemTypes`.
 * @returns {{ type: string, title: string, empty: string, canCreate: boolean, items: object[] }[]}
 */
export function prepareSections(actor, types = SOL.itemTypes) {
  const allowed = new Set(SOL.allowedItems[actor.type] ?? []);
  const grouped = new Map();
  for ( const item of actor.items ) {
    const list = grouped.get(item.type) ?? [];
    list.push(presentItem(item));
    grouped.set(item.type, list);
  }
  for ( const list of grouped.values() ) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  const uniqueActor = SOL.uniqueItemActors.includes(actor.type);
  const uniqueTypes = new Set(SOL.uniqueOnCharacter);

  return types
    .filter(type => allowed.has(type) || grouped.has(type))
    .map(type => {
      const items = grouped.get(type) ?? [];
      const unique = uniqueActor && uniqueTypes.has(type);
      const text = SECTION_TEXT[type] ?? { title: `TYPES.Item.${type}`, empty: "SOL.Sheet.NoItems" };
      return {
        type,
        title: text.title,
        empty: text.empty,
        canCreate: allowed.has(type) && !(unique && items.length > 0),
        items
      };
    });
}

/**
 * Actions `data-action` des gabarits de liste.
 * Foundry appelle ces fonctions avec la feuille comme `this`.
 */
export const itemListActions = { openItem, deleteItem, createItem };

/**
 * Ouvre la feuille de l'objet cliqué (le nom, ou le bouton Modifier).
 *
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function openItem(event, target) {
  const id = target.closest("[data-item-id]")?.dataset.itemId;
  const item = this.document.items.get(id);
  if ( item ) await item.sheet.render({ force: true });
}

/**
 * Retire l'objet de l'acteur, après confirmation.
 *
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function deleteItem(event, target) {
  const id = target.closest("[data-item-id]")?.dataset.itemId;
  const item = this.document.items.get(id);
  if ( !item ) return;
  const name = foundry.utils.escapeHTML(item.name);
  const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("SOL.Sheet.DeleteItem") },
    content: `<p>${game.i18n.format("SOL.Sheet.ConfirmDelete", { name })}</p>`,
    rejectClose: false,
    modal: true
  });
  if ( proceed ) await item.delete();
}

/**
 * Crée un objet du type porté par le bouton (`data-item-type`).
 * Le hook `preCreateItem` refuse encore une fois si le type n'est pas autorisé.
 *
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function createItem(event, target) {
  const type = target.dataset.itemType || target.closest("[data-item-type]")?.dataset.itemType;
  if ( !type ) return;
  const allowed = CONFIG.SOL.allowedItems[this.document.type] ?? [];
  if ( !allowed.includes(type) ) return;
  const name = game.i18n.localize(`TYPES.Item.${type}`);
  await this.document.createEmbeddedDocuments("Item", [{ name, type }]);
}
