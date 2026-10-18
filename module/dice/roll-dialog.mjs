/**
 * Fenêtre de jet : score, difficulté, modificateur libre, total borné.
 *
 * Annuler, ou fermer la fenêtre, ne lance pas le dé.
 * Réf. LdR v0.2 §5 et §15. API v14 : DialogV2.wait.
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
 */
import { SOL } from "../config.mjs";
import { cappedModifier, formatModifier } from "./d100.mjs";

/** Ordre du tableau LdR v0.2 §5. La clé `normal` est le défaut. */
const DIFFICULTY_ORDER = ["veryEasy", "easy", "simple", "normal", "tricky", "hard", "veryHard", "extreme"];

/**
 * Lit le formulaire et calcule le total borné.
 *
 * @param {HTMLFormElement} form
 * @param {number} score
 * @returns {{ difficultyKey: string, difficultyLabel: string, difficultyModifier: number, free: number, modifier: number, target: number }}
 */
function readForm(form, score) {
  const difficultyKey = form.elements.difficulty?.value || "normal";
  const cfg = SOL.difficulties[difficultyKey] ?? SOL.difficulties.normal;
  const raw = Number(form.elements.modifier?.value);
  // Décision Marc 18/10/2026 : le modificateur libre est un entier.
  const free = Number.isFinite(raw) ? Math.trunc(raw) : 0;
  const modifier = cappedModifier(cfg.modifier, free);
  return {
    difficultyKey,
    difficultyLabel: game.i18n.localize(cfg.label),
    difficultyModifier: cfg.modifier,
    free,
    modifier,
    target: Number(score) + modifier
  };
}

/**
 * Met à jour le total affiché quand la difficulté ou le modificateur change.
 *
 * @param {HTMLElement} root
 * @param {number} score
 * @returns {void}
 */
function paintTotal(root, score) {
  const form = root.querySelector("form") ?? root;
  const out = form.querySelector("[data-total]");
  if ( !out || !form.elements?.difficulty ) return;
  out.textContent = formatModifier(readForm(form, score).modifier);
}

/**
 * Difficulté et modificateur libre, sans fenêtre.
 * Le score visé est le score de base plus le modificateur borné.
 *
 * @param {number} score
 * @param {string} [difficultyKey]
 * @param {number} [free]
 * @returns {{ difficultyKey: string, difficultyLabel: string, difficultyModifier: number, free: number, modifier: number, target: number }}
 */
export function rollChoice(score, difficultyKey = "normal", free = 0) {
  const key = difficultyKey in SOL.difficulties ? difficultyKey : "normal";
  const cfg = SOL.difficulties[key];
  const safeFree = Number.isFinite(free) ? Math.trunc(free) : 0;
  const modifier = cappedModifier(cfg.modifier, safeFree);
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
 * @param {{ title: string, score: number }} options
 * @returns {Promise<null|{ difficultyKey: string, difficultyLabel: string, difficultyModifier: number, free: number, modifier: number, target: number }>}
 */
export async function askRoll({ title, score }) {
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
        <input type="number" name="modifier" value="0" step="1">
      </label>
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
        callback: (_event, button) => readForm(button.form, score)
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
        const update = () => paintTotal(form, score);
        form.querySelector("[name=difficulty]")?.addEventListener("change", update);
        form.querySelector("[name=modifier]")?.addEventListener("input", update);
        update();
      }
    }
  });

  if ( !result || result === "cancel" ) return null;
  return result;
}
