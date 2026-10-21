/**
 * Combat spatial par postes, sans Foundry.
 *
 * Réf. Vaisseaux v0.1 §1 et §3. Pas de carte vectorielle :
 * trois portées abstraites, sept postes, un tour d'environ une minute.
 * Les dégâts, la localisation et les missiles sont pour la 0.7.2.
 * La chaleur, Pousser et les réparations sont pour la 0.7.3.
 */
import { SHIP_POST_IDS } from "./hull.mjs";

/** Gravité standard, m/s². Le produit accélération × 60 s en découle. */
export const STANDARD_GRAVITY = 9.80665;

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
 * État vide. Le MJ le remplit (deux vaisseaux, portée de départ).
 *
 * @returns {object}
 */
export function blankCombat() {
  return {
    round: 1,
    postIndex: 0,
    side: 0,
    ships: ["", ""],
    firstSide: null,
    range: "medium",
    turns: {}
  };
}

/**
 * @returns {{ thrust: boolean, lock: boolean, evade: number, commanderPost: string, pilotBonus: boolean }}
 */
export function blankTurn() {
  return {
    thrust: false,
    lock: false,
    evade: 0,
    commanderPost: "",
    pilotBonus: false
  };
}

/**
 * Ramène un état lu (réglage, saisie) à la forme attendue.
 *
 * @param {unknown} raw
 * @returns {object}
 */
export function normalizeCombat(raw) {
  const blank = blankCombat();
  if ( !raw || typeof raw !== "object" || Array.isArray(raw) ) return blank;
  const source = /** @type {Record<string, unknown>} */ (raw);
  const round = Number(source.round);
  const postIndex = Number(source.postIndex);
  const side = Number(source.side);
  const range = SPACE_RANGES.includes(/** @type {string} */ (source.range))
    ? source.range
    : "medium";
  const ships = Array.isArray(source.ships)
    ? [String(source.ships[0] ?? ""), String(source.ships[1] ?? "")]
    : ["", ""];
  const firstSide = source.firstSide === 0 || source.firstSide === 1 ? source.firstSide : null;
  /** @type {Record<string, ReturnType<typeof blankTurn>>} */
  const turns = {};
  if ( source.turns && typeof source.turns === "object" ) {
    for ( const [uuid, turn] of Object.entries(source.turns) ) {
      if ( !uuid || !turn || typeof turn !== "object" ) continue;
      const row = /** @type {Record<string, unknown>} */ (turn);
      const post = typeof row.commanderPost === "string" && SHIP_POST_IDS.includes(row.commanderPost)
        ? row.commanderPost
        : "";
      turns[uuid] = {
        thrust: Boolean(row.thrust),
        lock: Boolean(row.lock),
        evade: snappedEvade(row.evade),
        commanderPost: post,
        pilotBonus: Boolean(row.pilotBonus)
      };
    }
  }
  return {
    round: Number.isFinite(round) && round >= 1 ? Math.trunc(round) : 1,
    postIndex: Number.isFinite(postIndex) && postIndex >= 0 && postIndex < SHIP_POST_IDS.length
      ? Math.trunc(postIndex)
      : 0,
    side: side === 1 ? 1 : 0,
    ships,
    firstSide,
    range,
    turns
  };
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
 * @param {object} state
 * @param {string} uuid
 * @returns {ReturnType<typeof blankTurn>}
 */
export function turnOf(state, uuid) {
  if ( !uuid ) return blankTurn();
  return { ...blankTurn(), ...(state?.turns?.[uuid] ?? {}) };
}

/**
 * Le premier vaisseau, puis l'autre. `firstSide` null : l'ordre saisi.
 *
 * @param {object} state
 * @returns {string[]}
 */
export function actingOrder(state) {
  const first = String(state?.ships?.[0] ?? "");
  const second = String(state?.ships?.[1] ?? "");
  if ( state?.firstSide === 1 ) return [second, first];
  return [first, second];
}

/**
 * Les quatorze créneaux : chaque poste, premier vaisseau puis l'autre.
 *
 * @param {object} state
 * @returns {{ postId: string, postIndex: number, side: number, uuid: string, current: boolean, empty: boolean }[]}
 */
export function turnSchedule(state) {
  const order = actingOrder(state);
  /** @type {ReturnType<typeof turnSchedule>} */
  const rows = [];
  SHIP_POST_IDS.forEach((postId, postIndex) => {
    order.forEach((uuid, side) => {
      rows.push({
        postId,
        postIndex,
        side,
        uuid,
        current: postIndex === state.postIndex && side === state.side,
        empty: uuid === ""
      });
    });
  });
  return rows;
}

/**
 * @param {object} state
 * @returns {{ postId: string|null, shipUuid: string, side: number }}
 */
export function currentStep(state) {
  return {
    postId: SHIP_POST_IDS[state?.postIndex] ?? null,
    shipUuid: actingOrder(state)[state?.side] ?? "",
    side: state?.side === 1 ? 1 : 0
  };
}

/**
 * Passe au créneau suivant. Un côté sans vaisseau est sauté.
 * À la fin du médecin du second, on ne boucle pas : le MJ prend « Tour suivant ».
 *
 * @param {object} state
 * @returns {{ state: object, done: boolean }}
 */
export function nextPost(state) {
  const start = normalizeCombat(state);
  let postIndex = start.postIndex;
  let side = start.side;
  for ( let step = 0; step < SHIP_POST_IDS.length * 2; step++ ) {
    side += 1;
    if ( side > 1 ) {
      side = 0;
      postIndex += 1;
    }
    if ( postIndex >= SHIP_POST_IDS.length ) return { state: start, done: true };
    const order = actingOrder({ ...start, postIndex, side });
    if ( order[side] ) return { state: { ...start, postIndex, side }, done: false };
  }
  return { state: start, done: true };
}

/**
 * Si le créneau courant n'a pas de vaisseau, avance jusqu'au prochain.
 *
 * @param {object} state
 * @returns {{ state: object, done: boolean }}
 */
export function settle(state) {
  let current = normalizeCombat(state);
  for ( let step = 0; step < SHIP_POST_IDS.length * 2; step++ ) {
    if ( current.postIndex >= SHIP_POST_IDS.length ) return { state: current, done: true };
    const order = actingOrder(current);
    if ( order[current.side] ) return { state: current, done: false };
    const stepped = nextPost(current);
    if ( stepped.done ) return { state: current, done: true };
    current = stepped.state;
  }
  return { state: current, done: false };
}

/**
 * Fin de tour : les bonus du tour partent, le verrouillage reste.
 * La poussée cochée produit une déduction, appliquée par l'appelant.
 *
 * Décision Marc 21/10/2026 : le verrouillage dure tout le combat,
 * sauf si le MJ le retire à la main.
 *
 * @param {object} state
 * @param {Record<string, { acceleration?: unknown, deltaV?: unknown }>} statsByUuid
 * @returns {{ state: object, deductions: { uuid: string, cost: number, value: number }[] }}
 */
export function finishRound(state, statsByUuid = {}) {
  const current = normalizeCombat(state);
  /** @type {{ uuid: string, cost: number, value: number }[]} */
  const deductions = [];
  /** @type {Record<string, ReturnType<typeof blankTurn>>} */
  const turns = {};
  for ( const uuid of current.ships ) {
    if ( !uuid || turns[uuid] ) continue;
    const turn = turnOf(current, uuid);
    const stats = statsByUuid[uuid] ?? {};
    if ( turn.thrust ) {
      deductions.push({
        uuid,
        cost: thrustCostKmS(stats.acceleration),
        value: deltaVAfterThrust(stats.deltaV, stats.acceleration)
      });
    }
    turns[uuid] = {
      thrust: false,
      lock: turn.lock,
      evade: 0,
      commanderPost: "",
      pilotBonus: false
    };
  }
  return {
    state: {
      ...current,
      round: current.round + 1,
      postIndex: 0,
      side: 0,
      turns
    },
    deductions
  };
}

/**
 * Coût d'un tour de poussée, en km/s.
 * Accélération en milli-g × 60 s. 21 milli-g → environ 12 m/s.
 *
 * Décision Marc 21/10/2026 : on soustrait le produit exact
 * (21 milli-g → 12,356 m/s), sans arrondir à 12 ni au supérieur.
 * Simplification : coût constant par tour, la masse n'est pas recalculée.
 * Réf. Vaisseaux v0.1 §3.
 *
 * @param {unknown} accelerationMilliG
 * @returns {number}
 */
export function thrustCostKmS(accelerationMilliG) {
  const acceleration = Number(accelerationMilliG);
  if ( !Number.isFinite(acceleration) || acceleration <= 0 ) return 0;
  return acceleration * 0.001 * STANDARD_GRAVITY * 60 / 1000;
}

/**
 * Delta-v après une poussée. Ne descend pas sous 0. Le maximum n'est pas touché.
 *
 * @param {unknown} value
 * @param {unknown} accelerationMilliG
 * @returns {number}
 */
export function deltaVAfterThrust(value, accelerationMilliG) {
  const current = Number(value);
  const base = Number.isFinite(current) ? current : 0;
  const next = base - thrustCostKmS(accelerationMilliG);
  return next > 0 ? next : 0;
}

/**
 * Affichage à trois décimales. 3,587… km/s se lit 3,588.
 * Ce nombre n'est pas celui qu'on stocke.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function roundDeltaV(value) {
  const number = Number(value);
  if ( !Number.isFinite(number) ) return 0;
  return Math.round(number * 1000) / 1000;
}

/**
 * Le delta-v restant couvre-t-il un tour de poussée ?
 * Égal au coût : oui. Strictement inférieur : non.
 *
 * @param {unknown} value
 * @param {unknown} accelerationMilliG
 * @returns {boolean}
 */
export function canPayThrust(value, accelerationMilliG) {
  const cost = thrustCostKmS(accelerationMilliG);
  const current = Number(value);
  const base = Number.isFinite(current) ? current : 0;
  return base + 1e-9 >= cost;
}

/**
 * La fiche montre le delta-v à 3 décimales. Renvoyer ce nombre
 * au formulaire ne doit pas remplacer la valeur exacte stockée.
 * Une saisie différente est une correction : on la garde.
 *
 * @param {object|null|undefined} diff Diff `system`.
 * @param {object|null|undefined} current Source déjà stockée.
 * @returns {void}
 */
export function keepExactDeltaV(diff, current) {
  const pair = diff?.propulsion?.deltaV;
  if ( !pair || typeof pair !== "object" || !Object.hasOwn(pair, "value") ) return;
  const stored = Number(current?.propulsion?.deltaV?.value);
  const proposed = Number(pair.value);
  if ( !Number.isFinite(stored) || !Number.isFinite(proposed) ) return;
  if ( Math.abs(proposed - stored) <= 1e-12 ) return;
  if ( Math.abs(proposed - roundDeltaV(stored)) >= 5e-7 ) return;
  delete pair.value;
  if ( Object.keys(pair).length ) return;
  delete diff.propulsion.deltaV;
  if ( Object.keys(diff.propulsion).length ) return;
  delete diff.propulsion;
}

/**
 * Delta-v après un changement de portée.
 * Même produit exact que la poussée, plancher 0. Pas d'arrondi à 0,012.
 *
 * // À confirmer par Marc : le retrait se fait-il aussi en cas d'échec,
 * et pour les deux vaisseaux ou seulement celui qui manœuvre ?
 * Choix par défaut : seulement le vaisseau qui a lancé le changement,
 * qu'il réussisse ou non.
 *
 * @param {unknown} value
 * @param {unknown} accelerationMilliG
 * @returns {number}
 */
export function deltaVAfterRangeChange(value, accelerationMilliG) {
  return deltaVAfterThrust(value, accelerationMilliG);
}

/**
 * Esquive réussie : au moins −10, puis −10 par DR, au plus −30.
 * Décision Marc 21/10/2026 : une réussite à 0 DR donne −10.
 * Un échec ne donne rien.
 *
 * @param {unknown} dr
 * @param {boolean} success
 * @returns {number}
 */
export function evadeFromDr(dr, success) {
  if ( !success ) return 0;
  const steps = Math.trunc(Number(dr));
  const fromDr = Number.isFinite(steps) ? Math.max(0, steps) * EVADE_STEP : 0;
  return Math.max(EVADE_FLOOR, Math.min(fromDr, EVADE_STEP));
}

/**
 * Modificateur proposé pour le dialogue (le MJ peut le changer).
 * // À confirmer par Marc : le plafond ±50 du dialogue de jet est conservé.
 * Il n'est pas réappliqué ici.
 *
 * @param {{ postId?: string, range?: string, ship?: { lock?: boolean, evade?: number, commanderPost?: string, pilotBonus?: boolean }, foe?: { evade?: number }, aim?: string, weaponCondition?: string }} input
 * @returns {number}
 */
export function suggestedModifier(input) {
  const postId = input?.postId ?? "";
  let modifier = 0;
  if ( input?.ship?.commanderPost && input.ship.commanderPost === postId ) modifier += POST_BONUS;
  // Décision Marc 21/10/2026 : le navigateur agit avant, donc ce +10
  // est déjà posé quand le pilote jette, dans le même tour.
  if ( postId === "pilot" && input?.ship?.pilotBonus ) modifier += POST_BONUS;
  if ( postId !== "gunner" ) return modifier;
  // Réf. Vaisseaux v0.1 §4 : dégradé, −20 aux tests qui utilisent l'arme.
  if ( input?.weaponCondition === "degraded" ) modifier += DEGRADED_PENALTY;
  if ( input?.range && input.range !== "close" && !input?.ship?.lock ) modifier += LOCK_PENALTY;
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
  if ( range === "close" ) return module.rangeClose === true;
  if ( range === "medium" ) return module.rangeMedium === true;
  if ( range === "long" ) return module.rangeLong === true;
  return false;
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
 * Test opposé.
 *
 * Une réussite bat un échec. Deux réussites : le plus gros DR.
 * Ensuite, si `useScore`, le meilleur score. Encore égal : `"tie"`.
 * Les DE ne départagent pas.
 *
 * Décision Marc 21/10/2026 : à l'ouverture, le score départage aussi
 * deux échecs (`scoreOnFailure`, défaut). Encore égal, le MJ choisit.
 * Au changement de portée (LdR §6), le score ne départage que deux
 * réussites au même DR. Deux échecs : personne ne gagne, `"tie"`.
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
 * Vaisseau et véhicule : pas d'initiative de personnage.
 * Décision Marc 18/10/2026. Réf. Vaisseaux v0.1 §1.
 *
 * @param {unknown} actorType
 * @returns {boolean}
 */
export function blocksCharacterCombat(actorType) {
  return actorType === "ship" || actorType === "vehicle";
}
