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

## État du système : version 0.9.0 sur `dev/0.9.0`

`main` est en 0.7.4 (chaleur, Pousser, réparations, `34b4d60`). Cette branche ajoute les armes et les armures du catalogue v0.3, et le malus de portée du jet d'attaque. C'est une PR brouillon : elle n'entre dans `main` qu'après la relecture de Relecteur Foundry puis l'accord de Didier. Ne pas la fusionner avant. La séance de test de Marc est reportée à la v1 : [TESTER.md](TESTER.md), section 14, avec le ZIP de `main` une fois la branche fusionnée. La suite des versions est dans [ROADMAP.md](ROADMAP.md). La 0.9 se découpe en 0.9.0 (armes, armures, portée), 0.9.1 (équipement et modules), 0.9.2 (atouts, augmentations, logiciels, substances) et 0.9.3 (blessures, journaux, vaisseaux PNJ).

Décision Marc 23/10/2026 : les vaisseaux sont dans le Combat Tracker. L'initiative est un jet d'Opérations de bord, classé comme les personnages. Sur le tour, l'équipage utilise les boutons des postes. Au round suivant, les bonus partent et le verrouillage reste. Le delta-v se corrige à la main, au dixième. La portée est un champ de la fiche : une manœuvre gagnée met à jour les deux vaisseaux. Décision Marc 25/10/2026 : les jets de poste ne sont pas plafonnés à ±50. Les jets des personnages, hors postes, gardent ce plafond. Décision Marc 25/10/2026 : un tir qui touche a un bouton « Appliquer les dégâts » (MJ, une fois). Les dégâts sont la valeur de l'arme plus le DR. Décision Marc 30/10/2026 : la chaleur, Pousser, les réparations et le canon sont dans la 0.7.4. Marc testera l'ensemble à la v1.0.

La 0.7.1 (fenêtre Combat spatial, poussée automatique, delta-v exact à 3 décimales) a servi de premier essai. Cette version la retire.

## 0.7.0

Marc a validé la 0.6.3, puis la 0.7.0. La 0.7.1 est ensuite entrée dans `main`.

Décision Marc 21/10/2026. Une seule fiche pour les vaisseaux et les objets fixes : type (liste du brouillon, groupée, plus Autre), catégorie (atmosphérique, vide, objet fixe), identité, masse, propulsion, réserves, chaleur du réacteur (0 à 10), pièces de rechange, cinq sections, modules, sept postes, notes. Pas de carte vectorielle. Le brouillon copié pour les agents est `docs/regles-vaisseaux-v0.1.md` (chiffres provisoires). Le compendium Vaisseaux contient la Petite Fortune ; le compendium Modules de vaisseau contient ses modules et trois repères d'armes.

## État précédent : version 0.6.3

On avance pas à pas (« ne pas brûler les étapes »). L'étape 4 (jets de dés) est validée. Cette étape applique les dégâts d'une attaque réussie : le MJ confirme, une blessure est créée, une combinaison pressurisée peut être percée. L'initiative est un test de Vigilance, conservé d'un round à l'autre. Des compendiums sont déclarés. L'interface est en français.

Acteurs : **Personnage** (`character`), **PNJ** (`npc`), **Créature** (`creature`), **Synthétique** (`synthetic`), **Drone** (`drone`), **Véhicule** (`vehicle`), **Vaisseau** (`ship`).

Objets : **Compétence** (`skill`), **Atout** (`talent`), **Origine** (`origin`), **Milieu** (`background`), **Profession** (`profession`), **Arme** (`weapon`), **Armure/Vêtement** (`armor`), **Équipement** (`gear`), **Augmentation** (`augmentation`), **Substance** (`substance`), **Blessure** (`injury`), **Séquelle** (`sequel`), **Logiciel** (`software`), **Module de vaisseau** (`shipModule`).

Le Personnage et le PNJ partagent la même feuille et les mêmes champs (caractéristiques, identité, textes). Créature, synthétique, drone et véhicule gardent une feuille simple, avec leurs objets groupés par type. Le vaisseau a sa feuille à onglets. Un objet d'un type interdit (par exemple un Module de vaisseau sur un Personnage) est refusé.

Le Seuil de blessure est `ceil((FOR + CON) / 20)` (décision du 18/10/2026 : le LdR v0.2 disait /10). Sur le Personnage et le PNJ il n'est pas une colonne de la feuille : il apparaît dans la fenêtre d'application. Créature, synthétique et drone ont Force, Constitution et Perception (bornes du PNJ) et le Seuil est affiché sur leur feuille. Véhicule et vaisseau n'ont pas de caractéristiques.

L'initiative est un test de Vigilance (LdR v0.2 §7). On agit dans l'ordre des réussites, puis des échecs. À degré égal, la Réflexes départage, puis le score de Vigilance (réussites et échecs), puis l'identifiant. Une réussite critique passe avant une réussite normale du même degré. Cet ordre reste au round suivant. Une blessure grave ou pire, ou la condition Sonné, envoie en fin d'ordre. Sonné posé avant le combat le fait dès le round 1. Le meneur peut reculer un interrompu d'une place. Se replacer, seulement pendant son tour, relance la Vigilance et sacrifie le mouvement. Au round 1, un combattant marqué Surpris saute son tour. Jouer avant ne donne aucun bonus. La valeur dérivée Initiative (Réflexes / 10) n'est pas au programme : décision du 18/10/2026.

L'Endurance actuelle est un nombre. Si elle est vide, la fiche affiche le maximum (CON/5, arrondi au supérieur). Le MJ actif n'écrit ce nombre au chargement que pour une fiche d'avant la 0.6.1. Une valeur déjà stockée sur une fiche récente n'est pas touchée. Un 0 déjà écrit reste 0. À 0, une carte propose un test de Constitution : échec Inconscient, réussite Épuisé (−20 appliqué aux jets). Une combinaison percée lance un compte à rebours (5 minutes, puis mort 2 minutes plus tard) sur le temps du monde, y compris pour un jeton non lié. Un tour de combat dure 5 secondes. Le MJ peut arrêter ce compte sans retirer le statut. La Rustine colmate : sans test au calme, et sous le feu avec Survie par défaut (décision du 20/10/2026 : Survie, pas Systèmes de survie ; le MJ peut changer la compétence et la difficulté). Les joints d'une armure pressurisée équipée, passés à Percée, lancent le même compte. Les remettre à Intact à la main est un outil du MJ : colmatage sans Rustine ni test. Les règles de réparation viendront plus tard. Une section États sur la fiche montre les statuts du pion. Les compendiums de compétences, origines, milieux, professions, armes, armures, la Rustine, les blessures et les états reprennent le texte explicite du LdR v0.2. L'hypoxie du compendium États suit le §8 et le §11 : −10, puis −20, puis l'inconscience. Pas encore inclus : tolérance aux g et Sang-froid comme champs.

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
     Si le dossier existe déjà : `git fetch` puis `git checkout main`.
   - **sans git** : ZIP
     https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip
     Décompressez-le, puis renommez le dossier obtenu
     (`hard-sf-rpg-main`) en `sol-nouvelle-ere` et copiez-le dans `Data/systems/`.
3. Vérifiez que le fichier `Data/systems/sol-nouvelle-ere/system.json` existe bien (pas de dossier en double du type
   `sol-nouvelle-ere/hard-sf-rpg-main/system.json`).
4. Redémarrez Foundry : « Sol, Nouvelle Ère » apparaît dans l'onglet *Systèmes de jeu*. Sur `main`, la version affichée est **0.7.2**. Cette branche affiche **0.7.2.1**.

Armures déjà présentes dans un monde ou sur une fiche avant la 0.6.0 (ex. Ilka, 6/6/6/6) : après migration elles n'ont pas de seuil de brèche (null) et ne percent plus jamais. Supprime-les et reglisse-les depuis le compendium Armures et vêtements.

Pour tester pas à pas, voir [TESTER.md](TESTER.md).
La suite des versions : [ROADMAP.md](ROADMAP.md).
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
module/sheets/actor-sheet.mjs       feuille des autres acteurs (pas le vaisseau)
module/sheets/ship-sheet.mjs        feuille du Vaisseau
module/sheets/item-sheet.mjs        feuille unique des objets
module/ships/                       modules, migrations, combat dans le tracker, relais
templates/                          gabarits Handlebars
lang/fr.json                        tous les libellés français
styles/sol.css                      mise en forme minimale
```

Les caractéristiques, leurs bornes et les listes de choix sont déclarées à un seul endroit (`module/config.mjs`).
Renommer une clé déjà stockée demande une migration (`migrateData`) : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Auteur

Marc-André Potheret — https://github.com/marcandre71/hard-sf-rpg
