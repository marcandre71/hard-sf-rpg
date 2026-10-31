/**
 * Portrait cliquable, sur toutes les fiches d'acteur.
 *
 * Décision Marc 31/10/2026. L'action ApplicationV2 `editImage` ouvre
 * le FilePicker v14 et écrit le chemin dans `img`.
 * `document.update` relance le rendu de la fiche : pas de rechargement
 * de page. Un objet incorporé (munition, module) met déjà à jour la
 * fiche parente : Foundry rend les `apps` du parent. On n'ajoute pas
 * un second rendu.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.apps.FilePicker.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
 */

/**
 * @this {foundry.applications.sheets.ActorSheetV2}
 * @param {PointerEvent} _event
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function editImage(_event, target) {
  if ( !this.isEditable ) return;
  const attr = target?.dataset?.edit || "img";
  const current = foundry.utils.getProperty(this.document._source, attr) ?? "";
  const picker = new foundry.applications.apps.FilePicker.implementation({
    type: "image",
    current,
    callback: path => {
      void this.document.update({ [attr]: path });
    }
  });
  await picker.browse();
}
