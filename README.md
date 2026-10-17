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

## État du système : étape 3 (version 0.3.0)

On avance pas à pas (« ne pas brûler les étapes »). L'étape 2 (types, modèles, feuilles minimales) est validée. Cette étape ne change que la **mise en page** : la feuille du Personnage et du PNJ a trois onglets (Principal, Inventaire, Roleplay). Pas de jets de dés, pas d'automatisation, pas de règle nouvelle. L'interface est en français.

Acteurs : **Personnage** (`character`), **PNJ** (`npc`), **Créature** (`creature`), **Synthétique** (`synthetic`), **Drone** (`drone`), **Véhicule** (`vehicle`), **Vaisseau** (`ship`).

Objets : **Compétence** (`skill`), **Atout** (`talent`), **Origine** (`origin`), **Milieu** (`background`), **Profession** (`profession`), **Arme** (`weapon`), **Armure/Vêtement** (`armor`), **Équipement** (`gear`), **Augmentation** (`augmentation`), **Substance** (`substance`), **Blessure** (`injury`), **Séquelle** (`sequel`), **Logiciel** (`software`), **Module de vaisseau** (`shipModule`).

Le Personnage et le PNJ partagent la même feuille et les mêmes champs (caractéristiques, identité, textes). Les autres acteurs gardent une feuille simple, avec leurs objets groupés par type. Un objet d'un type interdit (par exemple un Module de vaisseau sur un Personnage) est refusé.

Pas encore inclus : jets de dés, valeurs dérivées (seuil de blessure, tolérance aux g, initiative, Endurance, Sang-froid), effets automatiques, compendiums.

Compatibilité : **FoundryVTT version 14** (cible : version 14 Stable, build 369 ; `compatibility.minimum` et `compatibility.verified` = `"14"`).

L'entrée de langue `en` pointe vers le même fichier que `fr` : si Foundry est en anglais, les textes restent en français en attendant une traduction.

## Installation

Le dossier du système doit **obligatoirement** s'appeler `sol-nouvelle-ere` (le même nom que l'`id` dans `system.json`).

1. Repérez votre dossier de données Foundry (dans Foundry : *Configuration* → *Chemin des données utilisateur*).
2. Placez le système dans `Data/systems/sol-nouvelle-ere` :
   - **avec git** :
     ```bash
     cd <dossier de données>/Data/systems
     git clone https://github.com/marcandre71/hard-sf-rpg.git sol-nouvelle-ere
     ```
     Si le dossier existe déjà : `git pull` dedans.
   - **sans git** : téléchargez le dépôt (bouton *Code* → *Download ZIP*), décompressez-le, puis renommez le dossier obtenu
     (`hard-sf-rpg-main`) en `sol-nouvelle-ere` et copiez-le dans `Data/systems/`.
3. Vérifiez que le fichier `Data/systems/sol-nouvelle-ere/system.json` existe bien (pas de dossier en double du type
   `sol-nouvelle-ere/hard-sf-rpg-main/system.json`).
4. Redémarrez Foundry : « Sol, Nouvelle Ère » apparaît dans l'onglet *Systèmes de jeu*, version 0.3.0.

Pour tester pas à pas, voir [TESTER.md](TESTER.md).
Conventions et guide pour les agents et développeurs : [CONTRIBUTING.md](CONTRIBUTING.md).

## Structure

```
system.json                         manifeste (types, htmlFields, langues fr et en)
module/sol.mjs                      point d'entrée (hook « init »)
module/config.mjs                   caractéristiques, choix, objets autorisés par acteur
module/guards.mjs                   refus des objets interdits (preCreateItem)
module/data/                        un modèle par type (base commune des objets)
module/sheets/character-sheet.mjs   feuille du Personnage
module/sheets/actor-sheet.mjs       feuille des autres acteurs
module/sheets/item-sheet.mjs        feuille unique des objets
templates/                          gabarits Handlebars
lang/fr.json                        tous les libellés français
styles/sol.css                      mise en forme minimale
```

Les caractéristiques, leurs bornes et les listes de choix sont déclarées à un seul endroit (`module/config.mjs`).
Renommer une clé déjà stockée demande une migration (`migrateData`) : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Auteur

Marc-André Potheret — https://github.com/marcandre71/hard-sf-rpg
