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

## État du système : étape 5 (version 0.5.10)

On avance pas à pas (« ne pas brûler les étapes »). L'étape 4 (jets de dés) est validée. Cette étape applique les dégâts d'une attaque réussie : le MJ confirme, une blessure est créée, une combinaison pressurisée peut être percée. L'initiative est un test de Vigilance, conservé d'un round à l'autre. Des compendiums sont déclarés. L'interface est en français.

Acteurs : **Personnage** (`character`), **PNJ** (`npc`), **Créature** (`creature`), **Synthétique** (`synthetic`), **Drone** (`drone`), **Véhicule** (`vehicle`), **Vaisseau** (`ship`).

Objets : **Compétence** (`skill`), **Atout** (`talent`), **Origine** (`origin`), **Milieu** (`background`), **Profession** (`profession`), **Arme** (`weapon`), **Armure/Vêtement** (`armor`), **Équipement** (`gear`), **Augmentation** (`augmentation`), **Substance** (`substance`), **Blessure** (`injury`), **Séquelle** (`sequel`), **Logiciel** (`software`), **Module de vaisseau** (`shipModule`).

Le Personnage et le PNJ partagent la même feuille et les mêmes champs (caractéristiques, identité, textes). Les autres acteurs gardent une feuille simple, avec leurs objets groupés par type. Un objet d'un type interdit (par exemple un Module de vaisseau sur un Personnage) est refusé.

Le Seuil de blessure est `ceil((FOR + CON) / 20)` (décision du 18/10/2026 : le LdR v0.2 disait /10). Sur le Personnage et le PNJ il n'est pas une colonne de la feuille : il apparaît dans la fenêtre d'application. Créature, synthétique et drone ont Force, Constitution et Perception (bornes du PNJ) et le Seuil est affiché sur leur feuille. Véhicule et vaisseau n'en ont pas.

L'initiative est un test de Vigilance (LdR v0.2 §7). On agit dans l'ordre des réussites, puis des échecs. À degré égal, la Réflexes départage, puis le score de Vigilance (réussites et échecs), puis l'identifiant. Une réussite critique passe avant une réussite normale du même degré. Cet ordre reste au round suivant. Une blessure grave ou pire, ou la condition Sonné, envoie en fin d'ordre. Sonné posé avant le combat le fait dès le round 1. Le meneur peut reculer un interrompu d'une place. Se replacer, seulement pendant son tour, relance la Vigilance et sacrifie le mouvement. Au round 1, un combattant marqué Surpris saute son tour. Jouer avant ne donne aucun bonus. La valeur dérivée Initiative (Réflexes / 10) n'est pas au programme : décision du 18/10/2026.

Pas encore inclus : tolérance aux g, Endurance, Sang-froid, autres effets automatiques. Les compendiums de compétences, origines, milieux, professions, armes et armures reprennent le texte explicite du LdR v0.2. Les autres packs restent vides.

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
4. Redémarrez Foundry : « Sol, Nouvelle Ère » apparaît dans l'onglet *Systèmes de jeu*, version 0.5.10.

Pour tester pas à pas, voir [TESTER.md](TESTER.md).
Conventions et guide pour les agents et développeurs : [CONTRIBUTING.md](CONTRIBUTING.md).

## Structure

```
system.json                         manifeste (types, htmlFields, langues fr et en)
module/sol.mjs                      point d'entrée (hook « init »)
module/config.mjs                   caractéristiques, choix, difficultés, objets autorisés
module/guards.mjs                   refus des objets interdits (preCreateItem)
module/dice/                        jet D100, dégâts, classement d'initiative (règles pures)
module/combat/                      initiative dans le Combat Tracker
packs/                              compendiums (JSON dans _source, LevelDB construit)
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
