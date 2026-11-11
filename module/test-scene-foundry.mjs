/**
 * Branchement Foundry v14 de la scène de test.
 *
 * Au premier `ready`, seulement chez le MJ actif. Le réglage de monde
 * `testSceneCreated` empêche un second passage. La case
 * « Recréer la scène de test » relance quand le MJ actif l'enregistre.
 *
 * Décision Marc, relayée par Didier, 11/11/2026.
 * @see https://foundryvtt.com/api/v14/functions/hookEvents.ready.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html#register
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Scene.html#activate
 */
import { CAST_SETTING, SHEET_FLAG, SHEET_VERSION } from "./test-cast.mjs";
import {
  CREATED_SETTING,
  JOURNAL_NAME,
  RECREATE_SETTING,
  SCENE_NAME,
  SYSTEM_ID,
  runTestScene,
  upgradeTestCast
} from "./test-scene.mjs";

/**
 * @param {string} systemId
 * @returns {void}
 */
export function registerTestScene(systemId) {
  game.settings.register(systemId, CAST_SETTING, {
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(systemId, CREATED_SETTING, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
  game.settings.register(systemId, RECREATE_SETTING, {
    name: "SOL.TestScene.recreate",
    hint: "SOL.TestScene.recreateHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      if ( value !== true || game.ready !== true ) return;
      void recreateTestScene(systemId);
    }
  });
  Hooks.once("ready", () => {
    void createTestSceneOnce(systemId);
  });
}

/**
 * @param {string} systemId
 * @returns {Promise<void>}
 */
async function createTestSceneOnce(systemId) {
  try {
    const active = game.user?.isActiveGM === true;
    if ( active ) {
      const version = Number(game.settings.get(systemId, CAST_SETTING) ?? 0);
      const upgraded = await upgradeTestCast(foundryApi(), { isActiveGM: true, version });
      if ( upgraded.status === "done" ) await game.settings.set(systemId, CAST_SETTING, SHEET_VERSION);
    }
    const created = game.settings.get(systemId, CREATED_SETTING) === true;
    const force = game.settings.get(systemId, RECREATE_SETTING) === true;
    const result = await runTestScene(foundryApi(), {
      isActiveGM: active,
      created: force ? false : created,
      force,
      sceneName: SCENE_NAME,
      journalName: JOURNAL_NAME,
      journalHtml: game.i18n.localize("SOL.TestScene.journal")
    });
    if ( result.status === "done" ) await game.settings.set(systemId, CREATED_SETTING, true);
    if ( active && force ) await game.settings.set(systemId, RECREATE_SETTING, false);
  } catch (error) {
    console.error(error);
    ui.notifications?.error(game.i18n.localize("SOL.TestScene.failed"));
  }
}

/**
 * @param {string} systemId
 * @returns {Promise<void>}
 */
async function recreateTestScene(systemId) {
  if ( game.user?.isActiveGM !== true ) return;
  try {
    const result = await runTestScene(foundryApi(), {
      isActiveGM: true,
      created: true,
      force: true,
      sceneName: SCENE_NAME,
      journalName: JOURNAL_NAME,
      journalHtml: game.i18n.localize("SOL.TestScene.journal")
    });
    if ( result.status === "done" ) await game.settings.set(systemId, CREATED_SETTING, true);
    else if ( result.status === "failed" ) await game.settings.set(systemId, CREATED_SETTING, false);
  } catch (error) {
    console.error(error);
    ui.notifications?.error(game.i18n.localize("SOL.TestScene.failed"));
  } finally {
    if ( game.settings.get(systemId, RECREATE_SETTING) === true ) {
      await game.settings.set(systemId, RECREATE_SETTING, false);
    }
  }
}

/**
 * @param {Actor|Scene|JournalEntry} document
 * @returns {{ id: string, name: string, flags: object, items?: object[], tokenCount?: number, document: Actor|Scene|JournalEntry }}
 */
function summarize(document) {
  const items = document.items?.map(item => ({ name: item.name, type: item.type }));
  const tokenCount = document.tokens?.size;
  return {
    id: document.id,
    name: document.name,
    flags: document.flags,
    items,
    tokenCount,
    document
  };
}

/**
 * @returns {object}
 */
function foundryApi() {
  return {
    actors() {
      return game.actors.contents.map(summarize);
    },
    scenes() {
      return game.scenes.contents.map(summarize);
    },
    journals() {
      return game.journal.contents.map(summarize);
    },
    async readDocument(packName, name) {
      const pack = game.packs.get(`${SYSTEM_ID}.${packName}`);
      if ( !pack ) return null;
      const index = await pack.getIndex();
      const entry = index.find(row => row.name === name);
      if ( !entry ) return null;
      const document = await pack.getDocument(entry._id);
      return document?.toObject() ?? null;
    },
    async createActor(data) {
      const created = await Actor.implementation.create(data);
      return summarize(created);
    },
    async setRole(actor, role) {
      await actor.document.setFlag(SYSTEM_ID, "testRole", role);
      actor.flags = actor.document.flags;
    },
    async addItems(actor, items) {
      if ( !items.length ) return;
      await actor.document.createEmbeddedDocuments("Item", items);
    },
    async updateSystem(actor, system) {
      await actor.document.update({ system });
    },
    async setSheetMark(actor, mark) {
      await actor.document.setFlag(SYSTEM_ID, SHEET_FLAG, mark);
      actor.flags = actor.document.flags;
    },
    async setTraining(actor, name, training) {
      const item = actor.document.items.find(entry => entry.name === name);
      if ( item ) await item.update({ "system.training": training });
    },
    async deleteScene(id) {
      await Scene.implementation.deleteDocuments([id]);
    },
    async createScene(data) {
      const created = await Scene.implementation.create(data);
      return summarize(created);
    },
    async activateScene(scene) {
      // @see https://foundryvtt.com/api/v14/classes/foundry.documents.Scene.html#activate
      await scene.document.activate();
    },
    async placeTokens(scene, tokens) {
      await scene.document.createEmbeddedDocuments("Token", tokens);
    },
    async createJournal(data) {
      const created = await JournalEntry.implementation.create(data);
      return summarize(created);
    },
    async updateJournal(journal, html) {
      const pages = journal.document.pages;
      const page = pages.contents?.[0] ?? [...pages][0];
      if ( page ) await page.update({ "text.content": html });
    },
    notify(level, key, data) {
      const message = game.i18n.format(`SOL.TestScene.${key}`, data ?? {});
      if ( level === "error" ) ui.notifications.error(message);
      else if ( level === "warn" ) ui.notifications.warn(message);
      else ui.notifications.info(message);
    }
  };
}
