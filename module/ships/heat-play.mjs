/**
 * Chaleur, critique du réacteur et réparations, côté Foundry.
 *
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 * // Réf. Vaisseaux v0.1 §7
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.deleteDocument.html
 */
import { SOL } from "../config.mjs";
import { resolveReactorCrit } from "./damage.mjs";
import { moduleCondition } from "./hull.mjs";
import {
  FIELD_REPAIR_VALUE,
  addHeat,
  clampHeat,
  combatIdForShip,
  coolingDrop,
  noSpareParts,
  reactorIsDown,
  repairGain,
  repairedValue,
  shouldCoolRound,
  uniqueShipIds
} from "./reactor.mjs";
import { SHIP_POST_IDS, keepGmChecks, requesterIsGm } from "./hull.mjs";
import { readHull, writeHull } from "./strike.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";

/**
 * Cartes de chaleur et d'incident, et retour des réparations de fortune.
 * Une fois, sur `init`.
 *
 * @returns {void}
 */
export function registerHeatPlay() {
  Hooks.on("renderChatMessageHTML", onHeatCard);
  Hooks.on("deleteCombat", combat => { void restoreFieldRepairs(combat); });
  // Le hook reçoit un id. On le relit. Le modèle, lui, reçoit l'objet User.
  // Les deux refusent à un joueur de décocher. Le MJ actif voit le même diff.
  // https://foundryvtt.com/api/v14/functions/hookEvents.preUpdateDocument.html
  Hooks.on("preUpdateActor", (actor, changes, _options, userId) => {
    if ( actor?.type !== "ship" || !changes?.system ) return;
    const user = typeof userId === "object" && userId ? userId : game.users?.get?.(userId);
    if ( requesterIsGm(user) ) return;
    keepGmChecks(changes.system, actor.system);
  });
  // Saisie manuelle à 10 : la carte part. changeHeat pose solHeatFromCode
  // pour ne pas la poster deux fois.
  // https://foundryvtt.com/api/v14/functions/hookEvents.updateDocument.html
  Hooks.on("updateActor", (actor, changes, options) => {
    if ( game.user?.id !== game.users?.activeGM?.id ) return;
    if ( actor?.type !== "ship" || options?.solHeatFromCode === true ) return;
    const value = changes?.system?.heat?.value;
    if ( value !== 10 ) return;
    void postHeatCard(actor);
  });
}

/**
 * @param {Actor} ship
 * @returns {number}
 */
export function heatOf(ship) {
  return clampHeat(ship?.system?._source?.heat?.value ?? ship?.system?.heat?.value);
}

/**
 * @param {Actor} ship
 * @returns {boolean}
 */
export function shipReactorDown(ship) {
  return reactorIsDown(ship?.system?.reactorShutdown === true, moduleRows(ship));
}

/**
 * Un module réacteur hors service, même si la case n'est pas cochée.
 *
 * @param {Actor} ship
 * @returns {boolean}
 */
export function reactorModuleDown(ship) {
  return reactorIsDown(false, moduleRows(ship));
}

/**
 * @param {Actor} ship
 * @param {number} delta
 * @returns {Promise<number>}
 */
export async function changeHeat(ship, delta) {
  const before = heatOf(ship);
  const after = addHeat(before, delta);
  if ( after !== before ) await ship.update({ "system.heat.value": after }, { solHeatFromCode: true });
  if ( before < 10 && after === 10 ) await postHeatCard(ship);
  return after;
}

/**
 * @param {Actor} ship
 * @param {string} weaponId
 * @returns {Promise<void>}
 */
export async function spendCannonAmmo(ship, weaponId) {
  const item = ship.items?.get(weaponId);
  const ammo = item?.system?.weapon?.ammo?.value;
  // Décision Marc 30/10/2026 : munitions non saisies (null), on ne retire rien
  // et on n'écrit pas 0.
  if ( typeof ammo !== "number" ) return;
  await item.update({ "system.weapon.ammo.value": Math.max(0, Math.trunc(ammo) - 1) });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: article(game.i18n.localize("SOL.Ship.cannonSpent"))
  });
}

/**
 * @param {Actor} ship
 * @returns {Promise<void>}
 */
export async function postBricolage(ship) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: article(game.i18n.localize("SOL.Ship.repair.bricolage"))
  });
}

/**
 * @param {Actor} ship
 * @returns {Promise<void>}
 */
export async function postIncident(ship) {
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: `<article class="sol-nouvelle-ere"><p>${game.i18n.format("SOL.Ship.incidentAsk", { name })}</p>
      <p><button type="button" data-action="sol-incident-heat">${game.i18n.localize("SOL.Ship.incidentHeat")}</button>
      <button type="button" data-action="sol-incident-module">${game.i18n.localize("SOL.Ship.incidentModule")}</button></p></article>`,
    flags: { [SYSTEM_ID]: { type: "pilotIncident", shipUuid: ship.uuid } }
  });
}

/**
 * Refroidissement du round, après le critique si la jauge est à 10.
 * Le MJ actif seul. Une fois par vaisseau du combat.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
export async function coolCombat(combat) {
  if ( !combat || !shouldCoolRound(combat.getFlag?.(SYSTEM_ID, "heatRound"), combat.round) ) return;
  const round = Math.trunc(Number(combat.round));
  await combat.setFlag(SYSTEM_ID, "heatRound", round);
  const wanted = new Set(uniqueShipIds([...(combat.combatants ?? [])].map(row => ({
    uuid: row.actor?.uuid
  }))));
  const seen = new Set();
  for ( const combatant of combat.combatants ?? [] ) {
    const ship = combatant.actor;
    if ( !ship || ship.type !== "ship" || !wanted.has(ship.uuid) || seen.has(ship.uuid) ) continue;
    seen.add(ship.uuid);
    await coolOne(ship);
  }
}

/**
 * @param {Actor} ship
 * @param {string} moduleId
 * @returns {Promise<void>}
 */
export async function markFieldRepair(ship, moduleId) {
  const item = ship.items?.get(moduleId);
  if ( !item ) return;
  const parts = Number(ship.system?.spareParts);
  await item.update({ "system.integrity.value": FIELD_REPAIR_VALUE });
  const combatId = combatIdForShip(listedCombats(), ship.uuid);
  if ( !combatId ) return;
  await item.setFlag(SYSTEM_ID, "fieldRepair", combatId);
  if ( Number.isFinite(parts) ) await ship.update({ "system.spareParts": Math.max(0, Math.trunc(parts) - 1) });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: article(game.i18n.format("SOL.Ship.repair.patchSuccess", {
      name: foundry.utils.escapeHTML(ship.name ?? ""),
      module: foundry.utils.escapeHTML(item.name ?? "")
    }))
  });
}

/**
 * @param {Actor} ship
 * @returns {Promise<null|{ kind: string, id: string, yard: boolean, interval: string, actor: Actor, score: number, label: string }>}
 */
export async function askRepair(ship) {
  const escape = foundry.utils.escapeHTML;
  const people = repairPeople(ship);
  const targets = repairTargets(ship);
  if ( !targets.length ) return null;
  const personOptions = people.map(entry => `<option value="${escape(entry.id)}">${escape(entry.label)}</option>`).join("");
  const targetOptions = targets.map(entry => `<option value="${escape(entry.id)}">${escape(entry.label)}</option>`).join("");
  const content = `<div class="sol-ship-repair">
    <label>${escape(game.i18n.localize("SOL.Ship.repair.pickCrew"))}
      <select name="crew">${personOptions}</select></label>
    <label>${escape(game.i18n.localize("SOL.Ship.repair.pickTarget"))}
      <select name="target">${targetOptions}</select></label>
    <label>${escape(game.i18n.localize("SOL.Ship.repair.intervalRoute"))}
      <input type="radio" name="interval" value="route" checked></label>
    <label>${escape(game.i18n.localize("SOL.Ship.repair.intervalRush"))}
      <input type="radio" name="interval" value="rush"></label>
    <label><input type="checkbox" name="yard"> ${escape(game.i18n.localize("SOL.Ship.repair.yard"))}</label>
  </div>`;
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SOL.Ship.repair.fix") },
    content,
    buttons: [
      {
        action: "ok",
        label: game.i18n.localize("SOL.Ship.repair.fix"),
        default: true,
        callback: (_event, button) => ({
          crew: button.form?.elements?.crew?.value ?? "npc",
          target: button.form?.elements?.target?.value ?? "",
          interval: button.form?.elements?.interval?.value ?? "route",
          yard: button.form?.elements?.yard?.checked === true
        })
      },
      { action: "cancel", label: game.i18n.localize("SOL.Roll.cancel") }
    ],
    rejectClose: false
  });
  if ( !result || result === "cancel" || !result.target ) return null;
  const target = targets.find(entry => entry.id === result.target);
  if ( !target ) return null;
  const crew = await repairCrew(ship, result.crew);
  if ( !crew ) return null;
  return {
    ...bareTarget(target),
    yard: result.yard === true,
    interval: result.interval === "rush" ? "rush" : "route",
    ...crew
  };
}

/**
 * @param {Actor} ship
 * @param {{ kind: string, id: string, yard?: boolean, interval?: string, label?: string }} picked
 * @param {{ success?: boolean, dr?: number }} outcome
 * @returns {Promise<void>}
 */
export async function commitRepair(ship, picked, outcome) {
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  const interval = game.i18n.localize(picked.interval === "rush"
    ? "SOL.Ship.repair.intervalRush"
    : "SOL.Ship.repair.intervalRoute");
  if ( outcome?.success !== true ) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: ship }),
      content: article(`${game.i18n.format("SOL.Ship.repair.fail", { name })} ${game.i18n.format("SOL.Ship.repair.intervalNote", { interval })}`)
    });
    return;
  }
  if ( noSpareParts(ship.system?.spareParts) ) {
    await postBricolage(ship);
    return;
  }
  const gain = repairGain(outcome.dr);
  const parts = Math.max(0, Math.trunc(Number(ship.system.spareParts)) - 1);
  let value = 0;
  let targetLabel = picked.label ?? "";
  if ( picked.kind === "module" ) {
    const item = ship.items.get(picked.id);
    if ( !item ) return;
    value = repairedValue(item.system.integrity.value, item.system.integrity.max, gain, {});
    await item.update({ "system.integrity.value": value });
    if ( value > FIELD_REPAIR_VALUE ) await item.unsetFlag(SYSTEM_ID, "fieldRepair");
    targetLabel = item.name ?? targetLabel;
  } else if ( picked.kind === "plate" ) {
    const section = ship.system.sections?.[picked.id];
    value = repairedValue(section?.armor?.value, section?.armor?.max, gain, { plate: true, yard: picked.yard === true });
    await ship.update({ [`system.sections.${picked.id}.armor.value`]: value });
  } else {
    const section = ship.system.sections?.[picked.id];
    value = repairedValue(section?.integrity?.value, section?.integrity?.max, gain, {});
    await ship.update({ [`system.sections.${picked.id}.integrity.value`]: value });
  }
  await ship.update({ "system.spareParts": parts });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: article(`${game.i18n.format("SOL.Ship.repair.success", {
      name,
      gain,
      target: foundry.utils.escapeHTML(targetLabel),
      value
    })} ${game.i18n.format("SOL.Ship.repair.intervalNote", { interval })}`)
  });
}

/**
 * @param {Actor} ship
 * @returns {Promise<void>}
 */
/**
 * Critique réacteur, avec de vrais dés.
 * L'écriture ratée ne poste pas le critique comme s'il avait pris.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {Actor} ship
 * @returns {Promise<{ shutdown: boolean, wrote: boolean }>}
 */
export async function rollReactorCrit(ship) {
  const faceRoll = await oneDie("1d6");
  const face = shown(faceRoll);
  /** @type {Roll[]} */
  const rolls = [faceRoll];
  let shock = 0;
  if ( face === 5 ) {
    const shockRoll = await oneDie("1d10");
    rolls.push(shockRoll);
    shock = shown(shockRoll);
  }
  /** @type {Roll[]} */
  const pool6 = [];
  /** @type {Roll[]} */
  const pool10 = [];
  if ( face === 5 ) {
    for ( let index = 0; index < 8; index += 1 ) pool6.push(await oneDie("1d6"));
    for ( let index = 0; index < 4; index += 1 ) pool10.push(await oneDie("1d10"));
  }
  let sixAt = 0;
  let tenAt = 0;
  const before = readHull(ship);
  const resolved = resolveReactorCrit(before, face, shock, {
    d6() {
      const roll = pool6[sixAt++];
      if ( roll ) rolls.push(roll);
      return roll ? shown(roll) : 1;
    },
    d10() {
      const roll = pool10[tenAt++];
      if ( roll ) rolls.push(roll);
      return roll ? shown(roll) : 1;
    },
    pick(count) {
      const size = Math.trunc(Number(count));
      if ( !Number.isFinite(size) || size <= 1 ) return 0;
      return Math.floor(Math.random() * size);
    }
  });
  const wrote = await writeHull(ship, before, resolved.state);
  if ( wrote === false ) return { shutdown: false, wrote: false };
  if ( resolved.shutdown ) await ship.update({ "system.reactorShutdown": true });
  await postCrit(ship, resolved.logs, rolls);
  return { shutdown: resolved.shutdown === true, wrote: true };
}

/**
 * « Laisser tourner » ne programme rien de plus.
 * Au changement de round, si la chaleur est à 10 et le réacteur allumé,
 * le critique tombe quand même. Ne pas répondre à la carte a le même effet.
 * Le bouton ne fait que résoudre la carte et l'annoncer.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * @param {Actor} ship
 * @returns {Promise<void>}
 */
async function postHeatCard(ship) {
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: `<article class="sol-nouvelle-ere"><p>${game.i18n.format("SOL.Ship.heatReached", { name })}</p>
      <p><button type="button" data-action="sol-heat-cut">${game.i18n.localize("SOL.Ship.heatCut")}</button>
      <button type="button" data-action="sol-heat-run">${game.i18n.localize("SOL.Ship.heatRun")}</button></p></article>`,
    flags: { [SYSTEM_ID]: { type: "heatChoice", shipUuid: ship.uuid } }
  });
}

/**
 * @param {Actor} ship
 * @returns {Promise<void>}
 */
async function coolOne(ship) {
  const folded = ship.system?.radiatorsFolded === true;
  const down = shipReactorDown(ship);
  const running = ship.system?.reactorShutdown !== true && !reactorModuleDown(ship);
  if ( heatOf(ship) === 10 && running ) await rollReactorCrit(ship);
  const conditions = moduleRows(ship)
    .filter(entry => entry.category === "radiators")
    .map(entry => entry.condition);
  const next = clampHeat(heatOf(ship) - coolingDrop(conditions, folded));
  if ( next !== heatOf(ship) ) await ship.update({ "system.heat.value": next });
  if ( down && ship.system?.reactorShutdown !== true && reactorModuleDown(ship) ) {
    await ship.update({ "system.reactorShutdown": true });
  }
}

/**
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
async function restoreFieldRepairs(combat) {
  if ( game.user?.id !== game.users?.activeGM?.id ) return;
  const actors = shipActors();
  for ( const ship of actors ) {
    for ( const item of ship.items ?? [] ) {
      if ( item.getFlag?.(SYSTEM_ID, "fieldRepair") !== combat?.id ) continue;
      await item.update({ "system.integrity.value": 0 });
      await item.unsetFlag(SYSTEM_ID, "fieldRepair");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: ship }),
        content: article(game.i18n.format("SOL.Ship.repair.patchBack", {
          name: foundry.utils.escapeHTML(ship.name ?? ""),
          module: foundry.utils.escapeHTML(item.name ?? "")
        }))
      });
    }
  }
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
function onHeatCard(message, html) {
  const type = message.getFlag(SYSTEM_ID, "type");
  if ( type !== "heatChoice" && type !== "pilotIncident" ) return;
  if ( message.getFlag(SYSTEM_ID, "choiceResolved") === true ) {
    for ( const button of html.querySelectorAll("[data-action^=sol-heat], [data-action^=sol-incident]") ) {
      button.disabled = true;
    }
    return;
  }
  const ship = shipFromFlag(message);
  const allowed = viewerEngineer(ship, type === "pilotIncident");
  for ( const button of html.querySelectorAll("[data-action^=sol-heat], [data-action^=sol-incident]") ) {
    if ( !allowed ) {
      button.remove();
      continue;
    }
    if ( button.dataset.solBound === "1" ) continue;
    button.dataset.solBound = "1";
    button.addEventListener("click", event => {
      event.preventDefault();
      void onHeatClick(message, button);
    });
  }
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
/**
 * @param {ChatMessage} message
 * @param {string} action
 * @returns {Promise<void>}
 */
export async function finishHeatChoice(message, action) {
  return onHeatClick(message, { dataset: { action } });
}

async function onHeatClick(message, button) {
  if ( message.getFlag(SYSTEM_ID, "choiceResolved") === true ) return;
  const ship = shipFromFlag(message);
  if ( !ship ) return;
  const active = game.user?.id === game.users?.activeGM?.id;
  if ( !active ) {
    const { relayToGm } = await import("./actions.mjs");
    await relayToGm({
      type: "heatChoice",
      shipUuid: ship.uuid,
      messageId: message.id,
      action: button.dataset.action,
      userId: game.user.id
    });
    return;
  }
  const { userOwnsShipOrPost } = await import("./actions.mjs");
  const { heatChoiceRefusal } = await import("./reactor.mjs");
  const refusal = heatChoiceRefusal({
    cardType: message.getFlag(SYSTEM_ID, "type"),
    cardShipUuid: message.getFlag(SYSTEM_ID, "shipUuid"),
    shipUuid: ship.uuid,
    ownsEngineer: await userOwnsShipOrPost(game.user.id, ship, "engineer"),
    senderIsGm: game.user?.isGM === true,
    action: button.dataset.action
  });
  if ( refusal ) return;
  await message.setFlag(SYSTEM_ID, "choiceResolved", true);
  const action = button.dataset.action;
  const name = foundry.utils.escapeHTML(ship.name ?? "");
  if ( action === "sol-heat-cut" ) {
    await ship.update({ "system.reactorShutdown": true });
    await ChatMessage.create({ content: article(game.i18n.format("SOL.Ship.heatCutDone", { name })) });
    button.disabled = true;
    return;
  }
  if ( action === "sol-heat-run" ) {
    await ChatMessage.create({ content: article(game.i18n.format("SOL.Ship.heatRunDone", { name })) });
    button.disabled = true;
    return;
  }
  if ( action === "sol-incident-heat" ) {
    await changeHeat(ship, 1);
    await ChatMessage.create({ content: article(game.i18n.format("SOL.Ship.incidentHeatDone", { name })) });
    button.disabled = true;
    return;
  }
  if ( action === "sol-incident-module" ) {
    const moduleId = await pickModule(ship);
    if ( !moduleId ) {
      await message.unsetFlag(SYSTEM_ID, "choiceResolved");
      return;
    }
    const item = ship.items.get(moduleId);
    if ( !item ) return;
    const { incidentModuleValue } = await import("./damage.mjs");
    const next = incidentModuleValue(item.system.integrity.value, item.system.integrity.max);
    if ( !next ) {
      await message.unsetFlag(SYSTEM_ID, "choiceResolved");
      ui.notifications.info(game.i18n.localize("SOL.Ship.incidentNoModule"));
      return;
    }
    await item.update({ "system.integrity.value": next.integrity });
    const key = next.out ? "SOL.Ship.incidentModuleOut" : "SOL.Ship.incidentModuleDone";
    await ChatMessage.create({
      content: article(game.i18n.format(key, {
        name,
        module: foundry.utils.escapeHTML(item.name ?? "")
      }))
    });
    button.disabled = true;
  }
}

/**
 * @param {Actor} ship
 * @param {string} crewId
 * @returns {Promise<null|{ actor: Actor, score: number, label: string }>}
 */
async function repairCrew(ship, crewId) {
  if ( crewId === "npc" ) {
    const { shipInitiativeBasis } = await import("./combat.mjs");
    const basis = shipInitiativeBasis({ npcCrew: ship.system?.npcCrew });
    return { actor: ship, score: basis.score, label: `${ship.name} — Mécanique` };
  }
  const actor = await foundry.utils.fromUuid(crewId);
  if ( !actor || actor.documentName !== "Actor" ) return null;
  const skill = [...(actor.items ?? [])].find(item => item.type === "skill" && item.name === "Mécanique");
  const { skillScore } = await import("../dice/skill-score.mjs");
  const rated = skillScore(actor.system?.characteristics, skill?.system);
  if ( !skill || rated.impossible || typeof rated.score !== "number" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Roll.impossible"));
    return null;
  }
  return { actor, score: rated.score, label: `${actor.name} — Mécanique` };
}

/**
 * @param {Actor} ship
 * @returns {{ id: string, kind: string, label: string }[]}
 */
function repairTargets(ship) {
  /** @type {{ id: string, kind: string, label: string }[]} */
  const targets = [];
  for ( const id of ["bow", "port", "starboard", "stern"] ) {
    targets.push({
      id: `plate:${id}`,
      kind: "plate",
      label: game.i18n.format("SOL.Ship.repair.plate", { section: game.i18n.localize(SOL.shipSections[id]) })
    });
    targets.push({
      id: `section:${id}`,
      kind: "section",
      label: game.i18n.format("SOL.Ship.repair.section", { section: game.i18n.localize(SOL.shipSections[id]) })
    });
  }
  for ( const item of ship.items ?? [] ) {
    if ( item.type !== "shipModule" ) continue;
    targets.push({ id: `module:${item.id}`, kind: "module", label: item.name ?? item.id });
  }
  return targets.map(entry => ({
    ...entry,
    id: entry.id
  }));
}

/**
 * @param {{ id: string, kind: string, label: string }} entry
 * @returns {{ kind: string, id: string, label: string }}
 */
function bareTarget(entry) {
  const id = entry.id.includes(":") ? entry.id.split(":").slice(1).join(":") : entry.id;
  return { kind: entry.kind, id, label: entry.label };
}

/**
 * @param {Actor} ship
 * @returns {Promise<string|null>}
 */
async function pickModule(ship) {
  const modules = [...(ship.items ?? [])].filter(item => item.type === "shipModule" && Number(item.system?.integrity?.value) > 0);
  if ( !modules.length ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.incidentNoModule"));
    return null;
  }
  const escape = foundry.utils.escapeHTML;
  const options = modules.map(item => `<option value="${escape(item.id)}">${escape(item.name ?? item.id)}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("SOL.Ship.incidentModule") },
    content: `<label><select name="module">${options}</select></label>`,
    buttons: [
      {
        action: "ok",
        label: game.i18n.localize("SOL.Ship.incidentModule"),
        default: true,
        callback: (_event, button) => button.form?.elements?.module?.value ?? ""
      },
      { action: "cancel", label: game.i18n.localize("SOL.Roll.cancel") }
    ],
    rejectClose: false
  });
  if ( !result || result === "cancel" ) return null;
  return String(result);
}

/**
 * @param {Actor} ship
 * @param {{ key: string, data?: object }[]} logs
 * @param {Roll[]} rolls
 * @returns {Promise<void>}
 */
async function postCrit(ship, logs, rolls) {
  const items = logs.map(entry => `<li>${game.i18n.format(entry.key, entry.data ?? {})}</li>`).join("");
  /** @type {object} */
  const data = {
    speaker: ChatMessage.getSpeaker({ actor: ship }),
    content: `<article class="sol-nouvelle-ere"><ul>${items}</ul></article>`
  };
  if ( rolls.length ) {
    data.rolls = rolls;
    data.sound = CONFIG.sounds.dice;
  }
  await ChatMessage.create(data);
}

/**
 * @param {string} formula
 * @returns {Promise<Roll>}
 */
async function oneDie(formula) {
  const roll = new Roll(formula);
  await roll.evaluate();
  return roll;
}

/**
 * @param {Roll} roll
 * @returns {number}
 */
function shown(roll) {
  const total = Math.trunc(Number(roll?.total));
  return Number.isFinite(total) ? total : 1;
}

/**
 * @param {Actor} ship
 * @returns {{ category?: string, integrity?: unknown, integrityMax?: unknown, condition?: string }[]}
 */
function moduleRows(ship) {
  /** @type {{ category?: string, integrity?: unknown, integrityMax?: unknown, condition?: string }[]} */
  const rows = [];
  for ( const item of ship?.items ?? [] ) {
    if ( item.type !== "shipModule" ) continue;
    const integrity = item.system?.integrity ?? {};
    rows.push({
      category: item.system?.category,
      integrity: integrity.value,
      integrityMax: integrity.max,
      condition: item.system?.condition ?? moduleCondition(integrity.value, integrity.max)
    });
  }
  return rows;
}

/**
 * @returns {Array<{ id: string, combatants: Array<{ actorUuid: string }> }>}
 */
function listedCombats() {
  /** @type {Array<{ id: string, combatants: Array<{ actorUuid: string }> }>} */
  const list = [];
  for ( const combat of game.combats ?? [] ) {
    /** @type {Array<{ actorUuid: string }>} */
    const combatants = [];
    for ( const row of combat.combatants ?? [] ) {
      combatants.push({ actorUuid: row.actor?.uuid ?? "" });
    }
    list.push({ id: combat.id, combatants });
  }
  return list;
}

/**
 * Équipage du vaisseau, acteurs possédés, et tous les personnages si MJ.
 *
 * @param {Actor} ship
 * @returns {{ id: string, label: string }[]}
 */
function repairPeople(ship) {
  /** @type {{ id: string, label: string }[]} */
  const people = [{ id: "npc", label: game.i18n.localize("SOL.Ship.npcCrew.label") }];
  const seen = new Set(["npc"]);
  const add = (id, label) => {
    if ( !id || seen.has(id) ) return;
    seen.add(id);
    people.push({ id, label: label || id });
  };
  for ( const postId of SHIP_POST_IDS ) {
    const uuid = ship.system?._source?.posts?.[postId]?.actorUuid
      ?? ship.system?.posts?.[postId]?.actorUuid
      ?? "";
    if ( typeof uuid === "string" && uuid ) add(uuid, uuid);
  }
  const gm = game.user?.isGM === true;
  for ( const actor of game.actors ?? [] ) {
    if ( actor.type !== "character" && actor.type !== "npc" ) continue;
    if ( gm && actor.type === "character" ) add(actor.uuid, actor.name ?? actor.id);
    else if ( actor.isOwner === true ) add(actor.uuid, actor.name ?? actor.id);
  }
  for ( const person of people ) {
    if ( person.id === "npc" ) continue;
    if ( person.label && person.label !== person.id ) continue;
    try {
      const doc = foundry.utils.fromUuidSync(person.id);
      if ( doc?.name ) person.label = doc.name;
    } catch {
      // L'uuid reste le libellé.
    }
  }
  return people;
}

/**
 * @returns {Actor[]}
 */
function shipActors() {
  /** @type {Actor[]} */
  const actors = [];
  for ( const actor of game.actors ?? [] ) {
    if ( actor.type === "ship" ) actors.push(actor);
  }
  for ( const scene of game.scenes ?? [] ) {
    for ( const token of scene.tokens ?? []) {
      if ( token.actorLink === false && token.actor?.type === "ship" ) actors.push(token.actor);
    }
  }
  return actors;
}

/**
 * @param {ChatMessage} message
 * @returns {Actor|null}
 */
function shipFromFlag(message) {
  const uuid = message.getFlag(SYSTEM_ID, "shipUuid");
  if ( typeof uuid !== "string" || !foundry?.utils?.fromUuidSync ) return null;
  try {
    const doc = foundry.utils.fromUuidSync(uuid);
    if ( doc?.documentName === "Actor" && doc.type === "ship" ) return doc;
    if ( doc?.documentName === "Token" && doc.actor?.type === "ship" ) return doc.actor;
  } catch {
    return null;
  }
  return null;
}

/**
 * Chaleur : ingénieur ou MJ. Incident : MJ seul.
 *
 * @param {Actor|null} ship
 * @param {boolean} gmOnly
 * @returns {boolean}
 */
function viewerEngineer(ship, gmOnly) {
  if ( game.user?.isGM === true && (!gmOnly || game.user?.id === game.users?.activeGM?.id) ) return true;
  if ( gmOnly || !ship ) return false;
  if ( ship.isOwner === true ) return true;
  const uuid = ship.system?.posts?.engineer?.actorUuid ?? "";
  if ( !uuid || !foundry?.utils?.fromUuidSync ) return false;
  try {
    return foundry.utils.fromUuidSync(uuid)?.isOwner === true;
  } catch {
    return false;
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function article(text) {
  return `<article class="sol-nouvelle-ere"><p>${text}</p></article>`;
}

export { bareTarget };
