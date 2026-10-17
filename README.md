# hard-sf-rpg — Sol, Nouvelle Ère

Jeu de rôle de science-fiction réaliste (*hard SF*), conçu en collaboration avec des agents IA.
Ce dépôt contient le **système de jeu FoundryVTT** « Sol, Nouvelle Ère » (identifiant `sol-nouvelle-ere`).

## Le jeu

L'humanité s'est répandue dans le système solaire : Terre, Lune, Mars, Ceinture d'astéroïdes, lunes de Jupiter et de Saturne.
Pas de propulsion supraluminique, pas de pouvoirs : la physique (gravité, radiations, délais lumière, réserves d'air) fait partie du jeu.
Les personnages sont définis par leur **origine** (naître sur Terre, sur Mars ou dans la Ceinture change le corps et la culture)
et par neuf **caractéristiques notées sur 100** : Force (FOR), Constitution (CON), Coordination (COO), Réflexes (RÉF),
Adaptation spatiale (ADA), Perception (PER), Intellect (INT), Volonté (VOL), Présence (PRÉ).
Un test se résout au D100 : réussite si le résultat est inférieur ou égal au score.

## État du système : étape 1 (version 0.1.0)

On avance pas à pas (« ne pas brûler les étapes »). Cette première étape contient **uniquement** :

- un type d'acteur **Personnage** (`character`) ;
- ses **9 caractéristiques**, chacune avec quatre champs : **Base**, **Origine**, **Progression**, **Temp.** ;
- la valeur **Actuelle**, calculée automatiquement (Base + Origine + Progression + Temp.), jamais stockée ;
- une **feuille de personnage** très simple : nom, portrait, tableau des caractéristiques ;
- l'interface en **français**.

Pas encore inclus (étapes suivantes) : valeurs dérivées (seuil de blessure, tolérance aux g, initiative, Endurance, Sang-froid),
compétences, jets de dés, objets (équipement, origines, blessures…), vaisseaux, compendiums.

Compatibilité : **FoundryVTT version 14** (cible : version 14 Stable, build 369 ; `compatibility.verified` = 14).

## Installation

Le dossier du système doit **obligatoirement** s'appeler `sol-nouvelle-ere` (le même nom que l'`id` dans `system.json`).

1. Repérez votre dossier de données Foundry (dans Foundry : *Configuration* → *Chemin des données utilisateur*).
2. Placez le système dans `Data/systems/sol-nouvelle-ere` :
   - **avec git** :
     ```bash
     cd <dossier de données>/Data/systems
     git clone https://github.com/marcandre71/hard-sf-rpg.git sol-nouvelle-ere
     ```
   - **sans git** : téléchargez le dépôt (bouton *Code* → *Download ZIP*), décompressez-le, puis renommez le dossier obtenu
     (`hard-sf-rpg-main`) en `sol-nouvelle-ere` et copiez-le dans `Data/systems/`.
3. Vérifiez que le fichier `Data/systems/sol-nouvelle-ere/system.json` existe bien (pas de dossier en double du type
   `sol-nouvelle-ere/hard-sf-rpg-main/system.json`).
4. Redémarrez Foundry : « Sol, Nouvelle Ère » apparaît dans l'onglet *Systèmes de jeu*.

Pour tester pas à pas, voir [TESTER.md](TESTER.md).
Conventions et guide pour les agents et développeurs : [CONTRIBUTING.md](CONTRIBUTING.md).

## Structure

```
system.json                      manifeste du système
module/sol.mjs                   point d'entrée (hook « init »)
module/config.mjs                configuration centrale (liste des caractéristiques)
module/data/character.mjs        modèle de données du Personnage
module/sheets/character-sheet.mjs feuille de personnage (ApplicationV2)
templates/actor/character-sheet.hbs gabarit de la feuille
lang/fr.json                     textes français
styles/sol.css                   mise en forme
```

Les caractéristiques sont déclarées à un seul endroit (`module/config.mjs`) : pour en renommer une, on modifie ce fichier
et les libellés de `lang/fr.json`.

## Auteur

Marc-André Potheret — https://github.com/marcandre71/hard-sf-rpg
