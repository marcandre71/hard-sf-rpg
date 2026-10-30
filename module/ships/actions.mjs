/**
 * Jets de poste depuis la fiche, dans le Combat Tracker.
 *
 * Décision Marc 23/10/2026 : plus de fenêtre « Combat spatial ».
 * Le réglage de monde `spaceCombat` n'est plus enregistré.
 * Un monde qui l'a déjà le garde en base ; rien ne le lit,
 * donc le chargement ne plante pas.
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html
 *
 * Les bonus du tour sont un drapeau du document Combat.
 * `updateCombat` les vide chez le MJ actif, seulement si le round augmente.
 * `Combat.previous.round` est rempli dans `_onUpdate` sur tous les clients
 * (doc v14), même si c'est un joueur ou un MJ non actif qui passe le round.
 * Reculer d'un round les garde.
 * Le verrouillage reste. `deleteCombat` emporte le document,
 * donc le verrouillage avec.
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html#previous
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.updateDocument.html
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.deleteDocument.html
 *
 * Le relais `system.sol-nouvelle-ere` sert encore : un joueur qui
 * ne possède pas le vaisseau ne peut pas écrire le Combat ni la
 * portée de la cible. `userId` est déclaratif (le socket ne prouve
 * pas l'expéditeur). Acceptable à une table de confiance.
 * Le MJ vérifie OWNER, que l'action appartient au poste, et borne
 * le DR (0–10) et le score (0–200).
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.SocketInterface.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.Document.html#testUserPermission
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.User.html
 */
import { SOL } from "../config.mjs";
import { performRoll } from "../dice/chat.mjs";
import { skillScore } from "../dice/skill-score.mjs";
import {
  POST_ACTIONS,
  SPACE_RANGES,
  actionBelongsToPost,
  bonusesCleared,
  compareOpposed,
  duplicateActors,
  evadeFromDr,
  isOwnTarget,
  acceptedTokenScene,
  lockAfterRoll,
  lockCleared,
  lockRollAllowed,
  normalizeTurn,
  pickCombatant,
  rangeDifferWarning,
  refusesManeuver,
  roundClearRequested,
  sharedRange,
  targetIdentity,
  suggestedModifier,
  weaponCanFire,
  linkedActorTwins,
  ammoBlocksFire
} from "./combat.mjs";
import {
  isLaserWeapon,
  isMissileWeapon,
  isWreck,
  boundDr,
  missileAmmoSpent,
  missileArrivalRound,
  sensorsAreOut
} from "./damage.mjs";
import {
  askRepair,
  changeHeat,
  commitRepair,
  coolCombat,
  rollReactorCrit,
  heatOf,
  markFieldRepair,
  postBricolage,
  postIncident,
  reactorModuleDown,
  registerHeatPlay,
  shipReactorDown,
  spendCannonAmmo
} from "./heat-play.mjs";
import {
  clampHeat,
  isCannonWeapon,
  noSpareParts,
  repairAlreadyCapped,
  pushHeatGain,
  pushPilotBonus,
  pushRefusal,
  restartRefusal,
  shotAftermath,
  FIELD_REPAIR_PENALTY
} from "./reactor.mjs";
import { enqueueMissile, finishCounter, finishLaser, missileRecord, readHull, remindMissiles } from "./strike.mjs";
import { crewOf } from "./crew.mjs";
import { SHIP_POST_IDS } from "./hull.mjs";
import { registerShipCombatGuard } from "./guard.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const SOCKET = `system.${SYSTEM_ID}`;
const TURNS = "spaceTurns";

/** Avertissement renvoyé au joueur qui a relayé un verrouillage. */
const RELAY_WARN_LOCK = "SOL.Space.lockNoTarget";

export { POST_ACTIONS };

/**
 * Garde du véhicule, relais, et vidage des bonus au changement de round.
 * Une fois, sur `init`.
 *
 * @returns {void}
 */
export function registerShipPlay() {
  registerShipCombatGuard();
  registerHeatPlay();
  game.socket?.on(SOCKET, onSpaceRelay);
  Hooks.on("updateCombat", onCombatRound);
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} action
 * @param {TokenDocument|null} [token] Jeton de la fiche, s'il est connu.
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
export async function rollPostAction(ship, postId, action, token = null) {
  if ( !ship || ship.type !== "ship" || !actionBelongsToPost(postId, action) ) return null;
  warnIfDuplicate(ship, postId);
  warnLinkedTwins(ship, token);
  if ( (action === "evade" || action === "changeRange") && wreckBlocks(ship) ) return null;
  // Décision Marc 30/10/2026. Réf. Vaisseaux v0.1 §6.
  if ( (action === "evade" || action === "changeRange") && moveBlocked(ship) ) return null;
  if ( action === "push" ) return pushEngines(ship, token);
  if ( action === "patch" ) return fieldRepair(ship, token);
  if ( action === "repair" ) return repairOutside(ship, token);
  if ( action === "restart" ) return restartReactor(ship, token);
  if ( action === "changeRange" ) return changeRange(ship, token);
  if ( action === "lock" ) return lockShip(ship, token);
  return rollSingle(ship, postId, action, { token });
}

/**
 * Une seule cible, sinon pas de jet.
 * // Décision Marc 25/10/2026
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
async function lockShip(ship, token = null) {
  const targets = targetedShipTokens(ship, token);
  if ( !lockRollAllowed(targets.length) ) {
    const key = targets.length === 0 ? "SOL.Space.lockNoTarget" : "SOL.Space.lockOneTarget";
    ui.notifications.warn(game.i18n.localize(key));
    return null;
  }
  const identity = targetIdentity(targets[0]);
  if ( !identity ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.lockNoTarget"));
    return null;
  }
  const outcome = await rollSingle(ship, "operator", "lock", { store: false, token });
  if ( !outcome?.success ) return outcome;
  if ( !game.user.isGM ) {
    await relayOwned(ship, "operator", {
      type: "effect",
      shipUuid: ship.uuid,
      tokenId: tokenIdOf(ship, token),
      postId: "operator",
      action: "lock",
      userId: game.user.id,
      success: true,
      dr: outcome.dr,
      score: outcome.score,
      targetUuid: identity
    });
    return outcome;
  }
  const held = combatantFor(ship, token);
  if ( !held ) {
    ui.notifications.info(game.i18n.localize("SOL.Space.effectNotStored"));
    return outcome;
  }
  await writeStoredEffect(held.combat, held.combatant.id, "lock", {
    success: true,
    dr: outcome.dr,
    lockTarget: identity
  });
  refreshShip(ship);
  return outcome;
}

/**
 * Le MJ retire le verrouillage. Le reste du tour reste.
 * // Décision Marc 25/10/2026
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<void>}
 */
export async function clearShipLock(ship, token = null) {
  if ( game.user?.isGM !== true || !ship || ship.type !== "ship" ) return;
  const held = combatantFor(ship, token);
  if ( !held ) return;
  const turns = readTurns(held.combat);
  const current = normalizeTurn(turns[held.combatant.id]);
  if ( !current.lock ) return;
  turns[held.combatant.id] = lockCleared(current);
  await held.combat.setFlag(SYSTEM_ID, TURNS, turns);
  refreshShip(ship);
}

/**
 * Nom affiché sur l'onglet Postes. Vide s'il n'y a pas de verrouillage.
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {{ uuid: string, name: string }}
 */
export function readLock(ship, token = null) {
  const held = combatantFor(ship, token);
  if ( !held ) return { uuid: "", name: "" };
  const uuid = normalizeTurn(readTurns(held.combat)[held.combatant.id]).lock;
  if ( !uuid ) return { uuid: "", name: "" };
  let name = "";
  try {
    const doc = foundry.utils.fromUuidSync?.(uuid);
    name = doc?.name || doc?.actor?.name || "";
  } catch {
    name = "";
  }
  return { uuid, name };
}

/**
 * @param {Combat} combat
 * @param {object} changed
 * @returns {void}
 */
function onCombatRound(combat, changed) {
  if ( game.user?.isActiveGM !== true ) return;
  if ( !roundClearRequested(combat, changed) ) return;
  const turns = readTurns(combat);
  /** @type {Record<string, ReturnType<typeof bonusesCleared>>} */
  const next = {};
  let differ = false;
  for ( const [id, turn] of Object.entries(turns) ) {
    const cleared = bonusesCleared(turn);
    next[id] = cleared;
    const current = normalizeTurn(turn);
    if ( cleared.lock !== current.lock || cleared.evade !== current.evade
      || cleared.commanderPost !== current.commanderPost || cleared.pilotBonus !== current.pilotBonus
      || cleared.pushPilot !== current.pushPilot || cleared.coolLaser !== current.coolLaser ) {
      differ = true;
    }
  }
  void (async () => {
    if ( differ ) await combat.setFlag(SYSTEM_ID, TURNS, next);
    // Critique à 10, puis refroidissement. // Décision Marc 30/10/2026. Réf. Vaisseaux v0.1 §6.
    await coolCombat(combat);
    await remindMissiles(combat);
  })();
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|object>}
 */
async function changeRange(ship, token = null) {
  if ( !maneuverAllowed(ship) ) return null;
  const noteFor = outcome => outcome.de >= 3 ? game.i18n.localize("SOL.Space.incident") : "";
  const mine = await rollSingle(ship, "pilot", "changeRange", { noteFor, store: false, token });
  if ( !mine ) return null;
  const targets = targetedShips(ship, token);
  if ( targets.length !== 1 ) {
    const key = targets.length === 0 ? "SOL.Space.noTarget" : "SOL.Space.oneTarget";
    ui.notifications.info(game.i18n.localize(key));
    return mine;
  }
  const target = targets[0];
  if ( !game.user.isGM ) {
    await relayOwned(ship, "pilot", {
      type: "changeRange",
      shipUuid: ship.uuid,
      targetUuid: target.uuid,
      postId: "pilot",
      action: "changeRange",
      userId: game.user.id,
      success: mine.success === true,
      dr: mine.dr,
      de: mine.de,
      score: mine.score
    });
    return mine;
  }
  return resolveRangeChange(ship, target, mine);
}

/**
 * @param {Actor} ship
 * @param {Actor} target
 * @param {{ success: boolean, dr: number, de?: number, score: number }} mine
 * @returns {Promise<object>}
 */
async function resolveRangeChange(ship, target, mine) {
  if ( !maneuverAllowed(ship) ) return mine;
  if ( !target || target.documentName !== "Actor" || target.type !== "ship" || target.uuid === ship.uuid ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.noTarget"));
    return mine;
  }
  const noteFor = outcome => outcome.de >= 3 ? game.i18n.localize("SOL.Space.incident") : "";
  const theirs = await rollSingle(target, "pilot", "changeRange", { noteFor, store: false });
  if ( !theirs ) return mine;
  const verdict = compareOpposed(mine, theirs, { useScore: true, scoreOnFailure: false });
  if ( verdict === "tie" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.rangeTie"));
    return mine;
  }
  const winner = verdict === "a" ? ship : target;
  const direction = await choose(game.i18n.format("SOL.Space.rangeWinner", { name: winner.name }), [
    { id: "closer", label: game.i18n.localize("SOL.Space.closer") },
    { id: "farther", label: game.i18n.localize("SOL.Space.farther") }
  ]);
  // Décision Marc 25/10/2026 : la portée du vaisseau qui manœuvre.
  const maneuverRange = shipRange(ship);
  const targetRange = shipRange(target);
  const next = sharedRange(maneuverRange, direction);
  if ( !next ) return mine;
  if ( next === maneuverRange && next === targetRange ) {
    ui.notifications.info(game.i18n.localize("SOL.Space.rangeSame"));
    return mine;
  }
  await ship.update({ "system.range": next });
  await target.update({ "system.range": next });
  const text = game.i18n.format("SOL.Space.rangeMoved", {
    name: winner.name,
    range: game.i18n.localize(SOL.shipRanges[next] ?? next)
  });
  const differ = rangeDifferWarning(rangeLabel(maneuverRange), rangeLabel(targetRange));
  const warning = differ
    ? game.i18n.format(differ.key, { maneuver: differ.maneuver, other: differ.other })
    : "";
  const escape = foundry.utils.escapeHTML;
  const content = warning
    ? `<p>${escape(text)}</p><p>${escape(warning)}</p>`
    : `<p>${escape(text)}</p>`;
  await ChatMessage.create({ content });
  return mine;
}

/**
 * @param {string} range
 * @returns {string}
 */
function rangeLabel(range) {
  const key = SOL.shipRanges[range] ?? range;
  return game.i18n.localize(key);
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} action
 * @param {{ noteFor?: (outcome: object) => string, store?: boolean, token?: TokenDocument|null }} [options]
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
async function rollSingle(ship, postId, action, options = {}) {
  const crew = await crewOf(ship, postId);
  if ( !crew ) return null;
  let aim = typeof options.aim === "string" ? options.aim : "";
  let weaponCondition = "";
  /** @type {ReturnType<typeof weaponsOf>[number]|null} */
  let weapon = null;
  let aimed = { sectionId: "", moduleId: "" };
  let skill = crew.skills[0];
  if ( action === "command" ) {
    const post = await choose(game.i18n.localize("SOL.Space.pickPost"), SHIP_POST_IDS.map(id => ({
      id,
      label: game.i18n.localize(SOL.shipPosts[id])
    })));
    if ( !post ) return null;
    crew.chosenPost = post;
  }
  if ( action === "fire" ) {
    const range = options.rangeOverride || shipRange(ship);
    let weapons = weaponsOf(ship).filter(entry => weaponCanFire(entry, range));
    if ( options.defense ) weapons = weapons.filter(entry => isLaserWeapon(entry));
    if ( !weapons.length ) {
      ui.notifications.warn(game.i18n.localize(options.defense ? "SOL.Ship.noLaser" : "SOL.Space.noWeapon"));
      return null;
    }
    const weaponId = options.weaponId || await choose(game.i18n.localize("SOL.Space.pickWeapon"), weapons.map(entry => ({
      id: entry.id,
      label: entry.name
    })));
    if ( !weaponId ) return null;
    weapon = weapons.find(entry => entry.id === weaponId) ?? null;
    if ( !weapon ) return null;
    if ( shipReactorDown(ship) && (isLaserWeapon(weapon) || isCannonWeapon(weapon)) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.reactorDownFire"));
      return null;
    }
    weaponCondition = weapon.condition ?? "";
    // Un missile ne se vise pas : l'impact lit le dé inversé.
    // Décision Marc 26/10/2026. Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4 et §5.
    if ( !aim ) {
      if ( options.defense || isMissileWeapon(weapon) ) aim = "none";
      else {
        aim = await choose(game.i18n.localize("SOL.Space.pickAim"), [
          { id: "none", label: game.i18n.localize("SOL.Space.aimNone") },
          { id: "section", label: game.i18n.localize("SOL.Space.aimSection") },
          { id: "module", label: game.i18n.localize("SOL.Space.aimModule") }
        ]);
        if ( !aim ) return null;
      }
    }
    if ( aim === "section" || aim === "module" ) {
      const picked = await aimAt(ship, aim, options.token ?? null);
      if ( !picked ) return null;
      aimed = picked;
    }
  }
  if ( options.skillName ) {
    const wanted = options.skillName;
    const found = crew.skills.find(entry => entry.name === wanted || entry.name.startsWith(wanted));
    if ( !found ) {
      ui.notifications.warn(game.i18n.format("SOL.Ship.skillMissing", { name: wanted }));
      return null;
    }
    skill = found;
  } else if ( crew.skills.length > 1 ) {
    const picked = await choose(game.i18n.localize("SOL.Space.pickSkill"), crew.skills.map((entry, index) => ({
      id: String(index),
      label: entry.name
    })));
    if ( picked === null ) return null;
    skill = crew.skills[Number(picked)] ?? skill;
  }
  if ( !skill ) return null;
  const score = crew.npc ? crew.score : ratedScore(crew.actor, skill);
  if ( score === null ) return null;
  const suggested = modifierFor(ship, postId, aim, weaponCondition, options.token ?? null, {
    range: options.rangeOverride,
    ignoreEvade: options.ignoreEvade === true
  }) + (Number(options.extraModifier) || 0);
  const missileLaunch = action === "fire" && weapon && isMissileWeapon(weapon) && options.defense !== true;
  const single = action === "fire" ? singleTarget(ship, options.token ?? null) : null;
  const noteFor = options.noteFor ?? (action === "fire"
    ? outcome => fireNote(outcome, { missile: missileLaunch, defense: options.defense === true, single: Boolean(single) })
    : null);
  const shipStrike = action === "fire" && !missileLaunch && options.defense !== true && single && weapon
    ? {
      targetUuid: targetIdentity(single),
      attackerUuid: ship.uuid,
      tokenId: single.tokenId,
      weaponId: weapon.id,
      damage: weapon.damage,
      aim,
      sectionId: aimed.sectionId,
      moduleId: aimed.moduleId
    }
    : null;
  const outcome = await performRoll({
    actor: crew.actor,
    label: `${ship.name} — ${game.i18n.localize(SOL.shipPosts[postId])} — ${skill.name}`,
    score,
    type: "skill",
    suggested,
    shipPost: true,
    shipStrike,
    noteFor: noteFor ?? undefined
  });
  if ( !outcome ) return null;
  const result = { ...outcome, score };
  if ( options.store !== false && !missileLaunch ) {
    await storeEffect(ship, postId, action, result, crew.chosenPost, options.token ?? null);
  }
  // Décision Marc 26/10/2026 : réussi ou raté, une munition.
  if ( missileLaunch && missileAmmoSpent(result) ) await launchMissile(ship, weapon, result, options.token ?? null);
  if ( options.settle !== false ) await settleShot(ship, postId, action, weapon, result, options.token ?? null);
  return result;
}

/**
 * @param {{ success?: boolean }} outcome
 * @param {{ missile?: boolean, defense?: boolean, single?: boolean }} context
 * @returns {string}
 */
function fireNote(outcome, context) {
  if ( outcome?.success !== true ) return "";
  if ( context.defense ) return game.i18n.localize("SOL.Ship.laserShot");
  if ( context.missile ) return game.i18n.localize("SOL.Ship.missileLaunched");
  if ( !context.single ) return game.i18n.localize("SOL.Ship.hitNoTarget");
  return game.i18n.localize("SOL.Ship.hitApply");
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} action
 * @param {{ success: boolean, dr: number, score?: number }} result
 * @param {string} [chosenPost]
 * @param {TokenDocument|null} [token]
 * @returns {Promise<void>}
 */
async function storeEffect(ship, postId, action, result, chosenPost, token = null) {
  if ( !result.success ) return;
  if ( !actionBelongsToPost(postId, action) ) return;
  const held = combatantFor(ship, token);
  if ( !held ) {
    if ( action === "simple" ) return;
    ui.notifications.info(game.i18n.localize("SOL.Space.effectNotStored"));
    return;
  }
  if ( !game.user.isGM ) {
    await relayOwned(ship, postId, {
      type: "effect",
      shipUuid: ship.uuid,
      tokenId: tokenIdOf(ship, token),
      postId,
      userId: game.user.id,
      action,
      success: true,
      dr: result.dr,
      score: result.score,
      chosenPost: chosenPost ?? ""
    });
    return;
  }
  await writeStoredEffect(held.combat, held.combatant.id, action, result, chosenPost);
}

/**
 * @param {Combat} combat
 * @param {string} combatantId
 * @param {string} action
 * @param {{ success?: boolean, dr?: number }} result
 * @param {string} [chosenPost]
 * @returns {Promise<void>}
 */
async function writeStoredEffect(combat, combatantId, action, result, chosenPost) {
  if ( result?.success !== true || !combat || !combatantId ) return;
  const turn = normalizeTurn(readTurns(combat)[combatantId]);
  if ( action === "command" && chosenPost && SHIP_POST_IDS.includes(chosenPost) ) turn.commanderPost = chosenPost;
  else if ( action === "lock" ) {
    const next = lockAfterRoll(turn, result?.success === true, result?.lockTarget);
    if ( next.lock === turn.lock ) return;
    turn.lock = next.lock;
  }
  else if ( action === "evade" ) turn.evade = evadeFromDr(result.dr, true);
  else if ( action === "calculate" ) turn.pilotBonus = true;
  else return;
  const turns = readTurns(combat);
  turns[combatantId] = turn;
  await combat.setFlag(SYSTEM_ID, TURNS, turns);
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {object} message
 * @returns {Promise<boolean>}
 */
async function relayOwned(ship, postId, message) {
  if ( !await userOwnsShipOrPost(game.user.id, ship, postId) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayRefused"));
    return false;
  }
  return relayToGm(message);
}

/**
 * @param {object} message
 * @returns {Promise<boolean>}
 */
async function relayToGm(message) {
  if ( !game.users?.activeGM || !game.socket?.emit ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.noActiveGm"));
    return false;
  }
  game.socket.emit(SOCKET, message);
  ui.notifications.info(game.i18n.localize("SOL.Space.relaySent"));
  return true;
}

/**
 * `userId` est déclaratif. Le MJ actif revérifie le propriétaire.
 *
 * @param {object} message
 * @returns {Promise<void>}
 */
async function onSpaceRelay(message) {
  if ( !message || typeof message !== "object" ) return;
  if ( message.type === "relayWarn" ) {
    if ( message.userId === game.user?.id && message.key === RELAY_WARN_LOCK ) {
      ui.notifications.warn(game.i18n.localize(RELAY_WARN_LOCK));
    }
    return;
  }
  if ( game.user?.isActiveGM !== true ) return;
  if ( message.type === "heatChoice" ) {
    const card = game.messages?.get?.(message.messageId);
    if ( card ) {
      const { finishHeatChoice } = await import("./heat-play.mjs");
      await finishHeatChoice(card, message.action);
    }
    return;
  }
  if ( message.type === "reactor" ) {
    await onReactorRelay(message);
    return;
  }
  if ( message.type === "missile" ) {
    await onMissileRelay(message);
    return;
  }
  if ( message.type === "missileResolve" ) {
    await onMissileResolveRelay(message);
    return;
  }
  if ( message.type !== "effect" && message.type !== "changeRange" ) return;
  const ship = message.shipUuid ? await foundry.utils.fromUuid(String(message.shipUuid)) : null;
  if ( !ship || ship.documentName !== "Actor" || ship.type !== "ship" ) return;
  const postId = typeof message.postId === "string" ? message.postId : "";
  const action = message.type === "changeRange" ? "changeRange" : String(message.action ?? "");
  if ( !actionBelongsToPost(postId, action) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayAction"));
    return;
  }
  if ( !await userOwnsShipOrPost(message.userId, ship, postId) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayRefused"));
    return;
  }
  const roll = boundedRoll(message);
  if ( message.type === "effect" ) {
    const held = combatantFor(ship, hintedToken(message, ship));
    if ( !held ) return;
    if ( action === "lock" ) {
      if ( roll.success !== true ) return;
      const lockTarget = await acceptedLockTarget(String(message.targetUuid ?? ""), ship, held.combat, hintedToken(message, ship));
      if ( !lockTarget ) {
        warnLockRefused(message.userId);
        return;
      }
      roll.lockTarget = lockTarget;
    }
    await writeStoredEffect(
      held.combat,
      held.combatant.id,
      action,
      roll,
      typeof message.chosenPost === "string" ? message.chosenPost : ""
    );
    if ( action === "lock" ) refreshShip(ship);
    return;
  }
  const target = message.targetUuid ? await foundry.utils.fromUuid(String(message.targetUuid)) : null;
  await resolveRangeChange(ship, target, roll);
}

/**
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} aim
 * @param {string} [weaponCondition]
 * @param {TokenDocument|null} [token]
 * @returns {number}
 */
function modifierFor(ship, postId, aim, weaponCondition = "", token = null, extra = {}) {
  const held = combatantFor(ship, token);
  const shipTurn = held ? normalizeTurn(readTurns(held.combat)[held.combatant.id]) : normalizeTurn(null);
  // Décision Marc 26/10/2026 : le laser anti-missile n'a pas le malus d'esquive.
  const foe = extra.ignoreEvade ? { evade: 0 } : foeTurn(ship, held?.combat ?? null, token);
  const targets = targetedShipTokens(ship, token);
  const fireTarget = lockRollAllowed(targets.length) ? targetIdentity(targets[0]) : "";
  return suggestedModifier({
    postId,
    range: extra.range || shipRange(ship),
    fireTarget,
    ship: shipTurn,
    foe,
    aim,
    weaponCondition,
    twisted: ship?.system?.twisted === true,
    sensorsOut: sensorsOutOf(ship),
    // Réparer hors combat ne prend pas le −10 de chaleur.
    // // À confirmer par Marc
    heat: extra.ignoreHeat === true ? 0 : heatOf(ship)
  });
}

/**
 * Esquive du vaisseau ciblé, s'il y en a un seul.
 * Sans cible, pas de malus d'esquive.
 *
 * @param {Actor} ship
 * @param {Combat|null} combat
 * @param {TokenDocument|null} [token]
 * @returns {{ evade: number }}
 */
function foeTurn(ship, combat, token = null) {
  const targets = targetedShipTokens(ship, token);
  if ( !lockRollAllowed(targets.length) || !combat ) return { evade: 0 };
  const target = targets[0];
  const foe = pickCombatant(combat.combatants ?? [], {
    id: target.actor?.id,
    uuid: target.actorUuid,
    token: target.tokenId ? { id: target.tokenId } : null
  });
  if ( !foe ) return { evade: 0 };
  return normalizeTurn(readTurns(combat)[foe.id]);
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|{ id?: string }|null} [token]
 * @returns {{ combat: Combat, combatant: Combatant }|null}
 */
function combatantFor(ship, token = null) {
  const handle = {
    id: ship?.id,
    uuid: ship?.uuid,
    token: tokenIdOf(ship, token) ? { id: tokenIdOf(ship, token) } : null
  };
  /** @type {{ combat: Combat, combatant: Combatant }[]} */
  const rows = [];
  for ( const combat of eachCombat() ) {
    const combatant = pickCombatant(combat.combatants ?? [], handle);
    if ( combatant ) rows.push({ combat, combatant });
  }
  if ( !rows.length ) return null;
  const viewed = game.combat;
  const inView = viewed ? rows.filter(row => row.combat === viewed) : [];
  const pool = inView.length ? inView : rows;
  return pool.find(row => row.combat.combatant?.id === row.combatant.id) ?? pool[0];
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|{ id?: string }|null} [token]
 * @returns {string}
 */
function tokenIdOf(ship, token) {
  const id = token?.id || ship?.token?.id || "";
  return typeof id === "string" ? id : "";
}

/**
 * Jeton annoncé par le joueur, s'il appartient à ce vaisseau.
 * `pickCombatant` refuse un autre acteur.
 *
 * @param {object} message
 * @param {Actor} ship
 * @returns {{ id: string }|null}
 */
function hintedToken(message, ship) {
  const id = typeof message?.tokenId === "string" ? message.tokenId : "";
  if ( !id || id.length > 80 ) return ship?.token ?? null;
  return { id };
}

/**
 * @returns {Combat[]}
 */
function eachCombat() {
  const combats = game.combats;
  if ( !combats ) return [];
  if ( typeof combats[Symbol.iterator] === "function" ) return [...combats];
  return combats.contents ?? [];
}

/**
 * @param {Combat} combat
 * @returns {Record<string, object>}
 */
function readTurns(combat) {
  const raw = combat?.getFlag?.(SYSTEM_ID, TURNS);
  if ( !raw || typeof raw !== "object" || Array.isArray(raw) ) return {};
  /** @type {Record<string, object>} */
  const turns = {};
  for ( const [id, turn] of Object.entries(raw) ) {
    if ( !id || !turn || typeof turn !== "object" ) continue;
    turns[id] = normalizeTurn(turn);
  }
  return turns;
}

/**
 * Cibles Foundry du joueur : un Set de Token.
 * On ne garde que les autres vaisseaux. Le jeton prime sur l'acteur :
 * deux jetons du même acteur sont deux cibles.
 * // Décision Marc 25/10/2026
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {{ actor: Actor, tokenId: string, tokenUuid: string, actorUuid: string }[]}
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.User.html
 */
function targetedShipTokens(ship, token = null) {
  const targets = game.user?.targets;
  if ( !targets ) return [];
  const own = ownIdentity(ship, token);
  /** @type {{ actor: Actor, tokenId: string, tokenUuid: string, actorUuid: string }[]} */
  const found = [];
  const seen = new Set();
  for ( const target of targets ) {
    const actor = target?.actor;
    if ( !actor || actor.type !== "ship" ) continue;
    const doc = target.document ?? target;
    const row = {
      actor,
      tokenId: typeof doc.id === "string" ? doc.id : "",
      tokenUuid: typeof doc.uuid === "string" ? doc.uuid : "",
      actorUuid: typeof actor.uuid === "string" ? actor.uuid : ""
    };
    if ( isOwnTarget(own, row) ) continue;
    const key = targetIdentity(row);
    if ( !key || seen.has(key) ) continue;
    seen.add(key);
    found.push(row);
  }
  return found;
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Actor[]}
 */
function targetedShips(ship, token = null) {
  return targetedShipTokens(ship, token).map(row => row.actor);
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {{ tokenUuid: string, actorUuid: string }}
 */
function ownIdentity(ship, token = null) {
  const explicit = token?.uuid || ship?.token?.uuid;
  if ( typeof explicit === "string" && explicit ) {
    return {
      tokenUuid: explicit,
      actorUuid: typeof ship?.uuid === "string" ? ship.uuid : ""
    };
  }
  const held = combatantFor(ship, token);
  const heldToken = held?.combatant?.token;
  return {
    tokenUuid: typeof heldToken?.uuid === "string" ? heldToken.uuid : "",
    actorUuid: typeof ship?.uuid === "string" ? ship.uuid : ""
  };
}

/**
 * Le relais n'accepte qu'un jeton de vaisseau, sur la scène du combat.
 * // Décision Marc 25/10/2026
 *
 * @param {string} uuid
 * @param {Actor} ship
 * @param {Combat} combat
 * @param {TokenDocument|{ id?: string }|null} [token]
 * @returns {Promise<string>}
 * @see https://foundryvtt.com/api/v14/classes/foundry.utils.html#fromUuid
 */
async function acceptedLockTarget(uuid, ship, combat, token = null) {
  if ( !uuid || uuid.length > 300 ) return "";
  const doc = await foundry.utils.fromUuid(uuid);
  if ( !doc || doc.documentName !== "Token" ) return "";
  const sceneId = typeof combat?.scene === "string" ? combat.scene : (combat?.scene?.id ?? "");
  if ( !acceptedTokenScene(
    { documentName: doc.documentName, parentId: doc.parent?.id ?? "" },
    { sceneId }
  ) ) return "";
  const actor = doc.actor;
  if ( !actor || actor.type !== "ship" ) return "";
  const own = ownIdentity(ship, token);
  const row = {
    tokenUuid: typeof doc.uuid === "string" ? doc.uuid : uuid,
    actorUuid: typeof actor.uuid === "string" ? actor.uuid : ""
  };
  if ( isOwnTarget(own, row) ) return "";
  return targetIdentity(row);
}

/**
 * Le refus d'un verrouillage relayé s'affiche chez le MJ et chez le joueur.
 *
 * @param {unknown} userId
 * @returns {void}
 */
function warnLockRefused(userId) {
  ui.notifications.warn(game.i18n.localize(RELAY_WARN_LOCK));
  if ( typeof userId !== "string" || !userId || userId === game.user?.id ) return;
  game.socket?.emit(SOCKET, { type: "relayWarn", userId, key: RELAY_WARN_LOCK });
}

/**
 * @param {Actor} ship
 * @returns {void}
 */
function refreshShip(ship) {
  const sheet = ship?.sheet;
  if ( sheet?.rendered ) void sheet.render(false);
}

/**
 * @param {Actor} ship
 * @returns {string}
 */
function shipRange(ship) {
  const value = ship?.system?._source?.range ?? ship?.system?.range;
  return SPACE_RANGES.includes(value) ? value : "medium";
}

/**
 * @param {Actor} ship
 * @returns {void}
 */
function warnIfDuplicate(ship, postId) {
  const posts = SHIP_POST_IDS.map(id => ({
    id,
    uuid: ship.system._source?.posts?.[id]?.actorUuid ?? ship.system?.posts?.[id]?.actorUuid ?? ""
  }));
  const uuid = posts.find(post => post.id === postId)?.uuid ?? "";
  if ( uuid && duplicateActors(posts).includes(uuid) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.duplicate"));
  }
}

/**
 * @param {Actor} actor
 * @param {{ name: string, system: object }} skill
 * @returns {number|null}
 */
function ratedScore(actor, skill) {
  const rated = skillScore(actor.system?.characteristics, skill.system);
  if ( rated.impossible || rated.score === null ) {
    ui.notifications.warn(`${skill.name} — ${game.i18n.localize("SOL.Roll.impossible")}`);
    return null;
  }
  return rated.score;
}

/**
 * @param {Actor} ship
 * @returns {{ id: string, name: string, category: string, condition: string, rangeClose: boolean, rangeMedium: boolean, rangeLong: boolean }[]}
 */
function weaponsOf(ship) {
  return ship.items.filter(item => item.type === "shipModule").map(item => ({
    id: item.id,
    name: item.name,
    category: item.system.category,
    condition: item.system.condition,
    damage: Number(item.system.weapon?.damage ?? 0),
    ammo: item.system.weapon?.ammo ?? null,
    rangeClose: item.system.weapon?.rangeClose === true,
    rangeMedium: item.system.weapon?.rangeMedium === true,
    rangeLong: item.system.weapon?.rangeLong === true,
    heatPerShot: Number(item.system.weapon?.heatPerShot ?? 0)
  }));
}

/**
 * @param {string} title
 * @param {{ id: string, label: string }[]} options
 * @returns {Promise<string|null>}
 */
async function choose(title, options) {
  if ( !options.length ) return null;
  if ( options.length === 1 ) return options[0].id;
  const escape = foundry.utils.escapeHTML;
  const html = options.map(option => `<option value="${escape(option.id)}">${escape(option.label)}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title },
    content: `<label><select name="choice">${html}</select></label>`,
    buttons: [
      {
        action: "ok",
        label: game.i18n.localize("SOL.Roll.confirm"),
        default: true,
        callback: (_event, button) => button.form.elements.choice.value
      },
      {
        action: "cancel",
        label: game.i18n.localize("SOL.Roll.cancel")
      }
    ],
    rejectClose: false
  });
  if ( !result || result === "cancel" ) return null;
  return String(result);
}

/**
 * @param {Actor} ship
 * @returns {boolean}
 */
/**
 * Contre-mesures : jet d'Opérations de bord, sans verrouillage.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
export async function rollOperatorOpposed(ship, token = null) {
  if ( !ship || ship.type !== "ship" ) return null;
  return rollSingle(ship, "operator", "lock", { token, store: false });
}

/**
 * Laser de défense : l'artilleur du vaisseau ciblé, portée proche,
 * sans malus de verrouillage, sans esquive (la cible est le missile).
 * Décision Marc 26/10/2026. Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4 et §5.
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|{ success: boolean, dr: number, de: number, score: number }>}
 */
export async function rollDefenseLaser(ship, token = null) {
  if ( !ship || ship.type !== "ship" ) return null;
  return rollSingle(ship, "gunner", "fire", {
    token,
    store: false,
    defense: true,
    aim: "none",
    rangeOverride: "close",
    ignoreEvade: true
  });
}

/**
 * Le joueur envoie le résultat. Le MJ écrit le missile.
 * Décision Marc 25/10/2026.
 *
 * @param {Actor} ship
 * @param {string} postId
 * @param {object} fields
 * @returns {Promise<boolean>}
 */
export async function relayMissileResolve(ship, postId, fields) {
  return relayOwned(ship, postId, {
    type: "missileResolve",
    shipUuid: ship.uuid,
    postId,
    userId: game.user.id,
    ...fields
  });
}

/**
 * @param {Actor} ship
 * @param {{ id: string }} weapon
 * @param {{ die?: number, dr: number, score?: number }} result
 * @param {TokenDocument|null} [token]
 * @returns {Promise<void>}
 */
async function launchMissile(ship, weapon, result, token = null) {
  if ( !missileAmmoSpent(result) ) return;
  const die = boundedDie(result?.die);
  if ( die === null ) return;
  const success = result.success === true;
  const targets = success ? targetedShipTokens(ship, token) : [];
  if ( success && !lockRollAllowed(targets.length) ) {
    const key = targets.length === 0 ? "SOL.Ship.missileNoTarget" : "SOL.Ship.missileOneTarget";
    ui.notifications.warn(game.i18n.localize(key));
    return;
  }
  if ( !isActiveGm() ) {
    await relayOwned(ship, "gunner", {
      type: "missile",
      shipUuid: ship.uuid,
      tokenId: tokenIdOf(ship, token),
      postId: "gunner",
      action: "fire",
      userId: game.user.id,
      weaponId: weapon.id,
      targetUuid: success ? targetIdentity(targets[0]) : "",
      success,
      dr: result.dr,
      score: result.score,
      die
    });
    return;
  }
  if ( !success ) {
    await loseMissile(ship, weapon.id);
    return;
  }
  await commitMissile(ship, weapon.id, { die, dr: result.dr, score: result.score }, targets[0], token);
}

/**
 * @param {object} message
 * @returns {Promise<void>}
 */
async function onMissileRelay(message) {
  const ship = message.shipUuid ? await foundry.utils.fromUuid(String(message.shipUuid)) : null;
  if ( !ship || ship.documentName !== "Actor" || ship.type !== "ship" ) return;
  if ( !actionBelongsToPost("gunner", "fire") ) return;
  if ( message.postId !== "gunner" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayAction"));
    return;
  }
  if ( !await userOwnsShipOrPost(message.userId, ship, "gunner") ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayRefused"));
    return;
  }
  const roll = boundedRoll(message);
  const die = boundedDie(message.die);
  if ( die === null ) return;
  const weaponId = typeof message.weaponId === "string" ? message.weaponId : "";
  if ( !weaponId || weaponId.length > 80 ) return;
  if ( !missileAmmoSpent(roll) ) return;
  // Décision Marc 26/10/2026 : un raté consomme, sans carte et sans cible.
  if ( roll.success !== true ) {
    await loseMissile(ship, weaponId);
    return;
  }
  const held = combatantFor(ship, hintedToken(message, ship));
  if ( !held ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.missileNoCombat"));
    return;
  }
  const targetUuid = await acceptedLockTarget(String(message.targetUuid ?? ""), ship, held.combat, hintedToken(message, ship));
  if ( !targetUuid ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.missileNoTarget"));
    return;
  }
  const target = await foundry.utils.fromUuid(targetUuid);
  const row = target?.documentName === "Token"
    ? {
      actor: target.actor,
      tokenId: target.id,
      tokenUuid: target.uuid,
      actorUuid: target.actor?.uuid ?? ""
    }
    : null;
  if ( !row?.actor || row.actor.type !== "ship" ) return;
  await commitMissile(ship, weaponId, { die, dr: roll.dr, score: roll.score }, row, hintedToken(message, ship));
}

/**
 * @param {object} message
 * @returns {Promise<void>}
 */
async function onMissileResolveRelay(message) {
  const ship = message.shipUuid ? await foundry.utils.fromUuid(String(message.shipUuid)) : null;
  if ( !ship || ship.documentName !== "Actor" || ship.type !== "ship" ) return;
  const postId = message.kind === "laser" ? "gunner" : "operator";
  if ( message.postId !== postId ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayAction"));
    return;
  }
  if ( !await userOwnsShipOrPost(message.userId, ship, postId) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayRefused"));
    return;
  }
  const combatId = typeof message.combatId === "string" ? message.combatId : "";
  const missileId = typeof message.missileId === "string" ? message.missileId : "";
  const combat = game.combats?.get(combatId);
  if ( !combat || !missileId ) return;
  const missile = missileRecord(combatId, missileId);
  if ( !missile || missile.state !== "flying" ) return;
  if ( Number(combat.round) < Number(missile.arrivalRound) ) return;
  const target = await foundry.utils.fromUuid(missile.targetUuid);
  const targetActor = target?.documentName === "Token" ? target.actor : target;
  if ( !targetActor || targetActor.uuid !== ship.uuid ) return;
  const roll = boundedRoll(message);
  if ( message.kind === "laser" ) await finishLaser(combatId, missile, roll.success === true);
  else await finishCounter(combatId, missile, roll);
}

/**
 * MJ actif : `game.users.activeGM`, comparé par identifiant.
 * Un autre MJ relaie, comme un joueur.
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Users.html#activeGM
 * @returns {boolean}
 */
function isActiveGm() {
  const active = game.users?.activeGM;
  return Boolean(active && game.user?.id === active.id);
}

/**
 * Baisse d'une munition si le compteur est un nombre.
 * Vide : le missile est quand même traité, le compteur ne baisse pas.
 * Déjà à 0 : rien n'est consommé.
 * Décision Marc 26/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {Actor} ship
 * @param {string} weaponId
 * @returns {Promise<boolean>}
 */
async function spendMissileAmmo(ship, weaponId) {
  const weapon = weaponsOf(ship).find(entry => entry.id === weaponId);
  if ( !weapon || !isMissileWeapon(weapon) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.noWeapon"));
    return false;
  }
  if ( ammoBlocksFire(weapon.ammo) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.ammoEmpty"));
    return false;
  }
  const item = ship.items.get(weaponId);
  const ammo = item?.system?.weapon?.ammo?.value;
  if ( typeof ammo === "number" ) {
    await item.update({ "system.weapon.ammo.value": Math.max(0, Math.trunc(ammo) - 1) });
  } else {
    ui.notifications.info(game.i18n.localize("SOL.Ship.ammoUnset"));
  }
  return true;
}

/**
 * Missile raté : il part et manque. Pas de carte, pas d'impact.
 * Décision Marc 26/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {Actor} ship
 * @param {string} weaponId
 * @returns {Promise<void>}
 */
async function loseMissile(ship, weaponId) {
  const spent = await spendMissileAmmo(ship, weaponId);
  if ( !spent ) return;
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: `<article class="sol-nouvelle-ere"><p>${game.i18n.format("SOL.Ship.missileLost", { name })}</p></article>`
  });
}

/**
 * Réacteur coupé : Esquiver et Changer de portée sont refusés.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {Actor} ship
 * @returns {boolean}
 */
function moveBlocked(ship) {
  if ( !shipReactorDown(ship) ) return false;
  ui.notifications.warn(game.i18n.localize("SOL.Ship.reactorDownMove"));
  return true;
}

/**
 * Chaleur du tir, munition du canon, incident du Pilote.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {Actor} ship
 * @param {string} postId
 * @param {string} action
 * @param {{ id?: string, name?: string, heatPerShot?: number }|null} weapon
 * @param {{ success?: boolean, de?: number }} result
 * @param {TokenDocument|null} token
 * @returns {Promise<void>}
 */
async function settleShot(ship, postId, action, weapon, result, token) {
  const held = combatantFor(ship, token);
  const coolLaser = held ? normalizeTurn(readTurns(held.combat)[held.combatant.id]).coolLaser : 0;
  const plan = shotAftermath({
    action,
    laser: Boolean(weapon && isLaserWeapon(weapon)),
    cannon: Boolean(weapon && isCannonWeapon(weapon)),
    heatPerShot: weapon?.heatPerShot,
    coolLaser,
    success: result?.success,
    de: result?.de
  });
  if ( !plan ) return;
  if ( !isActiveGm() ) {
    await relayOwned(ship, postId, {
      type: "reactor",
      kind: "settle",
      shipUuid: ship.uuid,
      tokenId: tokenIdOf(ship, token),
      postId,
      userId: game.user.id,
      weaponId: weapon?.id ?? "",
      plan
    });
    return;
  }
  await applySettle(ship, plan, weapon?.id ?? "", token);
}

/**
 * @param {Actor} ship
 * @param {{ heat?: number, cannon?: boolean, incident?: boolean, coolLaser?: boolean }} plan
 * @param {string} weaponId
 * @param {TokenDocument|null} [token]
 * @returns {Promise<void>}
 */
async function applySettle(ship, plan, weaponId, token = null) {
  if ( plan.coolLaser ) await setCoolLaser(ship, token, 0);
  if ( plan.cannon && weaponId ) await spendCannonAmmo(ship, weaponId);
  if ( plan.heat ) await changeHeat(ship, plan.heat);
  if ( plan.incident ) await postIncident(ship);
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|object>}
 */
async function pushEngines(ship, token = null) {
  const refusal = pushRefusal(heatOf(ship), shipReactorDown(ship));
  if ( refusal ) {
    ui.notifications.warn(game.i18n.localize(refusal === "heat" ? "SOL.Ship.pushRefusedHeat" : "SOL.Ship.pushRefusedDown"));
    return null;
  }
  const result = await rollSingle(ship, "engineer", "push", {
    token,
    store: false,
    settle: false,
    skillName: "Réacteurs et propulsion"
  });
  if ( !result ) return null;
  const gain = pushHeatGain(result);
  /** @type {string} */
  let choice = "";
  if ( result.success === true ) {
    const picked = await choose(game.i18n.localize("SOL.Ship.pushChoice"), [
      { id: "pilot", label: game.i18n.localize("SOL.Ship.pushPilot") },
      { id: "thrust", label: game.i18n.localize("SOL.Ship.pushThrust") },
      { id: "laser", label: game.i18n.localize("SOL.Ship.pushLaser") }
    ]);
    if ( picked ) choice = picked;
  }
  if ( !isActiveGm() ) {
    await relayOwned(ship, "engineer", {
      type: "reactor",
      kind: "push",
      shipUuid: ship.uuid,
      tokenId: tokenIdOf(ship, token),
      postId: "engineer",
      userId: game.user.id,
      success: result.success === true,
      de: result.de,
      critical: result.critical,
      choice,
      dr: result.dr
    });
    return result;
  }
  await applyPush(ship, token, gain, choice, result.dr);
  return result;
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} token
 * @param {{ heat: number, crit: boolean }} gain
 * @param {string} choice
 * @param {number} dr
 * @returns {Promise<void>}
 */
async function applyPush(ship, token, gain, choice, dr) {
  await changeHeat(ship, gain.heat);
  if ( gain.crit ) await rollReactorCrit(ship);
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  if ( choice === "pilot" ) {
    const bonus = pushPilotBonus(dr);
    await setPushPilot(ship, token, bonus);
    await ChatMessage.create({
      content: articleText(game.i18n.format("SOL.Ship.pushPilotChat", { name, bonus }))
    });
  } else if ( choice === "thrust" ) {
    await ChatMessage.create({
      content: articleText(game.i18n.format("SOL.Ship.pushThrustChat", { name }))
    });
  } else if ( choice === "laser" ) {
    await setCoolLaser(ship, token, 1);
  }
}

/**
 * @param {Actor} ship
 * @param {{ kind?: string, id?: string }} picked
 * @returns {{ current: unknown, max: unknown }}
 */
function shipHasCombat(ship) {
  const uuid = ship?.uuid;
  if ( !uuid ) return false;
  for ( const combat of game.combats ?? [] ) {
    for ( const row of combat.combatants ?? [] ) {
      if ( row.actor?.uuid === uuid ) return true;
    }
  }
  return false;
}

function repairNumbers(ship, picked) {
  if ( picked?.kind === "module" ) {
    const item = ship.items?.get(picked.id);
    return { current: item?.system?.integrity?.value, max: item?.system?.integrity?.max };
  }
  const section = ship.system?.sections?.[picked?.id];
  if ( picked?.kind === "plate" ) return { current: section?.armor?.value, max: section?.armor?.max };
  return { current: section?.integrity?.value, max: section?.integrity?.max };
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|object>}
 */
async function fieldRepair(ship, token = null) {
  if ( !shipHasCombat(ship) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.repair.patchNoCombat"));
    return null;
  }
  if ( noSpareParts(ship.system?.spareParts) ) {
    await postBricolage(ship);
    return null;
  }
  const rows = [];
  for ( const item of ship.items ?? [] ) {
    if ( item.type !== "shipModule" ) continue;
    if ( item.system?.condition !== "out" ) continue;
    rows.push({ id: item.id, label: item.name ?? item.id });
  }
  if ( !rows.length ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.incidentNoModule"));
    return null;
  }
  const moduleId = rows.length === 1 ? rows[0].id : await choose(game.i18n.localize("SOL.Ship.repair.patch"), rows);
  if ( !moduleId ) return null;
  const result = await rollSingle(ship, "engineer", "patch", {
    token,
    store: false,
    settle: false,
    skillName: "Mécanique",
    // Jet de poste : le −10 de chaleur à 7 s'ajoute au −20.
    // // À confirmer par Marc
    extraModifier: FIELD_REPAIR_PENALTY
  });
  if ( !result ) return null;
  if ( result.success !== true ) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ship }),
      content: articleText(game.i18n.format("SOL.Ship.repair.patchFail", {
        name: foundry.utils.escapeHTML(ship.name ?? "")
      }))
    });
    return result;
  }
  if ( !isActiveGm() ) {
    await relayOwned(ship, "engineer", {
      type: "reactor",
      kind: "patch",
      shipUuid: ship.uuid,
      postId: "engineer",
      userId: game.user.id,
      moduleId
    });
    return result;
  }
  await markFieldRepair(ship, moduleId);
  return result;
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|object>}
 */
async function repairOutside(ship, token = null) {
  if ( noSpareParts(ship.system?.spareParts) ) {
    await postBricolage(ship);
    return null;
  }
  const picked = await askRepair(ship);
  if ( !picked ) return null;
  const numbers = repairNumbers(ship, picked);
  if ( repairAlreadyCapped(numbers.current, numbers.max, { plate: picked.kind === "plate", yard: picked.yard === true }) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.repair.capped"));
    return null;
  }
  const { performRoll } = await import("../dice/chat.mjs");
  const outcome = await performRoll({
    actor: picked.actor,
    label: picked.label,
    score: picked.score,
    type: "skill",
    // // À confirmer par Marc : hors combat, pas le malus de chaleur.
    suggested: modifierFor(ship, "engineer", "", "", token, { ignoreHeat: true }),
    shipPost: true
  });
  if ( !outcome ) return null;
  if ( !isActiveGm() ) {
    await relayOwned(ship, "engineer", {
      type: "reactor",
      kind: "repair",
      shipUuid: ship.uuid,
      postId: "engineer",
      userId: game.user.id,
      picked,
      success: outcome.success === true,
      dr: outcome.dr
    });
    return outcome;
  }
  await commitRepair(ship, picked, outcome);
  return outcome;
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|object>}
 */
async function restartReactor(ship, token = null) {
  const refusal = restartRefusal(heatOf(ship), reactorModuleDown(ship));
  if ( refusal ) {
    ui.notifications.warn(game.i18n.localize(refusal === "module" ? "SOL.Ship.restartRefusedModule" : "SOL.Ship.restartRefusedHeat"));
    return null;
  }
  const result = await rollSingle(ship, "engineer", "restart", {
    token,
    store: false,
    settle: false,
    skillName: "Réacteurs et propulsion"
  });
  if ( !result ) return null;
  if ( !isActiveGm() ) {
    await relayOwned(ship, "engineer", {
      type: "reactor",
      kind: "restart",
      shipUuid: ship.uuid,
      postId: "engineer",
      userId: game.user.id,
      success: result.success === true
    });
    return result;
  }
  await applyRestart(ship, result.success === true);
  return result;
}

/**
 * @param {Actor} ship
 * @param {boolean} success
 * @returns {Promise<void>}
 */
async function applyRestart(ship, success) {
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  if ( success ) {
    await ship.update({ "system.reactorShutdown": false });
    await ChatMessage.create({ content: articleText(game.i18n.format("SOL.Ship.restartOk", { name })) });
    return;
  }
  await ChatMessage.create({ content: articleText(game.i18n.format("SOL.Ship.restartFail", { name })) });
}

/**
 * @param {object} message
 * @returns {Promise<void>}
 */
async function onReactorRelay(message) {
  const ship = message.shipUuid ? await foundry.utils.fromUuid(String(message.shipUuid)) : null;
  if ( !ship || ship.documentName !== "Actor" || ship.type !== "ship" ) return;
  const postId = typeof message.postId === "string" ? message.postId : "engineer";
  if ( !await userOwnsShipOrPost(message.userId, ship, postId) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.relayRefused"));
    return;
  }
  if ( message.kind === "settle" && message.plan ) {
    const heat = clampHeat(message.plan.heat);
    await applySettle(ship, { ...message.plan, heat }, message.weaponId ?? "", null);
    return;
  }
  if ( message.kind === "push" ) {
    if ( pushRefusal(heatOf(ship), shipReactorDown(ship)) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.pushRefusedHeat"));
      return;
    }
    const dr = boundDr(message.dr);
    const de = boundDr(message.de);
    const gain = pushHeatGain({
      success: message.success === true,
      de,
      critical: message.critical === "failure" ? "failure" : null
    });
    const choice = message.choice === "pilot" || message.choice === "thrust" || message.choice === "laser"
      ? message.choice
      : "";
    await applyPush(ship, null, gain, choice, dr);
    return;
  }
  if ( message.kind === "patch" && message.moduleId ) {
    const item = ship.items?.get(message.moduleId);
    if ( !item || item.system?.condition !== "out" ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.incidentNoModule"));
      return;
    }
    await markFieldRepair(ship, message.moduleId);
    return;
  }
  if ( message.kind === "repair" && message.picked ) {
    await commitRepair(ship, message.picked, { success: message.success === true, dr: boundDr(message.dr) });
    return;
  }
  if ( message.kind === "restart" ) await applyRestart(ship, message.success === true);
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} token
 * @param {number} bonus
 * @returns {Promise<void>}
 */
async function setPushPilot(ship, token, bonus) {
  const held = combatantFor(ship, token);
  if ( !held ) return;
  const turns = readTurns(held.combat);
  const turn = normalizeTurn(turns[held.combatant.id]);
  turn.pushPilot = bonus;
  turns[held.combatant.id] = turn;
  await held.combat.setFlag(SYSTEM_ID, TURNS, turns);
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} token
 * @param {number} count
 * @returns {Promise<void>}
 */
async function setCoolLaser(ship, token, count) {
  const held = combatantFor(ship, token);
  if ( !held ) return;
  const turns = readTurns(held.combat);
  const turn = normalizeTurn(turns[held.combatant.id]);
  turn.coolLaser = count;
  turns[held.combatant.id] = turn;
  await held.combat.setFlag(SYSTEM_ID, TURNS, turns);
}

/**
 * @param {string} text
 * @returns {string}
 */
function articleText(text) {
  return `<article class="sol-nouvelle-ere"><p>${text}</p></article>`;
}

/**
 * Consomme une munition et pose le missile. Le MJ actif seul.
 * Un raté ne passe pas ici. Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {Actor} ship
 * @param {string} weaponId
 * @param {{ die: number, dr: number, score?: number }} launch
 * @param {{ actor?: Actor, tokenUuid?: string, actorUuid?: string }} target
 * @param {TokenDocument|{ id?: string }|null} [token]
 * @returns {Promise<void>}
 */
async function commitMissile(ship, weaponId, launch, target, token = null) {
  const weapon = weaponsOf(ship).find(entry => entry.id === weaponId);
  const range = shipRange(ship);
  if ( !weapon || !isMissileWeapon(weapon) || !weaponCanFire(weapon, range) ) {
    ui.notifications.warn(game.i18n.localize(ammoBlocksFire(weapon?.ammo) ? "SOL.Ship.ammoEmpty" : "SOL.Space.noWeapon"));
    return;
  }
  const held = combatantFor(ship, token);
  const arrival = held ? missileArrivalRound(held.combat.round, range) : null;
  if ( !held || arrival === null ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.missileNoCombat"));
    return;
  }
  const spent = await spendMissileAmmo(ship, weaponId);
  if ( !spent ) return;
  await enqueueMissile(held.combat, {
    id: foundry.utils.randomID(),
    targetUuid: targetIdentity(target),
    targetName: target.actor?.name ?? "",
    attackerName: ship.name ?? "",
    launch: { success: true, dr: launch.dr, score: launch.score ?? 0, die: launch.die },
    range,
    arrivalRound: arrival,
    reminded: false,
    state: "flying"
  });
}

/**
 * Deux jetons liés du même acteur, fiche sans jeton.
 * Décision Marc 25/10/2026.
 *
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {void}
 */
function warnLinkedTwins(ship, token = null) {
  if ( tokenIdOf(ship, token) ) return;
  const uuid = ship?.uuid;
  if ( typeof uuid !== "string" || !uuid ) return;
  for ( const combat of eachCombat() ) {
    if ( !linkedActorTwins(combat.combatants ?? [], uuid) ) continue;
    ui.notifications.warn(game.i18n.localize("SOL.Space.linkedActor"));
    return;
  }
}

/**
 * @param {Actor} ship
 * @returns {boolean}
 */
function wreckBlocks(ship) {
  if ( !isWreck(readHull(ship)) ) return false;
  ui.notifications.warn(game.i18n.localize("SOL.Ship.wreckRefuse"));
  return true;
}

/**
 * @param {Actor} ship
 * @returns {boolean}
 */
function sensorsOutOf(ship) {
  const items = ship?.items;
  if ( !items ) return false;
  /** @type {{ category?: string, condition?: string }[]} */
  const modules = [];
  for ( const item of items ) {
    if ( item.type !== "shipModule" ) continue;
    modules.push({ category: item.system?.category, condition: item.system?.condition });
  }
  return sensorsAreOut(modules);
}

/**
 * Tir visé : section, puis module, sur l'unique cible.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {Actor} ship
 * @param {"section"|"module"} aim
 * @param {TokenDocument|null} [token]
 * @returns {Promise<null|{ sectionId: string, moduleId: string }>}
 */
async function aimAt(ship, aim, token = null) {
  const single = singleTarget(ship, token);
  if ( !single?.actor ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.aimOneTarget"));
    return null;
  }
  const sectionId = await choose(game.i18n.localize("SOL.Ship.pickSection"), ["bow", "port", "starboard", "stern", "radiators"].map(id => ({
    id,
    label: game.i18n.localize(SOL.shipSections[id])
  })));
  if ( !sectionId ) return null;
  if ( aim === "section" ) return { sectionId, moduleId: "" };
  const modules = single.actor.items.filter(item => item.type === "shipModule" && item.system.section === sectionId);
  if ( !modules.length ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.aimNoModule"));
    return null;
  }
  const moduleId = await choose(game.i18n.localize("SOL.Ship.pickModule"), modules.map(item => ({
    id: item.id,
    label: item.name
  })));
  if ( !moduleId ) return null;
  return { sectionId, moduleId };
}

/**
 * @param {Actor} ship
 * @param {TokenDocument|null} [token]
 * @returns {{ actor: Actor, tokenId: string, tokenUuid: string, actorUuid: string }|null}
 */
function singleTarget(ship, token = null) {
  const targets = targetedShipTokens(ship, token);
  if ( !lockRollAllowed(targets.length) ) return null;
  return targets[0];
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function boundedDie(value) {
  const number = Math.trunc(Number(value));
  if ( !Number.isFinite(number) || number < 1 || number > 100 ) return null;
  return number;
}

/**
 * @param {Actor} ship
 * @returns {boolean}
 */
function maneuverAllowed(ship) {
  const category = ship?.system?._source?.category ?? ship?.system?.category;
  if ( refusesManeuver(category) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Space.fixedNoManeuver"));
    return false;
  }
  return true;
}

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function boundNumber(value, min, max) {
  const number = Number(value);
  if ( !Number.isFinite(number) ) return min;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

/**
 * @param {object} message
 * @returns {{ success: boolean, dr: number, de: number, score: number }}
 */
function boundedRoll(message) {
  return {
    success: message.success === true,
    dr: boundNumber(message.dr, 0, 10),
    de: Number.isFinite(Number(message.de)) ? Number(message.de) : 0,
    score: boundNumber(message.score, 0, 200)
  };
}

/**
 * Le joueur doit posséder le vaisseau, ou l'acteur qui tient le poste.
 * `userId` vient du message : il est déclaratif.
 *
 * @param {unknown} userId
 * @param {Actor} ship
 * @param {unknown} postId
 * @returns {Promise<boolean>}
 */
async function userOwnsShipOrPost(userId, ship, postId) {
  if ( typeof userId !== "string" || !userId ) return false;
  const user = game.users.get(userId);
  if ( !user ) return false;
  if ( ship.testUserPermission(user, "OWNER") ) return true;
  if ( typeof postId !== "string" || !SHIP_POST_IDS.includes(postId) ) return false;
  const uuid = ship.system._source?.posts?.[postId]?.actorUuid
    || ship.system?.posts?.[postId]?.actorUuid
    || "";
  if ( !uuid ) return false;
  const holder = await foundry.utils.fromUuid(uuid);
  if ( !holder || holder.documentName !== "Actor" ) return false;
  return holder.testUserPermission(user, "OWNER") === true;
}
