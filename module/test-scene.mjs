/**
 * Scène de test, sans Foundry.
 *
 * Décision Marc, relayée par Didier, 11/11/2026.
 * Le monde n'a pas d'acteur Personnage, Synthétique ni PNJ dans les
 * compendiums : ces trois fiches sont un repli (défauts du schéma).
 * Crabe, Petite Fortune et le Patrouilleur viennent des compendiums
 * Acteurs. L'arme et l'armure viennent des compendiums Objets.
 * Un compendium absent ne plante pas : la fiche minimale est créée,
 * ou l'objet n'est pas ajouté.
 *
 * Aucun chiffre de règle n'est écrit ici. La formation d'Esquive reste
 * celle du compendium.
 */

export const SYSTEM_ID = "sol-nouvelle-ere";

/** Réglage de monde : la création automatique a déjà réussi. */
export const CREATED_SETTING = "testSceneCreated";

/**
 * Case du menu de réglage. La recocher relance la scène.
 * `SettingConfig` v14 n'a pas de champ `restricted` : l'exécution
 * reste réservée au MJ actif.
 * @see https://foundryvtt.com/api/v14/interfaces/foundry.types.SettingConfig.html
 */
export const RECREATE_SETTING = "recreateTestScene";

export const SCENE_NAME = "Scène de test";
export const JOURNAL_NAME = "Lisez-moi test";

const ROLE_FLAG = "testRole";
const SCENE_FLAG = "testScene";

/**
 * Grille carrée. `1` est `CONST.GRID_TYPES.SQUARE`.
 * @see https://foundryvtt.com/api/v14/variables/CONST.GRID_TYPES.html
 */
const SQUARE_GRID = 1;

/**
 * Page HTML. `1` est `CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML`.
 * @see https://foundryvtt.com/api/v14/variables/CONST.JOURNAL_ENTRY_PAGE_FORMATS.html
 */
const HTML_PAGE = 1;

/**
 * Disposition des pions : amical 1, neutre 0, hostile −1.
 * Valeurs de `CONST.TOKEN_DISPOSITIONS`.
 */

/** @type {Array<{ role: string, name: string, type: string, pack: string|null, documentName: string|null, x: number, y: number, width: number, height: number, disposition: number, items: Array<{ pack: string, name: string, equipped?: boolean }> }>} */
export const TEST_CAST = [
  {
    role: "pc-human",
    name: "Humain d'essai",
    type: "character",
    pack: null,
    documentName: null,
    x: 100,
    y: 100,
    width: 1,
    height: 1,
    disposition: 1,
    items: [
      { pack: "weapons", name: "Pistolet de bord 9 mm basse vélocité", equipped: true },
      { pack: "armors", name: "Combinaison souple « Peau de quart »", equipped: true }
    ]
  },
  {
    role: "pc-synthetic",
    name: "Synthétique d'essai",
    type: "synthetic",
    pack: null,
    documentName: null,
    x: 300,
    y: 100,
    width: 1,
    height: 1,
    disposition: 1,
    items: [
      { pack: "skills", name: "Esquive" }
    ]
  },
  {
    role: "npc-armed",
    name: "Adversaire d'essai",
    type: "npc",
    pack: null,
    documentName: null,
    x: 700,
    y: 100,
    width: 1,
    height: 1,
    disposition: -1,
    items: [
      { pack: "weapons", name: "Pistolet de bord 9 mm basse vélocité", equipped: true }
    ]
  },
  {
    role: "drone-crabe",
    name: "Crabe",
    type: "drone",
    pack: "machines",
    documentName: "Crabe",
    x: 100,
    y: 400,
    width: 1,
    height: 1,
    disposition: 0,
    items: []
  },
  {
    role: "ship-player",
    name: "Petite Fortune",
    type: "ship",
    pack: "ships",
    documentName: "Petite Fortune",
    x: 400,
    y: 400,
    width: 2,
    height: 2,
    disposition: 1,
    items: []
  },
  {
    role: "ship-patrol",
    name: "Patrouilleur de la Veille",
    type: "ship",
    pack: "ships",
    documentName: "Patrouilleur de la Veille",
    x: 800,
    y: 400,
    width: 2,
    height: 2,
    disposition: -1,
    items: []
  }
];

/**
 * @param {{ isActiveGM?: boolean, created?: boolean, force?: boolean }} input
 * @returns {boolean}
 */
export function shouldRunTestScene(input) {
  if ( input?.isActiveGM !== true ) return false;
  if ( input?.force === true ) return true;
  return input?.created !== true;
}

/**
 * @param {object|null|undefined} document
 * @param {string} key
 * @returns {unknown}
 */
function flagValue(document, key) {
  return document?.flags?.[SYSTEM_ID]?.[key];
}

/**
 * D'abord le flag de rôle, ensuite le nom. Pas de second acteur.
 *
 * @param {Array<{ name?: string, flags?: object }>|null|undefined} actors
 * @param {{ role: string, name: string }} spec
 * @returns {object|null}
 */
export function findTestActor(actors, spec) {
  const list = actors ?? [];
  const flagged = list.find(actor => flagValue(actor, ROLE_FLAG) === spec.role);
  if ( flagged ) return flagged;
  return list.find(actor => actor?.name === spec.name) ?? null;
}

/**
 * @param {Array<{ id?: string, name?: string, flags?: object, tokenCount?: number }>|null|undefined} scenes
 * @param {string} name
 * @returns {object|null}
 */
export function findTestScene(scenes, name) {
  const list = scenes ?? [];
  return list.find(scene => flagValue(scene, SCENE_FLAG) === true)
    ?? list.find(scene => scene?.name === name)
    ?? null;
}

/**
 * @param {Array<{ id?: string, name?: string, flags?: object, tokenCount?: number }>|null|undefined} scenes
 * @param {string} name
 * @param {boolean} force
 * @returns {{ deleteIds: string[], create: boolean, scene: object|null, placeTokens: boolean }}
 */
export function scenePlan(scenes, name, force) {
  const matches = (scenes ?? []).filter(scene => flagValue(scene, SCENE_FLAG) === true || scene?.name === name);
  if ( force ) {
    return { deleteIds: matches.map(scene => String(scene.id)), create: true, scene: null, placeTokens: true };
  }
  if ( matches.length ) {
    const scene = matches[0];
    return {
      deleteIds: [],
      create: false,
      scene,
      placeTokens: !(Number(scene.tokenCount) > 0)
    };
  }
  return { deleteIds: [], create: true, scene: null, placeTokens: true };
}

/**
 * @param {object|null|undefined} source
 * @param {{ role: string, name: string, type: string }} spec
 * @returns {object}
 */
export function worldActorData(source, spec) {
  const data = source ? structuredClone(source) : { name: spec.name, type: spec.type };
  delete data._id;
  delete data._key;
  delete data.folder;
  delete data.ownership;
  delete data._stats;
  data.name = spec.name;
  data.type = spec.type;
  const prior = data.flags?.[SYSTEM_ID] ?? {};
  data.flags = { ...(data.flags ?? {}), [SYSTEM_ID]: { ...prior, [ROLE_FLAG]: spec.role } };
  return data;
}

/**
 * @param {object} source
 * @param {boolean} equipped
 * @returns {object}
 */
export function worldItemData(source, equipped) {
  const data = structuredClone(source);
  delete data._id;
  delete data._key;
  delete data.folder;
  delete data.ownership;
  delete data._stats;
  if ( equipped && data.system && typeof data.system === "object" ) {
    data.system = { ...data.system, equipped: true };
  }
  return data;
}

/**
 * Fond uni et grille. Pas d'image, pas d'adresse externe.
 *
 * @param {{ name: string, journalId?: string|null }} input
 * @returns {object}
 */
export function testSceneData(input) {
  return {
    name: input.name,
    navigation: true,
    width: 1600,
    height: 1000,
    padding: 0,
    backgroundColor: "#141c24",
    tokenVision: false,
    journal: input.journalId ?? null,
    grid: {
      type: SQUARE_GRID,
      size: 100,
      distance: 1,
      units: "m",
      color: "#8fa0ae",
      alpha: 0.5
    },
    flags: { [SYSTEM_ID]: { [SCENE_FLAG]: true } }
  };
}

/**
 * @param {{ name: string, html: string }} input
 * @returns {object}
 */
export function testJournalData(input) {
  return {
    name: input.name,
    pages: [{
      name: input.name,
      type: "text",
      text: { content: input.html, format: HTML_PAGE }
    }],
    flags: { [SYSTEM_ID]: { [SCENE_FLAG]: true } }
  };
}

/**
 * @param {{ id: string }} actor
 * @param {{ name: string, x: number, y: number, width: number, height: number, disposition: number }} spec
 * @returns {object}
 */
export function tokenData(actor, spec) {
  return {
    actorId: actor.id,
    name: spec.name,
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    disposition: spec.disposition,
    actorLink: true
  };
}

/**
 * @param {Array<{ name?: string, flags?: object }>|null|undefined} journals
 * @param {string} name
 * @returns {object|null}
 */
function findJournal(journals, name) {
  const list = journals ?? [];
  return list.find(journal => flagValue(journal, SCENE_FLAG) === true)
    ?? list.find(journal => journal?.name === name)
    ?? null;
}

/**
 * Crée ou répare la scène. Les écritures passent par `api`.
 * Un joueur, ou un monde déjà marqué, ne fait rien.
 *
 * @param {object} api
 * @param {{ isActiveGM?: boolean, created?: boolean, force?: boolean, sceneName?: string, journalName?: string, journalHtml?: string }} options
 * @returns {Promise<{ status: string, reason?: string, origins?: object[], sceneId?: string }>}
 */
export async function runTestScene(api, options) {
  if ( !shouldRunTestScene(options) ) {
    return { status: "skipped", reason: options?.isActiveGM === true ? "already" : "not-active" };
  }
  const sceneName = options.sceneName || SCENE_NAME;
  const journalName = options.journalName || JOURNAL_NAME;
  const journalHtml = options.journalHtml || "";
  try {
    /** @type {object[]} */
    const origins = [];
    /** @type {Array<{ actor: { id: string }, spec: object }>} */
    const placed = [];
    for ( const spec of TEST_CAST ) {
      const actors = await api.actors();
      let actor = findTestActor(actors, spec);
      const reused = Boolean(actor);
      let sourceKind = "fallback";
      if ( !actor ) {
        let source = null;
        if ( spec.pack ) {
          source = await api.readDocument(spec.pack, spec.documentName);
          if ( source ) sourceKind = "compendium";
          else await api.notify("warn", "missingPack", { pack: spec.pack, name: spec.name });
        }
        actor = await api.createActor(worldActorData(source, spec));
      } else if ( flagValue(actor, ROLE_FLAG) !== spec.role ) {
        await api.setRole(actor, spec.role);
      }
      const have = new Set((actor.items ?? []).map(item => item.name));
      /** @type {object[]} */
      const toAdd = [];
      for ( const item of spec.items ) {
        if ( have.has(item.name) ) continue;
        const source = await api.readDocument(item.pack, item.name);
        if ( !source ) {
          await api.notify("warn", "missingItem", { pack: item.pack, name: item.name });
          continue;
        }
        toAdd.push(worldItemData(source, item.equipped === true));
      }
      if ( toAdd.length ) await api.addItems(actor, toAdd);
      origins.push({
        role: spec.role,
        name: spec.name,
        source: reused ? "world" : sourceKind,
        pack: spec.pack,
        reused
      });
      placed.push({ actor, spec });
    }

    const journals = await api.journals();
    let journal = findJournal(journals, journalName);
    if ( !journal ) journal = await api.createJournal(testJournalData({ name: journalName, html: journalHtml }));
    else await api.updateJournal(journal, journalHtml);

    const plan = scenePlan(await api.scenes(), sceneName, options.force === true);
    for ( const id of plan.deleteIds ) await api.deleteScene(id);
    const scene = plan.create
      ? await api.createScene(testSceneData({ name: sceneName, journalId: journal?.id ?? null }))
      : plan.scene;
    if ( plan.placeTokens ) {
      await api.placeTokens(scene, placed.map(entry => tokenData(entry.actor, entry.spec)));
    }
    await api.activateScene(scene);
    await api.notify("info", "done", {});
    return { status: "done", origins, sceneId: scene?.id };
  } catch (error) {
    await api.notify("error", "failed", {});
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
