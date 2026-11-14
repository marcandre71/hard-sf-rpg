/**
 * Icône par type, à la création d'un acteur ou d'un objet.
 *
 * Doc v14 : `getDefaultArtwork` sur la classe de document
 * (`CONFIG.Item.documentClass`, `CONFIG.Actor.documentClass`).
 * Le TypeDataModel (`CONFIG.Item.dataModels`) porte les champs `system`,
 * pas l'image. `typeIcons` du CONFIG est un glyphe d'interface, pas un
 * fichier.
 *
 * On ne remplace une image que si elle est absente ou si c'est une icône
 * par défaut du cœur : `icons/svg/item-bag.svg` ou
 * `icons/svg/mystery-man.svg`. En plus, seulement pour leur type :
 * `icons/svg/blood.svg` sur une blessure, `icons/svg/ship.svg` sur un
 * vaisseau. Un portrait ou un fichier choisi reste. Les statuts de
 * jeton ne passent pas ici.
 *
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.BaseItem.html#getDefaultArtwork
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.BaseActor.html#getDefaultArtwork
 * @see https://foundryvtt.com/api/v14/variables/CONFIG.Item.html
 */
import { SOL } from "./config.mjs";

const SYSTEM_ID = "sol-nouvelle-ere";

/** Icônes posées par le cœur quand on ne choisit rien, pour tout type. */
export const FOUNDRY_DEFAULT_IMGS = Object.freeze([
  "icons/svg/item-bag.svg",
  "icons/svg/mystery-man.svg"
]);

/**
 * Icônes du cœur liées à un seul type. Ailleurs, on les laisse.
 * La goutte de sang des statuts de jeton n'est pas une image d'objet.
 */
export const TYPE_DEFAULT_IMGS = Object.freeze({
  injury: "icons/svg/blood.svg",
  ship: "icons/svg/ship.svg"
});

/**
 * @param {string|null|undefined} img
 * @param {"Item"|"Actor"|undefined} [kind]
 * @param {string|null|undefined} [type]
 * @returns {boolean}
 */
export function isReplaceableImg(img, kind, type) {
  if ( img == null || img === "" || FOUNDRY_DEFAULT_IMGS.includes(img) ) return true;
  if ( kind === "Item" && type === "injury" && img === TYPE_DEFAULT_IMGS.injury ) return true;
  if ( kind === "Actor" && type === "ship" && img === TYPE_DEFAULT_IMGS.ship ) return true;
  return false;
}

/**
 * Chemin d'icône du type, ou `null` si ce type n'en a pas.
 *
 * @param {"Item"|"Actor"} kind
 * @param {string|null|undefined} type
 * @returns {string|null}
 */
export function typeIconPath(kind, type) {
  if ( typeof type !== "string" || !type ) return null;
  if ( kind === "Item" && SOL.itemTypes.includes(type) ) {
    return `systems/${SYSTEM_ID}/assets/icons/items/${type}.svg`;
  }
  if ( kind === "Actor" && SOL.actorTypes.includes(type) ) {
    return `systems/${SYSTEM_ID}/assets/icons/actors/${type}.svg`;
  }
  return null;
}

/**
 * Image à écrire, ou `null` pour garder celle qui est là.
 *
 * @param {"Item"|"Actor"} kind
 * @param {string|null|undefined} type
 * @param {string|null|undefined} img
 * @returns {string|null}
 */
export function defaultImgFor(kind, type, img) {
  if ( !isReplaceableImg(img, kind, type) ) return null;
  return typeIconPath(kind, type);
}

/**
 * Changements `updateSource` pour une création.
 * `data` est la charge demandée. `document` est l'état après `super`.
 * Une image demandée qui n'est pas une icône du cœur est reposée si
 * `super` l'a remplacée.
 *
 * Pour un acteur, le jeton suit la même règle : absent, visage mystère,
 * ou, pour un vaisseau, `icons/svg/ship.svg`.
 *
 * @param {"Item"|"Actor"} kind
 * @param {string|null|undefined} type
 * @param {object|null|undefined} data
 * @param {{ img?: string, prototypeToken?: { texture?: { src?: string } } }|null|undefined} document
 * @returns {object|null}
 */
export function artworkSourceUpdate(kind, type, data, document) {
  const update = {};
  const requestedImg = data && Object.hasOwn(data, "img") ? data.img : undefined;
  const basisImg = requestedImg === undefined ? document?.img : requestedImg;
  const nextImg = defaultImgFor(kind, type, basisImg);
  if ( nextImg ) update.img = nextImg;
  else if ( typeof basisImg === "string" && basisImg && document?.img !== basisImg ) update.img = basisImg;

  if ( kind === "Actor" ) {
    const texture = data?.prototypeToken?.texture;
    const requestedToken = texture && Object.hasOwn(texture, "src") ? texture.src : undefined;
    const currentToken = document?.prototypeToken?.texture?.src;
    const basisToken = requestedToken !== undefined ? requestedToken : currentToken;
    // Pas de jeton du tout : on n'en invente un que si l'image d'acteur
    // elle-même est remplacée. Une image choisie, qui n'est pas un défaut, reste seule.
    if ( basisToken !== undefined ) {
      const nextToken = defaultImgFor("Actor", type, basisToken);
      if ( nextToken ) update.prototypeToken = { texture: { src: nextToken } };
      else if ( typeof basisToken === "string" && basisToken && currentToken !== basisToken ) {
        update.prototypeToken = { texture: { src: basisToken } };
      }
    } else if ( update.img ) {
      update.prototypeToken = { texture: { src: update.img } };
    }
  }
  return Object.keys(update).length ? update : null;
}

/**
 * Classe de document : `getDefaultArtwork` (candidat du cœur) et
 * `_preCreate` (ne remplace que les icônes par défaut du cœur).
 *
 * @returns {void}
 */
export function registerTypeIcons() {
  const ItemDoc = foundry.documents.Item;
  const ActorDoc = foundry.documents.Actor;

  class SolItem extends ItemDoc {
    /** @override */
    static getDefaultArtwork(data) {
      const img = typeIconPath("Item", data?.type);
      if ( img ) return { img };
      return super.getDefaultArtwork(data);
    }

    /** @override */
    async _preCreate(data, options, user) {
      const allowed = await super._preCreate(data, options, user);
      if ( allowed === false ) return false;
      const update = artworkSourceUpdate("Item", this.type, data, this);
      if ( update ) this.updateSource(update);
      return allowed;
    }
  }

  class SolActor extends ActorDoc {
    /** @override */
    static getDefaultArtwork(data) {
      const img = typeIconPath("Actor", data?.type);
      if ( !img ) return super.getDefaultArtwork(data);
      return { img, texture: { src: img } };
    }

    /** @override */
    async _preCreate(data, options, user) {
      const allowed = await super._preCreate(data, options, user);
      if ( allowed === false ) return false;
      const update = artworkSourceUpdate("Actor", this.type, data, this);
      if ( update ) this.updateSource(update);
      return allowed;
    }
  }

  CONFIG.Item.documentClass = SolItem;
  CONFIG.Actor.documentClass = SolActor;
}
