/**
 * Import du kit de démarrage visible par les joueurs.
 *
 * Décision Didier, 14/11/2026. Le dépôt est public : ce module
 * n'importe que les trois compendiums joueurs. Aucun secret de
 * meneur, aucun Atlas.
 * Point d'extension : `KIT_GM_PACKS` reste vide. Un pack MJ pourra
 * y être ajouté plus tard, quand Marc aura dit où le ranger.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html#register
 */

export const KIT_IMPORTS = [
  { pack: "kit-pregens", folder: "Kit — Prétirés", documentName: "Actor" },
  { pack: "kit-scenes", folder: "Kit — Plans", documentName: "Scene" },
  { pack: "kit-journals", folder: "Kit — Pour les joueurs", documentName: "JournalEntry" }
];

/** Aucun contenu. Réservé à un pack MJ qui n'existe pas encore. */
export const KIT_GM_PACKS = [];

/**
 * @param {{ isActiveGM?: boolean }} input
 * @returns {boolean}
 */
export function shouldImportKit(input) {
  return input?.isActiveGM === true;
}

/**
 * @param {Array<{ kitId?: string }>|null|undefined} documents
 * @param {Iterable<string>|null|undefined} existingKitIds
 * @returns {Array<{ kitId?: string }>}
 */
export function kitImportPlan(documents, existingKitIds) {
  const have = new Set(existingKitIds ?? []);
  return (documents ?? []).filter(document => document?.kitId && !have.has(document.kitId));
}

/**
 * @param {string} systemId
 * @returns {void}
 */
export function registerKitImport(systemId) {
  game.settings.register(systemId, "importKit", {
    name: "SOL.Kit.import",
    hint: "SOL.Kit.importHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      if ( value !== true || game.ready !== true ) return;
      void runKitImport(systemId);
    }
  });
}

/**
 * @param {string} systemId
 * @returns {Promise<void>}
 */
async function runKitImport(systemId) {
  if ( !shouldImportKit({ isActiveGM: game.user?.isActiveGM === true }) ) return;
  try {
    let created = 0;
    for ( const entry of [...KIT_IMPORTS, ...KIT_GM_PACKS] ) {
      created += await importPack(systemId, entry);
    }
    ui.notifications.info(game.i18n.format("SOL.Kit.done", { count: created }));
  } catch (error) {
    console.error(error);
    ui.notifications.error(game.i18n.localize("SOL.Kit.failed"));
  } finally {
    if ( game.settings.get(systemId, "importKit") === true ) {
      await game.settings.set(systemId, "importKit", false);
    }
  }
}

/**
 * @param {string} systemId
 * @param {{ pack: string, folder: string, documentName: string }} entry
 * @returns {Promise<number>}
 */
async function importPack(systemId, entry) {
  const pack = game.packs.get(`${systemId}.${entry.pack}`);
  if ( !pack ) {
    ui.notifications.warn(game.i18n.format("SOL.Kit.missingPack", { pack: entry.pack }));
    return 0;
  }
  const collection = game.collections.get(entry.documentName);
  const existing = collection.filter(document => document.getFlag(systemId, "kitId")).map(document => document.getFlag(systemId, "kitId"));
  const docs = await pack.getDocuments();
  const fresh = kitImportPlan(docs.map(document => ({ kitId: document.id, document })), existing);
  if ( !fresh.length ) return 0;
  const folder = await ensureFolder(entry.folder, entry.documentName);
  const data = fresh.map(({ document }) => {
    const next = document.toObject();
    delete next._id;
    next.folder = folder.id;
    next.flags ??= {};
    next.flags[systemId] ??= {};
    next.flags[systemId].kitId = document.id;
    next.flags[systemId].kit = entry.pack;
    return next;
  });
  const documentClass = CONFIG[entry.documentName].documentClass;
  await documentClass.implementation.create(data);
  return data.length;
}

/**
 * @param {string} name
 * @param {string} type
 * @returns {Promise<Folder>}
 */
async function ensureFolder(name, type) {
  const found = game.folders.find(folder => folder.type === type && folder.name === name);
  if ( found ) return found;
  const created = await Folder.implementation.create({ name, type, folder: null });
  return created;
}
