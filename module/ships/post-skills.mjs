/**
 * Compétence de chaque poste. Réf. Vaisseaux v0.1 §3.
 * Les noms sont ceux du compendium (LdR v0.2 §4).
 * Une spécialité absente de la fiche reste un jet possible :
 * le score suit `skillScore` (moitié, ou impossible sans formation).
 */

/**
 * @typedef {{ kind: "exact"|"prefix", name: string, characteristic: string, trainingRequired: boolean, untrainedAllowed: boolean }} SkillSpec
 */

/** @type {Record<string, SkillSpec[]>} */
export const POST_SKILL_SPECS = {
  commander: [spec("exact", "Commandement", "pre", false, true)],
  operator: [spec("exact", "Opérations de bord", "int", false, true)],
  pilot: [spec("prefix", "Pilotage", "coo", true, true)],
  navigator: [spec("exact", "Mécanique orbitale", "int", true, true)],
  gunner: [spec("exact", "Armement de bord", "per", true, true)],
  engineer: [
    spec("prefix", "Réacteurs et propulsion", "int", true, true),
    spec("exact", "Mécanique", "int", false, true)
  ],
  medic: [
    spec("prefix", "Médecine", "int", true, true),
    spec("exact", "Premiers secours", "int", false, true)
  ]
};

/**
 * @param {"exact"|"prefix"} kind
 * @param {string} name
 * @param {string} characteristic
 * @param {boolean} trainingRequired
 * @param {boolean} untrainedAllowed
 * @returns {SkillSpec}
 */
function spec(kind, name, characteristic, trainingRequired, untrainedAllowed) {
  return { kind, name, characteristic, trainingRequired, untrainedAllowed };
}

/**
 * @param {string} name
 * @param {SkillSpec} skillSpec
 * @returns {boolean}
 */
export function matchesSkillSpec(name, skillSpec) {
  const text = String(name ?? "").trim().toLocaleLowerCase("fr");
  const wanted = skillSpec.name.toLocaleLowerCase("fr");
  if ( skillSpec.kind === "exact" ) return text === wanted;
  return text === wanted || text.startsWith(`${wanted} :`) || text.startsWith(`${wanted}:`);
}

/**
 * Compétences proposées pour le poste.
 * Celles de l'acteur d'abord. Sinon une fiche virtuelle du compendium,
 * pour que le jet existe quand même.
 *
 * @param {string} postId
 * @param {{ name?: string, system?: object }[]} actorSkills
 * @returns {{ name: string, system: object, virtual: boolean }[]}
 */
export function skillsForPost(postId, actorSkills) {
  const specs = POST_SKILL_SPECS[postId] ?? [];
  /** @type {{ name: string, system: object, virtual: boolean }[]} */
  const offered = [];
  for ( const skillSpec of specs ) {
    const matches = (actorSkills ?? []).filter(skill => matchesSkillSpec(skill?.name, skillSpec));
    if ( matches.length ) {
      for ( const skill of matches ) {
        offered.push({
          name: String(skill.name ?? skillSpec.name),
          system: skill.system ?? virtualSystem(skillSpec),
          virtual: false
        });
      }
    } else {
      offered.push({
        name: skillSpec.name,
        system: virtualSystem(skillSpec),
        virtual: true
      });
    }
  }
  return offered;
}

/**
 * @param {SkillSpec} skillSpec
 * @returns {object}
 */
function virtualSystem(skillSpec) {
  return {
    characteristic: skillSpec.characteristic,
    training: 0,
    trainingRequired: skillSpec.trainingRequired,
    untrainedAllowed: skillSpec.untrainedAllowed
  };
}
