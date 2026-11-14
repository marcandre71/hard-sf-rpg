/**
 * Import du kit de démarrage visible par les joueurs, et, si Marc
 * a activé le module privé, de ses compendiums.
 *
 * Décision Didier, 14/11/2026 : le dépôt public n'importe par lui-même
 * que les trois compendiums joueurs.
 * Décision Marc, 14/11/2026 : `KIT_GM_PACKS` reste une liste vide.
 * Aucun nom de pack, de personne ou de lieu n'est écrit ici. Si le
 * module `sol-kit-mj` est actif, le MJ actif importe chaque pack
 * déclaré par ce module. Les documents gardent leur ownership.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html#register
 * @see https://foundryvtt.com/api/v14/classes/foundry.packages.Module.html
 */

export const KIT_IMPORTS = [
  { pack: "kit-pregens", folder: "Kit — Prétirés", documentName: "Actor" },
  { pack: "kit-scenes", folder: "Kit — Plans", documentName: "Scene" },
  { pack: "kit-journals", folder: "Kit — Pour les joueurs", documentName: "JournalEntry" }
];

/**
 * Aucun pack nommé. Le contenu MJ n'est pas dans ce dépôt.
 * L'import y ajoute, au moment du clic, les packs du module privé.
 */
export const KIT_GM_PACKS = [];

/** Seul identifiant permis pour le module privé. */
export const GM_KIT_MODULE_ID = "sol-kit-mj";

/** Dossier de monde des documents de ce module. Un dossier par type. */
export const GM_KIT_FOLDER = "Kit MJ — La Cale du quai 9";

/**
 * Packs du module privé à proposer à l'import.
 * Un joueur n'en reçoit aucun. Module absent ou inactif : aucun.
 *
 * @param {{ active?: boolean, packs?: Iterable<{ name?: string, type?: string }|string> }|null|undefined} module
 * @param {{ get?: (key: string) => { documentName?: string }|null|undefined }|null|undefined} packs
 * @param {{ isActiveGM?: boolean }} user
 * @returns {{ status: "not-gm"|"absent"|"active", entries: Array<{ key: string, pack: string, moduleId: string, folder: string, documentName: string|null, found: boolean }> }}
 */
export function gmKitPlan(module, packs, user) {
  if ( user?.isActiveGM !== true ) return { status: "not-gm", entries: [] };
  if ( module?.active !== true ) return { status: "absent", entries: [] };
  const entries = [];
  for ( const meta of module.packs ?? [] ) {
    const name = declaredPackName(meta);
    if ( !name ) continue;
    const key = `${GM_KIT_MODULE_ID}.${name}`;
    const live = readPack(packs, key);
    const documentName = live?.documentName || metaType(meta) || null;
    entries.push({
      key,
      pack: name,
      moduleId: GM_KIT_MODULE_ID,
      folder: GM_KIT_FOLDER,
      documentName,
      found: live != null
    });
  }
  return { status: "active", entries };
}

/**
 * @param {{ status: string, entries: Array<{ key: string, found: boolean, documentName: string|null }> }} plan
 * @returns {{ notice: "gmAbsent"|null, warnings: string[], imports: Array<object> }}
 */
export function gmKitImportSteps(plan) {
  if ( plan?.status === "not-gm" ) return { notice: null, warnings: [], imports: [] };
  if ( plan?.status !== "active" ) return { notice: "gmAbsent", warnings: [], imports: [] };
  const warnings = [];
  const imports = [];
  for ( const entry of plan.entries ?? [] ) {
    if ( entry.found !== true || !entry.documentName ) {
      warnings.push(entry.key);
      continue;
    }
    imports.push(entry);
  }
  return { notice: null, warnings, imports };
}

/**
 * Copie un document de compendium vers le monde.
 * `ownership` n'est pas réécrit : aucun droit n'est ajouté.
 *
 * @param {{ id?: string, _id?: string, toObject?: () => object }} source
 * @param {{ systemId: string, folderId: string, pack: string }} options
 * @returns {object}
 */
export function preparedKitDocument(source, { systemId, folderId, pack }) {
  const next = typeof source.toObject === "function" ? source.toObject() : { ...source };
  delete next._id;
  next.folder = folderId;
  const flags = { ...(next.flags ?? {}) };
  const own = { ...(flags[systemId] ?? {}) };
  own.kitId = source.id ?? source._id;
  own.kit = pack;
  flags[systemId] = own;
  next.flags = flags;
  return next;
}

/**
 * @param {{ name?: string }|string|null|undefined} meta
 * @returns {string}
 */
function declaredPackName(meta) {
  if ( typeof meta === "string" ) return meta;
  if ( !meta || typeof meta !== "object" ) return "";
  if ( typeof meta.name === "string" ) return meta.name;
  if ( typeof meta.metadata?.name === "string" ) return meta.metadata.name;
  return "";
}

/**
 * @param {{ type?: string }|string|null|undefined} meta
 * @returns {string}
 */
function metaType(meta) {
  if ( !meta || typeof meta === "string" ) return "";
  if ( typeof meta.type === "string" ) return meta.type;
  if ( typeof meta.documentName === "string" ) return meta.documentName;
  if ( typeof meta.metadata?.type === "string" ) return meta.metadata.type;
  return "";
}

/**
 * @param {{ get?: (key: string) => { documentName?: string }|null|undefined }|null|undefined} packs
 * @param {string} key
 * @returns {{ documentName?: string }|null}
 */
function readPack(packs, key) {
  if ( typeof packs?.get !== "function" ) return null;
  try {
    return packs.get(key) ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

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
    for ( const entry of KIT_IMPORTS ) {
      created += await importPack(systemId, entry);
    }
    const module = game.modules?.get?.(GM_KIT_MODULE_ID) ?? null;
    const plan = gmKitPlan(module, game.packs, { isActiveGM: true });
    const steps = gmKitImportSteps(plan);
    if ( steps.notice === "gmAbsent" ) {
      ui.notifications.info(game.i18n.localize("SOL.Kit.gmAbsent"));
    }
    for ( const key of steps.warnings ) {
      ui.notifications.warn(game.i18n.format("SOL.Kit.missingPack", { pack: key }));
    }
    for ( const entry of [...KIT_GM_PACKS, ...steps.imports] ) {
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
  const key = entry.key ?? `${entry.moduleId ?? systemId}.${entry.pack}`;
  const pack = game.packs.get(key);
  if ( !pack ) {
    ui.notifications.warn(game.i18n.format("SOL.Kit.missingPack", { pack: key }));
    return 0;
  }
  const documentName = pack.documentName || entry.documentName;
  const collection = game.collections.get(documentName);
  if ( !documentName || !collection ) {
    ui.notifications.warn(game.i18n.format("SOL.Kit.missingPack", { pack: key }));
    return 0;
  }
  const existing = collection.filter(document => document.getFlag(systemId, "kitId")).map(document => document.getFlag(systemId, "kitId"));
  const docs = await pack.getDocuments();
  const fresh = kitImportPlan(docs.map(document => ({ kitId: document.id, document })), existing);
  if ( !fresh.length ) return 0;
  const folder = await ensureFolder(entry.folder, documentName);
  const data = fresh.map(({ document }) => preparedKitDocument(document, {
    systemId,
    folderId: folder.id,
    pack: entry.pack
  }));
  const documentClass = CONFIG[documentName]?.documentClass;
  if ( !documentClass ) {
    ui.notifications.warn(game.i18n.format("SOL.Kit.missingPack", { pack: key }));
    return 0;
  }
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
