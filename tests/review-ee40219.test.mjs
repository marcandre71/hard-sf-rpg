/**
 * Régressions de la relecture de ee40219. Sans Foundry.
 * `node tests/review-ee40219.test.mjs`
 *
 * Les doubles échouent vraiment sur setFlag. Un refus n'est pas un succès.
 */
import assert from "node:assert/strict";
import { executeDodge } from "../module/dice/esquive-play.mjs";
import { runDamageSteps } from "../module/dice/gm-authority.mjs";

const S = "sol-nouvelle-ere";

function make(id, flags) {
  return {
    id,
    flags: structuredClone(flags),
    getFlag(_scope, key) { return this.flags[key]; },
    async setFlag(_scope, key, value) { this.flags[key] = structuredClone(value); }
  };
}

let actor;
let card;
let roll;

function setup() {
  card = make("m1", {
    success: true,
    dr: 1,
    target: 45,
    dodge: {
      "Actor.d": { state: "rolling", roller: "player", launched: false, applied: false }
    }
  });
  roll = make("r1", {
    die: 50,
    target: 40,
    esquiveFor: { attackMessageId: "m1", defenderUuid: "Actor.d" }
  });
  roll.author = { id: "player" };
  actor = {
    uuid: "Actor.d",
    type: "character",
    items: [],
    system: { characteristics: { ref: { value: 60 } } },
    reaction: {
      spent: false,
      spentNonce: null,
      turnNonce: 1,
      reserved: { messageId: "m1", senderId: "player" }
    },
    getFlag() { return structuredClone(this.reaction); },
    testUserPermission() { return true; },
    async setFlag(_scope, _key, value) { this.reaction = structuredClone(value); }
  };
  const messages = [card, roll];
  globalThis.game = {
    user: { id: "gm", isActiveGM: true, isGM: true },
    users: { get: id => ({ id, isGM: id === "gm" || id === "player" ? id === "gm" : false }) },
    messages: {
      contents: messages,
      get: id => messages.find(message => message.id === id) ?? null
    },
    combat: { started: true, combatants: [{ actor }] },
    i18n: { localize: key => key }
  };
  game.users.get = id => ({ id, isGM: id === "gm" });
  globalThis.foundry = {
    utils: {
      deepClone: value => structuredClone(value),
      fromUuid: async () => actor
    }
  };
  globalThis.ui = { notifications: { info() {}, warn() {} } };
}

const pending = [];
function check(label, fn) {
  pending.push(async () => {
    try {
      await fn();
    } catch (error) {
      console.error(`échec : ${label}`);
      console.error(error);
      process.exit(1);
    }
  });
}

check("cible du jet, pas la RÉF relue", async () => {
  setup();
  const result = await executeDodge({
    action: "finish",
    messageId: "m1",
    defenderUuid: "Actor.d",
    rollMessageId: "r1",
    roll: { score: 99 }
  }, "player");
  assert.equal(result.verdict, "attack");
  assert.equal(card.flags.dodge["Actor.d"].state, "failed");
  assert.equal(card.flags.dodge["Actor.d"].effectiveTarget, 40);
  assert.equal(actor.reaction.spent, true);
  assert.equal(actor.reaction.reserved, null);
});

check("jet déjà écrit : reprendre résout sans rendre la réaction", async () => {
  setup();
  const result = await executeDodge({
    action: "recover",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "gm");
  assert.equal(result.ok, true);
  assert.notEqual(card.flags.dodge["Actor.d"].state, "pending");
  assert.equal(card.flags.dodge["Actor.d"].state, "failed");
  assert.equal(actor.reaction.spent, true);
  assert.equal(actor.reaction.reserved, null);
});

check("panne entre carte et acteur, puis reprise", async () => {
  setup();
  actor.setFlag = async () => { throw new Error("panne écriture Actor"); };
  await assert.rejects(() => executeDodge({
    action: "finish",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "player"));
  assert.equal(card.flags.dodge["Actor.d"].launched, true);
  assert.notEqual(card.flags.dodge["Actor.d"].state, "evaded");
  assert.equal(actor.reaction.spent, false);
  actor.setFlag = async (_scope, _key, value) => { actor.reaction = structuredClone(value); };
  const resumed = await executeDodge({
    action: "recover",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "gm");
  assert.equal(resumed.ok, true);
  assert.equal(card.flags.dodge["Actor.d"].state, "failed");
  assert.equal(actor.reaction.spent, true);
  assert.equal(actor.reaction.reserved, null);
});

check("carte déjà tranchée, acteur en retard : reprise sans nouveau dé", async () => {
  setup();
  card.flags.dodge["Actor.d"].state = "evaded";
  card.flags.dodge["Actor.d"].launched = true;
  card.flags.dodge["Actor.d"].effectiveTarget = 40;
  const result = await executeDodge({
    action: "recover",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "gm");
  assert.equal(result.ok, true);
  assert.equal(card.flags.dodge["Actor.d"].state, "evaded");
  assert.equal(actor.reaction.spent, true);
  assert.equal(actor.reaction.reserved, null);
});

check("perte du MJ actif entre l'attente et l'écriture", async () => {
  setup();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  foundry.utils.fromUuid = async () => { await gate; return actor; };
  const flying = executeDodge({
    action: "recover",
    messageId: "m1",
    defenderUuid: "Actor.d"
  }, "gm");
  game.user.isActiveGM = false;
  release();
  const result = await flying;
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-active");
  assert.equal(card.flags.dodge["Actor.d"].state, "rolling");
  assert.equal(actor.reaction.spent, false);
});

check("checkpoint raté : la blessure marquée n'est pas recréée", async () => {
  const opId = "m1:Actor.d:damage";
  const items = [];
  let created = 0;
  const writers = {
    findInjury: async () => items.find(item => item.flags[S].damageOp === opId)?.id ?? null,
    injury: async () => {
      created += 1;
      const id = `i${created}`;
      items.push({ id, flags: { [S]: { damageOp: opId } } });
      return id;
    },
    findSummary: async () => null,
    summary: async () => "sum"
  };
  let saved = { id: opId };
  await assert.rejects(runDamageSteps(saved, writers, async () => {
    throw new Error("panne checkpoint");
  }));
  assert.equal(created, 1);
  await runDamageSteps(saved, writers, async next => { saved = next; });
  assert.equal(created, 1);
  assert.equal(saved.injuryId, "i1");
  assert.equal(saved.summaryId, "sum");
});

for ( const step of pending ) await step();
console.log("review-ee40219.test.mjs : ok");
