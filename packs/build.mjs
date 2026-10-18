/**
 * Reconstruit les compendiums LevelDB depuis packs/_source/<pack>/*.json.
 *
 * Outil officiel : @foundryvtt/foundryvtt-cli (`compilePack`).
 * Voir CONTRIBUTING.md. Les dossiers sans source JSON ne sont pas touchés.
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { readdir } from "node:fs/promises";
import path from "node:path";

const packsRoot = import.meta.dirname;
const sourceRoot = path.join(packsRoot, "_source");
const names = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

for ( const name of names ) {
  await compilePack(path.join(sourceRoot, name), path.join(packsRoot, name));
  console.log(name);
}
