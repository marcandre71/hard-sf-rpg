/**
 * Garde-fou à la création d'un objet embarqué.
 *
 * Hook `preCreateItem` : il couvre le glisser-déposer, le bouton « Créer »
 * de la feuille, et toute autre création. Un objet du monde (sans acteur
 * parent) n'est pas concerné.
 *
 * Deux contrôles :
 * 1. le type doit être dans `CONFIG.SOL.allowedItems` pour cet acteur
 *    (décision Marc 17/10/2026 — voir `module/config.mjs`) ;
 * 2. sur un personnage ou un PNJ, un seul origin, un seul background,
 *    une seule profession (Fiche v0.2 §4 ; le PNJ : décision Marc 17/10/2026).
 *
 * Le second contrôle suit aussi le lot en cours (`createEmbeddedDocuments`
 * avec deux Origines d'un coup) : les objets du même appel partagent
 * `options`, et `actor.items` ne contient pas encore ceux qui viennent
 * d'être acceptés dans ce lot.
 *
 * Limite : les objets embarqués dans un acteur créé, dupliqué ou importé
 * d'un bloc ne passent pas ici (seul `preCreateActor` est appelé). Le hook
 * est aussi ignoré si l'appelant passe `noHook: true`.
 *
 * `return false` annule la création. L'avertissement n'est affiché que
 * chez l'utilisateur qui crée, pour ne pas le répéter sur les autres clients.
 */

/**
 * Types uniques déjà acceptés dans un même appel de création.
 * Clé : l'objet `options` partagé par le lot. Valeur : `actorUuid.type`.
 *
 * @type {WeakMap<object, Set<string>>}
 */
const pendingUnique = new WeakMap();

/**
 * Enregistre le hook. Appelé une fois depuis `module/sol.mjs` (`init`).
 *
 * @returns {void}
 */
export function registerItemGuard() {
  Hooks.on("preCreateItem", onPreCreateItem);
}

/**
 * @param {Item} item Document en cours de création (déjà typé, pas encore sauvé).
 * @param {object} data
 * @param {object} options
 * @param {string} userId
 * @returns {boolean|void} `false` pour refuser.
 */
function onPreCreateItem(item, data, options, userId) {
  const actor = item.parent;
  if ( !actor || actor.documentName !== "Actor" ) return;

  const itemType = game.i18n.localize(`TYPES.Item.${item.type}`);
  const actorType = game.i18n.localize(`TYPES.Actor.${actor.type}`);
  const allowed = CONFIG.SOL.allowedItems[actor.type];

  if ( !allowed?.includes(item.type) ) {
    notify(userId, "SOL.Warning.itemNotAllowed", {
      itemType,
      actor: actor.name,
      actorType
    });
    return false;
  }

  // Réf. Fiche v0.2 §4. Décision Marc 17/10/2026 : personnage et PNJ.
  if ( CONFIG.SOL.uniqueItemActors.includes(actor.type) && CONFIG.SOL.uniqueOnCharacter.includes(item.type) ) {
    const key = `${actor.uuid}.${item.type}`;
    const seen = batchSeen(options);
    const already = actor.items.some(other => other.type === item.type) || seen.has(key);
    if ( already ) {
      notify(userId, "SOL.Warning.uniqueItem", { actor: actor.name, itemType });
      return false;
    }
    // seen.add a lieu avant l'acceptation finale du document. Si un autre
    // hook refuse la première Origine, la deuxième du même lot est quand
    // même refusée. Cas rare, accepté pour l'instant.
    seen.add(key);
  }
}

/**
 * Ensemble des types uniques déjà vus dans ce lot de création.
 * Sans objet `options` (cas anormal), un ensemble neuf : le contrôle
 * retombe sur `actor.items` seul.
 *
 * @param {object} options
 * @returns {Set<string>}
 */
function batchSeen(options) {
  if ( !options || typeof options !== "object" ) return new Set();
  let seen = pendingUnique.get(options);
  if ( !seen ) {
    seen = new Set();
    pendingUnique.set(options, seen);
  }
  return seen;
}

/**
 * Avertissement localisé, uniquement pour l'auteur de la création.
 *
 * @param {string} userId
 * @param {string} key
 * @param {Record<string, string>} data
 * @returns {void}
 */
function notify(userId, key, data) {
  // Pas de userId : on affiche quand même, sinon le refus serait silencieux.
  if ( userId && game.user.id !== userId ) return;
  ui.notifications.warn(game.i18n.format(key, data));
}
