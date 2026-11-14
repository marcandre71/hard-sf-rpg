/**
 * Identifiants des sources de packs, 1.1.6. Sans Foundry.
 * `node tests/ids-116.test.mjs`
 *
 * Foundry attend 16 caractères alphanumériques.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const pattern = /^[A-Za-z0-9]{16}$/;
const root = new URL("../packs/_source/", import.meta.url);
const bad = [];

for ( const pack of readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()) ) {
  const dir = new URL(`${pack.name}/`, root);
  for ( const file of readdirSync(dir).filter(name => name.endsWith(".json")) ) {
    walk(JSON.parse(readFileSync(new URL(file, dir), "utf8")), `${pack.name}/${file}`);
  }
}

assert.deepEqual(bad, [], bad.map(entry => entry.id).join(", "));

const talent = JSON.parse(readFileSync(
  new URL("../packs/_source/talents/Miracle_de_la_cle_de_12_TlnCleDe12000010.json", import.meta.url),
  "utf8"
));
assert.equal(talent._id, "TlnCleDe12000010");
assert.equal(talent._key, "!items!TlnCleDe12000010");
assert.equal(talent.name, "Miracle de la clé de 12");

const factions = JSON.parse(readFileSync(
  new URL("../packs/_source/universe/Factions_JrFactionsV01So.json", import.meta.url),
  "utf8"
));
const tharsis = factions.pages.find(page => page.name === "Le Directoire de Tharsis");
assert.equal(tharsis._id, "PgDirectTharsis1");
assert.equal(tharsis._key, "!journal.pages!JrFactionsV01So0.PgDirectTharsis1");

console.log("ids-116.test.mjs : ok");

/**
 * @param {unknown} node
 * @param {string} where
 */
function walk(node, where) {
  if ( !node || typeof node !== "object" ) return;
  if ( Array.isArray(node) ) {
    node.forEach((entry, index) => walk(entry, `${where}[${index}]`));
    return;
  }
  if ( typeof node._id === "string" && !pattern.test(node._id) ) {
    bad.push({ id: node._id, where, name: node.name ?? "" });
  }
  for ( const [key, value] of Object.entries(node) ) {
    if ( key === "_id" ) continue;
    walk(value, `${where}.${key}`);
  }
}
