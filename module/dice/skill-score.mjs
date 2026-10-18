/**
 * Score d'une compétence, et résolution du nom de compétence d'une arme.
 *
 * Pas de Foundry : la feuille et le jet passent les données déjà lues.
 * Réf. LdR v0.2 §4 et §15.
 */
import { SOL } from "../config.mjs";

/**
 * Score = valeur actuelle de la caractéristique + formation.
 * Formation requise et formation à 0 :
 * - `untrainedAllowed` faux → jet impossible ;
 * - sinon moitié de la caractéristique, arrondi supérieur.
 * Décision Marc 18/10/2026 : cette moitié est calculée avant la difficulté.
 * La difficulté s'ajoute ensuite, dans le jet, pas ici.
 *
 * @param {Record<string, { value?: number }>|undefined} characteristics
 * @param {{ characteristic?: string, training?: number, trainingRequired?: boolean, untrainedAllowed?: boolean }} skill
 * @returns {{ impossible: boolean, score: number|null, halved: boolean }}
 */
export function skillScore(characteristics, skill) {
  const value = Number(characteristics?.[skill?.characteristic]?.value ?? 0);
  const training = Number(skill?.training ?? 0);
  if ( skill?.trainingRequired && training === 0 ) {
    if ( skill.untrainedAllowed === false ) return { impossible: true, score: null, halved: false };
    return { impossible: false, score: Math.ceil(value / 2), halved: true };
  }
  // Décision Marc 18/10/2026 : le score n'est pas plafonné (il peut dépasser 100 ; le surplus donne des DR).
  return { impossible: false, score: value + training, halved: false };
}

/**
 * Nom de compétence, comparaison insensible à la casse et aux espaces.
 *
 * @param {{ name?: string }[]} skills
 * @param {string} name
 * @returns {{ name?: string }|null}
 */
export function findSkillByName(skills, name) {
  const wanted = String(name ?? "").trim().toLocaleLowerCase("fr");
  if ( !wanted ) return null;
  return skills.find(skill => String(skill?.name ?? "").trim().toLocaleLowerCase("fr") === wanted) ?? null;
}

/**
 * Caractéristique de repli si l'acteur n'a pas la compétence nommée.
 * Réf. LdR v0.2 §7 et §15 : sans la compétence, on lance sur la
 * caractéristique. Armes de poing / Armes d'épaule → COO,
 * Corps-à-corps → FOR. Ces trois compétences ne sont pas (F).
 * Le modèle d'arme ne porte pas de caractéristique : on n'en ajoute pas.
 * // À confirmer par Marc : un nom vide ou inconnu ne dit pas si l'arme
 * est de tir ou de corps-à-corps. On retombe sur COO.
 *
 * @param {string} name
 * @param {Record<string, string>} [defaults]
 * @returns {string} Clé de caractéristique.
 */
export function weaponCharacteristicFallback(name, defaults = SOL.weaponSkillDefaults) {
  const wanted = String(name ?? "").trim().toLocaleLowerCase("fr");
  if ( wanted ) {
    const key = Object.keys(defaults).find(label => label.trim().toLocaleLowerCase("fr") === wanted);
    if ( key ) return defaults[key];
  }
  return "coo";
}

/**
 * Score d'une attaque.
 * D'abord une compétence de l'acteur au même nom. Sinon la
 * caractéristique de repli : le jet n'est pas refusé.
 * Réf. LdR v0.2 §15 « Attaque ».
 *
 * @param {Record<string, { value?: number }>|undefined} characteristics
 * @param {string} skillName
 * @param {{ name?: string, system?: object }[]} skills
 * @returns {{ unknown: boolean, impossible: boolean, score: number|null, label: string, halved: boolean, fallback: boolean, characteristic: string|null }}
 */
export function weaponAttackScore(characteristics, skillName, skills) {
  const found = findSkillByName(skills, skillName);
  if ( found ) {
    const rated = skillScore(characteristics, found.system ?? {});
    return {
      ...rated,
      unknown: false,
      label: found.name ?? skillName,
      fallback: false,
      characteristic: found.system?.characteristic ?? null
    };
  }
  const characteristic = weaponCharacteristicFallback(skillName);
  const value = Number(characteristics?.[characteristic]?.value ?? 0);
  return {
    unknown: false,
    impossible: false,
    score: value,
    label: String(skillName ?? "").trim(),
    halved: false,
    fallback: true,
    characteristic
  };
}
