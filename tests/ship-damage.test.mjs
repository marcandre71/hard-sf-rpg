/**
 * Dégâts de vaisseau, localisation, critiques, épave, missiles.
 * Sans Foundry. Réf. Vaisseaux v0.1 §4 et §5. Décision Marc 25/10/2026.
 */
import { readFileSync } from "node:fs";
import { ammoBlocksFire } from "../module/ships/combat.mjs";
import {
  MISSILE_DAMAGE,
  applyHullDamage,
  degradedValue,
  hullFromDocument,
  invertDie,
  isMissileWeapon,
  isLaserWeapon,
  isWreck,
  missileArrivalRound,
  missileDecoyed,
  missilesDue,
  pickLivingModule,
  resolveShipStrike,
  sectionFromInverted,
  sensorsAreOut
} from "../module/ships/damage.mjs";

const fr = JSON.parse(readFileSync(new URL("../lang/fr.json", import.meta.url), "utf8"));

let failed = 0;

/**
 * @param {boolean} ok
 * @param {string} message
 * @returns {void}
 */
function check(ok, message) {
  if ( ok ) return;
  failed += 1;
  console.error(message);
}

/**
 * @param {number[]} sixes
 * @param {number[]} [tens]
 * @param {number[]} [picks]
 * @returns {{ d6: () => number, d10: () => number, pick: (count: number) => number }}
 */
function scripted(sixes, tens = [], picks = []) {
  let sixAt = 0;
  let tenAt = 0;
  let pickAt = 0;
  return {
    d6() {
      if ( sixAt >= sixes.length ) throw new Error("d6 en trop");
      return sixes[sixAt++];
    },
    d10() {
      if ( tenAt >= tens.length ) throw new Error("d10 en trop");
      return tens[tenAt++];
    },
    pick() {
      return picks[pickAt++] ?? 0;
    }
  };
}

/**
 * @param {object} [partial]
 * @returns {import("../module/ships/damage.mjs").HullState}
 */
function hull(partial = {}) {
  /** @type {Record<string, object>} */
  const sections = {};
  for ( const id of ["bow", "port", "starboard", "stern"] ) {
    sections[id] = {
      integrity: 20,
      integrityMax: 20,
      armor: 8,
      destroyed: false,
      ...(partial.sections?.[id] ?? {})
    };
  }
  sections.radiators = partial.sections?.radiators ?? {};
  return {
    twisted: partial.twisted === true,
    sections,
    modules: partial.modules ?? []
  };
}

check(invertDie(61) === 16 && invertDie(10) === 1 && invertDie(100) === 100, "inversion du dé, 100 reste 00");
check(invertDie(0) === null && invertDie(101) === null, "dé hors 1–100 : pas de section");
check(sectionFromInverted(10, false) === "radiators", "01–15 : radiateurs");
check(sectionFromInverted(20, false) === "stern" && sectionFromInverted(35, false) === "stern", "16–35 : poupe");
check(sectionFromInverted(40, false) === "port" && sectionFromInverted(50, false) === "port", "36–50 : bâbord");
check(sectionFromInverted(51, false) === "starboard" && sectionFromInverted(65, false) === "starboard", "51–65 : tribord");
check(sectionFromInverted(66, false) === "bow" && sectionFromInverted(100, false) === "bow", "66–00 : proue");
check(sectionFromInverted(20, true) === "bow" && sectionFromInverted(80, true) === "stern", "en fuite : proue et poupe s'échangent");
check(sectionFromInverted(40, true) === "port" && sectionFromInverted(60, true) === "starboard" && sectionFromInverted(10, true) === "radiators", "en fuite : les autres sections restent");
check(sectionFromInverted(invertDie(61), true) === "bow", "le dé 61 inversé tombe en poupe, en fuite en proue");

const chain = applyHullDamage({ plate: 5, module: 4, section: 10, amount: 12 });
check(chain.plate === 0 && chain.module === 0 && chain.section === 7 && chain.lost === 0, "plaque, puis module, puis section");
check(chain.plateZeroed === true && chain.moduleZeroed === true && chain.sectionZeroed === false, "plaque et module passent à 0");
const overflow = applyHullDamage({ plate: 2, module: 2, section: 2, amount: 10 });
check(overflow.lost === 4 && overflow.section === 0, "le surplus au-delà de la section est perdu");
const radiators = applyHullDamage({ plate: null, module: 3, section: null, amount: 10 });
check(radiators.module === 0 && radiators.lost === 7 && radiators.plateZeroed === false && radiators.sectionZeroed === false, "radiateurs : pas de plaque, le surplus est perdu");
const already = applyHullDamage({ plate: 0, module: 0, section: 4, amount: 1 });
check(already.plateZeroed === false && already.moduleZeroed === false && already.section === 3, "déjà à 0 : la couche ne passe pas à 0");

const plateOnly = resolveShipStrike(hull({
  sections: { bow: { armor: 3, integrity: 10 } },
  modules: [{ id: "m", name: "Capteurs", section: "bow", category: "sensors", integrity: 8, integrityMax: 10 }]
}), { sectionId: "bow", moduleId: "m", amount: 3 }, scripted([1]));
check(plateOnly.state.sections.bow.armor === 0 && plateOnly.state.modules[0].integrity === 8, "la plaque absorbe, le module reste");
check(plateOnly.logs.some(entry => entry.key === "SOL.Ship.crit.plateTorn"), "critique de plaque au passage à 0");

let threw = false;
try {
  resolveShipStrike(hull({
    sections: { bow: { armor: 0, integrity: 10 } },
    modules: [{ id: "m", name: "Capteurs", section: "bow", integrity: 8, integrityMax: 10 }]
  }), { sectionId: "bow", moduleId: "m", amount: 2 }, scripted([]));
} catch {
  threw = true;
}
check(threw === false, "plaque déjà à 0 : pas de critique");

const moduleDown = resolveShipStrike(hull({
  sections: { stern: { armor: 0, integrity: 10 } },
  modules: [{ id: "eng", name: "Moteur", section: "stern", category: "propulsion", integrity: 4, integrityMax: 8 }]
}), { sectionId: "stern", moduleId: "eng", amount: 4 }, scripted([2]));
check(moduleDown.state.modules[0].integrity === 0 && moduleDown.logs.some(entry => entry.key === "SOL.Ship.crit.moduleOut"), "module à 0 : hors service");
check(moduleDown.logs.some(entry => entry.key === "SOL.Ship.crit.moduleQuiet"), "critique module 1–4 : rien de plus");

try {
  resolveShipStrike(hull({
    sections: { stern: { armor: 0, integrity: 10 } },
    modules: [{ id: "eng", name: "Moteur", section: "stern", integrity: 0, integrityMax: 8 }]
  }), { sectionId: "stern", moduleId: "eng", amount: 3 }, scripted([]));
  check(true, "module déjà à 0 : pas de critique, le reste va à la section");
} catch (error) {
  check(false, error.message);
}

const eviscerate = resolveShipStrike(hull({
  sections: { port: { armor: 1, integrity: 10 } },
  modules: [{ id: "a", name: "Soute", section: "port", integrity: 8, integrityMax: 10 }]
}), { sectionId: "port", moduleId: null, amount: 1 }, scripted([6], [], [0]));
check(eviscerate.state.modules[0].integrity === 5 && eviscerate.logs.some(entry => entry.key === "SOL.Ship.crit.plateEviscerate"), "plaque 6 : un module devient dégradé");
check(degradedValue(4, 10) === 4 && degradedValue(1, 1) === null, "déjà dégradé, ou maximum 1 : on ne change pas");

const boom = resolveShipStrike(hull({
  sections: { bow: { armor: 0, integrity: 3 } },
  modules: [{ id: "gun", name: "Laser", section: "bow", category: "weapon", integrity: 2, integrityMax: 4 }]
}), { sectionId: "bow", moduleId: "gun", amount: 2 }, scripted([6, 5], [5]));
check(boom.state.sections.bow.integrity === 0 && boom.state.twisted === true, "module 6 : 1D10 sans blindage, puis critique de section");
check(boom.logs.filter(entry => entry.key === "SOL.Ship.crit.sectionTwisted").length === 1, "la section n'est critiquée qu'une fois");

const quietBoom = resolveShipStrike(hull({
  sections: { bow: { armor: 0, integrity: 0 } },
  modules: [{ id: "gun", name: "Laser", section: "bow", integrity: 2, integrityMax: 4 }]
}), { sectionId: "bow", moduleId: "gun", amount: 2 }, scripted([6], [4]));
check(quietBoom.state.sections.bow.integrity === 0 && !quietBoom.logs.some(entry => entry.key.startsWith("SOL.Ship.crit.section")), "section déjà à 0 : l'explosion ne relance pas la table");

const lostModules = resolveShipStrike(hull({
  sections: { starboard: { armor: 0, integrity: 1 } },
  modules: [
    { id: "live", name: "Cabine", section: "starboard", category: "cabins", integrity: 6, integrityMax: 6 },
    { id: "dead", name: "Mort", section: "starboard", integrity: 0, integrityMax: 4 },
    { id: "radio", name: "Radio", section: "starboard", category: "communications", integrity: 2, integrityMax: 2 }
  ]
}), { sectionId: "starboard", moduleId: null, amount: 1 }, scripted([3, 1, 1]));
check(lostModules.state.modules.every(entry => entry.integrity === 0), "section 3–4 : les modules encore vivants passent hors service");
check(lostModules.logs.filter(entry => entry.key === "SOL.Ship.crit.moduleOut").length === 2, "un module déjà à 0 n'est pas recritiqué");
check(lostModules.logs.some(entry => entry.key === "SOL.Ship.crit.comms"), "communications hors service : rappel");

const rupture = resolveShipStrike(hull({
  sections: { stern: { armor: 0, integrity: 4 } }
}), { sectionId: "stern", amount: 4 }, scripted([6]));
check(rupture.state.sections.stern.destroyed === true && rupture.state.sections.stern.integrity === 0, "section 6 : détruite, compte comme à 0");

const rad = resolveShipStrike(hull({
  modules: [{ id: "rad", name: "Radiateurs", section: "radiators", category: "radiators", integrity: 2, integrityMax: 6 }]
}), { sectionId: "radiators", moduleId: "rad", amount: 2 }, scripted([6], [4]));
check(rad.logs.some(entry => entry.key === "SOL.Ship.crit.noSection") && rad.state.sections.radiators.integrity === undefined, "radiateurs : le 1D10 n'a pas de section");

const living = pickLivingModule([
  { id: "a", section: "bow", integrity: 0 },
  { id: "b", section: "bow", integrity: 3 },
  { id: "c", section: "port", integrity: 3 }
], "bow", () => 0);
check(living?.id === "b", "module au hasard parmi ceux d'Intégrité > 0");
check(pickLivingModule([{ id: "a", section: "bow", integrity: 0 }], "bow", () => 0) === null, "aucun module vivant : null");

const wreck = hull({ sections: { stern: { integrity: 0, integrityMax: 20 }, bow: { integrity: 0, integrityMax: 20 } } });
check(isWreck(wreck) === true, "poupe et une autre section à 0 : épave");
check(isWreck(hull({ sections: { stern: { integrity: 0, integrityMax: 20 } } })) === false, "poupe seule : pas une épave");
check(isWreck(hull({ sections: { stern: { integrity: 5, integrityMax: 20, destroyed: true }, port: { integrity: 0, integrityMax: 15 } } })) === true, "section détruite : compte comme à 0");
check(isWreck(hull({ sections: { stern: { integrity: 0, integrityMax: 0 } } })) === false, "0/0 non renseigné : pas à 0");
check(isWreck(hull({
  sections: { stern: { integrity: 0, integrityMax: 20 } },
  modules: [
    { id: "r1", section: "radiators", category: "radiators", integrity: 0, integrityMax: 6 },
    { id: "r2", section: "radiators", category: "radiators", integrity: 0, integrityMax: 6 }
  ]
})) === true, "radiateurs tous à 0, avec la poupe : épave");
check(isWreck(hull({
  sections: { stern: { integrity: 0, integrityMax: 20 } },
  modules: [{ id: "r1", section: "radiators", category: "radiators", integrity: 1, integrityMax: 6 }]
})) === false, "un radiateur encore vivant : pas une épave");

check(sensorsAreOut([{ category: "sensors", condition: "out" }]) === true, "capteurs hors service");
check(sensorsAreOut([{ category: "sensors", condition: "degraded" }]) === false, "capteurs seulement dégradés : pas le malus hors service");

check(missileArrivalRound(3, "medium") === 4, "missile moyenne : round suivant");
check(missileArrivalRound(3, "long") === 5, "missile lointaine : deux rounds plus tard");
check(missileArrivalRound(3, "close") === null, "missile proche : pas de lancement");
const flying = { state: "flying", arrivalRound: 4, reminded: false };
check(missilesDue([flying, { ...flying, reminded: true }, { ...flying, state: "decoyed" }, { ...flying, arrivalRound: 5 }], 4).length === 1, "rappel : en vol, round atteint, pas déjà rappelé");
check(missileDecoyed({ success: true, dr: 2, score: 40 }, { success: true, dr: 2, score: 40 }) === false, "égalité : le missile n'est pas leurré");
check(missileDecoyed({ success: true, dr: 3, score: 40 }, { success: true, dr: 1, score: 80 }) === true, "l'opérateur l'emporte : missile leurré");
check(missileDecoyed({ success: false, dr: 0, score: 90 }, { success: true, dr: 0, score: 10 }) === false, "un échec ne leurre pas un missile réussi");
check(MISSILE_DAMAGE === 20, "impact : 20, plus le DR du lancement");
check(isMissileWeapon({ rangeClose: false, rangeMedium: true, rangeLong: true }) === true, "missile : pas de portée proche");
check(isMissileWeapon({ rangeClose: true, rangeMedium: true, rangeLong: false }) === false, "une arme de portée proche n'est pas un missile");
check(isLaserWeapon({ name: "Laser de défense" }) === true && isLaserWeapon({ name: "Canon électromagnétique" }) === false, "laser : le nom contient laser");
check(ammoBlocksFire(0) === true && ammoBlocksFire({ value: 0 }) === true && ammoBlocksFire(null) === false && ammoBlocksFire({ value: null }) === false, "0 bloque, vide non");

const fromDoc = hullFromDocument({
  twisted: true,
  sections: { stern: { integrity: { value: 0, max: 20 }, armor: { value: 0, max: 4 }, destroyed: true } }
}, [{ id: "x", name: "Moteur", type: "shipModule", system: { section: "stern", category: "propulsion", integrity: { value: 0, max: 8 } } }]);
check(fromDoc.twisted === true && fromDoc.sections.stern.destroyed === true && fromDoc.modules[0].integrity === 0, "lecture de fiche : source, pas un défaut inventé");
check(isWreck(hullFromDocument({
  sections: {
    stern: { integrity: { value: 0, max: 20 } },
    bow: { integrity: { value: 0, max: 20 } }
  }
}, [])) === true, "épave lue sur la source");

check(fr.SOL.Space.linkedActor === "Un vaisseau = un acteur : dupliquez l'acteur pour avoir deux vaisseaux", "deux jetons liés : la phrase demandée");
check(typeof fr.SOL.Ship.applyDamage === "string" && typeof fr.SOL.Ship.crit.sectionRupture === "string", "textes de dégâts dans fr.json");

if ( failed ) {
  console.error(`${failed} échec(s)`);
  process.exit(1);
}
console.log("ship-damage ok");
