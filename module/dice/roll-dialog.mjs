/**
 * Fenêtre de jet : score, difficulté, modificateur libre, total borné.
 *
 * Annuler, ou fermer la fenêtre, ne lance pas le dé.
 * Réf. LdR v0.2 §5 et §15. API v14 : DialogV2.wait.
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 */
import { SOL } from "../config.mjs";
import { AIM_MODIFIERS, attackSituation } from "./attack.mjs";
import { cappedModifier, formatModifier, rollModifier } from "./d100.mjs";

/** Ordre du tableau LdR v0.2 §5. La clé `normal` est le défaut. */
const DIFFICULTY_ORDER = ["veryEasy", "easy", "simple", "normal", "tricky", "hard", "veryHard", "extreme"];

/**
 * Actions de visée saisies. Une case par entrée de `AIM_MODIFIERS`.
 * Réf. LdR v0.2 §7. Le nombre d'actions est un entier, borné par
 * le modificateur (0 à 3 pour Viser).
 *
 * @param {HTMLFormElement} form
 * @returns {Record<string, number>}
 */
function readAim(form) {
  /** @type {Record<string, number>} */
  const actions = {};
  for ( const mod of AIM_MODIFIERS ) {
    const raw = Number(form.elements[`aim-${mod.id}`]?.value);
    actions[mod.id] = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  }
  return actions;
}

/**
 * Lit le formulaire et calcule le total.
 * Tir visé et Viser d'un personnage entrent dans le plafond ±50.
 * Réf. LdR v0.2 §5 et §7.
 * Décision Marc 25/10/2026 : un jet de poste de vaisseau n'est pas borné.
 *
 * @param {HTMLFormElement} form
 * @param {number} score
 * @param {number} [statusModifier] Malus de statut.
 * @param {boolean} [shipPost]
 * @returns {object}
 */
function readForm(form, score, statusModifier = 0, shipPost = false) {
  const difficultyKey = form.elements.difficulty?.value || "normal";
  const cfg = SOL.difficulties[difficultyKey] ?? SOL.difficulties.normal;
  const raw = Number(form.elements.modifier?.value);
  // Décision Marc 18/10/2026 : le modificateur libre est un entier.
  // Ce n'est pas une division du LdR.
  const free = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  const calledShot = form.elements.calledShot?.value || "none";
  const aimActions = readAim(form);
  const situation = attackSituation(calledShot, aimActions);
  const stacked = situation.situation + Number(statusModifier || 0);
  const modifier = shipPost
    ? rollModifier(cfg.modifier, free, stacked, { shipPost: true })
    : cappedModifier(cfg.modifier, free, stacked);
  const aimPart = situation.aim.parts.find(part => part.id === "aim");
  return {
    difficultyKey,
    difficultyLabel: game.i18n.localize(cfg.label),
    difficultyModifier: cfg.modifier,
    free,
    calledShot,
    calledPenalty: situation.called.penalty,
    aimActions: aimPart?.actions ?? 0,
    aimBonus: aimPart?.bonus ?? 0,
    visor: situation.called.visor,
    situation: situation.situation,
    statusModifier: Number(statusModifier || 0),
    modifier,
    target: Number(score) + modifier
  };
}

/**
 * Met à jour le total affiché quand la difficulté ou le modificateur change.
 *
 * @param {HTMLElement} root
 * @param {number} score
 * @param {number} [statusModifier]
 * @param {boolean} [shipPost]
 * @returns {void}
 */
function paintTotal(root, score, statusModifier = 0, shipPost = false) {
  const form = root.querySelector("form") ?? root;
  const out = form.querySelector("[data-total]");
  if ( !out || !form.elements?.difficulty ) return;
  out.textContent = formatModifier(readForm(form, score, statusModifier, shipPost).modifier);
}

/**
 * Difficulté et modificateur libre, sans fenêtre.
 * Le score visé est le score de base plus le modificateur borné.
 *
 * @param {number} score
 * @param {string} [difficultyKey]
 * @param {number} [free]
 * @param {{ shipPost?: boolean }} [options]
 * @returns {{ difficultyKey: string, difficultyLabel: string, difficultyModifier: number, free: number, modifier: number, target: number }}
 */
export function rollChoice(score, difficultyKey = "normal", free = 0, { shipPost = false } = {}) {
  const key = difficultyKey in SOL.difficulties ? difficultyKey : "normal";
  const cfg = SOL.difficulties[key];
  const safeFree = Number.isFinite(free) ? Math.trunc(free) : 0;
  const modifier = shipPost
    ? rollModifier(cfg.modifier, safeFree, 0, { shipPost: true })
    : cappedModifier(cfg.modifier, safeFree);
  return {
    difficultyKey: key,
    difficultyLabel: game.i18n.localize(cfg.label),
    difficultyModifier: cfg.modifier,
    free: safeFree,
    modifier,
    target: Number(score) + modifier
  };
}

/**
 * Cases de tir visé et de visée, seulement pour une arme.
 * Les libellés viennent de l'i18n. Les malus viennent de `attack.mjs`.
 *
 * @returns {string}
 */
function attackFields() {
  const escape = foundry.utils.escapeHTML;
  const options = [
    "none", "torso", "rightArm", "leftArm", "rightLeg", "leftLeg", "head", "visor"
  ].map(id => {
    const selected = id === "none" ? " selected" : "";
    const text = game.i18n.localize(`SOL.Roll.called.${id}`);
    return `<option value="${id}"${selected}>${escape(text)}</option>`;
  }).join("");
  const aims = AIM_MODIFIERS.map(mod => `
      <label>${escape(game.i18n.localize(mod.label))}
        <input type="number" name="aim-${mod.id}" value="0" min="0" max="${mod.maxActions}" step="1">
      </label>`).join("");
  return `
      <label>${escape(game.i18n.localize("SOL.Roll.calledShot"))}
        <select name="calledShot">${options}</select>
      </label>
      ${aims}`;
}

/**
 * Ligne Épuisé dans la fenêtre. Le total la compte déjà.
 * Décision Marc 20/10/2026.
 *
 * @param {number} statusModifier
 * @returns {string}
 */
function statusNote(statusModifier) {
  if ( !statusModifier ) return "";
  const escape = foundry.utils.escapeHTML;
  const text = `${game.i18n.localize("SOL.Status.exhaustedMod")} (${formatModifier(statusModifier)})`;
  return `<p class="sol-roll-score">${escape(text)}</p>`;
}

/**
 * @param {{ title: string, score: number, attack?: boolean, statusModifier?: number, free?: number, shipPost?: boolean }} options
 * @returns {Promise<null|object>}
 */
export async function askRoll({ title, score, attack = false, statusModifier = 0, free = 0, shipPost = false }) {
  const initialFree = Number.isFinite(Number(free)) ? Math.trunc(Number(free)) : 0;
  const escape = foundry.utils.escapeHTML;
  const options = DIFFICULTY_ORDER.map(key => {
    const cfg = SOL.difficulties[key];
    const selected = key === "normal" ? " selected" : "";
    const text = `${game.i18n.localize(cfg.label)} (${formatModifier(cfg.modifier)})`;
    return `<option value="${key}"${selected}>${escape(text)}</option>`;
  }).join("");

  const content = `
    <div class="sol-roll-form">
      <p class="sol-roll-score">${escape(game.i18n.localize("SOL.Roll.score"))}
        <strong>${escape(String(score))}</strong></p>
      <label>${escape(game.i18n.localize("SOL.Roll.difficulty"))}
        <select name="difficulty">${options}</select>
      </label>
      <label>${escape(game.i18n.localize("SOL.Roll.free"))}
        <input type="number" name="modifier" value="${initialFree}" step="1">
      </label>
      ${attack ? attackFields() : ""}
      ${statusNote(statusModifier)}
      <p class="sol-roll-total">${escape(game.i18n.localize("SOL.Roll.total"))}
        <strong data-total>0</strong></p>
    </div>`;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title },
    classes: ["sol", "sol-nouvelle-ere", "sol-roll-dialog"],
    content,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("SOL.Roll.confirm"),
        default: true,
        callback: (_event, button) => readForm(button.form, score, statusModifier, shipPost)
      },
      {
        action: "cancel",
        label: game.i18n.localize("SOL.Roll.cancel")
      }
    ],
    rejectClose: false,
    render: (first, second) => {
      // v14 appelle `render` avec l'élément ou (événement, dialogue).
      const root = first instanceof HTMLElement
        ? first
        : (second?.element ?? first?.element ?? second);
      if ( root instanceof HTMLElement ) {
        const form = root.querySelector("form") ?? root;
        const update = () => paintTotal(form, score, statusModifier, shipPost);
        form.querySelector("[name=difficulty]")?.addEventListener("change", update);
        form.querySelector("[name=modifier]")?.addEventListener("input", update);
        form.querySelector("[name=calledShot]")?.addEventListener("change", update);
        for ( const mod of AIM_MODIFIERS ) {
          form.querySelector(`[name=aim-${mod.id}]`)?.addEventListener("input", update);
        }
        update();
      }
    }
  });

  if ( !result || result === "cancel" ) return null;
  return result;
}
