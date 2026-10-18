/**
 * Lance un D100 et poste la carte de discussion.
 *
 * Réf. LdR v0.2 §2, §7 et §15. Pas de ressource narrative, pas de relance
 * (LdR v0.2 §7). L'application des dégâts est dans `apply-damage.mjs` :
 * elle lit les drapeaux posés ici.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html
 * @see https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.renderTemplate.html
 */
import { SOL } from "../config.mjs";
import { formatModifier, hitLocation, resolveD100 } from "./d100.mjs";
import { askRoll } from "./roll-dialog.mjs";

const CARD = "systems/sol-nouvelle-ere/templates/chat/roll-card.hbs";

/**
 * Visibilité de la carte : le mode choisi dans le menu du chat.
 *
 * v14, foundryvtt#8856 : le réglage s'appelle `core.messageMode`.
 * `ChatMessage.applyMode(data)` sans second argument reprend ce réglage
 * (doc : « otherwise apply the default mode stored in client settings »).
 * `game.settings.get("core", "rollMode")` lève : le réglage n'existe plus.
 *
 * v13 : `applyMode` n'existe pas. On retombe sur `applyRollMode` seulement
 * si le réglage `core.rollMode` est encore enregistré.
 *
 * @param {object} chatData
 * @returns {object}
 */
function applyClientVisibility(chatData) {
  // applyMode et applyRollMode modifient chatData. On ne se fie pas à leur
  // valeur de retour : on renvoie l'objet qu'on leur a passé.
  if ( typeof ChatMessage.applyMode === "function" ) {
    ChatMessage.applyMode(chatData);
    return chatData;
  }
  const hasRollMode = game.settings.settings.has("core.rollMode");
  if ( hasRollMode && typeof ChatMessage.applyRollMode === "function" ) {
    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
    return chatData;
  }
  return chatData;
}

/**
 * @param {"success"|"failure"|null} critical
 * @param {boolean} success
 * @returns {string}
 */
function resultKey(critical, success) {
  if ( critical === "success" ) return "SOL.Roll.criticalSuccess";
  if ( critical === "failure" ) return "SOL.Roll.criticalFailure";
  return success ? "SOL.Roll.success" : "SOL.Roll.failure";
}

/**
 * @param {object} params
 * @param {Actor} params.actor
 * @param {string} params.label Ce qui est testé.
 * @param {number} params.score Score avant difficulté.
 * @param {Item|null} [params.weapon] Arme : localisation et dégâts si réussite.
 * @param {"characteristic"|"skill"|"weapon"} [params.type] Pour l'étape dégâts.
 * @returns {Promise<void>}
 */
export async function performRoll({ actor, label, score, weapon = null, type = "characteristic" }) {
  const choice = await askRoll({ title: label, score });
  if ( !choice ) return;

  // Foundry : 1d100 va de 1 à 100. Un 00 physique vaut 100.
  // Décision Marc 18/10/2026.
  const roll = new Roll("1d100");
  await roll.evaluate();
  const outcome = resolveD100(roll.total, choice.target);

  /** @type {object} */
  const card = {
    label,
    score,
    difficultyLabel: choice.difficultyLabel,
    difficultyModifier: formatModifier(choice.difficultyModifier),
    free: formatModifier(choice.free),
    total: formatModifier(choice.modifier),
    target: choice.target,
    // 100 s'affiche « 00 », comme sur les dés.
    die: outcome.die === 100 ? "00" : String(outcome.die).padStart(2, "0"),
    result: game.i18n.localize(resultKey(outcome.critical, outcome.success)),
    resultClass: outcome.critical === "success"
      ? "crit-success"
      : outcome.critical === "failure"
        ? "crit-failure"
        : outcome.success ? "success" : "failure",
    degreeLabel: outcome.success
      ? game.i18n.localize("SOL.Roll.dr")
      : game.i18n.localize("SOL.Roll.de"),
    degree: outcome.success ? outcome.dr : outcome.de,
    location: "",
    damage: null,
    chooseZone: false,
    canApply: false
  };

  /** @type {string|null} */
  let locationKey = null;
  if ( weapon && outcome.success ) {
    locationKey = hitLocation(outcome.die);
    card.location = game.i18n.localize(SOL.bodyLocations[locationKey]);
    // Réf. LdR v0.2 §7 : dégâts fixes de l'arme + DR. Pas de dé de dégâts.
    card.damage = Number(weapon.system.damage ?? 0) + outcome.dr;
    // Décision Marc 18/10/2026 : texte seulement. Le choix de zone est
    // dans la fenêtre d'application, réservée au MJ.
    if ( outcome.critical === "success" ) card.chooseZone = true;
    card.canApply = Number.isFinite(card.damage);
  }

  const content = await foundry.applications.handlebars.renderTemplate(CARD, card);
  // flags : apply-damage.mjs lit la zone et les dégâts sans reparser la carte.
  const messageData = applyClientVisibility({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content,
    sound: CONFIG.sounds.dice,
    flags: {
      "sol-nouvelle-ere": {
        type,
        target: choice.target,
        die: outcome.die,
        success: outcome.success,
        critical: outcome.critical,
        dr: outcome.dr,
        de: outcome.de,
        location: locationKey,
        // Dégâts de l'arme + DR. L'étape d'application s'en sert tels quels.
        damage: card.damage,
        label
      }
    }
  });
  await ChatMessage.create(messageData);
}
