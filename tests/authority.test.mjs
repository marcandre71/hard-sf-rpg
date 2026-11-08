/**
 * Autorité du MJ actif. Sans Foundry. `node tests/authority.test.mjs`
 *
 * Les doubles n'autorisent pas tout le monde : l'id prouvé et les
 * droits sont séparés du message.
 */
import assert from "node:assert/strict";
import {
  applyDodgeCommand,
  beginDamageOp,
  createSerialQueue,
  damageOpId,
  mutationRoute,
  provenSender,
  runDamageSteps
} from "../module/dice/gm-authority.mjs";

function check(label, fn) {
  try {
    const result = fn();
    if ( result && typeof result.then === "function" ) {
      return result.catch(error => {
        console.error(`échec : ${label}`);
        console.error(error);
        process.exit(1);
      });
    }
  } catch (error) {
    console.error(`échec : ${label}`);
    console.error(error);
    process.exit(1);
  }
  return Promise.resolve();
}

/**
 * @param {object} [extra]
 * @returns {object}
 */
function world(extra = {}) {
  return {
    users: {
      player: { isGM: false, owns: ["Actor.d"] },
      other: { isGM: false, owns: [] },
      gm: { isGM: true, owns: [] },
      gm2: { isGM: true, owns: [] }
    },
    cards: {
      m1: {
        id: "m1",
        success: true,
        dr: 2,
        score: 45,
        dodge: {
          "Actor.d": { state: "pending", name: "Ilka", applied: false, launched: false }
        }
      },
      m2: {
        id: "m2",
        success: true,
        dr: 2,
        score: 45,
        dodge: {
          "Actor.d": { state: "pending", name: "Ilka", applied: false, launched: false }
        }
      }
    },
    actors: {
      "Actor.d": {
        uuid: "Actor.d",
        tracked: true,
        reaction: { spent: false, spentNonce: null, turnNonce: 1, lastStart: null, reserved: null }
      }
    },
    ...extra
  };
}

const pending = [];

pending.push(check("un joueur qui n'est pas l'auteur n'écrit pas", () => {
  const table = world();
  const forged = applyDodgeCommand(table, {
    action: "reserve",
    messageId: "m1",
    defenderUuid: "Actor.d",
    userId: "player"
  }, "other");
  assert.equal(forged.ok, false);
  assert.equal(forged.reason, "rights");
  assert.equal(table.cards.m1.dodge["Actor.d"].state, "pending");
  assert.equal(provenSender("other", { userId: "gm" }), "other");
  assert.equal(provenSender("", { userId: "gm" }), null);
  assert.equal(provenSender(undefined, { userId: "player" }), null);
  const missing = applyDodgeCommand(table, {
    action: "reserve",
    messageId: "m1",
    defenderUuid: "Actor.d",
    userId: "player"
  }, undefined);
  assert.equal(missing.reason, "unproven");
}));

pending.push(check("deux cartes, une seule réservation", async () => {
  const table = world();
  table.actors["Actor.d"].tracked = false;
  const serial = createSerialQueue();
  const receive = (messageId, senderId) => serial("actor:Actor.d", () => applyDodgeCommand(table, {
    action: "reserve",
    messageId,
    defenderUuid: "Actor.d"
  }, senderId));
  const [first, second] = await Promise.all([
    receive("m1", "player"),
    receive("m2", "player")
  ]);
  const oks = [first, second].filter(result => result.ok);
  assert.equal(oks.length, 1);
  assert.equal(table.actors["Actor.d"].reaction.spent, false);
  const winner = table.actors["Actor.d"].reaction.reserved.messageId;
  const finish = applyDodgeCommand(table, {
    action: "finish",
    messageId: winner,
    defenderUuid: "Actor.d",
    roll: {
      authorId: "player",
      attackMessageId: winner,
      defenderUuid: "Actor.d",
      die: 12,
      score: 60,
      messageId: "roll-1"
    }
  }, "player");
  assert.equal(finish.ok, true);
  assert.equal(finish.spent, false);
  assert.equal(table.cards[winner].dodge["Actor.d"].state, "evaded");
  const otherId = winner === "m1" ? "m2" : "m1";
  assert.equal(table.cards[otherId].dodge["Actor.d"].state, "pending");
}));

pending.push(check("réservation refusée, annulation avant le dé, dépense après", () => {
  const table = world();
  const reserved = applyDodgeCommand(table, {
    action: "reserve",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "player");
  assert.equal(reserved.ok, true);
  const refused = applyDodgeCommand(table, {
    action: "reserve",
    messageId: "m2",
    defenderUuid: "Actor.d"
  }, "player");
  assert.equal(refused.reason, "reserved");
  const released = applyDodgeCommand(table, {
    action: "release",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "player");
  assert.equal(released.ok, true);
  assert.equal(released.spent, false);
  assert.equal(table.cards.m1.dodge["Actor.d"].state, "pending");
  applyDodgeCommand(table, {
    action: "reserve",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "player");
  const interrupted = applyDodgeCommand(table, {
    action: "finish",
    messageId: "m1",
    defenderUuid: "Actor.d",
    failAfterLaunch: true,
    roll: {
      authorId: "player",
      attackMessageId: "m1",
      defenderUuid: "Actor.d",
      die: 80,
      score: 40,
      messageId: "roll-2"
    }
  }, "player");
  assert.equal(interrupted.reason, "interrupted");
  assert.equal(table.actors["Actor.d"].reaction.spent, true);
  assert.equal(table.cards.m1.dodge["Actor.d"].state, "rolling");
  const recover = applyDodgeCommand(table, {
    action: "recover",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "gm");
  assert.equal(recover.reason, "launched");
  assert.equal(table.actors["Actor.d"].reaction.spent, true);
  const again = applyDodgeCommand(table, {
    action: "finish",
    messageId: "m1",
    defenderUuid: "Actor.d",
    roll: {
      authorId: "other",
      attackMessageId: "m1",
      defenderUuid: "Actor.d",
      die: 5,
      score: 90,
      messageId: "roll-3"
    }
  }, "player");
  assert.equal(again.reason, "author");
  const done = applyDodgeCommand(table, {
    action: "finish",
    messageId: "m1",
    defenderUuid: "Actor.d",
    roll: {
      authorId: "player",
      attackMessageId: "m1",
      defenderUuid: "Actor.d",
      die: 80,
      score: 40,
      messageId: "roll-2"
    }
  }, "player");
  assert.equal(done.ok, true);
  assert.notEqual(table.cards.m1.dodge["Actor.d"].state, "evaded");
}));

pending.push(check("deux confirmations de dégâts, reprise après la blessure", async () => {
  const serial = createSerialQueue();
  const calls = { injury: 0, defer: 0, breach: 0, summary: 0 };
  let failBreach = true;
  let record = { id: damageOpId("m1", "Actor.d"), injuryId: null, deferDone: false, breachDone: false, summaryId: null };
  const writers = {
    injury: async () => { calls.injury += 1; return "inj1"; },
    defer: async () => { calls.defer += 1; },
    breach: async () => {
      calls.breach += 1;
      if ( failBreach ) throw new Error("panne");
    },
    summary: async () => { calls.summary += 1; return "sum1"; }
  };
  const run = () => serial("card:m1", async () => {
    const fresh = { ...record };
    if ( fresh.done === true ) return fresh;
    try {
      record = await runDamageSteps(fresh, writers, async next => { record = next; });
    } catch (error) {
      assert.equal(error.message, "panne");
    }
    return record;
  });
  await Promise.all([run(), run()]);
  assert.equal(calls.injury, 1);
  assert.equal(record.injuryId, "inj1");
  assert.equal(record.summaryId, null);
  failBreach = false;
  await run();
  assert.equal(calls.injury, 1);
  assert.equal(calls.summary, 1);
  assert.equal(record.done, true);
  const routePlayer = mutationRoute({ isActiveGM: false, senderId: "other", senderIsGM: false });
  const routeSecond = mutationRoute({ isActiveGM: false, senderId: "gm2", senderIsGM: true });
  const routeActive = mutationRoute({ isActiveGM: true, senderId: "gm", senderIsGM: true });
  assert.equal(routePlayer, "refuse");
  assert.equal(routeSecond, "relay");
  assert.equal(routeActive, "write");
  const begun = beginDamageOp({ state: "failed" }, damageOpId("m1", "Actor.d"), "torso");
  assert.equal(begun.entry.damageOp.zone, "torso");
  const kept = beginDamageOp(begun.entry, damageOpId("m1", "Actor.d"), "head");
  assert.equal(kept.entry.damageOp.zone, "torso");
}));

await Promise.all(pending);
console.log("authority.test.mjs : ok");
