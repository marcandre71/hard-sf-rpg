/**
 * Règles de combat spatial, sans Foundry.
 *
 * Réf. Vaisseaux v0.1 §1 et §3. Pas de carte vectorielle :
 * trois portées abstraites, sept postes.
 * Décision Marc 23/10/2026 : le suivi tour par tour (fenêtre,
 * poussée, delta-v exact) est retiré. Le Combat Tracker tient l'ordre.
 * Les dégâts, la localisation et les missiles sont dans `damage.mjs` (0.7.3).
 * La chaleur, Pousser et les réparations sont pour la 0.7.4.
 */
import { NPC_CREW_SCORES, SHIP_POST_IDS } from "./hull.mjs";

/** Proche, moyenne, lointaine. Réf. Vaisseaux v0.1 §3. */
export const SPACE_RANGES = ["close", "medium", "long"];

/** Esquive : −10 par DR, plancher −30. Réf. Vaisseaux v0.1 §3. */
export const EVADE_STEP = -10;
export const EVADE_FLOOR = -30;

/** Sans verrouillage, au-delà de la portée proche. Réf. Vaisseaux v0.1 §3. */
export const LOCK_PENALTY = -20;

/** Tir visé : section −20, module −40. Réf. Vaisseaux v0.1 §3. */
export const AIM_SECTION = -20;
export const AIM_MODULE = -40;

/** Arme dégradée, proposée au jet de l'artilleur. Réf. Vaisseaux v0.1 §4. */
export const DEGRADED_PENALTY = -20;

/** +10 du commandant, +10 du navigateur. Réf. Vaisseaux v0.1 §3. */
export const POST_BONUS = 10;

/**
 * Boutons de l'onglet Postes. Réf. Vaisseaux v0.1 §3.
 * L'ordre du tour est `SHIP_POST_IDS`. Le +10 du commandant a l'id `command`.
 *
 * @type {Record<string, string[]>}
 */
export const POST_ACTIONS = {
  commander: ["command"],
  operator: ["lock"],
  navigator: ["calculate"],
  pilot: ["evade", "changeRange"],
  gunner: ["fire"],
  engineer: ["simple"],
  medic: ["simple"]
};

/**
 * L'action appartient-elle à ce poste.
 * Le relais refuse le reste. `command` n'est pas un id de poste.
 *
 * @param {unknown} postId
 * @param {unknown} action
 * @returns {boolean}
 */
export function actionBelongsToPost(postId, action) {
  if ( typeof postId !== "string" || typeof action !== "string" ) return false;
  if ( !Object.hasOwn(POST_ACTIONS, postId) ) return false;
  return POST_ACTIONS[postId].includes(action);
}

/**
 * Bonus du tour d'un vaisseau. Pas de poussée : le delta-v est manuel.
 * Décision Marc 23/10/2026.
 *
 * `lock` est l'identité de la cible (jeton de préférence), ou "".
 * // Décision Marc 25/10/2026 : une seule cible.
 *
 * @returns {{ lock: string, evade: number, commanderPost: string, pilotBonus: boolean }}
 */
export function blankTurn() {
  return {
    lock: "",
    evade: 0,
    commanderPost: "",
    pilotBonus: false
  };
}

/**
 * @param {unknown} raw
 * @returns {ReturnType<typeof blankTurn>}
 */
export function normalizeTurn(raw) {
  const blank = blankTurn();
  if ( !raw || typeof raw !== "object" || Array.isArray(raw) ) return blank;
  const row = /** @type {Record<string, unknown>} */ (raw);
  const post = typeof row.commanderPost === "string" && SHIP_POST_IDS.includes(row.commanderPost)
    ? row.commanderPost
    : "";
  return {
    lock: lockId(row.lock),
    evade: snappedEvade(row.evade),
    commanderPost: post,
    pilotBonus: Boolean(row.pilotBonus)
  };
}

/**
 * Un booléen hérité d'un essai sans cible n'est pas une identité.
 *
 * @param {unknown} value
 * @returns {string}
 */
function lockId(value) {
  if ( typeof value !== "string" ) return "";
  return value.trim();
}

/**
 * Jeton de préférence, sinon l'acteur.
 * // Décision Marc 25/10/2026
 *
 * @param {{ tokenUuid?: unknown, actorUuid?: unknown }|null|undefined} target
 * @returns {string}
 */
export function targetIdentity(target) {
  const tokenUuid = typeof target?.tokenUuid === "string" ? target.tokenUuid.trim() : "";
  if ( tokenUuid ) return tokenUuid;
  return typeof target?.actorUuid === "string" ? target.actorUuid.trim() : "";
}

/**
 * Le jeton visé est celui qui manœuvre.
 * Même acteur, autre jeton : ce n'est pas soi.
 * // Décision Marc 25/10/2026
 *
 * @param {{ tokenUuid?: string, actorUuid?: string }} own
 * @param {{ tokenUuid?: string, actorUuid?: string }} target
 * @returns {boolean}
 */
export function isOwnTarget(own, target) {
  const ownToken = targetIdentity({ tokenUuid: own?.tokenUuid });
  const targetToken = targetIdentity({ tokenUuid: target?.tokenUuid });
  if ( ownToken && targetToken ) return ownToken === targetToken;
  const ownActor = typeof own?.actorUuid === "string" ? own.actorUuid : "";
  const targetActor = typeof target?.actorUuid === "string" ? target.actorUuid : "";
  return ownActor !== "" && ownActor === targetActor;
}

/**
 * Verrouiller ne se lance qu'avec une seule cible.
 * // Décision Marc 25/10/2026
 *
 * @param {number} count
 * @returns {boolean}
 */
export function lockRollAllowed(count) {
  return count === 1;
}

/**
 * Réussite : cette cible remplace l'ancienne. Échec ou identité vide :
 * on garde le verrouillage déjà là.
 * // Décision Marc 25/10/2026
 *
 * @param {unknown} turn
 * @param {boolean} success
 * @param {unknown} uuid
 * @returns {ReturnType<typeof blankTurn>}
 */
export function lockAfterRoll(turn, success, uuid) {
  const current = normalizeTurn(turn);
  if ( success !== true ) return current;
  const id = lockId(uuid);
  if ( !id ) return current;
  return { ...current, lock: id };
}

/**
 * Le MJ retire le verrouillage. Le reste du tour ne bouge pas.
 * // Décision Marc 25/10/2026
 *
 * @param {unknown} turn
 * @returns {ReturnType<typeof blankTurn>}
 */
export function lockCleared(turn) {
  return { ...normalizeTurn(turn), lock: "" };
}

/**
 * Le tir vise la cible verrouillée.
 * // Décision Marc 25/10/2026
 *
 * @param {unknown} lock
 * @param {unknown} fireTarget
 * @returns {boolean}
 */
export function lockCovers(lock, fireTarget) {
  const id = lockId(lock);
  const fire = lockId(fireTarget);
  return id !== "" && id === fire;
}

/**
 * Début de round : +10 du commandant, Calculer et esquive partent.
 * Le verrouillage reste jusqu'à la suppression du combat.
 * Décision Marc 23/10/2026. Décision Marc 21/10/2026 pour le verrouillage.
 *
 * @param {unknown} turn
 * @returns {ReturnType<typeof blankTurn>}
 */
export function bonusesCleared(turn) {
  const current = normalizeTurn(turn);
  return { ...blankTurn(), lock: current.lock };
}

/**
 * Les bonus partent seulement si le nouveau round est plus grand.
 * Reculer d'un round ne les vide pas. Un round illisible non plus.
 *
 * @param {unknown} previous
 * @param {unknown} next
 * @returns {boolean}
 */
export function roundAdvanced(previous, next) {
  const before = Number(previous);
  const after = Number(next);
  if ( !Number.isFinite(before) || !Number.isFinite(after) ) return false;
  return after > before;
}

/**
 * Vider les bonus de ce passage de round.
 * `previous` est posé dans `Combat#_onUpdate` sur tous les clients,
 * y compris le MJ actif qui n'a pas cliqué.
 * Un joueur qui passe le round est donc vu.
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html#previous
 *
 * @param {{ previous?: { round?: unknown } }|null|undefined} combat
 * @param {object|null|undefined} changed
 * @returns {boolean}
 */
export function roundClearRequested(combat, changed) {
  if ( !changed || !Object.hasOwn(changed, "round") ) return false;
  return roundAdvanced(combat?.previous?.round, changed.round);
}

/**
 * Combattant de ce vaisseau.
 * D'abord le jeton. Sinon l'acteur, si son uuid n'a qu'un combattant
 * (jeton non lié). `actorId` seulement sans jeton (barre latérale),
 * et seulement s'il n'y a qu'un candidat. Deux jetons du même acteur
 * ne se confondent pas : le tour de l'autre n'est pas un critère.
 *
 * @param {Array<{ tokenId?: string, actorId?: string, actor?: { uuid?: string, id?: string } }>|Iterable<{ tokenId?: string }>|null|undefined} combatants
 * @param {{ token?: { id?: string }|null, tokenId?: string, uuid?: string, id?: string }|null|undefined} ship
 * @returns {object|null}
 */
export function pickCombatant(combatants, ship) {
  const rows = combatantList(combatants);
  if ( !ship || !rows.length ) return null;
  const tokenId = ship.token?.id || ship.tokenId || "";
  if ( typeof tokenId === "string" && tokenId ) {
    const hit = rows.find(row => row?.tokenId === tokenId);
    if ( !hit || !combatantIsShip(hit, ship) ) return null;
    return hit;
  }
  const uuid = typeof ship.uuid === "string" ? ship.uuid : "";
  if ( uuid ) {
    const byUuid = rows.filter(row => row?.actor?.uuid === uuid);
    if ( byUuid.length === 1 ) return byUuid[0];
    if ( byUuid.length > 1 ) return null;
  }
  const actorId = typeof ship.id === "string" ? ship.id : "";
  if ( !actorId ) return null;
  const byActor = rows.filter(row => row && (row.actorId === actorId || row.actor?.id === actorId));
  if ( byActor.length === 1 ) return byActor[0];
  return null;
}

/**
 * @param {Iterable<object>|null|undefined} combatants
 * @returns {object[]}
 */
function combatantList(combatants) {
  if ( !combatants || typeof combatants[Symbol.iterator] !== "function" ) return [];
  return [...combatants].filter(row => row && typeof row === "object");
}

/**
 * Le jeton demandé est bien ce vaisseau.
 * Même `actorId`, autre uuid : un autre jeton non lié, refusé.
 *
 * @param {{ actorId?: string, actor?: { uuid?: string, id?: string } }} row
 * @param {{ uuid?: string, id?: string }} ship
 * @returns {boolean}
 */
function combatantIsShip(row, ship) {
  const uuid = typeof ship.uuid === "string" ? ship.uuid : "";
  const actorUuid = typeof row.actor?.uuid === "string" ? row.actor.uuid : "";
  if ( uuid && actorUuid ) return uuid === actorUuid;
  const actorId = typeof ship.id === "string" ? ship.id : "";
  if ( !actorId ) return false;
  return row.actorId === actorId || row.actor?.id === actorId;
}

/**
 * Le relais n'accepte qu'un Token de la scène du combat.
 *
 * @param {{ documentName?: unknown, parentId?: unknown }} doc
 * @param {{ sceneId?: unknown }} combat
 * @returns {boolean}
 */
export function acceptedTokenScene(doc, combat) {
  if ( doc?.documentName !== "Token" ) return false;
  const sceneId = typeof combat?.sceneId === "string" ? combat.sceneId : "";
  const parentId = typeof doc?.parentId === "string" ? doc.parentId : "";
  return sceneId !== "" && parentId === sceneId;
}

/**
 * @param {unknown} value
 * @returns {number} 0, −10, −20 ou −30.
 */
function snappedEvade(value) {
  const number = Number(value);
  if ( !Number.isFinite(number) || number >= 0 ) return 0;
  const steps = Math.min(3, Math.max(0, Math.round(Math.abs(number) / 10)));
  return -steps * 10;
}

/**
 * Esquive réussie : max(10, 10×DR), plafonné à 30, en malus.
 * Décision Marc 21/10/2026 : une réussite à 0 DR donne −10.
 * Un échec donne 0.
 *
 * @param {unknown} dr
 * @param {boolean} success
 * @returns {number}
 */
export function evadeFromDr(dr, success) {
  if ( !success ) return 0;
  const steps = Math.trunc(Number(dr));
  const tens = Number.isFinite(steps) ? Math.max(0, steps) : 0;
  const magnitude = Math.max(10, 10 * tens);
  return -Math.min(30, magnitude);
}

/**
 * Modificateur proposé pour le dialogue (le MJ peut le changer).
 * Décision Marc 25/10/2026 : ce total n'est pas ramené à ±50.
 * Le dialogue d'un poste le garde tel quel (`rollModifier`).
 * Un jet de personnage, hors poste, reste borné (`cappedModifier`).
 *
 * Décision Marc 21/10/2026 : le +10 de Calculer vaut pour tous
 * les jets du Pilote du tour (Esquiver et Changer de portée).
 *
 * `fireTarget` est l'identité du tir (jeton de préférence).
 * // Décision Marc 25/10/2026 : le −20 ne tombe pas si c'est la cible verrouillée.
 *
 * @param {{ postId?: string, range?: string, fireTarget?: string, ship?: { lock?: string, evade?: number, commanderPost?: string, pilotBonus?: boolean }, foe?: { evade?: number }, aim?: string, weaponCondition?: string, twisted?: boolean, sensorsOut?: boolean }} input
 * @returns {number}
 */
export function suggestedModifier(input) {
  const postId = input?.postId ?? "";
  let modifier = 0;
  if ( input?.ship?.commanderPost && input.ship.commanderPost === postId ) modifier += POST_BONUS;
  if ( postId === "pilot" && input?.ship?.pilotBonus ) modifier += POST_BONUS;
  // Réf. Vaisseaux v0.1 §5. Décision Marc 25/10/2026.
  if ( postId === "pilot" && input?.twisted === true ) modifier += DEGRADED_PENALTY;
  if ( postId === "operator" && input?.sensorsOut === true ) modifier += DEGRADED_PENALTY;
  if ( postId !== "gunner" ) return modifier;
  if ( input?.sensorsOut === true ) modifier += DEGRADED_PENALTY;
  // Réf. Vaisseaux v0.1 §4 : dégradé, −20 aux tests qui utilisent l'arme.
  if ( input?.weaponCondition === "degraded" ) modifier += DEGRADED_PENALTY;
  if ( input?.range && input.range !== "close" && !lockCovers(input?.ship?.lock, input?.fireTarget) ) {
    modifier += LOCK_PENALTY;
  }
  const evade = Number(input?.foe?.evade);
  if ( Number.isFinite(evade) ) modifier += evade;
  if ( input?.aim === "section" ) modifier += AIM_SECTION;
  if ( input?.aim === "module" ) modifier += AIM_MODULE;
  return modifier;
}

/**
 * L'arme ne tire qu'à ses portées. Hors service ou non renseigné : non.
 *
 * @param {{ category?: string, condition?: string, rangeClose?: boolean, rangeMedium?: boolean, rangeLong?: boolean }} module
 * @param {string} range
 * @returns {boolean}
 */
export function weaponCanFire(module, range) {
  if ( !module || module.category !== "weapon" ) return false;
  if ( module.condition === "out" || module.condition === "unset" ) return false;
  // 0 : plus de munitions. Vide (null) : le MJ n'a pas saisi, le tir n'est pas bloqué.
  // Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
  if ( ammoBlocksFire(module.ammo) ) return false;
  if ( range === "close" ) return module.rangeClose === true;
  if ( range === "medium" ) return module.rangeMedium === true;
  if ( range === "long" ) return module.rangeLong === true;
  return false;
}

/**
 * Compteur à 0 : l'arme ne tire plus. Absent ou vide : non.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {unknown} ammo Nombre, ou `{ value }`.
 * @returns {boolean}
 */
export function ammoBlocksFire(ammo) {
  if ( ammo === null || ammo === undefined || ammo === "" ) return false;
  const value = typeof ammo === "object" ? /** @type {{ value?: unknown }} */ (ammo).value : ammo;
  if ( value === null || value === undefined || value === "" ) return false;
  const number = Number(value);
  return Number.isFinite(number) && number <= 0;
}

/**
 * Deux combattants du même acteur. Un jeton lié partage l'uuid :
 * ce sont deux vaisseaux qu'on ne sait pas séparer sans dupliquer l'acteur.
 * Décision Marc 25/10/2026.
 *
 * @param {Array<{ actor?: { uuid?: string }, actorUuid?: string }>|Iterable<{ actor?: { uuid?: string } }>|null|undefined} combatants
 * @param {unknown} actorUuid
 * @returns {boolean}
 */
export function linkedActorTwins(combatants, actorUuid) {
  if ( typeof actorUuid !== "string" || !actorUuid ) return false;
  if ( !combatants || typeof combatants[Symbol.iterator] !== "function" ) return false;
  let count = 0;
  for ( const row of combatants ) {
    const uuid = row?.actor?.uuid || row?.actorUuid || "";
    if ( uuid === actorUuid ) count += 1;
  }
  return count >= 2;
}

/**
 * Une portée plus près ou plus loin. Au bout de l'échelle, on reste.
 *
 * @param {string} range
 * @param {"closer"|"farther"} direction
 * @returns {string}
 */
export function shiftRange(range, direction) {
  const index = SPACE_RANGES.indexOf(range);
  if ( index < 0 ) return "medium";
  if ( direction === "closer" ) return SPACE_RANGES[Math.max(0, index - 1)];
  if ( direction === "farther" ) return SPACE_RANGES[Math.min(SPACE_RANGES.length - 1, index + 1)];
  return range;
}

/**
 * Portée écrite sur les deux vaisseaux quand la manœuvre est gagnée.
 * // Décision Marc 25/10/2026 : c'est la portée du vaisseau qui manœuvre
 * qui compte, pas celle de l'autre fiche. Direction inconnue : null.
 *
 * @param {string} current Portée du vaisseau qui manœuvre.
 * @param {unknown} direction
 * @returns {string|null}
 */
export function sharedRange(current, direction) {
  if ( direction !== "closer" && direction !== "farther" ) return null;
  return shiftRange(current, direction);
}

/**
 * Avertissement de chat si les deux fiches n'ont pas la même portée.
 * `null` si elles concordent. On manœuvre quand même.
 * La phrase est `SOL.Space.rangeDiffer` (`{maneuver}`, `{other}`),
 * en français et en anglais : les deux langues lisent `lang/fr.json`.
 * // Décision Marc 25/10/2026
 *
 * @param {string} maneuverLabel
 * @param {string} otherLabel
 * @returns {{ key: string, maneuver: string, other: string }|null}
 */
export function rangeDifferWarning(maneuverLabel, otherLabel) {
  if ( maneuverLabel === otherLabel ) return null;
  return {
    key: "SOL.Space.rangeDiffer",
    maneuver: maneuverLabel,
    other: otherLabel
  };
}

/**
 * Test opposé.
 *
 * Une réussite bat un échec. Deux réussites : le plus gros DR.
 * Ensuite, si `useScore`, le meilleur score. Encore égal : `"tie"`.
 * Les DE ne départagent pas.
 *
 * Au changement de portée (Réf. LdR v0.2 §6), le score ne départage
 * que deux réussites au même DR (`scoreOnFailure` faux). Deux échecs :
 * personne ne gagne, `"tie"`.
 *
 * @param {{ success?: boolean, dr?: unknown, score?: unknown }} a
 * @param {{ success?: boolean, dr?: unknown, score?: unknown }} b
 * @param {{ useScore?: boolean, scoreOnFailure?: boolean }} [options]
 * @returns {"a"|"b"|"tie"}
 */
export function compareOpposed(a, b, { useScore = false, scoreOnFailure = true } = {}) {
  const aHit = a?.success === true;
  const bHit = b?.success === true;
  if ( aHit !== bHit ) return aHit ? "a" : "b";
  if ( aHit && bHit ) {
    const left = Number(a?.dr);
    const right = Number(b?.dr);
    if ( Number.isFinite(left) && Number.isFinite(right) && left !== right ) return left > right ? "a" : "b";
  }
  if ( useScore && (aHit || scoreOnFailure) ) {
    const left = Number(a?.score);
    const right = Number(b?.score);
    if ( Number.isFinite(left) && Number.isFinite(right) && left !== right ) return left > right ? "a" : "b";
  }
  return "tie";
}

/**
 * Uuid présents sur plus d'un poste. Un personnage, un poste par tour.
 *
 * @param {{ uuid?: string }[]} posts
 * @returns {string[]}
 */
export function duplicateActors(posts) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for ( const post of posts ?? [] ) {
    const uuid = typeof post?.uuid === "string" ? post.uuid : "";
    if ( !uuid ) continue;
    counts.set(uuid, (counts.get(uuid) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([uuid]) => uuid);
}

/**
 * Le véhicule n'entre pas dans le Combat Tracker.
 * Décision Marc 18/10/2026. Le vaisseau, lui, y entre.
 * Décision Marc 23/10/2026.
 *
 * @param {unknown} actorType
 * @returns {boolean}
 */
export function blocksCharacterCombat(actorType) {
  return actorType === "vehicle";
}

/**
 * Un objet fixe ne manœuvre pas.
 * Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §3.
 *
 * @param {unknown} category
 * @returns {boolean}
 */
export function refusesManeuver(category) {
  return category === "fixed";
}

/**
 * Score d'un poste vide. Même barème qu'en 0.7.1.
 * Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §3.
 * Inconnu : entraîné (50).
 *
 * @param {unknown} npcCrew
 * @returns {number}
 */
export function emptyPostScore(npcCrew) {
  if ( typeof npcCrew === "string" && Number.isFinite(NPC_CREW_SCORES[npcCrew]) ) {
    return NPC_CREW_SCORES[npcCrew];
  }
  return NPC_CREW_SCORES.trained;
}

/**
 * Base du jet d'initiative d'un vaisseau, avant `encodeInitiative`.
 *
 * Le jet est Opérations de bord, par l'acteur du poste Opérateur.
 * Poste vide : équipage PNJ, RÉF 0 (le vaisseau n'a pas de caractéristiques).
 * La formule est celle des personnages : on passe ce score et cette
 * RÉF à `encodeInitiative`, sans autre encodage.
 * // Décision Marc 25/10/2026 : ce jet n'est pas plafonné à ±50.
 * // Décision Marc 25/10/2026 : à égalité, le vaisseau passe après
 * les personnages. Le nombre ne change pas : le MJ réordonne.
 *
 * @param {{ npcCrew?: unknown, operatorScore?: unknown, operatorRef?: unknown }} [input]
 * @returns {{ score: number, ref: number, npc: boolean }}
 */
export function shipInitiativeBasis({ npcCrew, operatorScore, operatorRef } = {}) {
  const hasScore = typeof operatorScore === "number" && Number.isFinite(operatorScore);
  if ( !hasScore ) return { score: emptyPostScore(npcCrew), ref: 0, npc: true };
  const ref = Number(operatorRef);
  return {
    score: operatorScore,
    ref: Number.isFinite(ref) ? ref : 0,
    npc: false
  };
}
