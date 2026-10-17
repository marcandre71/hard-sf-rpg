/**
 * Sol, Nouvelle Ère — point d'entrée du système (FoundryVTT v14).
 *
 * Chargé par `esmodules` dans `system.json`. Ne fait rien à l'import :
 * tout l'enregistrement a lieu une fois, sur le hook `init`, avant que
 * les documents du monde ne soient préparés.
 *
 * Enchaînement : publier `CONFIG.SOL`, lier le modèle du Personnage,
 * puis poser la feuille par défaut du type `character`.
 */
import { SOL } from "./config.mjs";
import { CharacterData } from "./data/character.mjs";
import { CharacterSheet } from "./sheets/character-sheet.mjs";

/**
 * Enregistre la configuration, le modèle de données et la feuille.
 *
 * Appelée par {@link https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html#once Hooks.once}
 * sur `init`. Le message de console est le repère attendu par TESTER.md.
 *
 * @returns {void}
 * @see https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html
 * @see https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Actors.html#registerSheet
 * @see https://foundryvtt.com/api/v14/classes/foundry.applications.apps.DocumentSheetConfig.html#registerSheet
 */
function initializeSystem() {
  console.log("Sol, Nouvelle Ère | Initialisation du système");

  // Configuration centrale (caractéristiques, etc.).
  CONFIG.SOL = SOL;

  // Modèle de données du type d'acteur « character ».
  CONFIG.Actor.dataModels.character = CharacterData;

  // Feuille de personnage par défaut pour le type « character ».
  // Actors.registerSheet délègue à DocumentSheetConfig.registerSheet.
  foundry.documents.collections.Actors.registerSheet("sol-nouvelle-ere", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SOL.Sheet.Character"
  });
}

Hooks.once("init", initializeSystem);
