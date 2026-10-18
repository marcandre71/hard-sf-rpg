/**
 * Lance un D100 et poste la carte de discussion.
 *
 * Réf. LdR v0.2 §2, §7 et §15. Pas de ressource narrative, pas de relance
 * (LdR v0.2 §7). Étape suivante, pas ici : armure de la zone, Seuil de
 * blessure, création d'une Blessure, condition « Combinaison percée ».
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
 * Mode de visibilité courant.
 * `core.rollMode` est la valeur choisie ; `CONFIG.Dice.rollModes` en
 * liste les clés. En v14, `ChatMessage.applyMode` attend `public`,
 * `gm`, `blind` ou `self`. `Roll._mapLegacyRollMode` traduit les
 * anciennes clés (`publicroll`, …) tant qu'elle existe.
 *
 * @returns {string|undefined}
 */
function currentMessageMode() {
  const stored = game.settings.get("core", "rollMode");
  // Clés historiques de CONFIG.Dice.rollModes, et clés v14 de applyMode.
  const modes = {
    publicroll: "public",
    gmroll: "gm",
    blindroll: "blind",
    selfroll: "self",
    public: "public",
    gm: "gm",
    blind: "blind",
    self: "self"
  };
  if ( stored && modes[stored] ) return modes[stored];
  return stored || undefined;
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
 * @returns {Promise<void>}
 */
export async function performRoll({ actor, label, score, weapon = null }) {
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
      ? "critical-success"
      : outcome.critical === "failure"
        ? "critical-failure"
        : outcome.success ? "success" : "failure",
    degreeLabel: outcome.success
      ? game.i18n.localize("SOL.Roll.dr")
      : game.i18n.localize("SOL.Roll.de"),
    degree: outcome.success ? outcome.dr : outcome.de,
    location: "",
    damage: null,
    chooseZone: false
  };

  if ( weapon && outcome.success ) {
    const zone = hitLocation(outcome.die);
    card.location = game.i18n.localize(SOL.bodyLocations[zone]);
    // Réf. LdR v0.2 §7 : dégâts fixes de l'arme + DR. Pas de dé de dégâts.
    card.damage = Number(weapon.system.damage ?? 0) + outcome.dr;
    // Décision Marc 18/10/2026 : texte seulement, pas de choix de zone.
    if ( outcome.critical === "success" ) card.chooseZone = true;
  }

  const content = await foundry.applications.handlebars.renderTemplate(CARD, card);
  const messageData = ChatMessage.applyMode({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content
  }, currentMessageMode());
  await ChatMessage.create(messageData);
}
