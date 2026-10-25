/**
 * Jet D100, sans Foundry.
 *
 * Réf. LdR v0.2 §2 (réussite, DR/DE, critiques), §5 (plafond ±50),
 * §7 (localisation par inversion des chiffres).
 * Les choix ci-dessous sont tranchés : `// Décision Marc 18/10/2026`.
 */

/** Plafond du total des modificateurs. Réf. LdR v0.2 §5. */
export const MODIFIER_LIMIT = 50;

/**
 * Chiffre des dizaines.
 * Réf. LdR v0.2 §2 : « la dizaine se lit directement ». Ce n'est pas
 * un arrondi au supérieur : partie entière, `Math.floor(x / 10)`.
 * 100 → 10, 01–09 → 0. Un score négatif donne une dizaine négative.
 *
 * @param {number} value
 * @returns {number}
 */
export function tens(value) {
  return Math.floor(Number(value) / 10);
}

/**
 * Difficulté + modificateur libre + situation.
 *
 * Décision Marc 25/10/2026 : un jet de poste de vaisseau (`shipPost`)
 * n'est pas ramené à ±50. Commandant, Calculer, verrouillage ou son
 * absence, tir visé, arme dégradée et le reste s'additionnent tels quels.
 * Un jet de personnage, hors poste de vaisseau, reste borné.
 * Réf. LdR v0.2 §5. Le score qui en résulte n'est pas borné ici.
 *
 * @param {number} difficulty
 * @param {number} free
 * @param {number} [situation]
 * @param {{ shipPost?: boolean }} [options]
 * @returns {number}
 */
export function rollModifier(difficulty, free, situation = 0, { shipPost = false } = {}) {
  const sum = Number(difficulty) + Number(free) + Number(situation);
  if ( !Number.isFinite(sum) ) return 0;
  if ( shipPost ) return sum; // Décision Marc 25/10/2026
  return Math.min(MODIFIER_LIMIT, Math.max(-MODIFIER_LIMIT, sum));
}

/**
 * Jet de personnage : total borné à ±50. Réf. LdR v0.2 §5.
 *
 * @param {number} difficulty
 * @param {number} free
 * @param {number} [situation]
 * @returns {number}
 */
export function cappedModifier(difficulty, free, situation = 0) {
  return rollModifier(difficulty, free, situation, { shipPost: false });
}

/**
 * Score visé = score de base + modificateur borné.
 * Pas de second plafond : le DR lit la dizaine de ce total.
 *
 * @param {number} baseScore
 * @param {number} difficulty
 * @param {number} free
 * @returns {{ modifier: number, target: number }}
 */
export function modifiedTarget(baseScore, difficulty, free) {
  const modifier = cappedModifier(difficulty, free);
  return { modifier, target: Number(baseScore) + modifier };
}

/**
 * Affiche un modificateur avec son signe (+10, 0, -20).
 *
 * @param {number} value
 * @returns {string}
 */
export function formatModifier(value) {
  const n = Number(value);
  if ( !Number.isFinite(n) ) return "0";
  if ( n > 0 ) return `+${n}`;
  return String(n);
}

/**
 * Double entre 11 et 99 (11, 22, …, 99).
 * 00 est stocké 100 : ce n'est pas un double de la plage 06–95.
 *
 * @param {number} die
 * @returns {boolean}
 */
function isDouble(die) {
  return die >= 11 && die <= 99 && die % 11 === 0;
}

/**
 * Résout un dé déjà tiré (1 à 100, 00 = 100) contre le score modifié.
 *
 * Priorité des critiques, Réf. LdR v0.2 §2 :
 * 01–05 toujours réussite critique (même si le dé dépasse le score) ;
 * 96–100 toujours échec critique (même si le dé est sous le score) ;
 * sinon un double ≤ score modifié est une réussite critique,
 * un double > score modifié est un échec critique.
 * Décision Marc 18/10/2026 : le double se compare au score modifié.
 * Décision Marc 18/10/2026 : DR et DE ne descendent pas sous 0.
 * Décision Marc 18/10/2026 : 18 % de critiques par jet (01–05, 96–00, doubles 11–88), voulu.
 *
 * @param {number} die
 * @param {number} target
 * @returns {{ die: number, target: number, success: boolean, critical: "success"|"failure"|null, dr: number, de: number }}
 */
export function resolveD100(die, target) {
  const d = Number(die);
  const t = Number(target);
  const fixedSuccess = d >= 1 && d <= 5;
  const fixedFailure = d >= 96 && d <= 100;

  let success;
  /** @type {"success"|"failure"|null} */
  let critical = null;

  if ( fixedSuccess ) {
    success = true;
    critical = "success";
  } else if ( fixedFailure ) {
    success = false;
    critical = "failure";
  } else if ( isDouble(d) ) {
    if ( d <= t ) {
      success = true;
      critical = "success";
    } else {
      success = false;
      critical = "failure";
    }
  } else {
    success = d <= t;
  }

  const dr = success ? Math.max(0, tens(t) - tens(d)) : 0;
  const de = success ? 0 : Math.max(0, tens(d) - tens(t));
  return { die: d, target: t, success, critical, dr, de };
}

/**
 * Zone touchée en inversant les deux chiffres du dé.
 * 100 s'écrit « 00 ». Décision Marc 18/10/2026 : « 00 » inversé reste 100,
 * donc la jambe gauche. « 10 » devient « 01 » (tête).
 * Décision Marc 18/10/2026 : une réussite critique ne change pas cette
 * zone, et ne permet pas de la choisir.
 * Clés : celles de `SOL.bodyLocations`. Réf. LdR v0.2 §7.
 *
 * @param {number} die
 * @returns {"head"|"rightArm"|"leftArm"|"torso"|"rightLeg"|"leftLeg"}
 */
export function hitLocation(die) {
  const text = Number(die) === 100 ? "00" : String(Number(die)).padStart(2, "0");
  const inverted = `${text[1]}${text[0]}`;
  const zone = inverted === "00" ? 100 : Number(inverted);
  if ( zone <= 10 ) return "head";
  if ( zone <= 25 ) return "rightArm";
  if ( zone <= 40 ) return "leftArm";
  if ( zone <= 70 ) return "torso";
  if ( zone <= 85 ) return "rightLeg";
  return "leftLeg";
}
