/**
 * Dégâts de vaisseau et missiles, côté Foundry.
 *
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4 et §5.
 * Décision Marc 26/10/2026 : le bouton est au MJ actif, une fois,
 * noté avant l'écriture. Les dégâts sont relus sur l'arme.
 * Les effets sur l'équipage sont annoncés, pas appliqués.
 * Pas de compte à rebours sur le vaisseau.
 *
 * Le relais des missiles est dans `actions.mjs` : un joueur
 * ne possède pas le Combat. Ici, le MJ écrit l'acteur et le drapeau.
 *
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.renderChatMessageHTML.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.updateDocument.html
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.preUpdateDocument.html
 */
import { SOL } from "../config.mjs";
import { mayAuthorStrike } from "./combat.mjs";
import {
  applyHullDamage,
  beginShipApply,
  claimMissileReminders,
  hullFromDocument,
  invertDie,
  isMissileWeapon,
  isWreck,
  missileDecoyed,
  pickLivingModule,
  resolveShipStrike,
  sectionFromInverted,
  shipStrikeAmount,
  MISSILE_DAMAGE
} from "./damage.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";
const MISSILES = "missiles";
const APPLIED = "shipStrikesApplied";
const RECORDED = "shipStrikeRecord";
const FLIGHT = "systems/sol-nouvelle-ere/templates/chat/missile-card.hbs";
const SECTIONS = ["bow", "port", "starboard", "stern", "radiators"];

/** Un double clic n'ouvre pas deux fenêtres. */
const busy = new Set();

/** Épave avant l'écriture, pour n'annoncer que le passage. */
const wasWreck = new WeakMap();

/** Écritures de la liste de missiles, l'une après l'autre. */
let missileChain = Promise.resolve();

/** Notes « déjà appliqué », l'une après l'autre. */
let appliedChain = Promise.resolve();

/**
 * Cartes de tir, cartes de missile, annonce d'épave.
 * Une fois, sur `init`.
 *
 * @returns {void}
 */
export function registerShipStrike() {
  // Le joueur possède la carte : il peut effacer son drapeau.
  // Le réglage de monde, lui, n'est écrit que par un MJ.
  // https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html
  game.settings.register(SYSTEM_ID, APPLIED, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
  game.settings.register(SYSTEM_ID, RECORDED, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
  Hooks.on("renderChatMessageHTML", onChatCard);
  Hooks.on("createChatMessage", message => { void rememberStrike(message); });
  Hooks.on("deleteChatMessage", message => { void forgetStrike(message); });
  // Le MJ actif a changé : les boutons et les missiles en attente.
  // https://foundryvtt.com/api/v14/functions/hookEvents.userConnected.html
  Hooks.on("userConnected", () => { void onActiveGm(); });
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("preUpdateItem", onPreUpdateItem);
  Hooks.on("updateItem", onUpdateItem);
}

/**
 * @param {Actor} actor
 * @returns {import("./damage.mjs").HullState}
 */
export function readHull(actor) {
  return hullFromDocument(actor?.system?._source ?? actor?.system, actor?.items);
}

/**
 * @param {Combat|null|undefined} combat
 * @returns {object[]}
 */
export function readMissiles(combat) {
  const raw = combat?.getFlag?.(SYSTEM_ID, MISSILES);
  if ( !Array.isArray(raw) ) return [];
  return raw.map(cleanMissile).filter(Boolean);
}

/**
 * Ajoute un missile en vol. Le MJ seul appelle ceci.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {Combat} combat
 * @param {object} missile
 * @returns {Promise<object|null>}
 */
export async function enqueueMissile(combat, missile) {
  const clean = cleanMissile(missile);
  if ( !combat || !clean || !isActiveGm() ) return null;
  return queueMissileWrite(async () => {
    if ( !isActiveGm() ) return null;
    const list = readMissiles(combat);
    list.push(clean);
    await combat.setFlag(SYSTEM_ID, MISSILES, list);
    await postMissileCard(combat, clean, { impact: false });
    return clean;
  });
}

/**
 * Rappel au round d'arrivée, par le MJ actif.
 * La carte d'arrivée porte les boutons. Décision Marc 25/10/2026.
 *
 * @param {Combat} combat
 * @returns {Promise<void>}
 */
export async function remindMissiles(combat) {
  if ( !isActiveGm() || !combat ) return;
  await queueMissileWrite(async () => {
    if ( !isActiveGm() ) return;
    const claimed = claimMissileReminders(readMissiles(combat), combat.round);
    if ( !claimed.due.length ) return;
    await combat.setFlag(SYSTEM_ID, MISSILES, claimed.list);
    for ( const missile of claimed.due ) {
      await postMissileCard(combat, missile, { impact: true });
    }
  });
}

/**
 * @param {string} combatId
 * @param {string} missileId
 * @returns {object|null}
 */
export function missileRecord(combatId, missileId) {
  const combat = game.combats?.get(combatId);
  if ( !combat || typeof missileId !== "string" ) return null;
  return readMissiles(combat).find(entry => entry.id === missileId) ?? null;
}

/**
 * @param {string} combatId
 * @param {string} missileId
 * @param {"decoyed"|"destroyed"|"impacted"} state
 * @returns {Promise<object|null>}
 */
export async function setMissileState(combatId, missileId, state) {
  const combat = game.combats?.get(combatId);
  if ( !combat || !isActiveGm() ) return null;
  return queueMissileWrite(async () => {
    if ( !isActiveGm() ) return null;
    const list = readMissiles(combat);
    const missile = list.find(entry => entry.id === missileId);
    if ( !missile || missile.state !== "flying" ) return missile ?? null;
    missile.state = state;
    await combat.setFlag(SYSTEM_ID, MISSILES, list);
    await paintMessages(missileId, state);
    return missile;
  });
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 * @returns {void}
 */
function onChatCard(message, html) {
  const apply = html.querySelector("[data-action=sol-apply-ship]");
  if ( apply ) bindApply(message, apply);
  const counter = html.querySelector("[data-action=sol-missile-counter]");
  const laser = html.querySelector("[data-action=sol-missile-laser]");
  if ( counter || laser ) bindMissile(message, counter, laser, apply);
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} apply
 * @returns {void}
 */
function bindApply(message, apply) {
  if ( !isActiveGm() ) {
    apply.remove();
    return;
  }
  const done = strikeWasApplied(message)
    || message.getFlag(SYSTEM_ID, "missileState") && message.getFlag(SYSTEM_ID, "missileState") !== "flying";
  if ( done ) gray(apply, "SOL.Ship.applied");
  if ( apply.dataset.solBound === "1" ) return;
  apply.dataset.solBound = "1";
  apply.addEventListener("click", event => {
    event.preventDefault();
    if ( event.detail > 1 ) return;
    void applyShipDamage(message, apply);
  });
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement|null} counter
 * @param {HTMLButtonElement|null} laser
 * @param {HTMLButtonElement|null} apply
 * @returns {void}
 */
function bindMissile(message, counter, laser, apply) {
  const state = message.getFlag(SYSTEM_ID, "missileState");
  const stopped = typeof state === "string" && state !== "flying";
  const target = shipOf(message.getFlag(SYSTEM_ID, "shipStrike")?.targetUuid);
  if ( counter ) {
    if ( !viewerCan(target, "operator") ) counter.remove();
    else if ( stopped ) gray(counter, "SOL.Ship.missileStopped");
    else if ( counter.dataset.solBound !== "1" ) {
      counter.dataset.solBound = "1";
      counter.addEventListener("click", event => {
        event.preventDefault();
        if ( event.detail > 1 ) return;
        void onCounter(message, counter);
      });
    }
  }
  if ( laser ) {
    if ( !viewerCan(target, "gunner") ) laser.remove();
    else if ( stopped ) gray(laser, "SOL.Ship.missileStopped");
    else if ( laser.dataset.solBound !== "1" ) {
      laser.dataset.solBound = "1";
      laser.addEventListener("click", event => {
        event.preventDefault();
        if ( event.detail > 1 ) return;
        void onLaser(message, laser);
      });
    }
  }
  if ( apply && stopped ) gray(apply, "SOL.Ship.applied");
}

/**
 * @param {HTMLButtonElement} button
 * @param {string} key
 * @returns {void}
 */
function gray(button, key) {
  button.disabled = true;
  button.textContent = game.i18n.localize(key);
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function applyShipDamage(message, button) {
  const opened = beginShipApply({ activeGm: isActiveGm(), applied: strikeWasApplied(message) });
  if ( !opened.ok ) {
    if ( opened.applied ) gray(button, "SOL.Ship.applied");
    return;
  }
  const strike = readStrike(message);
  if ( !strike ) return;
  if ( !strikeMatchesRecord(message, strike) ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.forgeRefused"));
    return;
  }
  const key = `${message.id}:apply`;
  if ( busy.has(key) ) return;
  busy.add(key);
  try {
    if ( strike.missileId && !missileFlying(message, strike.missileId) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.missileGone"));
      gray(button, "SOL.Ship.applied");
      return;
    }
    const target = await resolveShip(strike.targetUuid);
    if ( !target ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.noTarget"));
      return;
    }
    const amount = await strikeAmount(strike, message);
    if ( amount === null ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.damageUnread"));
      return;
    }
    const fleeing = target.system?.fleeing === true;
    const sectionId = strikeSection(strike, fleeing);
    if ( !sectionId ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.noSection"));
      return;
    }
    const hull = readHull(target);
    const modules = hull.modules.filter(entry => entry.section === sectionId && entry.id);
    const preset = strike.aim === "module"
      ? modules.find(entry => entry.id === strike.moduleId) ?? pickLivingModule(modules, sectionId, randomIndex)
      : pickLivingModule(modules, sectionId, randomIndex);
    const picked = await confirmStrike(hull, sectionId, modules, preset?.id ?? "", amount);
    if ( !picked ) return;
    if ( strike.missileId && !missileFlying(message, strike.missileId) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.missileGone"));
      return;
    }
    const again = beginShipApply({ activeGm: isActiveGm(), applied: strikeWasApplied(message) });
    if ( !again.ok ) {
      if ( again.applied ) gray(button, "SOL.Ship.applied");
      return;
    }
    const dice = await strikeDice();
    const before = readHull(target);
    const resolved = resolveShipStrike(before, {
      sectionId,
      moduleId: picked.moduleId || null,
      amount
    }, dice);
    await markStrikeApplied(message);
    const wrote = await writeHull(target, before, resolved.state);
    if ( wrote === false ) return;
    await postResolution(target, sectionId, picked.moduleId, resolved, dice.rolls);
    gray(button, "SOL.Ship.applied");
    if ( strike.missileId ) {
      const combatId = message.getFlag(SYSTEM_ID, "combatId");
      if ( typeof combatId === "string" ) await setMissileState(combatId, strike.missileId, "impacted");
    }
  } finally {
    busy.delete(key);
  }
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function onCounter(message, button) {
  const held = missileContext(message);
  if ( !held ) return;
  const key = `${message.id}:counter`;
  if ( busy.has(key) ) return;
  busy.add(key);
  try {
    if ( !arrivalReached(held.combat, held.missile) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.counterSoon"));
      return;
    }
    const target = await resolveShip(held.missile.targetUuid);
    if ( !target || !viewerCan(target, "operator") ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.notYourPost"));
      return;
    }
    const { rollOperatorOpposed } = await import("./actions.mjs");
    const outcome = await rollOperatorOpposed(target, null);
    if ( !outcome ) return;
    if ( !isActiveGm() ) {
      const { relayMissileResolve } = await import("./actions.mjs");
      await relayMissileResolve(target, "operator", {
        kind: "counter",
        missileId: held.missile.id,
        combatId: held.combat.id,
        success: outcome.success === true,
        dr: outcome.dr,
        score: outcome.score
      });
      return;
    }
    await finishCounter(held.combat.id, held.missile, outcome);
    if ( held.missile && missileRecord(held.combat.id, held.missile.id)?.state !== "flying" ) {
      gray(button, "SOL.Ship.missileStopped");
    }
  } finally {
    busy.delete(key);
  }
}

/**
 * @param {ChatMessage} message
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function onLaser(message, button) {
  const held = missileContext(message);
  if ( !held ) return;
  const key = `${message.id}:laser`;
  if ( busy.has(key) ) return;
  busy.add(key);
  try {
    if ( !arrivalReached(held.combat, held.missile) ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.counterSoon"));
      return;
    }
    const target = await resolveShip(held.missile.targetUuid);
    if ( !target || !viewerCan(target, "gunner") ) {
      ui.notifications.warn(game.i18n.localize("SOL.Ship.notYourPost"));
      return;
    }
    const { rollDefenseLaser } = await import("./actions.mjs");
    const outcome = await rollDefenseLaser(target, null);
    if ( !outcome ) return;
    if ( !isActiveGm() ) {
      const { relayMissileResolve } = await import("./actions.mjs");
      await relayMissileResolve(target, "gunner", {
        kind: "laser",
        missileId: held.missile.id,
        combatId: held.combat.id,
        success: outcome.success === true,
        dr: outcome.dr,
        score: outcome.score
      });
      return;
    }
    await finishLaser(held.combat.id, held.missile, outcome.success === true);
    if ( outcome.success === true ) gray(button, "SOL.Ship.missileStopped");
  } finally {
    busy.delete(key);
  }
}

/**
 * Le MJ compare au jet de lancement gardé, pas aux nombres du joueur.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {string} combatId
 * @param {object} missile
 * @param {{ success?: boolean, dr?: number, score?: number }} outcome
 * @returns {Promise<void>}
 */
export async function finishCounter(combatId, missile, outcome) {
  const current = missileRecord(combatId, missile.id);
  if ( !current || current.state !== "flying" ) return;
  const decoyed = missileDecoyed(outcome, current.launch);
  if ( decoyed ) await setMissileState(combatId, current.id, "decoyed");
  await ChatMessage.create({
    content: article(game.i18n.localize(decoyed ? "SOL.Ship.counterWin" : "SOL.Ship.counterLose"))
  });
}

/**
 * @param {string} combatId
 * @param {object} missile
 * @param {boolean} hit
 * @returns {Promise<void>}
 */
export async function finishLaser(combatId, missile, hit) {
  const current = missileRecord(combatId, missile.id);
  if ( !current || current.state !== "flying" ) return;
  if ( hit ) await setMissileState(combatId, current.id, "destroyed");
  await ChatMessage.create({
    content: article(game.i18n.localize(hit ? "SOL.Ship.laserHit" : "SOL.Ship.laserMiss"))
  });
}

/**
 * @param {Actor} actor
 * @param {object} changes
 * @returns {void}
 */
function onPreUpdateActor(actor) {
  if ( actor?.type !== "ship" ) return;
  wasWreck.set(actor, isWreck(readHull(actor)));
}

/**
 * @param {Actor} actor
 * @returns {void}
 */
function onUpdateActor(actor) {
  if ( game.user?.isActiveGM !== true || actor?.type !== "ship" ) return;
  const before = wasWreck.get(actor);
  wasWreck.delete(actor);
  if ( before !== false ) return;
  if ( !isWreck(readHull(actor)) ) return;
  void announceWreck(actor);
}

/**
 * @param {Item} item
 * @returns {void}
 */
function onPreUpdateItem(item) {
  const actor = item?.parent;
  if ( !actor || actor.documentName !== "Actor" || actor.type !== "ship" ) return;
  wasWreck.set(actor, isWreck(readHull(actor)));
}

/**
 * @param {Item} item
 * @returns {void}
 */
function onUpdateItem(item) {
  const actor = item?.parent;
  if ( game.user?.isActiveGM !== true || !actor || actor.type !== "ship" ) return;
  const before = wasWreck.get(actor);
  wasWreck.delete(actor);
  if ( before !== false ) return;
  if ( !isWreck(readHull(actor)) ) return;
  void announceWreck(actor);
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function announceWreck(actor) {
  const name = foundry.utils.escapeHTML(actor.name ?? "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: article(game.i18n.format("SOL.Ship.wreckChat", { name }))
  });
}

/**
 * @param {object} strike
 * @param {boolean} fleeing
 * @returns {string}
 */
function strikeSection(strike, fleeing) {
  if ( strike.missileId || strike.aim === "none" ) {
    const zone = sectionFromInverted(invertDie(strike.die), fleeing);
    return zone ?? "";
  }
  return SECTIONS.includes(strike.sectionId) ? strike.sectionId : "";
}

/**
 * @param {Actor} target
 * @param {import("./damage.mjs").HullState} hull
 * @param {string} sectionId
 * @param {import("./damage.mjs").HullModule[]} modules
 * @param {string} moduleId
 * @returns {Promise<{ moduleId: string }|null>}
 */
async function confirmStrike(hull, sectionId, modules, moduleId, amount) {
  const escape = foundry.utils.escapeHTML;
  const section = hull.sections[sectionId] ?? {};
  const hasPlate = sectionId !== "radiators";
  const lines = [
    `<option value=""${moduleId ? "" : " selected"}>${escape(game.i18n.localize("SOL.Ship.confirmNone"))}</option>`
  ];
  for ( const module of modules ) {
    const selected = module.id === moduleId ? " selected" : "";
    lines.push(`<option value="${escape(module.id)}"${selected}>${escape(module.name || module.id)}</option>`);
  }
  const initial = breakText(hull, sectionId, hasPlate, section, moduleId, amount);
  const content = `<div class="sol-ship-strike">
    <p>${escape(game.i18n.localize("SOL.Ship.confirmSection"))} : <strong>${escape(game.i18n.localize(SOL.shipSections[sectionId] ?? sectionId))}</strong></p>
    <p>${escape(game.i18n.format("SOL.Ship.confirmAmount", { amount: Number(amount) || 0 }))}</p>
    <label>${escape(game.i18n.localize("SOL.Ship.confirmModule"))}
      <select name="module">${lines.join("")}</select>
    </label>
    <p data-ship-break>${escape(initial)}</p>
  </div>`;
  const paint = event => {
    const select = event.target;
    if ( select?.name !== "module" ) return;
    const node = select.closest(".sol-ship-strike")?.querySelector("[data-ship-break]");
    if ( !node ) return;
    node.textContent = breakText(hull, sectionId, hasPlate, section, select.value, amount);
  };
  document.addEventListener("change", paint, true);
  try {
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("SOL.Ship.confirmTitle") },
      content,
      buttons: [
        {
          action: "ok",
          label: game.i18n.localize("SOL.Ship.confirmOk"),
          default: true,
          callback: (_event, button) => {
            const select = button.form?.elements?.module;
            const value = select?.value ?? "";
            if ( value && !modules.some(entry => entry.id === value) ) return null;
            return { moduleId: value };
          }
        },
        {
          action: "cancel",
          label: game.i18n.localize("SOL.Roll.cancel")
        }
      ],
      rejectClose: false
    });
    if ( !result || result === "cancel" ) return null;
    if ( typeof result.moduleId !== "string" ) return null;
    return result;
  } finally {
    document.removeEventListener("change", paint, true);
  }
}

/**
 * @param {import("./damage.mjs").HullState} hull
 * @param {string} sectionId
 * @param {boolean} hasPlate
 * @param {object} section
 * @param {string} moduleId
 * @param {number} amount
 * @returns {string}
 */
function breakText(hull, sectionId, hasPlate, section, moduleId, amount) {
  const module = moduleId
    ? hull.modules.find(entry => entry.id === moduleId && entry.section === sectionId) ?? null
    : null;
  const spent = applyHullDamage({
    plate: hasPlate ? section.armor : null,
    module: module ? module.integrity : null,
    section: hasPlate ? section.integrity : null,
    amount
  });
  return game.i18n.format("SOL.Ship.breakLine", {
    plate: hasPlate ? String(spent.spent.plate) : "—",
    module: module ? String(spent.spent.module) : "—",
    section: hasPlate ? String(spent.spent.section) : "—",
    lost: String(spent.lost)
  });
}

/**
 * @returns {Promise<{ d6: () => number, d10: () => number, pick: (count: number) => number }>}
 */
async function strikeDice() {
  /** @type {Roll[]} */
  const six = [];
  /** @type {Roll[]} */
  const ten = [];
  for ( let index = 0; index < 16; index += 1 ) six.push(await rollPool("1d6"));
  for ( let index = 0; index < 8; index += 1 ) ten.push(await rollPool("1d10"));
  let sixAt = 0;
  let tenAt = 0;
  /** @type {Roll[]} */
  const rolls = [];
  return {
    d6() {
      const roll = six[sixAt++];
      if ( !roll ) return 1;
      rolls.push(roll);
      return shownTotal(roll);
    },
    d10() {
      const roll = ten[tenAt++];
      if ( !roll ) return 1;
      rolls.push(roll);
      return shownTotal(roll);
    },
    pick(count) {
      const size = Math.trunc(Number(count));
      if ( !Number.isFinite(size) || size <= 1 ) return 0;
      return Math.floor(Math.random() * size);
    },
    rolls
  };
}

/**
 * @param {string} formula
 * @returns {Promise<number>}
 * @see https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html
 */
async function rollPool(formula) {
  const roll = new Roll(formula);
  await roll.evaluate();
  return roll;
}

/**
 * @param {Roll} roll
 * @returns {number}
 */
function shownTotal(roll) {
  const total = Math.trunc(Number(roll?.total));
  return Number.isFinite(total) ? total : 1;
}

/**
 * @param {Actor} actor
 * @param {import("./damage.mjs").HullState} before
 * @param {import("./damage.mjs").HullState} after
 * @returns {Promise<void>}
 */
export async function writeHull(actor, before, after) {
  /** @type {Record<string, unknown>} */
  const update = {};
  if ( after.twisted === true && before.twisted !== true ) update["system.twisted"] = true;
  for ( const id of ["bow", "port", "starboard", "stern"] ) {
    const next = after.sections[id] ?? {};
    const prev = before.sections[id] ?? {};
    if ( next.armor !== prev.armor && next.armor !== undefined ) {
      update[`system.sections.${id}.armor.value`] = next.armor;
    }
    if ( next.integrity !== prev.integrity && next.integrity !== undefined ) {
      update[`system.sections.${id}.integrity.value`] = next.integrity;
    }
    if ( next.destroyed === true && prev.destroyed !== true ) update[`system.sections.${id}.destroyed`] = true;
  }
  /** @type {{ _id: string, [key: string]: unknown }[]} */
  const items = [];
  for ( const module of after.modules ) {
    const prev = before.modules.find(entry => entry.id === module.id);
    if ( !prev || !module.id ) continue;
    if ( module.integrity === prev.integrity ) continue;
    items.push({ _id: module.id, "system.integrity.value": module.integrity });
  }
  let wroteActor = false;
  try {
    if ( Object.keys(update).length ) {
      await actor.update(update);
      wroteActor = true;
    }
    if ( items.length ) await actor.updateEmbeddedDocuments("Item", items);
  } catch (error) {
    if ( wroteActor ) {
      /** @type {Record<string, unknown>} */
      const back = {};
      if ( Object.hasOwn(update, "system.twisted") ) back["system.twisted"] = before.twisted === true;
      for ( const id of ["bow", "port", "starboard", "stern"] ) {
        const prev = before.sections[id] ?? {};
        if ( Object.hasOwn(update, `system.sections.${id}.armor.value`) ) back[`system.sections.${id}.armor.value`] = prev.armor;
        if ( Object.hasOwn(update, `system.sections.${id}.integrity.value`) ) back[`system.sections.${id}.integrity.value`] = prev.integrity;
        if ( Object.hasOwn(update, `system.sections.${id}.destroyed`) ) back[`system.sections.${id}.destroyed`] = prev.destroyed === true;
      }
      try {
        await actor.update(back);
      } catch {
        // Le retour en arrière a aussi échoué. Le chat le dit.
      }
    }
    ui.notifications.error(game.i18n.localize("SOL.Ship.writeFailed"));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: article(game.i18n.localize("SOL.Ship.writeFailed"))
    });
    return false;
  }
  return true;
}

/**
 * @param {Actor} target
 * @param {string} sectionId
 * @param {string} moduleId
 * @param {{ logs: { key: string, data?: object }[], spent: object }} resolved
 * @param {Roll[]} [rolls] Dés de critique réellement tirés.
 * @returns {Promise<void>}
 */
async function postResolution(target, sectionId, moduleId, resolved, rolls = []) {
  const escape = foundry.utils.escapeHTML;
  const module = readHull(target).modules.find(entry => entry.id === moduleId);
  const line = game.i18n.format("SOL.Ship.damageLine", {
    ship: escape(target.name ?? ""),
    section: escape(game.i18n.localize(SOL.shipSections[sectionId] ?? sectionId)),
    plate: resolved.spent.plate,
    moduleName: escape(module?.name || "—"),
    module: resolved.spent.module,
    sectionSpent: resolved.spent.section,
    lost: resolved.spent.lost
  });
  const crits = resolved.logs.map(entry => {
    const data = {};
    for ( const [key, value] of Object.entries(entry.data ?? {}) ) {
      data[key] = typeof value === "string" ? escape(value) : value;
    }
    return `<li>${game.i18n.format(entry.key, data)}</li>`;
  }).join("");
  /** @type {object} */
  const data = {
    speaker: ChatMessage.getSpeaker({ actor: target }),
    content: `<article class="sol-nouvelle-ere"><p>${line}</p>${crits ? `<ul>${crits}</ul>` : ""}</article>`
  };
  if ( rolls.length ) {
    data.rolls = rolls;
    data.sound = CONFIG.sounds.dice;
  }
  await ChatMessage.create(data);
}

/**
 * @param {Combat} combat
 * @param {object} missile
 * @param {{ impact: boolean }} options
 * @returns {Promise<void>}
 */
async function postMissileCard(combat, missile, options) {
  const impact = options.impact === true;
  const damage = shipStrikeAmount(MISSILE_DAMAGE, missile.launch.dr, { missile: true });
  const name = missile.targetName || missile.targetUuid;
  const card = {
    title: game.i18n.localize(impact ? "SOL.Ship.missileImpact" : "SOL.Ship.missileFlight"),
    target: name,
    round: missile.arrivalRound,
    impact,
    damage,
    remind: impact ? game.i18n.format("SOL.Ship.missileRemind", { target: name }) : ""
  };
  const content = await foundry.applications.handlebars.renderTemplate(FLIGHT, card);
  /** @type {object} */
  const flags = {
    type: impact ? "missileImpact" : "missileFlight",
    missileId: missile.id,
    combatId: combat.id,
    missileState: missile.state
  };
  if ( impact ) {
    flags.shipStrike = {
      targetUuid: missile.targetUuid,
      attackerUuid: "",
      tokenId: "",
      weaponId: "",
      weaponDamage: MISSILE_DAMAGE,
      aim: "none",
      sectionId: "",
      moduleId: "",
      die: missile.launch.die,
      dr: missile.launch.dr,
      missileId: missile.id
    };
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content,
    flags: { [SYSTEM_ID]: flags }
  });
}

/**
 * @param {string} missileId
 * @param {string} state
 * @returns {Promise<void>}
 */
async function paintMessages(missileId, state) {
  const messages = game.messages;
  const contents = messages?.contents ?? (messages ? [...messages] : []);
  for ( const message of contents ) {
    if ( message.getFlag(SYSTEM_ID, "missileId") !== missileId ) continue;
    await message.setFlag(SYSTEM_ID, "missileState", state);
  }
}

/**
 * @param {ChatMessage} message
 * @returns {{ combat: Combat, missile: object }|null}
 */
function missileContext(message) {
  const missileId = message.getFlag(SYSTEM_ID, "missileId");
  const combatId = message.getFlag(SYSTEM_ID, "combatId");
  if ( typeof missileId !== "string" || typeof combatId !== "string" ) return null;
  const combat = game.combats?.get(combatId);
  const missile = missileRecord(combatId, missileId);
  if ( !combat || !missile || missile.state !== "flying" ) {
    ui.notifications.warn(game.i18n.localize("SOL.Ship.missileGone"));
    return null;
  }
  return { combat, missile };
}

/**
 * @param {Combat} combat
 * @param {object} missile
 * @returns {boolean}
 */
function arrivalReached(combat, missile) {
  const round = Number(combat?.round);
  const arrival = Number(missile?.arrivalRound);
  return Number.isFinite(round) && Number.isFinite(arrival) && round >= arrival;
}

/**
 * @param {ChatMessage} message
 * @param {string} missileId
 * @returns {boolean}
 */
function missileFlying(message, missileId) {
  const flagged = message.getFlag(SYSTEM_ID, "missileState");
  if ( flagged && flagged !== "flying" ) return false;
  const combatId = message.getFlag(SYSTEM_ID, "combatId");
  if ( typeof combatId !== "string" || !combatId ) return true;
  const missile = missileRecord(combatId, missileId);
  return !missile || missile.state === "flying";
}

/**
 * @param {ChatMessage} message
 * @returns {object|null}
 */
function readStrike(message) {
  const raw = message.getFlag(SYSTEM_ID, "shipStrike");
  if ( !raw || typeof raw !== "object" ) return null;
  const weaponDamage = Number(raw.weaponDamage);
  const dr = Number(raw.dr);
  const die = Number(raw.die);
  const targetUuid = typeof raw.targetUuid === "string" ? raw.targetUuid : "";
  if ( !targetUuid || !Number.isFinite(weaponDamage) || !Number.isFinite(dr) || !Number.isFinite(die) ) return null;
  if ( die < 1 || die > 100 ) return null;
  return {
    targetUuid,
    attackerUuid: typeof raw.attackerUuid === "string" ? raw.attackerUuid : "",
    tokenId: typeof raw.tokenId === "string" ? raw.tokenId : "",
    weaponId: typeof raw.weaponId === "string" ? raw.weaponId : "",
    weaponDamage,
    aim: raw.aim === "section" || raw.aim === "module" ? raw.aim : "none",
    sectionId: typeof raw.sectionId === "string" ? raw.sectionId : "",
    moduleId: typeof raw.moduleId === "string" ? raw.moduleId : "",
    die,
    dr,
    missileId: typeof raw.missileId === "string" ? raw.missileId : ""
  };
}

/**
 * @param {unknown} uuid
 * @returns {Promise<Actor|null>}
 */
async function resolveShip(uuid) {
  if ( typeof uuid !== "string" || !uuid ) return null;
  const doc = await foundry.utils.fromUuid(uuid);
  if ( !doc ) return null;
  if ( doc.documentName === "Actor" && doc.type === "ship" ) return doc;
  if ( doc.documentName === "Token" && doc.actor?.type === "ship" ) return doc.actor;
  return null;
}

/**
 * @param {unknown} uuid
 * @returns {Actor|null}
 */
function shipOf(uuid) {
  if ( typeof uuid !== "string" || !uuid || typeof foundry?.utils?.fromUuidSync !== "function" ) return null;
  try {
    const doc = foundry.utils.fromUuidSync(uuid);
    if ( !doc ) return null;
    if ( doc.documentName === "Actor" && doc.type === "ship" ) return doc;
    if ( doc.documentName === "Token" && doc.actor?.type === "ship" ) return doc.actor;
  } catch {
    return null;
  }
  return null;
}

/**
 * MJ, propriétaire du vaisseau, ou propriétaire de l'acteur du poste.
 *
 * @param {Actor|null} ship
 * @param {string} postId
 * @returns {boolean}
 */
function viewerCan(ship, postId) {
  if ( game.user?.isGM === true ) return true;
  if ( !ship ) return false;
  if ( ship.isOwner === true ) return true;
  const uuid = ship.system?._source?.posts?.[postId]?.actorUuid
    ?? ship.system?.posts?.[postId]?.actorUuid
    ?? "";
  if ( !uuid || typeof foundry?.utils?.fromUuidSync !== "function" ) return false;
  try {
    return foundry.utils.fromUuidSync(uuid)?.isOwner === true;
  } catch {
    return false;
  }
}

/**
 * @param {unknown} raw
 * @returns {object|null}
 */
function cleanMissile(raw) {
  if ( !raw || typeof raw !== "object" ) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const targetUuid = typeof raw.targetUuid === "string" ? raw.targetUuid : "";
  const arrival = Number(raw.arrivalRound);
  const die = Number(raw.launch?.die);
  const dr = Number(raw.launch?.dr);
  if ( !id || !targetUuid || !Number.isFinite(arrival) || !Number.isFinite(die) || !Number.isFinite(dr) ) return null;
  if ( die < 1 || die > 100 ) return null;
  const states = ["flying", "decoyed", "destroyed", "impacted"];
  return {
    id,
    targetUuid,
    targetName: typeof raw.targetName === "string" ? raw.targetName : "",
    attackerName: typeof raw.attackerName === "string" ? raw.attackerName : "",
    launch: {
      success: true,
      dr,
      score: Number.isFinite(Number(raw.launch?.score)) ? Number(raw.launch.score) : 0,
      die
    },
    range: raw.range === "long" ? "long" : "medium",
    arrivalRound: arrival,
    reminded: raw.reminded === true,
    state: states.includes(raw.state) ? raw.state : "flying"
  };
}

/**
 * @param {number} count
 * @returns {number}
 */
function randomIndex(count) {
  const size = Math.trunc(Number(count));
  if ( !Number.isFinite(size) || size <= 1 ) return 0;
  return Math.floor(Math.random() * size);
}

/**
 * @param {string} text Déjà traduit. Les noms sont échappés par l'appelant.
 * @returns {string}
 */
function article(text) {
  return `<article class="sol-nouvelle-ere"><p>${text}</p></article>`;
}

/**
 * MJ actif : `game.users.activeGM`, comparé par identifiant.
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Users.html#activeGM
 * @returns {boolean}
 */
/**
 * Photo du tir au moment où la carte est créée.
 * Un drapeau modifié ensuite ne s'applique pas.
 * // Décision Marc 30/10/2026, reliquat de relecture.
 *
 * // Décision Marc 30/10/2026 : MJ, propriétaire du vaisseau tireur,
 * ou propriétaire du personnage au poste Artilleur.
 *
 * @param {ChatMessage} message
 * @returns {Promise<void>}
 */
async function rememberStrike(message) {
  if ( !isActiveGm() || !message?.id ) return;
  const raw = message.getFlag(SYSTEM_ID, "shipStrike");
  if ( !raw || typeof raw !== "object" ) return;
  const stored = game.settings.get(SYSTEM_ID, RECORDED);
  const next = stored && typeof stored === "object" ? { ...stored } : {};
  next[message.id] = {
    attackerUuid: typeof raw.attackerUuid === "string" ? raw.attackerUuid : "",
    targetUuid: typeof raw.targetUuid === "string" ? raw.targetUuid : "",
    weaponId: typeof raw.weaponId === "string" ? raw.weaponId : "",
    missileId: typeof raw.missileId === "string" ? raw.missileId : ""
  };
  await game.settings.set(SYSTEM_ID, RECORDED, next);
}

/**
 * @param {ChatMessage} message
 * @returns {Promise<void>}
 */
async function forgetStrike(message) {
  if ( !isActiveGm() || !message?.id ) return;
  const stored = game.settings.get(SYSTEM_ID, RECORDED);
  if ( !stored || typeof stored !== "object" || !Object.hasOwn(stored, message.id) ) return;
  const next = { ...stored };
  delete next[message.id];
  await game.settings.set(SYSTEM_ID, RECORDED, next);
  const applied = game.settings.get(SYSTEM_ID, APPLIED);
  if ( applied && typeof applied === "object" && Object.hasOwn(applied, message.id) ) {
    const cleared = { ...applied };
    delete cleared[message.id];
    await game.settings.set(SYSTEM_ID, APPLIED, cleared);
  }
}

/**
 * @returns {Promise<void>}
 */
async function onActiveGm() {
  if ( !isActiveGm() ) return;
  const combat = game.combat;
  if ( combat ) await remindMissiles(combat);
  ui.chat?.render?.();
}

/**
 * @param {ChatMessage} message
 * @param {object} strike
 * @returns {boolean}
 */
function strikeMatchesRecord(message, strike) {
  const stored = game.settings.get(SYSTEM_ID, RECORDED);
  const recorded = stored && typeof stored === "object" ? stored[message.id] : null;
  if ( !recorded ) return false;
  if ( recorded.targetUuid !== strike.targetUuid ) return false;
  if ( recorded.attackerUuid !== strike.attackerUuid ) return false;
  if ( recorded.weaponId !== strike.weaponId ) return false;
  if ( (recorded.missileId || "") !== (strike.missileId || "") ) return false;
  return authorMayStrike(message, strike.attackerUuid);
}

/**
 * @param {ChatMessage} message
 * @param {string} attackerUuid
 * @returns {boolean}
 */
function authorMayStrike(message, attackerUuid) {
  const author = message.author;
  if ( !author ) return false;
  const ship = shipOf(attackerUuid);
  const level = foundry.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  const ownsShip = ship?.testUserPermission?.(author, level) === true;
  return mayAuthorStrike({
    gm: author.isGM === true,
    ownsShip,
    ownsPost: authorOwnsGunner(author, ship, level)
  });
}

/**
 * Le tir est le poste Artilleur.
 * // Décision Marc 30/10/2026
 *
 * @param {User} author
 * @param {Actor|null} ship
 * @param {number} level
 * @returns {boolean}
 */
function authorOwnsGunner(author, ship, level) {
  const uuid = ship?.system?._source?.posts?.gunner?.actorUuid
    ?? ship?.system?.posts?.gunner?.actorUuid
    ?? "";
  if ( typeof uuid !== "string" || !uuid || typeof foundry?.utils?.fromUuidSync !== "function" ) return false;
  try {
    const crew = foundry.utils.fromUuidSync(uuid);
    return crew?.testUserPermission?.(author, level) === true;
  } catch {
    return false;
  }
}

function isActiveGm() {
  const active = game.users?.activeGM;
  return Boolean(active && game.user?.id === active.id);
}

/**
 * @param {() => Promise<unknown>} task
 * @returns {Promise<unknown>}
 */
function queueMissileWrite(task) {
  const run = missileChain.then(task, task);
  missileChain = run.then(() => undefined, () => undefined);
  return run;
}

/**
 * @param {() => Promise<unknown>} task
 * @returns {Promise<unknown>}
 */
function queueApplied(task) {
  const run = appliedChain.then(task, task);
  appliedChain = run.then(() => undefined, () => undefined);
  return run;
}

/**
 * Réglage de monde, ou drapeau de carte. Le réglage fait foi.
 *
 * @param {ChatMessage} message
 * @returns {boolean}
 */
function strikeWasApplied(message) {
  const stored = game.settings.get(SYSTEM_ID, APPLIED);
  if ( stored && typeof stored === "object" && stored[message.id] === true ) return true;
  return message.getFlag(SYSTEM_ID, "shipApplied") === true;
}

/**
 * Noté avant `writeHull`. Le joueur ne peut pas effacer le réglage.
 *
 * @param {ChatMessage} message
 * @returns {Promise<void>}
 */
async function markStrikeApplied(message) {
  await queueApplied(async () => {
    const stored = game.settings.get(SYSTEM_ID, APPLIED);
    const next = stored && typeof stored === "object" ? { ...stored } : {};
    next[message.id] = true;
    await game.settings.set(SYSTEM_ID, APPLIED, next);
  });
  await message.setFlag(SYSTEM_ID, "shipApplied", true);
}

/**
 * Missile : 20 + DR du lancement gardé sur le Combat.
 * Tir : dégâts du module arme sur le vaisseau tireur, plus le DR de la carte.
 * Le nombre `weaponDamage` du drapeau n'est pas utilisé.
 * Décision Marc 26/10/2026.
 *
 * @param {object} strike
 * @param {ChatMessage} message
 * @returns {Promise<number|null>}
 */
async function strikeAmount(strike, message) {
  if ( strike.missileId ) {
    const combatId = message.getFlag(SYSTEM_ID, "combatId");
    const missile = typeof combatId === "string" ? missileRecord(combatId, strike.missileId) : null;
    if ( !missile ) return null;
    return shipStrikeAmount(strike.weaponDamage, missile.launch.dr, { missile: true });
  }
  const attacker = await resolveShip(strike.attackerUuid);
  if ( !attacker || typeof strike.weaponId !== "string" || !strike.weaponId ) return null;
  const item = attacker.items?.get(strike.weaponId);
  if ( !item || item.type !== "shipModule" ) return null;
  // Un missile ne s'applique pas par la carte de tir. // Décision Marc 30/10/2026
  if ( isMissileWeapon(item.system?.weapon) ) return null;
  return shipStrikeAmount(item.system?.weapon?.damage, strike.dr, { missile: false });
}
