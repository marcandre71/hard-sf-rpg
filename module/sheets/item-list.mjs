/**
 * Liste des objets embarqués, partagée par les feuilles d'acteur.
 *
 * Glisser-déposer : ActorSheetV2 traite les éléments `.draggable` qui ont
 * `data-item-id` (ajout, tri). Le refus d'un type interdit est fait dans
 * `module/guards.mjs` (hook `preCreateItem`), pas ici.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html
 */

/**
 * Contexte Handlebars de la liste : objets déjà sur l'acteur, et types
 * encore proposés à la création (ceux de `CONFIG.SOL.allowedItems`).
 *
 * @param {Actor} actor
 * @returns {{ items: object[], itemTypes: { type: string, label: string }[] }}
 */
export function prepareItemList(actor) {
  const allowed = CONFIG.SOL.allowedItems[actor.type] ?? [];
  const labelOf = type => game.i18n.localize(`TYPES.Item.${type}`);
  const items = actor.items.map(item => ({
    id: item.id,
    name: item.name,
    img: item.img,
    type: item.type,
    typeLabel: labelOf(item.type)
  }));
  items.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel, "fr") || a.name.localeCompare(b.name, "fr"));
  const itemTypes = allowed
    .map(type => ({ type, label: labelOf(type) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return { items, itemTypes };
}

/**
 * Actions `data-action` des gabarits `templates/actor/item-list.hbs`.
 * Foundry appelle ces fonctions avec la feuille comme `this`.
 */
export const itemListActions = { openItem, deleteItem, createItem };

/**
 * Empêche la liste « Créer » de soumettre la fiche.
 *
 * La feuille est un formulaire en `submitOnChange`. Sans ça, changer le
 * type dans la liste enregistrerait l'acteur et réinitialiserait la liste
 * avant le clic sur Créer. À appeler depuis `_onRender`.
 *
 * @param {foundry.applications.api.ApplicationV2} sheet
 * @returns {void}
 */
export function keepItemTypeSelectLocal(sheet) {
  for ( const select of sheet.element?.querySelectorAll("[data-sol-item-type]") ?? [] ) {
    select.addEventListener("change", event => event.stopPropagation());
  }
}

/**
 * Ouvre la feuille de l'objet cliqué.
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
 * Crée un objet du type choisi dans la liste. Le hook `preCreateItem`
 * refuse encore une fois si le type n'est pas autorisé.
 *
 * @param {PointerEvent} event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
async function createItem(event, target) {
  const select = target.closest(".sol-create-item")?.querySelector("select");
  const type = select?.value;
  if ( !type ) return;
  const allowed = CONFIG.SOL.allowedItems[this.document.type] ?? [];
  if ( !allowed.includes(type) ) return;
  const name = game.i18n.localize(`TYPES.Item.${type}`);
  await this.document.createEmbeddedDocuments("Item", [{ name, type }]);
}
