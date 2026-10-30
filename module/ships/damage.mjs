/**
 * Dégâts des vaisseaux, sans Foundry.
 *
 * Réf. Vaisseaux v0.1 §4 et §5. Décision Marc 25/10/2026.
 * Décision Marc 26/10/2026 : rupture, éventration à max 1, missile raté.
 * La chaleur, Pousser et les réparations restent pour la 0.7.4.
 * Les effets sur l'équipage sont des textes : pas de compte à rebours.
 */

import { compareOpposed } from "./combat.mjs";
import { shipWeaponKind, weaponClass } from "./reactor.mjs";

/** Dégâts d'un missile à l'impact : 20 + DR du lancement. Réf. Vaisseaux v0.1 §4. */
export const MISSILE_DAMAGE = 20;

/** −20 capteurs hors service, structure tordue. Réf. Vaisseaux v0.1 §4 et §5. */
export const HULL_PENALTY = -20;

/**
 * Plafond du DR relu sur une carte. Le relais borne déjà 0–10.
 * Un DR forgé ne gonfle pas les dégâts. Un vrai DR (dizaines) tient dessous.
 */
const DR_CAP = 10;

/**
 * Inverse les deux chiffres du dé. 100 s'écrit « 00 » et le reste.
 * Même lecture que `hitLocation`. Réf. LdR v0.2 §7. Réf. Vaisseaux v0.1 §5.
 *
 * @param {unknown} die
 * @returns {number|null}
 */
export function invertDie(die) {
  const number = Number(die);
  if ( !Number.isFinite(number) ) return null;
  const face = Math.trunc(number);
  if ( face < 1 || face > 100 ) return null;
  const text = face === 100 ? "00" : String(face).padStart(2, "0");
  const inverted = `${text[1]}${text[0]}`;
  return inverted === "00" ? 100 : Number(inverted);
}

/**
 * Section du tableau §5. En fuite : proue et poupe s'échangent.
 * 01–15 radiateurs, 16–35 poupe, 36–50 bâbord, 51–65 tribord, 66–00 proue.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {unknown} inverted
 * @param {boolean} fleeing
 * @returns {"bow"|"port"|"starboard"|"stern"|"radiators"|null}
 */
export function sectionFromInverted(inverted, fleeing) {
  const zone = Number(inverted);
  if ( !Number.isFinite(zone) ) return null;
  const face = zone === 100 ? 100 : Math.trunc(zone);
  if ( face < 1 || face > 100 ) return null;
  /** @type {"bow"|"port"|"starboard"|"stern"|"radiators"} */
  let section = "bow";
  if ( face <= 15 ) section = "radiators";
  else if ( face <= 35 ) section = "stern";
  else if ( face <= 50 ) section = "port";
  else if ( face <= 65 ) section = "starboard";
  if ( fleeing && section === "bow" ) return "stern";
  if ( fleeing && section === "stern" ) return "bow";
  return section;
}

/**
 * Plaque, puis module, puis section. Le surplus est perdu.
 * `null` : cette couche n'existe pas (radiateurs : pas de plaque,
 * pas d'intégrité de section). Une couche déjà à 0 ne « passe » pas à 0.
 * Décision Marc 26/10/2026 : seule la plaque de la section est ce pool.
 * Les points des modules Blindage restent un bonus affiché.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {{ plate?: number|null, module?: number|null, section?: number|null, amount?: unknown }} input
 * @returns {{ plate: number|null, module: number|null, section: number|null, plateZeroed: boolean, moduleZeroed: boolean, sectionZeroed: boolean, lost: number, spent: { plate: number, module: number, section: number } }}
 */
export function applyHullDamage(input) {
  let left = whole(input?.amount);
  if ( left < 0 ) left = 0;
  const plate = pool(input?.plate);
  const module = pool(input?.module);
  const section = pool(input?.section);
  const spent = { plate: 0, module: 0, section: 0 };
  if ( plate !== null && plate > 0 && left > 0 ) {
    spent.plate = Math.min(plate, left);
    left -= spent.plate;
  }
  if ( module !== null && module > 0 && left > 0 ) {
    spent.module = Math.min(module, left);
    left -= spent.module;
  }
  if ( section !== null && section > 0 && left > 0 ) {
    spent.section = Math.min(section, left);
    left -= spent.section;
  }
  return {
    plate: plate === null ? null : plate - spent.plate,
    module: module === null ? null : module - spent.module,
    section: section === null ? null : section - spent.section,
    plateZeroed: plate !== null && plate > 0 && plate - spent.plate === 0,
    moduleZeroed: module !== null && module > 0 && module - spent.module === 0,
    sectionZeroed: section !== null && section > 0 && section - spent.section === 0,
    lost: left,
    spent
  };
}

/**
 * Incident du Pilote : le module choisi devient dégradé.
 * Intégrité max 1 : il passe hors service, comme l'éventration.
 * `null` : déjà dégradé ou hors service, on ne change pas.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §5 et §6
 *
 * @param {unknown} value
 * @param {unknown} max
 * @returns {{ integrity: number, out: boolean }|null}
 */
export function incidentModuleValue(value, max) {
  const lowered = degradedValue(value, max);
  const current = Number(value);
  if ( lowered !== null && lowered < current ) return { integrity: lowered, out: false };
  const ceiling = Number(max);
  if ( ceiling === 1 && Number.isFinite(current) && current > 0 ) return { integrity: 0, out: true };
  return null;
}

/**
 * Valeur qui rend le module dégradé (moitié du maximum, vers le bas).
 * Déjà dégradé ou hors service : on ne change pas.
 * Maximum 1 : la moitié tombe à 0, cette fonction ne dégrade pas.
 * L'éventration, elle, met alors hors service. Décision Marc 26/10/2026.
 * On ne remonte jamais une Intégrité. Réf. Vaisseaux v0.1 §4 et §5.
 *
 * @param {unknown} value
 * @param {unknown} max
 * @returns {number|null}
 */
export function degradedValue(value, max) {
  const ceiling = Number(max);
  const current = Number(value);
  if ( !Number.isFinite(ceiling) || ceiling <= 0 ) return null;
  if ( !Number.isFinite(current) || current <= 0 ) return null;
  const half = Math.floor(ceiling / 2);
  if ( half <= 0 ) return null;
  if ( current <= half ) return current;
  return half;
}

/**
 * @param {unknown} value
 * @returns {number|null} `null` si la couche est absente.
 */
function pool(value) {
  if ( value === null || value === undefined ) return null;
  const number = Number(value);
  if ( !Number.isFinite(number) || number < 0 ) return 0;
  return Math.trunc(number);
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function whole(value) {
  const number = Number(value);
  if ( !Number.isFinite(number) ) return 0;
  return Math.trunc(number);
}

/**
 * @typedef {{ id: string, name?: string, section?: string, category?: string, integrity?: unknown, integrityMax?: unknown }} HullModule
 * @typedef {{ integrity?: unknown, integrityMax?: unknown, armor?: unknown, destroyed?: boolean }} HullSection
 * @typedef {{ twisted?: boolean, sections: Record<string, HullSection>, modules: HullModule[] }} HullState
 * @typedef {{ key: string, data?: Record<string, unknown> }} HullLog
 */

/**
 * @param {HullState} state
 * @returns {HullState}
 */
function cloneHull(state) {
  /** @type {Record<string, HullSection>} */
  const sections = {};
  for ( const [id, section] of Object.entries(state?.sections ?? {}) ) {
    sections[id] = { ...section };
  }
  return {
    twisted: state?.twisted === true,
    sections,
    modules: (state?.modules ?? []).map(module => ({ ...module }))
  };
}

/**
 * Applique les dégâts puis les critiques qui passent à 0.
 * `dice.d6` et `dice.d10` renvoient 1–6 et 1–10. `dice.pick` choisit un index.
 * La plaque lue ici est celle de la section, pas le bonus des modules.
 * Décision Marc 26/10/2026. Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {HullState} state
 * @param {{ sectionId: string, moduleId?: string|null, amount: number }} strike
 * @param {{ d6: () => number, d10: () => number, pick: (count: number) => number }} dice
 * @returns {{ state: HullState, logs: HullLog[], spent: { plate: number, module: number, section: number, lost: number } }}
 */
export function resolveShipStrike(state, strike, dice) {
  const next = cloneHull(state);
  /** @type {HullLog[]} */
  const logs = [];
  const sectionId = strike?.sectionId;
  const section = next.sections[sectionId];
  if ( !section ) return { state: next, logs, spent: { plate: 0, module: 0, section: 0, lost: whole(strike?.amount) } };
  // Décision Marc 26/10/2026 : la plaque de la section seule. Pas le bonus Blindage.
  const hasPlate = sectionId !== "radiators";
  const module = strike?.moduleId
    ? next.modules.find(entry => entry.id === strike.moduleId && entry.section === sectionId) ?? null
    : null;
  const applied = applyHullDamage({
    plate: hasPlate ? section.armor : null,
    module: module ? module.integrity : null,
    section: hasPlate ? section.integrity : null,
    amount: strike?.amount
  });
  if ( hasPlate && applied.plate !== null ) section.armor = applied.plate;
  if ( module && applied.module !== null ) module.integrity = applied.module;
  if ( hasPlate && applied.section !== null ) section.integrity = applied.section;
  /** @type {Set<string>} */
  const moduleCritted = new Set();
  if ( applied.plateZeroed ) plateCrit(next, sectionId, logs, dice, moduleCritted);
  if ( applied.moduleZeroed && module ) moduleCrit(next, section, module, logs, dice, moduleCritted, hasPlate);
  if ( applied.sectionZeroed ) sectionCrit(next, sectionId, section, logs, dice, moduleCritted);
  return {
    state: next,
    logs,
    spent: { ...applied.spent, lost: applied.lost }
  };
}

/**
 * @param {HullState} state
 * @param {string} sectionId
 * @param {HullLog[]} logs
 * @param {{ d6: () => number, d10: () => number, pick: (count: number) => number }} dice
 * @param {Set<string>} moduleCritted
 * @returns {void}
 */
function plateCrit(state, sectionId, logs, dice, moduleCritted) {
  const roll = face(dice.d6(), 6);
  if ( roll <= 2 ) {
    logs.push({ key: "SOL.Ship.crit.plateTorn", data: { roll } });
    return;
  }
  if ( roll <= 4 ) {
    logs.push({ key: "SOL.Ship.crit.plateLeak", data: { roll } });
    return;
  }
  if ( roll === 5 ) {
    logs.push({ key: "SOL.Ship.crit.plateBreach", data: { roll } });
    return;
  }
  const pool = state.modules.filter(entry => entry.section === sectionId && Number(entry.integrity) > 0);
  if ( !pool.length ) {
    logs.push({ key: "SOL.Ship.crit.plateNoModule", data: { roll } });
    return;
  }
  const index = Math.min(pool.length - 1, Math.max(0, Math.trunc(dice.pick(pool.length))));
  const picked = pool[index];
  const lowered = degradedValue(picked.integrity, picked.integrityMax);
  if ( lowered !== null && lowered < Number(picked.integrity) ) {
    picked.integrity = lowered;
    logs.push({ key: "SOL.Ship.crit.plateEviscerate", data: { roll, name: picked.name ?? "" } });
    return;
  }
  // Décision Marc 26/10/2026 : Intégrité max 1, l'éventration met hors service.
  const ceiling = Number(picked.integrityMax);
  if ( ceiling === 1 && Number(picked.integrity) > 0 ) {
    picked.integrity = 0;
    logs.push({ key: "SOL.Ship.crit.plateEviscerateOut", data: { roll, name: picked.name ?? "" } });
    const section = state.sections[sectionId] ?? {};
    moduleCrit(state, section, picked, logs, dice, moduleCritted, true);
    return;
  }
  logs.push({ key: "SOL.Ship.crit.plateEviscerateSame", data: { roll, name: picked.name ?? "" } });
}

/**
 * @param {HullState} state
 * @param {HullSection} section
 * @param {HullModule} module
 * @param {HullLog[]} logs
 * @param {{ d6: () => number, d10: () => number, pick: (count: number) => number }} dice
 * @param {Set<string>} moduleCritted
 * @param {boolean} hasPlate
 * @returns {void}
 */
function moduleCrit(state, section, module, logs, dice, moduleCritted, hasPlate) {
  if ( moduleCritted.has(module.id) ) return;
  moduleCritted.add(module.id);
  logs.push({ key: "SOL.Ship.crit.moduleOut", data: { name: module.name ?? "" } });
  if ( module.category === "communications" ) logs.push({ key: "SOL.Ship.crit.comms", data: { name: module.name ?? "" } });
  if ( module.category === "lifeSupport" ) logs.push({ key: "SOL.Ship.crit.life", data: { name: module.name ?? "" } });
  const roll = face(dice.d6(), 6);
  if ( roll <= 4 ) {
    logs.push({ key: "SOL.Ship.crit.moduleQuiet", data: { roll, name: module.name ?? "" } });
    return;
  }
  if ( roll === 5 ) {
    logs.push({ key: "SOL.Ship.crit.moduleFire", data: { roll, name: module.name ?? "" } });
    return;
  }
  const shock = face(dice.d10(), 10);
  logs.push({ key: "SOL.Ship.crit.moduleExplode", data: { roll, name: module.name ?? "", shock } });
  // Décision Marc 26/10/2026 : radiateurs, le 1D10 est annoncé puis perdu.
  if ( !hasPlate ) {
    logs.push({ key: "SOL.Ship.crit.noSection", data: { shock } });
    return;
  }
  const before = pool(section.integrity) ?? 0;
  if ( before <= 0 ) return;
  const next = Math.max(0, before - shock);
  section.integrity = next;
  if ( next === 0 ) sectionCrit(state, module.section ?? "", section, logs, dice, moduleCritted);
}

/**
 * @param {HullState} state
 * @param {string} sectionId
 * @param {HullSection} section
 * @param {HullLog[]} logs
 * @param {{ d6: () => number, d10: () => number, pick: (count: number) => number }} dice
 * @param {Set<string>} moduleCritted
 * @returns {void}
 */
function sectionCrit(state, sectionId, section, logs, dice, moduleCritted, options = {}) {
  if ( section._critted ) return;
  // Décision Marc 30/10/2026 : le critique réacteur 5 ne relance pas
  // la table de module. Les modules passent quand même hors service.
  const bare = options.noModuleCrit === true;
  section._critted = true;
  const roll = face(dice.d6(), 6);
  if ( roll <= 2 ) {
    logs.push({ key: "SOL.Ship.crit.sectionLost", data: { roll } });
    return;
  }
  if ( roll <= 4 ) {
    logs.push({ key: "SOL.Ship.crit.sectionModules", data: { roll } });
    for ( const entry of state.modules ) {
      if ( entry.section !== sectionId ) continue;
      if ( !(Number(entry.integrity) > 0) ) continue;
      entry.integrity = 0;
      if ( !bare ) moduleCrit(state, section, entry, logs, dice, moduleCritted, sectionId !== "radiators");
    }
    return;
  }
  if ( roll === 5 ) {
    state.twisted = true;
    logs.push({ key: "SOL.Ship.crit.sectionTwisted", data: { roll } });
    return;
  }
  section.destroyed = true;
  section.integrity = 0;
  logs.push({ key: "SOL.Ship.crit.sectionRupture", data: { roll } });
  // Décision Marc 26/10/2026 : tous les modules encore vivants passent hors service.
  // Décision Marc 30/10/2026 : sans jet de module, la ligne « hors service » reste.
  for ( const entry of state.modules ) {
    if ( entry.section !== sectionId ) continue;
    if ( !(Number(entry.integrity) > 0) ) continue;
    entry.integrity = 0;
    if ( bare ) {
      logs.push({ key: "SOL.Ship.crit.moduleOut", data: { name: entry.name ?? "" } });
      continue;
    }
    moduleCrit(state, section, entry, logs, dice, moduleCritted, sectionId !== "radiators");
  }
}

/**
 * Critique du réacteur. Le 5 met le module à 0 sans critique de module,
 * et retire le 1D10 à la poupe sans blindage. Si la poupe passe à 0,
 * le critique de section de la 0.7.3 s'applique.
 * // Décision Marc 30/10/2026
 * // Réf. Vaisseaux v0.1 §6
 *
 * // Décision Marc 30/10/2026 : s'il y a plusieurs modules réacteur encore
 * vivants, on met à 0 le premier de la fiche.
 *
 * @param {HullState} state
 * @param {unknown} die Face 1–6.
 * @param {unknown} shock Dégâts 1D10 déjà tirés, pour la face 5.
 * @param {{ d6: () => number, d10: () => number, pick: (count: number) => number }} dice
 * @returns {{ state: HullState, logs: HullLog[], shutdown: boolean }}
 */
export function resolveReactorCrit(state, die, shock, dice) {
  const next = cloneHull(state);
  const logs = [];
  const roll = face(Number(die), 6);
  if ( roll <= 2 ) {
    logs.push({ key: "SOL.Ship.reactor.critStop", data: { roll } });
    return { state: next, logs, shutdown: true };
  }
  if ( roll <= 4 ) {
    logs.push({ key: "SOL.Ship.reactor.critLeak", data: { roll } });
    return { state: next, logs, shutdown: false };
  }
  if ( roll === 5 ) {
    const reactor = next.modules.find(entry => entry.category === "reactor" && Number(entry.integrity) > 0)
      ?? next.modules.find(entry => entry.category === "reactor");
    if ( reactor ) reactor.integrity = 0;
    const hit = Math.max(0, Math.trunc(Number(shock)));
    const spent = Number.isFinite(hit) ? hit : 0;
    logs.push({
      key: "SOL.Ship.reactor.critModule",
      data: { roll, name: reactor?.name ?? "", shock: spent }
    });
    const section = next.sections.stern;
    if ( section ) {
      const before = pool(section.integrity) ?? 0;
      section.integrity = Math.max(0, before - spent);
      if ( before > 0 && section.integrity === 0 ) {
        sectionCrit(next, "stern", section, logs, dice, new Set(), { noModuleCrit: true });
      }
    }
    return { state: next, logs, shutdown: false };
  }
  logs.push({ key: "SOL.Ship.reactor.critRadiation", data: { roll } });
  return { state: next, logs, shutdown: false };
}

/**
 * @param {number} value
 * @param {number} faces
 * @returns {number}
 */
function face(value, faces) {
  const number = Math.trunc(Number(value));
  if ( !Number.isFinite(number) || number < 1 || number > faces ) return 1;
  return number;
}

/**
 * Poupe et une autre section à 0. Une section détruite compte comme à 0.
 * Radiateurs : tous les modules Radiateurs de la section, s'il y en a.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {HullState|null|undefined} state
 * @returns {boolean}
 */
export function isWreck(state) {
  if ( !sectionDown(state, "stern") ) return false;
  return ["bow", "port", "starboard", "radiators"].some(id => sectionDown(state, id));
}

/**
 * @param {HullState|null|undefined} state
 * @param {string} id
 * @returns {boolean}
 */
function sectionDown(state, id) {
  if ( id === "radiators" ) {
    const modules = (state?.modules ?? []).filter(entry => entry.section === "radiators" && entry.category === "radiators" && Number(entry.integrityMax) > 0);
    return modules.length > 0 && modules.every(entry => Number(entry.integrity) <= 0);
  }
  const section = state?.sections?.[id];
  if ( !section ) return false;
  if ( section.destroyed === true ) return true;
  const max = Number(section.integrityMax);
  const value = Number(section.integrity);
  if ( !Number.isFinite(max) || max <= 0 ) return false;
  return Number.isFinite(value) && value <= 0;
}

/**
 * Capteurs hors service : −20 à l'opérateur et à l'artilleur.
 * Décision Marc 26/10/2026 : seulement dégradé, pas de malus automatique.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {Array<{ category?: string, condition?: string }>|null|undefined} modules
 * @returns {boolean}
 */
export function sensorsAreOut(modules) {
  return (modules ?? []).some(entry => entry?.category === "sensors" && entry?.condition === "out");
}

/**
 * Missile : pas de portée proche, et moyenne ou lointaine.
 * Réf. Vaisseaux v0.1 §4. Décision Marc 25/10/2026.
 *
 * @param {{ rangeClose?: boolean, rangeMedium?: boolean, rangeLong?: boolean }|null|undefined} weapon
 * @returns {boolean}
 */
export function isMissileWeapon(weapon) {
  // Décision Marc 30/10/2026 : le type d'arme prime sur les portées.
  const kind = shipWeaponKind(weapon);
  if ( kind === "missile" ) return true;
  if ( kind === "laser" || kind === "railgun" || kind === "other" ) return false;
  if ( !weapon || weapon.rangeClose === true ) return false;
  return weapon.rangeMedium === true || weapon.rangeLong === true;
}

/**
 * Laser du catalogue : le nom contient « laser ».
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {{ name?: string }|null|undefined} weapon
 * @returns {boolean}
 */
export function isLaserWeapon(weapon) {
  return weaponClass(weapon) === "laser";
}

/**
 * Arrivée : round suivant en moyenne, deux rounds plus tard en lointaine.
 * Proche : pas de lancement. Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {unknown} round
 * @param {unknown} range
 * @returns {number|null}
 */
export function missileArrivalRound(round, range) {
  const current = Math.trunc(Number(round));
  if ( !Number.isFinite(current) ) return null;
  if ( range === "medium" ) return current + 1;
  if ( range === "long" ) return current + 2;
  return null;
}

/**
 * Missiles encore en vol dont le round d'arrivée est atteint.
 *
 * @param {Array<{ state?: string, arrivalRound?: unknown, reminded?: boolean }>|null|undefined} missiles
 * @param {unknown} round
 * @returns {Array<{ state?: string, arrivalRound?: unknown, reminded?: boolean }>}
 */
export function missilesDue(missiles, round) {
  const current = Math.trunc(Number(round));
  if ( !Number.isFinite(current) ) return [];
  return (missiles ?? []).filter(entry => {
    if ( !entry || entry.state !== "flying" || entry.reminded === true ) return false;
    const arrival = Number(entry.arrivalRound);
    return Number.isFinite(arrival) && arrival <= current;
  });
}

/**
 * Marque les missiles à rappeler avant d'en poster la carte.
 * Un second passage sur la liste renvoyée n'a plus rien à rappeler.
 *
 * @param {Array<{ id?: string, state?: string, arrivalRound?: unknown, reminded?: boolean }>|null|undefined} missiles
 * @param {unknown} round
 * @returns {{ list: object[], due: object[] }}
 */
export function claimMissileReminders(missiles, round) {
  const source = Array.isArray(missiles) ? missiles : [];
  const dueIds = new Set(missilesDue(source, round).map(entry => entry?.id).filter(id => typeof id === "string" && id));
  /** @type {object[]} */
  const due = [];
  const list = source.map(entry => {
    if ( !entry || typeof entry !== "object" || !dueIds.has(entry.id) ) {
      return entry && typeof entry === "object" ? { ...entry } : entry;
    }
    const marked = { ...entry, reminded: true };
    due.push(marked);
    return marked;
  });
  return { list, due };
}

/**
 * DR relu sur une carte : entier, plancher 0, plafond 10.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function boundDr(value) {
  const number = Number(value);
  if ( !Number.isFinite(number) || number < 0 ) return 0;
  return Math.min(DR_CAP, Math.trunc(number));
}

/**
 * Dégâts relus sur l'arme, plus le DR borné. Un missile ignore
 * un nombre de dégâts forgé : 20 + DR du lancement.
 *
 * @param {unknown} weaponDamage
 * @param {unknown} dr
 * @param {{ missile?: boolean }} [options]
 * @returns {number|null}
 */
export function shipStrikeAmount(weaponDamage, dr, options = {}) {
  const bounded = boundDr(dr);
  if ( options?.missile === true ) return MISSILE_DAMAGE + bounded;
  const weapon = Number(weaponDamage);
  if ( !Number.isFinite(weapon) || weapon < 0 ) return null;
  return Math.trunc(weapon) + bounded;
}

/**
 * Le MJ actif réclame l'application. Déjà faite : refus.
 * L'appelant note `applied` avant d'écrire la coque.
 *
 * @param {{ activeGm?: boolean, applied?: boolean }} input
 * @returns {{ ok: boolean, reason: string, applied: boolean }}
 */
export function beginShipApply(input = {}) {
  const applied = input?.applied === true;
  if ( input?.activeGm !== true ) return { ok: false, reason: "gm", applied };
  if ( applied ) return { ok: false, reason: "applied", applied: true };
  return { ok: true, reason: "", applied: true };
}

/**
 * Un jet de missile terminé consomme une munition, touché ou raté.
 * Un jet annulé (`null`) n'en consomme pas.
 * Décision Marc 26/10/2026. Réf. Vaisseaux v0.1 §4.
 *
 * @param {null|undefined|{ success?: boolean }} outcome
 * @returns {boolean}
 */
export function missileAmmoSpent(outcome) {
  if ( !outcome || typeof outcome !== "object" ) return false;
  return outcome.success === true || outcome.success === false;
}

/**
 * L'opérateur l'emporte : le missile est leurré. Égalité : non.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5 et LdR v0.2 §6.
 *
 * @param {{ success?: boolean, dr?: unknown, score?: unknown }} operatorRoll
 * @param {{ success?: boolean, dr?: unknown, score?: unknown }} launchRoll
 * @returns {boolean}
 */
export function missileDecoyed(operatorRoll, launchRoll) {
  return compareOpposed(operatorRoll, launchRoll, { useScore: true, scoreOnFailure: false }) === "a";
}

/**
 * État lu sur une fiche, pour l'épave et les dégâts.
 * Les nombres viennent de la source. L'état dérivé n'est pas recopié.
 *
 * @param {object|null|undefined} source `system._source`.
 * @param {Iterable<{ id?: string, name?: string, type?: string, system?: object }>|null|undefined} items
 * @returns {HullState}
 */
export function hullFromDocument(source, items) {
  const stored = source && typeof source === "object" ? source : {};
  /** @type {Record<string, HullSection>} */
  const sections = {};
  for ( const id of ["bow", "port", "starboard", "stern", "radiators"] ) {
    const row = stored.sections?.[id] ?? {};
    sections[id] = {
      integrity: row.integrity?.value,
      integrityMax: row.integrity?.max,
      armor: row.armor?.value,
      destroyed: row.destroyed === true
    };
  }
  /** @type {HullModule[]} */
  const modules = [];
  if ( items && typeof items[Symbol.iterator] === "function" ) {
    for ( const item of items ) {
      if ( item?.type && item.type !== "shipModule" ) continue;
      const system = item?.system?._source ?? item?.system ?? {};
      modules.push({
        id: typeof item?.id === "string" ? item.id : "",
        name: typeof item?.name === "string" ? item.name : "",
        section: system.section,
        category: system.category,
        integrity: system.integrity?.value,
        integrityMax: system.integrity?.max
      });
    }
  }
  return { twisted: stored.twisted === true, sections, modules };
}

/**
 * Module au hasard dans la section, Intégrité > 0. Sinon `null`.
 * Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §5.
 *
 * @param {HullModule[]|null|undefined} modules
 * @param {string} sectionId
 * @param {(count: number) => number} pick
 * @returns {HullModule|null}
 */
export function pickLivingModule(modules, sectionId, pick) {
  const pool = (modules ?? []).filter(entry => entry?.section === sectionId && Number(entry.integrity) > 0);
  if ( !pool.length ) return null;
  const index = Math.min(pool.length - 1, Math.max(0, Math.trunc(pick(pool.length))));
  return pool[index] ?? null;
}
