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
import { struckZone } from "./attack.mjs";
import { cappedModifier, formatModifier, resolveD100, rollModifier } from "./d100.mjs";
import { askRoll } from "./roll-dialog.mjs";
import { statusRollModifiers, statusSituation } from "./status-mods.mjs";

const CARD = "systems/sol-nouvelle-ere/templates/chat/roll-card.hbs";

/** Clés v13 (`publicroll`) et v14 (`public`). */
const TO_V14 = { publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self" };
const TO_V13 = { public: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll" };

/**
 * Correspondance des modes de carte. Sans ça, `public` en v13
 * (`applyRollMode`) part en chuchotement aux MJ.
 *
 * @param {string|null|undefined} mode
 * @param {"v13"|"v14"} target
 * @returns {string|null}
 */
export function mapMessageMode(mode, target) {
  if ( typeof mode !== "string" || !mode ) return null;
  const table = target === "v13" ? TO_V13 : TO_V14;
  return table[mode] ?? mode;
}

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
 * @param {string|null} [mode] Clé de `CONFIG.ChatMessage.modes`. Sans mode, le réglage du client.
 * @returns {object}
 */
function applyClientVisibility(chatData, mode = null) {
  // applyMode et applyRollMode modifient chatData. On ne se fie pas à leur
  // valeur de retour : on renvoie l'objet qu'on leur a passé.
  // Doc v14 : applyMode(chatData, mode). `gm` chuchote aux MJ.
  if ( typeof ChatMessage.applyMode === "function" ) {
    const mapped = mapMessageMode(mode, "v14");
    if ( mapped ) ChatMessage.applyMode(chatData, mapped);
    else ChatMessage.applyMode(chatData);
    return chatData;
  }
  const hasRollMode = game.settings.settings.has("core.rollMode");
  const rollMode = mapMessageMode(mode, "v13")
    ?? (hasRollMode ? game.settings.get("core", "rollMode") : null);
  if ( rollMode && typeof ChatMessage.applyRollMode === "function" ) {
    ChatMessage.applyRollMode(chatData, rollMode);
    return chatData;
  }
  return chatData;
}

/**
 * Visibilité demandée pour cette carte.
 * Un mode explicite gagne. Sinon `messageOptions.messageMode` ou
 * `messageOptions.rollMode`. Sinon null : le réglage du client,
 * sauf si `messageOptions` a déjà `whisper` ou `blind`.
 *
 * @param {{ messageMode?: string|null, messageOptions?: object|null }} options
 * @returns {string|null}
 */
function requestedMode({ messageMode, messageOptions }) {
  if ( typeof messageMode === "string" && messageMode ) return messageMode;
  const fromOptions = messageOptions?.messageMode ?? messageOptions?.rollMode;
  if ( typeof fromOptions === "string" && fromOptions ) return fromOptions;
  return null;
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
 * @param {"characteristic"|"skill"|"weapon"|"initiative"} [params.type] Pour l'étape dégâts.
 * @param {object|null} [params.choice] Déjà choisi : pas de fenêtre (jets groupés).
 * @param {string} [params.note] Rappel déjà traduit, sous le résultat.
 * @param {(outcome: { success: boolean, dr: number, de: number }) => string} [params.noteFor] Rappel selon le résultat.
 * @param {number} [params.suggested] Modificateur libre proposé. Le MJ peut le changer.
 * @param {boolean} [params.shipPost] Poste de vaisseau : pas de plafond ±50. Décision Marc 25/10/2026.
 * @param {object|null} [params.shipStrike] Tir de vaisseau qui touche : bouton du MJ, pas les dégâts de personnage.
 * @param {string|null} [params.messageMode] Clé de `CONFIG.ChatMessage.modes`.
 * @param {object|null} [params.messageOptions] Champs ajoutés à la carte (`whisper`, `blind`, …).
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, critical: "success"|"failure"|null, die: number, target: number }>}
 */
export async function performRoll({
  actor,
  label,
  score,
  weapon = null,
  type = "characteristic",
  choice = null,
  note = "",
  noteFor = null,
  suggested = 0,
  shipPost = false,
  shipStrike = null,
  messageMode = null,
  messageOptions = null
}) {
  const statusModifier = statusSituation(actorStatusIds(actor));
  const picked = choice
    ? stampStatus(choice, score, statusModifier, shipPost)
    : await askRoll({ title: label, score, attack: Boolean(weapon), statusModifier, free: suggested, shipPost });
  if ( !picked ) return null;

  // Foundry : 1d100 va de 1 à 100. Un 00 physique vaut 100.
  // Décision Marc 18/10/2026.
  const roll = new Roll("1d100");
  await roll.evaluate();
  const outcome = resolveD100(roll.total, picked.target);

  /** @type {object} */
  const card = {
    label,
    score,
    difficultyLabel: picked.difficultyLabel,
    difficultyModifier: formatModifier(picked.difficultyModifier),
    free: formatModifier(picked.free),
    total: formatModifier(picked.modifier),
    target: picked.target,
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
    canApply: false,
    canApplyShip: false,
    note: [note, typeof noteFor === "function" ? (noteFor(outcome) ?? "") : ""].filter(Boolean).join(" "),
    calledLabel: "",
    rangeLabel: "",
    aimModifier: "",
    aimActions: picked.aimActions ?? 0,
    statusLabel: "",
    statusModifier: "",
    visor: false
  };

  if ( picked.range ) {
    // Le libellé porte le malus (« Moyenne (−10) »). Décision Marc 30/10/2026.
    card.rangeLabel = game.i18n.localize(`SOL.Roll.rangeBand.${picked.range}`);
  }
  if ( picked.calledShot && picked.calledShot !== "none" ) {
    // Le libellé porte déjà le malus (« Torse (−10) »). On ne le répète pas.
    card.calledLabel = game.i18n.localize(`SOL.Roll.called.${picked.calledShot}`);
  }
  if ( picked.aimActions ) {
    card.aimModifier = formatModifier(picked.aimBonus ?? 0);
  }
  const statusLine = statusRollModifiers(actorStatusIds(actor))[0];
  if ( statusLine ) {
    card.statusLabel = game.i18n.localize(statusLine.labelKey);
    card.statusModifier = formatModifier(statusLine.value);
  }

  /** @type {string|null} */
  let locationKey = null;
  let visor = false;
  if ( weapon && outcome.success ) {
    // Sans tir visé : dé inversé. Avec un tir visé qui touche : la zone choisie.
    // Réf. LdR v0.2 §7. Une réussite critique ne choisit pas la zone.
    const struck = struckZone(outcome.die, picked.calledShot);
    locationKey = struck.zone;
    visor = struck.visor;
    card.visor = visor;
    card.location = game.i18n.localize(SOL.bodyLocations[locationKey]);
    // Réf. LdR v0.2 §7 : dégâts fixes de l'arme + DR. Pas de dé de dégâts.
    card.damage = Number(weapon.system.damage ?? 0) + outcome.dr;
    card.canApply = Number.isFinite(card.damage);
  }

  // Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
  // Le bouton personnage (`canApply`) ne sert pas : autre action, autre drapeau.
  const shipHit = shipStrike && outcome.success ? cleanShipStrike(shipStrike, outcome) : null;
  if ( shipHit ) card.canApplyShip = true;

  const content = await foundry.applications.handlebars.renderTemplate(CARD, card);
  const extra = { ...(messageOptions ?? {}) };
  delete extra.messageMode;
  delete extra.rollMode;
  // flags : apply-damage.mjs lit la zone et les dégâts sans reparser la carte.
  // mergeObject garde les autres drapeaux de messageOptions.
  const messageData = foundry.utils.mergeObject(extra, {
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content,
    sound: CONFIG.sounds.dice,
    flags: {
      "sol-nouvelle-ere": {
        type,
        target: picked.target,
        die: outcome.die,
        success: outcome.success,
        critical: outcome.critical,
        dr: outcome.dr,
        de: outcome.de,
        location: locationKey,
        // Visière : apply-damage divise protection et seuil de la tête.
        visor,
        // Dégâts de l'arme + DR. L'étape d'application s'en sert tels quels.
        damage: card.damage,
        label,
        shipStrike: shipHit
      }
    }
  }, { inplace: false });
  const mode = requestedMode({ messageMode, messageOptions });
  const alreadyHidden = Array.isArray(extra.whisper) || typeof extra.blind === "boolean";
  if ( mode || !alreadyHidden ) applyClientVisibility(messageData, mode);
  await ChatMessage.create(messageData);
  return {
    success: outcome.success,
    dr: outcome.dr,
    de: outcome.de,
    critical: outcome.critical,
    die: outcome.die,
    target: picked.target
  };
}

/**
 * Drapeau du tir de vaisseau. On ne garde que des scalaires.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {object} strike
 * @param {{ die: number, dr: number }} outcome
 * @returns {object|null}
 */
function cleanShipStrike(strike, outcome) {
  const targetUuid = typeof strike.targetUuid === "string" ? strike.targetUuid : "";
  if ( !targetUuid ) return null;
  const damage = Number(strike.damage);
  if ( !Number.isFinite(damage) ) return null;
  const aim = strike.aim === "section" || strike.aim === "module" ? strike.aim : "none";
  return {
    targetUuid,
    attackerUuid: typeof strike.attackerUuid === "string" ? strike.attackerUuid : "",
    tokenId: typeof strike.tokenId === "string" ? strike.tokenId : "",
    weaponId: typeof strike.weaponId === "string" ? strike.weaponId : "",
    weaponDamage: damage,
    aim,
    sectionId: typeof strike.sectionId === "string" ? strike.sectionId : "",
    moduleId: typeof strike.moduleId === "string" ? strike.moduleId : "",
    die: outcome.die,
    dr: outcome.dr,
    missileId: typeof strike.missileId === "string" ? strike.missileId : ""
  };
}

/**
 * Ajoute le malus de statut à un choix déjà fait (test simple, jets groupés).
 * Le plafond ±50 s'applique au total d'un personnage. Réf. LdR v0.2 §5.
 * Décision Marc 25/10/2026 : un jet de poste de vaisseau n'est pas borné.
 *
 * @param {object} choice
 * @param {number} score
 * @param {number} statusModifier
 * @param {boolean} [shipPost]
 * @returns {object}
 */
function stampStatus(choice, score, statusModifier, shipPost = false) {
  const situation = Number(choice.situation ?? 0) + Number(statusModifier || 0);
  const modifier = shipPost
    ? rollModifier(choice.difficultyModifier ?? 0, choice.free ?? 0, situation, { shipPost: true })
    : cappedModifier(choice.difficultyModifier ?? 0, choice.free ?? 0, situation);
  return {
    ...choice,
    statusModifier,
    modifier,
    target: Number(score) + modifier
  };
}

/**
 * @param {Actor|null|undefined} actor
 * @returns {string[]}
 */
function actorStatusIds(actor) {
  if ( actor?.statuses && typeof actor.statuses[Symbol.iterator] === "function" ) {
    return [...actor.statuses];
  }
  /** @type {string[]} */
  const ids = [];
  const effects = actor?.effects;
  if ( !effects ) return ids;
  for ( const effect of effects ) {
    const statuses = effect?.statuses;
    if ( !statuses ) continue;
    const values = typeof statuses[Symbol.iterator] === "function" ? [...statuses] : [];
    for ( const id of values ) {
      if ( typeof id === "string" && !ids.includes(id) ) ids.push(id);
    }
  }
  return ids;
}
