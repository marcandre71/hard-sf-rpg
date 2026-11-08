/**
 * Décisions du MJ actif. Sans Foundry.
 *
 * L'identité est le second argument du socket `system.<id>`, fourni
 * par la session. Un `userId` dans le message n'est jamais lu.
 * S'il manque, le refus est ferme : pas d'identité de repli.
 * Réf. issue Foundry 3249. `system.json` a `socket: true`.
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.SocketInterface.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.Document.html#testUserPermission
 *
 * Décision Marc 08/11/2026. Décision Didier 08/11/2026.
 */
import { resolveD100 } from "./d100.mjs";
import {
  blankReaction,
  defenderDamage,
  finishDodge,
  personalOpposed,
  reactionOnLaunch,
  releaseDodge,
  skipDodge
} from "./esquive.mjs";

/**
 * File : une opération à la fois pour une clé (acteur ou carte).
 *
 * @returns {(key: string, fn: () => Promise<unknown>) => Promise<unknown>}
 */
export function createSerialQueue() {
  /** @type {Map<string, Promise<unknown>>} */
  const tails = new Map();
  return function serial(key, fn) {
    const prev = tails.get(key) ?? Promise.resolve();
    let release = () => {};
    const gate = new Promise(resolve => { release = resolve; });
    const done = prev.then(() => gate);
    tails.set(key, done);
    return prev.then(async () => {
      try { return await fn(); }
      finally { release(); }
    });
  };
}

/**
 * @param {unknown} senderId
 * @param {object|null|undefined} payload
 * @returns {string|null}
 */
export function provenSender(senderId, payload) {
  // `payload` est ignoré : un demandeur peut y écrire n'importe quel id.
  void payload;
  if ( typeof senderId !== "string" || senderId.length === 0 ) return null;
  return senderId;
}

/**
 * @param {{ isActiveGM?: boolean, senderId?: unknown, senderIsGM?: boolean }} input
 * @returns {"write"|"relay"|"refuse"}
 */
export function mutationRoute({ isActiveGM, senderId, senderIsGM }) {
  if ( provenSender(senderId, null) == null ) return "refuse";
  if ( isActiveGM === true ) return "write";
  if ( senderIsGM === true ) return "relay";
  return "refuse";
}

/**
 * @param {string} messageId
 * @param {string} defenderUuid
 * @returns {string}
 */
export function damageOpId(messageId, defenderUuid) {
  return `${messageId}:${defenderUuid}:damage`;
}

/**
 * @param {object} world
 * @param {object} command
 * @param {string|null|undefined} senderId
 * @returns {{ ok: boolean, reason?: string }}
 */
export function applyDodgeCommand(world, command, senderId) {
  const proven = provenSender(senderId, command);
  if ( !proven ) return { ok: false, reason: "unproven" };
  const user = world.users?.[proven];
  if ( !user ) return { ok: false, reason: "unproven" };
  const defenderUuid = command?.defenderUuid;
  const messageId = command?.messageId;
  const card = world.cards?.[messageId];
  const actor = world.actors?.[defenderUuid];
  if ( !card || !actor || typeof defenderUuid !== "string" ) return { ok: false, reason: "missing" };
  const entry = card.dodge?.[defenderUuid];
  if ( !entry ) return { ok: false, reason: "missing" };
  const owner = Array.isArray(user.owns) && user.owns.includes(defenderUuid);
  const gm = user.isGM === true;
  const action = command?.action;
  if ( action === "recover" && !gm ) return { ok: false, reason: "rights" };
  if ( action !== "recover" && action !== "skip" && !gm && !owner ) return { ok: false, reason: "rights" };
  if ( action === "skip" && !gm ) return { ok: false, reason: "rights" };
  const reaction = actor.reaction ?? blankReaction();
  if ( action === "reserve" ) return commitReserve(world, card, actor, entry, reaction, messageId, proven, command);
  if ( action === "release" || action === "recover" ) {
    return commitRelease(world, card, actor, entry, reaction, proven, gm, action === "recover");
  }
  if ( action === "skip" ) return commitSkip(world, card, entry, defenderUuid);
  if ( action === "finish" ) return commitFinish(world, card, actor, entry, reaction, command, proven);
  return { ok: false, reason: "unknown" };
}

/**
 * @param {object} world
 * @param {object} card
 * @param {object} actor
 * @param {object} entry
 * @param {object} reaction
 * @param {string} messageId
 * @param {string} senderId
 * @returns {{ ok: boolean, reason?: string }}
 */
function commitReserve(world, card, actor, entry, reaction, messageId, senderId, command) {
  if ( entry.state !== "pending" ) return { ok: false, reason: "closed" };
  if ( actor.tracked === true && reaction.spent === true ) return { ok: false, reason: "spent" };
  if ( reaction.reserved && reaction.reserved.messageId !== messageId ) {
    return { ok: false, reason: "reserved" };
  }
  entry.state = "rolling";
  entry.roller = senderId;
  entry.launched = false;
  if ( typeof command?.authorizedBase === "number" ) entry.authorizedBase = command.authorizedBase;
  actor.reaction = { ...reaction, reserved: { messageId, senderId } };
  card.dodge[actor.uuid] = entry;
  world.actors[actor.uuid] = actor;
  return { ok: true };
}

/**
 * @param {object} world
 * @param {object} card
 * @param {object} actor
 * @param {object} entry
 * @param {object} reaction
 * @param {string} senderId
 * @param {boolean} gm
 * @param {boolean} recover
 * @returns {{ ok: boolean, reason?: string }}
 */
function commitRelease(world, card, actor, entry, reaction, senderId, gm, recover) {
  if ( entry.state !== "rolling" ) return { ok: false, reason: "closed" };
  if ( entry.launched === true ) return { ok: false, reason: "launched", spent: reaction.spent === true };
  if ( !recover && senderId !== entry.roller && gm !== true ) return { ok: false, reason: "rights" };
  if ( recover && gm !== true ) return { ok: false, reason: "rights" };
  const released = releaseDodge(entry, entry.roller);
  if ( !released.ok || !released.entry ) return { ok: false, reason: "closed" };
  card.dodge[actor.uuid] = released.entry;
  const next = { ...reaction, reserved: null };
  actor.reaction = next;
  world.actors[actor.uuid] = actor;
  return { ok: true, spent: next.spent === true };
}

/**
 * @param {object} world
 * @param {object} card
 * @param {object} entry
 * @param {string} defenderUuid
 * @returns {{ ok: boolean, reason?: string }}
 */
function commitSkip(world, card, entry, defenderUuid) {
  void world;
  const passed = skipDodge(entry, true);
  if ( !passed.ok || !passed.entry ) return { ok: false, reason: "closed" };
  card.dodge[defenderUuid] = passed.entry;
  return { ok: true, spent: false };
}

/**
 * @param {object} world
 * @param {object} card
 * @param {object} actor
 * @param {object} entry
 * @param {object} reaction
 * @param {object} command
 * @param {string} senderId
 * @returns {{ ok: boolean, reason?: string }}
 */
function commitFinish(world, card, actor, entry, reaction, command, senderId) {
  const roll = command?.roll;
  if ( entry.state !== "rolling" || entry.roller !== senderId ) return { ok: false, reason: "holder" };
  if ( reaction.reserved?.messageId !== card.id || reaction.reserved?.senderId !== senderId ) {
    return { ok: false, reason: "holder" };
  }
  if ( !roll || roll.authorId !== senderId ) return { ok: false, reason: "author" };
  if ( roll.attackMessageId !== card.id || roll.defenderUuid !== actor.uuid ) return { ok: false, reason: "card" };
  if ( typeof roll.die !== "number" || typeof roll.score !== "number" ) return { ok: false, reason: "roll" };
  if ( entry.launched !== true ) {
    const launch = reactionOnLaunch({ tracked: actor.tracked === true, state: reaction });
    if ( launch.refused ) return { ok: false, reason: "spent" };
    entry.launched = true;
    entry.rollMessageId = roll.messageId ?? null;
    actor.reaction = { ...launch.state, reserved: reaction.reserved ?? null };
    card.dodge[actor.uuid] = entry;
    world.actors[actor.uuid] = actor;
    if ( command?.failAfterLaunch === true ) return { ok: false, reason: "interrupted", spent: actor.reaction.spent === true };
  }
  const outcome = resolveD100(roll.die, roll.score);
  const verdict = personalOpposed(
    { success: card.success === true, dr: card.dr, score: card.score },
    { success: outcome.success, dr: outcome.dr, score: outcome.target }
  );
  const done = finishDodge(entry, senderId, verdict);
  if ( !done.ok || !done.entry ) return { ok: false, reason: "holder" };
  const next = { ...(actor.reaction ?? reaction), reserved: null };
  actor.reaction = next;
  card.dodge[actor.uuid] = done.entry;
  world.actors[actor.uuid] = actor;
  return { ok: true, verdict, spent: next.spent === true, remind: actor.tracked !== true };
}

/**
 * Reprise à partir des documents. La cible du jet déjà écrit prime.
 * Pas de recalcul sur la RÉF du moment. Pas de score venu du socket.
 *
 * @param {object} input
 * @returns {{ ok: boolean, reason?: string, verdict?: string|null, writes: object[] }}
 */
export function planDodgeWrites(input) {
  const entry = input?.entry ?? {};
  const reaction = input?.reaction ?? blankReaction();
  const tracked = input?.tracked === true;
  const roll = input?.roll ?? null;
  const terminal = entry.state === "evaded" || entry.state === "failed";
  const attack = input?.attack ?? {};
  if ( input?.action === "recover" && !roll && entry.launched !== true && !terminal ) {
    if ( input?.isGM !== true ) return { ok: false, reason: "rights", writes: [] };
    if ( entry.state !== "rolling" ) return { ok: false, reason: "closed", writes: [] };
    const pending = { ...entry, state: "pending", launched: false };
    delete pending.roller;
    return {
      ok: true,
      verdict: null,
      writes: [
        { kind: "card", entry: pending },
        { kind: "actor", reaction: { ...reaction, reserved: null } }
      ]
    };
  }
  if ( !roll && !terminal ) return { ok: false, reason: "roll", writes: [] };
  const effective = typeof entry.effectiveTarget === "number" ? entry.effectiveTarget : roll?.target;
  if ( !terminal ) {
    if ( typeof effective !== "number" || typeof roll?.die !== "number" ) {
      return { ok: false, reason: "roll", writes: [] };
    }
    if ( typeof entry.authorizedBase === "number" && Math.abs(effective - entry.authorizedBase) > 50 ) {
      return { ok: false, reason: "target", writes: [] };
    }
    if ( roll?.authorId && entry.roller && roll.authorId !== entry.roller ) {
      return { ok: false, reason: "author", writes: [] };
    }
  }
  const outcome = !terminal && roll ? resolveD100(roll.die, effective) : null;
  const verdict = outcome
    ? personalOpposed(
      { success: attack.success === true, dr: attack.dr, score: attack.score },
      { success: outcome.success, dr: outcome.dr, score: outcome.target }
    )
    : null;
  const finalState = terminal ? entry.state : (verdict === "attack" ? "failed" : "evaded");
  /** @type {object[]} */
  const writes = [];
  const launchEntry = {
    ...entry,
    state: "rolling",
    launched: true,
    rollMessageId: roll?.messageId ?? entry.rollMessageId ?? null,
    effectiveTarget: effective
  };
  if ( !terminal && entry.launched !== true ) writes.push({ kind: "card", entry: launchEntry });
  const consumed = {
    ...reaction,
    spent: tracked ? true : reaction.spent === true,
    spentNonce: tracked ? (Number.isFinite(reaction.turnNonce) ? reaction.turnNonce : 0) : (reaction.spentNonce ?? null),
    reserved: reaction.reserved ?? null
  };
  if ( tracked && reaction.spent !== true ) writes.push({ kind: "actor", reaction: consumed });
  if ( !terminal ) {
    const done = { ...launchEntry, state: finalState };
    delete done.roller;
    writes.push({ kind: "card", entry: done });
  }
  writes.push({
    kind: "actor",
    reaction: {
      ...consumed,
      reserved: null,
      spent: tracked ? true : consumed.spent
    }
  });
  return { ok: true, verdict, writes };
}

/**
 * @returns {boolean}
 */
export function activeGmNow() {
  return globalThis.game?.user?.isActiveGM === true;
}

/**
 * Bouton de reprise : esquive en cours, ou verdict déjà écrit
 * avec une réservation d'acteur encore là. Pas un nouveau jet.
 *
 * @param {object|null|undefined} entry
 * @param {object|null|undefined} reaction
 * @param {string} messageId
 * @param {boolean} isGM
 * @returns {boolean}
 */
export function recoverShown(entry, reaction, messageId, isGM) {
  if ( isGM !== true ) return false;
  if ( entry?.state === "rolling" ) return true;
  const terminal = entry?.state === "failed" || entry?.state === "evaded";
  return terminal && reaction?.reserved?.messageId === messageId;
}

/**
 * Une étape, puis l'appelant enregistre. Une panne laisse l'étape d'avant.
 *
 * @param {object} record
 * @param {{ injury?: Function|null, defer?: Function|null, breach?: Function|null, summary?: Function|null }} writers
 * @returns {Promise<object>}
 */
/**
 * Enchaîne les étapes. `save` n'est appelé qu'après une étape réussie.
 *
 * @param {object} record
 * @param {object} writers
 * @param {(record: object) => Promise<void>} save
 * @returns {Promise<object>}
 */
function allowStep(writers) {
  if ( typeof writers.guard === "function" && writers.guard() !== true ) {
    throw new Error("not-active");
  }
}

export async function runDamageSteps(record, writers, save) {
  let current = { ...(record ?? {}) };
  while ( current.done !== true ) {
    if ( writers.injury && !current.injuryId ) {
      allowStep(writers);
      const found = typeof writers.findInjury === "function" ? await writers.findInjury() : null;
      allowStep(writers);
      const injuryId = found || await writers.injury();
      if ( typeof injuryId !== "string" || !injuryId ) throw new Error("injury");
      current = { ...current, injuryId };
      allowStep(writers);
      await save(current);
      continue;
    }
    if ( writers.status && current.statusDone !== true ) {
      allowStep(writers);
      await writers.status();
      current = { ...current, statusDone: true };
      allowStep(writers);
      await save(current);
      continue;
    }
    if ( writers.defer && current.injuryId && current.deferDone !== true ) {
      allowStep(writers);
      await writers.defer(current.injuryId);
      current = { ...current, deferDone: true };
      allowStep(writers);
      await save(current);
      continue;
    }
    if ( writers.breach && current.breachDone !== true ) {
      allowStep(writers);
      await writers.breach();
      current = { ...current, breachDone: true };
      allowStep(writers);
      await save(current);
      continue;
    }
    if ( writers.summary && !current.summaryId ) {
      allowStep(writers);
      const found = typeof writers.findSummary === "function" ? await writers.findSummary() : null;
      allowStep(writers);
      const summaryId = found || await writers.summary();
      if ( typeof summaryId !== "string" || !summaryId ) throw new Error("summary");
      current = { ...current, summaryId, done: true };
      allowStep(writers);
      await save(current);
      break;
    }
    current = { ...current, done: true };
    allowStep(writers);
    await save(current);
    break;
  }
  return current;
}

export async function advanceDamageRecord(record, writers) {
  const current = {
    injuryId: null,
    deferDone: false,
    breachDone: false,
    summaryId: null,
    ...(record ?? {})
  };
  if ( current.summaryId ) return { ...current, done: true };
  if ( writers.injury && !current.injuryId ) {
    const injuryId = await writers.injury();
    if ( typeof injuryId !== "string" || !injuryId ) throw new Error("injury");
    return { ...current, injuryId };
  }
  if ( writers.defer && current.injuryId && current.deferDone !== true ) {
    await writers.defer(current.injuryId);
    return { ...current, deferDone: true };
  }
  if ( writers.breach && current.breachDone !== true ) {
    await writers.breach();
    return { ...current, breachDone: true };
  }
  if ( writers.summary && !current.summaryId ) {
    const summaryId = await writers.summary();
    if ( typeof summaryId !== "string" || !summaryId ) throw new Error("summary");
    return { ...current, summaryId, done: true };
  }
  return { ...current, done: true };
}

/**
 * @param {object} entry
 * @param {string} opId
 * @param {string} zone
 * @returns {{ ok: boolean, reason?: string, entry: object }}
 */
export function beginDamageOp(entry, opId, zone) {
  const current = entry?.damageOp;
  if ( current?.id && current.id !== opId && current.done !== true ) {
    return { ok: false, reason: "busy", entry };
  }
  if ( current?.id === opId ) return { ok: true, entry };
  return {
    ok: true,
    entry: {
      ...entry,
      damageOp: {
        id: opId,
        zone,
        injuryId: null,
        deferDone: false,
        breachDone: false,
        summaryId: null,
        done: false
      }
    }
  };
}

/**
 * @param {object} entry
 * @param {{ dr?: unknown }} attack
 * @returns {boolean}
 */
export function damageStillDue(entry, attack) {
  if ( entry?.damageOp?.done === true || entry?.applied === true ) return false;
  return defenderDamage(entry, attack).write === true;
}
