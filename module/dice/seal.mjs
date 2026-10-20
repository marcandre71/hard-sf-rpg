/**
 * Colmatage. Sans Foundry.
 *
 * Réf. LdR v0.2 §7 et §8. Rustine est la première méthode.
 * D'autres (mousse expansive, etc.) s'ajoutent au registre,
 * elles ne sont pas inventées ici.
 * // Décision Marc 20/10/2026 : un test raté ne consomme pas l'objet.
 * // À confirmer par Marc : sous le feu, Survie ou « Systèmes de survie ».
 * En attendant, Survie, par l'id du compendium, pas par le nom.
 */

/**
 * Méthode dont le nom correspond à l'objet, insensible à la casse.
 *
 * @param {string} name
 * @param {Array<{ id: string, name: string }>|null|undefined} methods
 * @returns {{ id: string, name: string }|null}
 */
export function findSealMethod(name, methods) {
  const wanted = String(name ?? "").trim().toLocaleLowerCase("fr");
  if ( !wanted || !methods ) return null;
  return methods.find(method => String(method?.name ?? "").trim().toLocaleLowerCase("fr") === wanted) ?? null;
}

/**
 * Une quantité inférieure à 1 ne colmate pas.
 *
 * @param {unknown} quantity
 * @returns {boolean}
 */
export function canSeal(quantity) {
  return typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 1;
}

/**
 * La compétence embarquée est Survie si son id est celui du compendium,
 * ou si la source s'y termine (glisser-déposer : nouvel id).
 * `_stats.compendiumSource`, sinon `flags.core.sourceId`.
 * // À confirmer par Marc : Survie ou « Systèmes de survie ».
 * On ne compare pas le nom.
 *
 * @param {{ id?: string, _stats?: { compendiumSource?: string }, flags?: { core?: { sourceId?: string } } }|null|undefined} skill
 * @param {string|null|undefined} compendiumId
 * @returns {boolean}
 */
export function isSealSkill(skill, compendiumId) {
  if ( !skill || typeof compendiumId !== "string" || compendiumId.length === 0 ) return false;
  if ( skill.id === compendiumId ) return true;
  const source = skill._stats?.compendiumSource ?? skill.flags?.core?.sourceId;
  if ( typeof source !== "string" || source.length === 0 ) return false;
  return source.endsWith(`.Item.${compendiumId}`);
}

/**
 * Id embarqué de Survie, ou null si la fiche ne l'a pas.
 *
 * @param {Array<{ id?: string, _stats?: { compendiumSource?: string }, flags?: { core?: { sourceId?: string } } }>|null|undefined} skills
 * @param {string|null|undefined} compendiumId
 * @returns {string|null}
 */
export function pickSealSkillId(skills, compendiumId) {
  const found = (skills ?? []).find(skill => isSealSkill(skill, compendiumId));
  return typeof found?.id === "string" && found.id.length > 0 ? found.id : null;
}

/**
 * Joints. Décision Marc 20/10/2026 : une armure non pressurisée n'a pas
 * de joints étanches. Percée ne lance rien.
 * // Décision Marc 20/10/2026 : Intact à la main, sur une armure
 * équipée et pressurisée, est un outil du MJ. Ça vaut colmatage,
 * sans Rustine ni test. Les règles de réparation viendront plus tard.
 *
 * @param {unknown} next
 * @param {{ equipped?: boolean, pressurized?: boolean }|null|undefined} armor
 * @returns {"start"|"seal"|"ignore"}
 */
export function jointEffect(next, armor) {
  if ( armor?.equipped !== true || armor?.pressurized !== true ) return "ignore";
  if ( next === "breached" ) return "start";
  if ( next === "intact" ) return "seal";
  return "ignore";
}

/**
 * Le hook des joints pose Combinaison percée.
 * Statut déjà là, ou pose déjà commencée : on ne fait rien.
 *
 * @param {{ hasStatus?: boolean, pending?: boolean }|null|undefined} state
 * @returns {boolean}
 */
export function shouldPoseSuit(state) {
  if ( state?.hasStatus === true || state?.pending === true ) return false;
  return true;
}
