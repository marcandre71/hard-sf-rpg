/**
 * Migration de monde, une fois, pour enregistrer la biographie des PNJ.
 *
 * Au chargement, `_initializeSource` a déjà appelé `migrateData` puis
 * `cleanData`. Dans `actor._source.system`, `description` a donc disparu
 * et `biography` est déjà là, en mémoire. Ce n'est pas pour autant écrit
 * en base : un `updateDocuments` ordinaire ne voit aucune différence.
 * On force l'écriture de cette biographie (`diff: false`). On ne cherche
 * pas à effacer `description` en base : une fois `biography` stockée, la
 * clé restante est ignorée au chargement.
 *
 * Le palier 1 (commit eed2d54) cherchait encore `description` dans
 * `_source` et `system.-=description` (`-=` déprécié jusqu'en v16). Il ne réécrivait
 * rien, mais posait déjà `migrationVersion` à 1. Ce passage vise donc 2.
 *
 * Gardé par le réglage de monde `migrationVersion` (nombre, pas affiché
 * dans le menu). Seulement `game.actors` : pas de compendium à cette
 * étape, et les acteurs non liés dans les scènes ne sont pas parcourus.
 * Réf. revue de eed2d54.
 */

/** Palier atteint une fois la biographie des PNJ forcée en base. */
const NPC_BIOGRAPHY_MIGRATION = 2;

const SETTING = "migrationVersion";

/**
 * Déclare le réglage. À appeler pendant `init`, avant `ready`.
 *
 * @param {string} systemId
 * @returns {void}
 */
export function registerNpcReadyMigration(systemId) {
  game.settings.register(systemId, SETTING, {
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  Hooks.once("ready", () => migrateNpcActorsOnce(systemId));
}

/**
 * @param {string} systemId
 * @returns {Promise<void>}
 */
async function migrateNpcActorsOnce(systemId) {
  // Un seul MJ actif : les autres clients ne réécrivent pas le monde.
  if ( !game.user.isActiveGM ) return;
  const current = game.settings.get(systemId, SETTING) ?? 0;
  if ( current >= NPC_BIOGRAPHY_MIGRATION ) return;

  // biography est déjà dans _source (migrateData). On la persiste telle quelle.
  const updates = game.actors
    .filter(actor => actor.type === "npc" && actor._source.system?.biography)
    .map(actor => ({ _id: actor.id, "system.biography": actor._source.system.biography }));

  try {
    if ( updates.length ) await Actor.implementation.updateDocuments(updates, { diff: false });
    // Seulement après l'écriture. Un échec laisse le palier pour retenter au prochain ready.
    await game.settings.set(systemId, SETTING, NPC_BIOGRAPHY_MIGRATION);
    if ( updates.length ) {
      ui.notifications.info(game.i18n.format("SOL.Migration.done", { count: updates.length }));
    }
  } catch (error) {
    console.error(error);
    ui.notifications.error(game.i18n.localize("SOL.Migration.failed"));
  }
}
