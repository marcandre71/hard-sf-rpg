/**
 * Migration de monde, une fois, pour les PNJ encore stockés avec
 * `system.description` (étape 2).
 *
 * `migrateData` ne réécrit pas toujours la base : une mise à jour partielle
 * peut laisser l'ancienne clé. Ici, au hook `ready`, le MJ enregistre
 * `biography` (si la fiche est bien une fiche étape 2) et retire la clé
 * avec `system.-=description`.
 *
 * Gardé par le réglage de monde `migrationVersion` (nombre, pas affiché
 * dans le menu). 0 : pas fait. 1 : description des PNJ traitée.
 * Seulement `game.actors` : pas de compendium à cette étape, et les
 * acteurs non liés dans les scènes ne sont pas parcourus.
 * Réf. revue de b2ac7e1.
 */

import { migrateNpcSource } from "./data/npc-migrate.mjs";

/** Palier atteint une fois la description des PNJ réécrite. */
const NPC_DESCRIPTION_MIGRATION = 1;

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
  if ( !game.user.isGM ) return;
  const current = game.settings.get(systemId, SETTING) ?? 0;
  if ( current >= NPC_DESCRIPTION_MIGRATION ) return;

  const updates = [];
  for ( const actor of game.actors ) {
    if ( actor.type !== "npc" ) continue;
    const stored = actor._source?.system;
    if ( !stored || !("description" in stored) ) continue;
    const source = foundry.utils.deepClone(stored);
    migrateNpcSource(source);
    const update = { _id: actor.id, "system.-=description": null };
    // N'écrit biography que si la copie l'a ajoutée (fiche étape 2).
    if ( source.biography && source.biography !== stored.biography ) {
      update["system.biography"] = source.biography;
    }
    updates.push(update);
  }

  if ( updates.length ) await game.actors.documentClass.updateDocuments(updates);
  await game.settings.set(systemId, SETTING, NPC_DESCRIPTION_MIGRATION);
}
