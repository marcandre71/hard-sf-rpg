/**
 * Poser une Rustine, ou une autre méthode du registre.
 *
 * Réf. LdR v0.2 §7 et §8. Au calme : pas de test. Sous le feu :
 * la fenêtre de jet habituelle. // À confirmer par Marc : Survie
 * ou « Systèmes de survie ». En attendant, Survie par l'id du
 * compendium, pas le nom. Difficulté normale.
 * Le MJ peut changer la compétence et la difficulté. « Test simple »
 * du LdR s'oppose au test prolongé, ce n'est pas la difficulté Aisée.
 * Réussite : la condition Combinaison percée part, l'horloge s'arrête,
 * la quantité baisse d'un. Les armures équipées encore marquées
 * percées repassent intactes. Un message part au MJ.
 * // Décision Marc 20/10/2026 : un échec ne consomme pas l'objet.
 * Décision Marc 20/10/2026 : le propriétaire de la fiche peut ouvrir
 * la fenêtre, pas seulement le MJ.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 */
import { SOL } from "../config.mjs";
import { performRoll } from "./chat.mjs";
import { canSeal, findSealMethod, pickSealSkillId } from "./seal.mjs";
import { skillScore } from "./skill-score.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const SUIT = "sol-nouvelle-ere.suitBreach";

/**
 * @param {Actor} actor
 * @param {HTMLElement} target
 * @returns {Promise<void>}
 */
export async function applySealAction(actor, target) {
  const id = target.closest("[data-item-id]")?.dataset.itemId;
  const item = actor?.items?.get(id);
  if ( !item || item.type !== "gear" ) return;
  if ( !findSealMethod(item.name, SOL.sealMethods) ) return;
  if ( game.user?.isGM !== true && actor.isOwner !== true ) return;
  if ( !canSeal(item.system?.quantity) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Seal.empty"));
    return;
  }
  if ( !hasBreach(actor) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Seal.noBreach"));
    return;
  }
  const mode = await askMode();
  if ( mode === "calm" ) {
    await sealNow(actor, item);
    return;
  }
  if ( mode !== "fire" ) return;
  const skill = await askSkill(actor);
  if ( !skill ) return;
  const rated = skillScore(actor.system?.characteristics, skill.system ?? {});
  if ( rated.impossible || typeof rated.score !== "number" ) {
    ui.notifications.warn(game.i18n.format("SOL.Seal.impossible", { name: skill.name }));
    return;
  }
  // Décision Marc 20/10/2026 : pas de choix préparé. La fenêtre
  // s'ouvre sur la difficulté normale, le MJ peut la changer.
  const outcome = await performRoll({
    actor,
    label: skill.name,
    score: rated.score,
    type: "skill"
  });
  if ( !outcome ) return;
  // Décision Marc 20/10/2026 : l'échec laisse la quantité et la brèche.
  if ( !outcome.success ) {
    ui.notifications.info(game.i18n.localize("SOL.Seal.failed"));
    return;
  }
  await sealNow(actor, item);
}

/**
 * @param {Actor} actor
 * @returns {boolean}
 */
function hasBreach(actor) {
  if ( actorHasStatus(actor, SUIT) ) return true;
  for ( const item of actor.items ?? [] ) {
    if ( item.type === "armor" && item.system?.equipped === true && item.system.sealState === "breached" ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<void>}
 */
async function sealNow(actor, item) {
  await repairBreach(actor);
  const quantity = Number(item.system?.quantity);
  const next = Number.isFinite(quantity) ? Math.max(0, quantity - 1) : 0;
  await item.update({ "system.quantity": next });
}

/**
 * Même effet qu'une Rustine réussie, sans consommer d'objet.
 * Joints remis à Intacte à la main, ou réussite du test.
 * `solSealApply` empêche le hook des joints de relancer ce passage.
 *
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function repairBreach(actor) {
  const updates = [];
  for ( const piece of actor.items ?? [] ) {
    if ( piece.type !== "armor" || piece.system?.equipped !== true ) continue;
    if ( piece.system.sealState !== "breached" ) continue;
    updates.push({ _id: piece.id, "system.sealState": "intact" });
  }
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates, { solSealApply: true });
  if ( actorHasStatus(actor, SUIT) ) await actor.toggleStatusEffect(SUIT, { active: false });
  if ( actor.getFlag(SYSTEM_ID, "breachClock") ) await actor.unsetFlag(SYSTEM_ID, "breachClock");
  await postSeal(actor);
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function postSeal(actor) {
  const whisper = (game.users ?? []).filter(user => user.isGM).map(user => user.id);
  const body = foundry.utils.escapeHTML(game.i18n.format("SOL.Seal.done", { name: actor.name }));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p>${body}</p>`,
    whisper
  });
}

/**
 * @returns {Promise<string|null>}
 */
async function askMode() {
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SOL.Seal.title") },
    classes: ["sol", "sol-nouvelle-ere"],
    content: `<p>${foundry.utils.escapeHTML(game.i18n.localize("SOL.Seal.prompt"))}</p>`,
    buttons: [
      { action: "calm", label: game.i18n.localize("SOL.Seal.calm") },
      { action: "fire", label: game.i18n.localize("SOL.Seal.fire") },
      { action: "cancel", label: game.i18n.localize("SOL.Seal.cancel"), default: true }
    ],
    rejectClose: false
  });
  return result === "calm" || result === "fire" ? result : null;
}

/**
 * @param {Actor} actor
 * @returns {Promise<Item|null>}
 */
async function askSkill(actor) {
  const skills = [];
  for ( const item of actor.items ?? [] ) {
    if ( item.type === "skill" ) skills.push(item);
  }
  skills.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  if ( !skills.length ) {
    ui.notifications.warn(game.i18n.localize("SOL.Seal.noSkill"));
    return null;
  }
  const escape = foundry.utils.escapeHTML;
  // À confirmer par Marc : Survie ou « Systèmes de survie ».
  // En attendant, Survie est présélectionnée par son id.
  const preferred = pickSealSkillId(skills, SOL.sealSkillId);
  const note = preferred ? "" : `<p>${escape(game.i18n.localize("SOL.Seal.noSurvie"))}</p>`;
  const options = skills.map(skill => {
    const selected = skill.id === preferred ? " selected" : "";
    return `<option value="${escape(skill.id)}"${selected}>${escape(skill.name)}</option>`;
  }).join("");
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SOL.Seal.fire") },
    classes: ["sol", "sol-nouvelle-ere"],
    content: `${note}<label>${escape(game.i18n.localize("SOL.Seal.skill"))}
      <select name="skill">${options}</select></label>`,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("SOL.Seal.roll"),
        default: true,
        callback: (_event, button) => button.form?.elements?.skill?.value ?? null
      },
      { action: "cancel", label: game.i18n.localize("SOL.Seal.cancel") }
    ],
    rejectClose: false
  });
  if ( !result || result === "cancel" || result === "roll" ) return null;
  return actor.items.get(result) ?? null;
}

/**
 * @param {Actor|null|undefined} actor
 * @param {string} id
 * @returns {boolean}
 */
function actorHasStatus(actor, id) {
  if ( !actor ) return false;
  if ( typeof actor.statuses?.has === "function" && actor.statuses.has(id) ) return true;
  const effects = actor.effects;
  if ( !effects ) return false;
  for ( const effect of effects ) {
    const statuses = effect?.statuses;
    if ( !statuses ) continue;
    if ( typeof statuses.has === "function" && statuses.has(id) ) return true;
    if ( Array.isArray(statuses) && statuses.includes(id) ) return true;
  }
  return false;
}
