/**
 * 1.1.4 icônes de type et boutons d'en-tête. Sans Foundry.
 * `node tests/icons-114.test.mjs`
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { artworkSourceUpdate, defaultImgFor, isReplaceableImg } from "../module/icons.mjs";

const css = readFileSync(new URL("../styles/sol.css", import.meta.url), "utf8");
const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const tester = readFileSync(new URL("../TESTER.md", import.meta.url), "utf8");
const sol = readFileSync(new URL("../module/sol.mjs", import.meta.url), "utf8");

const ICON = "systems/sol-nouvelle-ere/assets/icons";
const BAG = "icons/svg/item-bag.svg";
const MAN = "icons/svg/mystery-man.svg";

/**
 * Sélecteurs dont la font-family du thème peut atteindre une icône FA.
 * Un sélecteur générique (`button`, `*`, `.window-header`, `.header-control`)
 * doit exclure `.fa`, `.fas`, `.fa-solid` et `[class*="fa-"]`.
 * `var(--font-awesome)` n'est pas une police du système.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function faFontOffenders(source) {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@font-face\s*\{[^}]*\}/g, "");
  const offenders = [];
  const re = /([^{}@]+)\{([^{}]*)\}/g;
  let match = re.exec(stripped);
  while ( match ) {
    const body = match[2];
    const family = body.match(/font-family\s*:\s*([^;]+)/);
    if ( family && /sol-f-|IBM Plex|Atkinson Hyperlegible/.test(family[1]) ) {
      for ( const selector of match[1].split(",").map(part => part.trim()).filter(Boolean) ) {
        if ( genericWithoutFaExclusion(selector) ) offenders.push(selector);
      }
    }
    match = re.exec(stripped);
  }
  return offenders;
}

/**
 * @param {string} selector
 * @returns {boolean}
 */
function genericWithoutFaExclusion(selector) {
  const positive = selector.replace(/:not\((?:[^)(]+|\([^)]*\))*\)/g, "");
  const generic = /(^|[\s>+~])button\b|(^|[\s>+~])\*|(\.window-header\b)|(\.header-control\b)/.test(positive);
  if ( !generic ) return false;
  return !(
    selector.includes(":not(.fa)")
    && selector.includes(":not(.fas)")
    && selector.includes(":not(.fa-solid)")
    && selector.includes(':not([class*="fa-"])')
  );
}

assert.deepEqual(faFontOffenders("button { font-family: var(--sol-f-label); }"), ["button"]);
assert.deepEqual(faFontOffenders(".window-header { font-family: \"IBM Plex Sans Condensed\", sans-serif; }"), [".window-header"]);
assert.deepEqual(
  faFontOffenders('.item button:not(.fa):not(.fas):not(.fa-solid):not([class*="fa-"]) { font-family: var(--sol-f-label); }'),
  []
);
assert.deepEqual(faFontOffenders(".header-control { font-family: var(--font-awesome); }"), []);
assert.deepEqual(faFontOffenders(css), []);
assert.equal(css.includes("font-family: var(--font-awesome)"), true);
assert.equal(css.includes("font-weight: 900"), true);
assert.equal(css.includes(".window-header .header-control:hover"), true);
assert.equal(css.includes("color: var(--sol-accent);"), true);

assert.equal(isReplaceableImg(null), true);
assert.equal(isReplaceableImg(""), true);
assert.equal(isReplaceableImg(BAG), true);
assert.equal(isReplaceableImg(MAN), true);
assert.equal(isReplaceableImg("icons/svg/blood.svg"), false);
assert.equal(isReplaceableImg("icons/svg/blood.svg", "Item", "injury"), true);
assert.equal(isReplaceableImg("icons/svg/blood.svg", "Item", "weapon"), false);
assert.equal(isReplaceableImg("icons/svg/ship.svg"), false);
assert.equal(isReplaceableImg("icons/svg/ship.svg", "Actor", "ship"), true);
assert.equal(isReplaceableImg("icons/svg/ship.svg", "Item", "shipModule"), false);
assert.equal(isReplaceableImg(`${ICON}/actors/character.svg`), false);
assert.equal(isReplaceableImg("systems/sol-nouvelle-ere/assets/portraits/anouk.webp"), false);

assert.equal(defaultImgFor("Item", "weapon", BAG), `${ICON}/items/weapon.svg`);
assert.equal(defaultImgFor("Item", "weapon", ""), `${ICON}/items/weapon.svg`);
assert.equal(defaultImgFor("Item", "weapon", undefined), `${ICON}/items/weapon.svg`);
assert.equal(defaultImgFor("Item", "injury", "icons/svg/blood.svg"), `${ICON}/items/injury.svg`);
assert.equal(defaultImgFor("Item", "weapon", "icons/svg/blood.svg"), null);
assert.equal(defaultImgFor("Item", "shipModule", "icons/svg/ship.svg"), null);
assert.equal(defaultImgFor("Actor", "drone", "icons/svg/ship.svg"), null);
assert.equal(defaultImgFor("Actor", "drone", MAN), `${ICON}/actors/drone.svg`);
assert.equal(defaultImgFor("Actor", "ship", "icons/svg/ship.svg"), `${ICON}/actors/ship.svg`);
assert.equal(defaultImgFor("Actor", "character", "systems/sol-nouvelle-ere/assets/portraits/anouk.webp"), null);
assert.equal(defaultImgFor("Item", "inconnu", BAG), null);

const created = artworkSourceUpdate("Item", "armor", {}, { img: BAG });
assert.equal(created.img, `${ICON}/items/armor.svg`);
const kept = artworkSourceUpdate("Item", "armor", { img: "monde/choix.webp" }, { img: BAG });
assert.equal(kept.img, "monde/choix.webp");
const portraitPath = "systems/sol-nouvelle-ere/assets/portraits/kesi.webp";
const already = artworkSourceUpdate("Actor", "character", {
  img: portraitPath,
  prototypeToken: { texture: { src: portraitPath } }
}, {
  img: portraitPath,
  prototypeToken: { texture: { src: portraitPath } }
});
assert.equal(already, null);
const restored = artworkSourceUpdate("Actor", "character", {
  img: portraitPath,
  prototypeToken: { texture: { src: portraitPath } }
}, {
  img: MAN,
  prototypeToken: { texture: { src: MAN } }
});
assert.equal(restored.img, portraitPath);
assert.equal(restored.prototypeToken.texture.src, portraitPath);
const token = artworkSourceUpdate("Actor", "npc", {}, {
  img: MAN,
  prototypeToken: { texture: { src: MAN } }
});
assert.equal(token.img, `${ICON}/actors/npc.svg`);
assert.equal(token.prototypeToken.texture.src, `${ICON}/actors/npc.svg`);
const shipReplaced = artworkSourceUpdate("Actor", "ship", {
  img: "icons/svg/ship.svg",
  prototypeToken: { texture: { src: "icons/svg/ship.svg" } }
}, {
  img: "icons/svg/ship.svg",
  prototypeToken: { texture: { src: "icons/svg/ship.svg" } }
});
assert.equal(shipReplaced.img, `${ICON}/actors/ship.svg`);
assert.equal(shipReplaced.prototypeToken.texture.src, `${ICON}/actors/ship.svg`);
const otherShip = artworkSourceUpdate("Actor", "drone", { img: "icons/svg/ship.svg" }, { img: "icons/svg/ship.svg" });
assert.equal(otherShip, null);

const itemTypes = ["skill", "talent", "origin", "background", "profession", "weapon", "armor", "gear", "augmentation", "substance", "injury", "sequel", "software", "shipModule"];
const actorTypes = ["character", "npc", "creature", "synthetic", "drone", "vehicle", "ship"];
for ( const type of itemTypes ) {
  assert.equal(existsSync(new URL(`../assets/icons/items/${type}.svg`, import.meta.url)), true, type);
}
for ( const type of actorTypes ) {
  assert.equal(existsSync(new URL(`../assets/icons/actors/${type}.svg`, import.meta.url)), true, type);
}
assert.equal(existsSync(new URL("../assets/icons/items/state.svg", import.meta.url)), true);

let bags = 0;
let mysteryActors = 0;
let blood = 0;
let ships = 0;
let portraits = 0;
const root = new URL("../packs/_source/", import.meta.url);
for ( const pack of readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()) ) {
  const dir = new URL(`${pack.name}/`, root);
  for ( const file of readdirSync(dir).filter(name => name.endsWith(".json")) ) {
    walk(JSON.parse(readFileSync(new URL(file, dir), "utf8")));
  }
}
assert.equal(bags, 0, "sac Foundry encore dans un pack");
assert.equal(mysteryActors, 0, "visage mystère encore sur un acteur");
assert.equal(blood, 0, "blessure encore en goutte de sang");
assert.equal(ships, 0, "vaisseau encore en icône ship.svg du cœur");
assert.equal(portraits, 12, "six portraits, fiche et jeton");

const states = JSON.parse(readFileSync(new URL("../packs/_source/states/Etats_EtatsLdRv02SolNE.json", import.meta.url), "utf8"));
assert.equal(states.img, `${ICON}/items/state.svg`);
assert.equal(states.name, "États");

assert.equal(system.version, "1.1.6");
assert.equal(sol.includes("registerTypeIcons"), true);
assert.equal(tester.includes("## 31. 1.1.4 icônes et boutons d'en-tête"), true);
assert.equal(tester.includes("## 32. 1.1.5 icônes Blessure et Vaisseau"), true);

console.log("icons-114.test.mjs : ok");

/**
 * @param {unknown} node
 */
function walk(node) {
  if ( !node || typeof node !== "object" ) return;
  if ( Array.isArray(node) ) {
    for ( const entry of node ) walk(entry);
    return;
  }
  const img = node.img;
  const token = node.prototypeToken?.texture?.src;
  if ( img === BAG ) bags += 1;
  if ( itemTypes.includes(node.type) && img === "icons/svg/blood.svg" ) blood += 1;
  if ( node.type === "ship" && (img === "icons/svg/ship.svg" || token === "icons/svg/ship.svg") ) ships += 1;
  if ( actorTypes.includes(node.type) && (img === MAN || token === MAN) ) mysteryActors += 1;
  if ( typeof img === "string" && img.includes("/assets/portraits/") ) portraits += 1;
  if ( typeof token === "string" && token.includes("/assets/portraits/") ) portraits += 1;
  for ( const value of Object.values(node) ) walk(value);
}
