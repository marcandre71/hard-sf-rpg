# Contribuer à Sol, Nouvelle Ère

Guide pour les agents IA et les développeurs qui poursuivent ce système FoundryVTT.
La branche `dev/0.7.0` porte la 0.7.1 (postes et ordre du tour). Elle n'entre dans `main` qu'après la relecture : `main` reste en 0.7.0 jusque-là. La 0.6.3 (fin d'ordre, Rustine sur Survie, joints, section États) est sur `main`, de même que le compte à rebours (0.6.2), l'armure par zone (0.6.0) et l'initiative glissante (0.5.10–0.5.11). Le Seuil de blessure est `ceil((FOR + CON) / 20)`. Pas d'automatisation des origines. Pas de dégâts de vaisseau, pas de chaleur ni de réparations automatisées.

## Petites étapes jouables, validées par Marc

On n'enchaîne pas les mécaniques. Chaque étape doit être **jouable et validée par Marc**
(Marc-André Potheret, propriétaire du dépôt) avant la suivante.

Une étape est acceptable quand :

- le périmètre annoncé dans le README est respecté, sans fonctionnalité en plus ;
- un personnage peut être créé et ses données survivent à la fermeture de la feuille et au rechargement ;
- [TESTER.md](TESTER.md) passe sans ligne rouge dans la console Foundry.

Tant que Marc n'a pas validé l'étape, on ne commence pas la suivante. En cas de doute sur une règle, on lui demande plutôt que d'inventer.

Hors périmètre (ne pas les ajouter) : tolérance aux g et Sang-froid comme champs (les formules `ceil` sont dans `derived.mjs`, pas affichées), encombrement, mouvement, usure de perforation, mousses expansives (le registre `SOL.sealMethods` est le point d'entrée), compteurs de dose, automation des origines, perte d'Endurance du saignement. L'Endurance actuelle est un nombre (Personnage, PNJ, créature, synthétique, drone), pas `{ value, max }`. Décision Marc 19/10/2026 : le LdR v0.2 §15 écrit `{ value, max }` ; on garde un seul nombre, le maximum `ceil(CON/5)` est calculé. Une valeur absente (null) est écrite au maximum par le MJ actif (`fillEndurance`), jamais dans `migrateData`. Un 0 stocké reste 0. Active Effects du système : « Combinaison percée », « Saignement », « Sonné », « Surpris », « Épuisé ». Inconscient et Mort réutilisent les statuts cœur `unconscious` et `dead`. Sur le Personnage et le PNJ, le Seuil n'est pas une colonne : il est calculé à l'application des dégâts. Décision Marc 18/10/2026 : la valeur dérivée Initiative (RÉF/10) est retirée, elle ne sera pas ajoutée. Vice et Lueur n'existent pas : ne pas les réintroduire.

## Où sont les règles du jeu

Les règles ne sont **pas dans ce dépôt**, sauf un brouillon copié tel quel pour les agents : `docs/regles-vaisseaux-v0.1.md` (Règles des vaisseaux v0.1, 21/10/2026, chiffres provisoires). Le Livre de règles v0.2 et la Fiche de personnage v0.2 restent dans des **Google Docs dont Marc est propriétaire**.
Ne pas créer une version parallèle, et ne pas deviner une formule absente du code, du brouillon, ou d'une consigne de Marc. Dans le code vaisseau, citer `// Réf. Vaisseaux v0.1 §x`. Une décision écrite de Marc se cite `// Décision Marc 21/10/2026`. Un point non couvert se marque `// À confirmer par Marc`.

Quand un champ est marqué « non défini » ou « à préciser » dans le code, c'est volontaire : les docs donnent le nom, pas le type. Ne pas le « compléter » sans une décision de Marc.

## Arborescence

```
system.json                         Manifeste : id, version 0.7.1 sur cette branche, compatibilité 14,
                                    esmodules, styles, langues fr et en (en → lang/fr.json),
                                    documentTypes avec htmlFields, packs et packFolders.
module/sol.mjs                      Point d'entrée. Hook init : CONFIG.SOL, dataModels,
                                    retrait des feuilles V1 du cœur, registerSheet, garde-fou.
module/config.mjs                   Caractéristiques, characteristicRollLabel,
                                    characteristicFields (base max 60 ;
                                    PNJ : characteristicFieldsFor, base max 100),
                                    characteristicValueBounds (Actuelle 0 à 100),
                                    difficulties (huit niveaux, §5), weaponSkillDefaults,
                                    choix d'énumération, actorTypes, itemTypes,
                                    allowedItems, uniqueOnCharacter, uniqueItemActors.
module/dice/d100.mjs                Règles du D100, sans Foundry. Test : tests/d100.test.mjs.
module/dice/derived.mjs             Arrondis au supérieur, Endurance à 0. Test : tests/damage.test.mjs.
module/dice/attack.mjs              Tir visé et modificateurs de visée. Test : tests/d100.test.mjs.
module/dice/damage.mjs              Dégâts, Seuil, gravité, brèche au seuil. Test : tests/damage.test.mjs.
module/dice/skill-score.mjs         Score de compétence et caractéristique d'une arme.
module/dice/roll-dialog.mjs         DialogV2 : difficulté, modificateur, zone visée, Viser.
module/dice/chat.mjs                Roll 1d100, ChatMessage, gabarit templates/chat/roll-card.hbs.
module/dice/initiative.mjs         Classement d'initiative, sans Foundry. Test : tests/initiative.test.mjs.
module/dice/apply-damage.mjs        Bouton MJ, DialogV2, blessure, brèche, carte de résultat.
module/dice/endurance.mjs           Carte de CON quand l'Endurance passe à 0.
module/combat/initiative.mjs        Combat, Combatant, Combat Tracker : Vigilance, fin d'ordre, Sonné.
packs/                              Compendiums. JSON dans `_source/`, LevelDB construit à côté.
packs/build.mjs                     `compilePack` de l'outil officiel, un dossier source à la fois.
module/guards.mjs                   Hook preCreateItem : refuse un objet interdit, et un
                                    second origin / background / profession sur un personnage
                                    (y compris deux d'un coup dans le même appel).
tests/models.test.mjs               Validation des 21 modèles si FOUNDRY_PATH est défini.
module/data/fields.mjs              Constructeurs de champs (html, string, number, bool).
module/data/base-item.mjs           Description HTML commune. Substance et Logiciel s'arrêtent là.
module/data/person.mjs              Schéma commun Personnage et PNJ.
module/data/npc-migrate.mjs         PNJ étape 2 seulement (description + notes, sans biography).
module/npc-ready-migration.mjs      Une fois par monde (MJ actif, migrationVersion 2) : réécrit system.biography.
module/data/character.mjs           Personnage : étend PersonData, pas de migration.
module/data/actors.mjs              PNJ (migrateData), Créature, Synthétique, Drone, Véhicule. Le Vaisseau est réexporté.
module/data/ship.mjs                Vaisseau : type, catégorie, sections, postes. migrateData sans défauts injectés.
module/ships/hull.mjs               État d'un module et plaque affichée, sans Foundry. Test : tests/ship.test.mjs.
module/ships/migrate.mjs            station → fixed, ship → void ; ancien état de module retiré.
module/ships/types.mjs              Liste groupée des types de vaisseau (Réf. Vaisseaux v0.1 §2).
module/data/skill.mjs               Compétence. Le score n'est pas calculé.
module/data/weapon.mjs              Arme portative. Portée = palier short / medium / long.
module/data/armor.mjs               Armure/Vêtement.
module/data/gear.mjs                Équipement.
module/data/augmentation.mjs        Augmentation (genre : thérapie, prothèse, organe cultivé, héréditaire).
module/data/injury.mjs              Blessure.
module/data/provisional.mjs         Atout, Origine, Milieu, Profession, Séquelle, Module de vaisseau.
                                    Le module a une Intégrité et un état dérivé (plus de texte libre).
module/sheets/character-sheet.mjs   Feuille à onglets du Personnage et du PNJ (groupe main).
module/sheets/actor-sheet.mjs       Feuille générique des autres acteurs, objets groupés par type. Pas le vaisseau.
module/sheets/ship-sheet.mjs        Feuille du Vaisseau, quatre onglets. Dépôt d'un personnage sur un poste.
module/sheets/item-sheet.mjs        Une feuille pour tous les objets (formGroup sur le schéma).
                                    Module : champs d'arme ou de blindage selon la catégorie.
module/sheets/prepare-fields.mjs    Schéma → lignes de formulaire, valeurs lues dans _source.
module/sheets/item-list.mjs         Liste d'objets embarqués (créer, ouvrir, retirer).
templates/                          Gabarits. Pas de français en dur : {{localize}}.
lang/fr.json                        Tous les libellés, y compris TYPES.Actor et TYPES.Item.
styles/sol.css                      Préfixe .sol-nouvelle-ere uniquement.
README.md                           Présentation, périmètre, installation.
TESTER.md                           Scénario de test manuel de l'étape en cours.
docs/tests/etape-2.md               Scénario de l'étape 2, conservé.
docs/tests/etape-5.md               Scénario des dégâts (0.5.0 à 0.5.4), conservé.
CONTRIBUTING.md                     Ce guide.
```

`module/sol.mjs` est le seul fichier listé dans `esmodules`. Le gabarit est référencé par un chemin `systems/sol-nouvelle-ere/...` : le dossier installé dans Foundry doit porter cet identifiant.

## Ajouter un type

1. Clé anglaise dans `documentTypes` de `system.json`. Si le modèle a un `HTMLField`, son chemin (relatif à `system`, par exemple `"description"` ou `"effect"`) va dans `htmlFields`.
2. Classe `TypeDataModel` dans `module/data/`, une classe par type, ou la base commune si le type n'a que `description`.
3. L'enregistrer dans `CONFIG.Actor.dataModels` ou `CONFIG.Item.dataModels` (`module/sol.mjs`).
4. Ajouter la clé à `SOL.actorTypes` ou `SOL.itemTypes`, et mettre à jour `SOL.allowedItems` si l'objet n'est pas permis partout.
5. Libellé français dans `lang/fr.json` sous `TYPES.Actor` ou `TYPES.Item`, et les libellés de champs sous `SOL.*`.
6. Les feuilles génériques (`GenericActorSheet`, `GenericItemSheet`) reprennent les champs du schéma toutes seules. Le Personnage et le PNJ partagent `CharacterSheet` : un champ nouveau du schéma commun s'y place dans l'onglet qui convient.
7. Une ligne dans TESTER.md : créer le type, vérifier le libellé français, modifier un champ, rouvrir.

Les choix d'une liste (domaine, munition, genre d'augmentation, catégorie…) vivent dans `module/config.mjs`, valeurs anglaises (ou celles écrites dans la Fiche) et libellés = clés i18n. Pas de tableau de choix recopié dans un gabarit.

## Conventions de nommage

- **Clés de code en anglais** : `character`, `ship`, `talent`, `background`, `base`, `origin`, `advance`, `temp`, `value`. Pas d'accent ni d'espace dans une clé stockée. Les docs utilisent ces clés (`ship`, pas `starship` ; `talent`, pas `asset` ; `background` pour le Milieu).
- **Libellés en français via `lang/fr.json`** uniquement. Le code et les gabarits passent par `{{localize}}` ou par une clé (`SOL.Sheet.Person`, `TYPES.Actor.character`). On n'écrit pas de français en dur dans un `.mjs`, un `.hbs` ou un `.css` (les commentaires, si).
- **Caractéristiques et leurs bornes** : `SOL.characteristics`, `SOL.characteristicFields` et `SOL.characteristicValueBounds` dans `module/config.mjs`. Le modèle et la feuille lisent ces objets. Ne pas recopier `1`, `60`, `0`, `100`, `-10`, `15` dans le gabarit ni dans `defineSchema`.
- **Commentaires en français**, avec la source de la règle quand elle existe : `// Réf. LdR v0.2 §15`, `// Réf. Fiche v0.2 §4`. Un champ dont le type n'est pas écrit dans les docs porte `// À préciser : types non définis dans LdR v0.2`.
- Identifiant du système, scope de `registerSheet` et nom du dossier Foundry : `sol-nouvelle-ere`.
- Classes CSS de fenêtre : `sol`, `sol-nouvelle-ere`, puis `actor` / `item`.
- Les saisies lisent la source stockée (`document._source` pour le nom, `system._source` pour les champs du modèle), pas la valeur préparée. `value` des caractéristiques est la seule colonne dérivée, et ce n'est pas un input.

### Migration

Renommer ou supprimer une clé **déjà stockée** (une caractéristique, `base` / `origin` / `advance` / `temp`, un champ d'identité, un type de document) exige une méthode statique `migrateData(source)` sur le TypeDataModel. Sans elle, les fiches déjà créées gardent l'ancienne clé et affichent le défaut du nouveau nom.

Ajouter un champ avec une valeur `initial` ne demande pas de migration : Foundry complète les documents existants au chargement. C'est le cas des champs d'identité ajoutés à l'étape 2 sur le Personnage de l'étape 1, et des caractéristiques d'un PNJ de l'étape 2 (Base 25, les autres à 0) quand il passe au schéma partagé.

PNJ, étape 3 : `NpcData.migrateData` appelle `migrateNpcSource`. On ne recopie `description` dans `biography` que si la source a `description` et `notes`, et pas encore de clé `biography` (fiche étape 2). Une mise à jour partielle qui n'a que `description` ne crée pas de biographie. La clé `description` est toujours retirée de l'objet traité. `migrateData` ne réécrit pas à lui seul la base. Au chargement, `_initializeSource` a déjà migré `_source` : `description` n'y est plus. Au `ready`, le MJ actif force donc l'écriture de `system.biography` (`Actor.implementation.updateDocuments`, `diff: false`) pour les PNJ de `game.actors` qui ont une biographie. On n'efface pas `description` en base. Le réglage `migrationVersion` passe à 2 seulement si cette écriture réussit (le palier 1 ne réécrivait rien). `htmlFields` du PNJ dans `system.json` est `biography` et `notes`, et non plus `description`.

Bornes actuelles (`SOL.characteristicFields`) :

| Champ | Initial | Minimum | Maximum |
|---|---|---|---|
| `base` | 25 | 1 | 60 |
| `origin` | 0 | −10 | 15 |
| `advance` | 0 | 0 | 10 |
| `temp` | 0 | aucune | aucune |

Décision Marc 17/10/2026 : `base` du personnage plafonne à 60 (LdR v0.2 §9, 60 max avant origine). Le défaut reste 25. Décision Marc 18/10/2026 : la Base d'un PNJ va de 1 à 100 (`NpcData.characteristicFieldBounds`, `characteristicFieldsFor("npc")`). Le minimum reste celui du personnage.

`value` n'est pas un champ du schéma. `prepareDerivedData` la recalcule puis la borne avec `SOL.characteristicValueBounds` : `Math.clamp(base + origin + advance + temp, 0, 100)`. Les champs stockés ne sont pas modifiés par ce plafond. Décision Marc 17/10/2026.
Un `NumberField` hors bornes est **ramené silencieusement** à la borne la plus proche, sans message. Les `min` / `max` du HTML ne font que guider la saisie.

### Entiers et décimaux

Décision Marc 17/10/2026 : dégâts, quantités, protections, coûts et âge sont des entiers (`integer: true`). Un nombre avec `step: 1` arrondit déjà une décimale.

Entiers aussi, sans nouvelle décision : formation (0 à 60, borne écrite Fiche v0.2 §4) ; pénalités d'armure et de blessure ; bonus d'outils ; modificateur de tolérance aux g ; les quatre champs de caractéristique. La portée d'une arme n'est plus un nombre : c'est un palier (`short`, `medium`, `long`).

Décimaux, encore provisoires là où le commentaire le dit : gravité natale du personnage (pas sur l'objet Origine), masse, encombrement, munitions (`value` / `max`), réserve d'équipement (`value` / `max`), réserve d'air (heures).

La feuille passe `type="number"` à chaque nombre. Sans ça, un champ qui a un minimum et un maximum (la Formation) s'affiche en curseur plus une case.

## Carte des objets autorisés

`SOL.allowedItems` dans `module/config.mjs` est une liste d'autorisation par type d'acteur. Décision Marc 17/10/2026. Le hook `preCreateItem` s'en sert.

- `character` et `npc` : tous les objets sauf `shipModule`. Un seul `origin`, un seul `background`, une seule `profession` (`uniqueOnCharacter`, acteurs dans `uniqueItemActors`). Réf. Fiche v0.2 §4 pour le personnage.
- `creature` : `weapon`, `armor`, `injury`, `talent` (pas faits pour être équipés).
- `synthetic` : les objets du personnage sauf `origin`, `background`, `profession`, `substance`. Décision Marc 17/10/2026.
- `drone` : `weapon`, `armor`, `gear`, `software`, `injury`. Décision Marc 17/10/2026.
- `vehicle` : `weapon`, `armor`, `gear`, `software`. `ship` : les mêmes, plus `shipModule`. Inchangé.

Le hook compte aussi les objets du même appel (`createEmbeddedDocuments` avec deux Origines) : ils partagent `options`, et `actor.items` ne les contient pas encore. `seen.add` a lieu avant l'acceptation finale : si un autre hook refuse la première Origine, la deuxième du lot est quand même refusée (cas rare, accepté). Il ne voit pas les objets embarqués dans un acteur créé, dupliqué ou importé d'un bloc (seul `preCreateActor` est appelé). Il est ignoré si l'appelant passe `noHook: true`.

La gravité natale fait foi sur `character.identity.gravityNative`. L'objet Origine n'a pas ce champ (rien à migrer). La séquelle a une liste fermée `radiation` / `deconditioning` / `trauma` (LdR v0.2 §15) ; chaque séquelle reste un objet. La portée d'une arme est un palier, pas des mètres ; `migrateData` ramène un ancien objet `{ short, medium, long }` à `short`.

## Vaisseaux (0.7.0)

Décision Marc 21/10/2026. Réf. Vaisseaux v0.1, fichier `docs/regles-vaisseaux-v0.1.md`.

`module/ships/hull.mjs` ne charge pas Foundry. `tests/ship.test.mjs` s'en sert. L'état d'un module : non renseigné si le maximum est absent, nul ou négatif ; hors service si la valeur est 0 et que le maximum est positif ; intact au-dessus de la moitié ; dégradé à la moitié ou moins. Pas d'arrondi sur cette moitié. Le −20 est affiché, pas appliqué. La plaque affichée est la valeur stockée plus les points des modules `armor` de la section, sauf hors service et non renseigné. Un module dégradé garde tous ses points. Les radiateurs n'ont pas de plaque : la fiche ne montre pas d'Intégrité de section, seulement celle des modules `radiators` posés dans cette section. Le schéma de la section Radiateurs est vide. Si une source a encore `sections.radiators.integrity`, `migrateShipSource` retire la clé et pose `-=integrity`, sans créer `sections` quand le diff ne l'a pas.

`migrateData` ne touche une clé que si elle est déjà dans le diff. Décision Marc 21/10/2026 : `station` devient `fixed`, `ship` devient `void`. L'ancien `state` texte d'un module est supprimé, pas converti en Intégrité. `_preUpdate` ramène une valeur au-dessus de son maximum (Intégrité de module, Intégrité de section, plaque, delta-v) sans créer la paire si le diff ne l'a pas. Un token non lié lit le maximum absent sur l'acteur de base (`effectiveClampCurrent`), toujours sans l'écrire dans le diff. Une case numérique de module vidée est ignorée (`parsedNumber`) : elle ne devient pas 0. Le delta-v n'est pas un entier.

Les choix du type de vaisseau sont une carte plate dans le schéma (`SOL.shipTypes`). Les groupes du menu sont `SOL.shipTypeGroups`, rendus dans le gabarit. Ne pas mettre les groupes dans `choices` : la validation Foundry prendrait les noms de groupe pour des valeurs.

Le total au départ est dérivé (à vide + masse de réaction), pas stocké. La chaleur est un nombre 0 à 10. Un poste stocke un uuid. Vide : le score de l'équipage PNJ. Le glisser-déposer passe par `_onDrop`, pas `_onDropDocument`.

## Postes et combat spatial (0.7.1)

Réf. Vaisseaux v0.1 §1 et §3. `module/ships/combat.mjs` et `module/ships/post-skills.mjs` ne chargent pas Foundry. `tests/space.test.mjs` s'en sert.

L'état du combat est le réglage de monde `spaceCombat` (`module/ships/space-ui.mjs`, ApplicationV2). Ce n'est pas un document Combat : le tracker des personnages reste celui de l'initiative. Décision Marc 18/10/2026 : `module/ships/guard.mjs` refuse un vaisseau ou un véhicule dans ce tracker (`preCreateCombatant`, `return false`).

Ordre fixe des sept postes, premier vaisseau puis l'autre (`firstSide`). Un uuid vide est sauté. Fin de tour : bonus effacés, verrouillage conservé, poussée cochée ôtée du delta-v par le produit exact accélération × 60 s. On n'avance pas `game.time` et on ne change pas `CONFIG.time.roundTime` (5 secondes).

Le −20 d'un module dégradé reste un rappel, non appliqué au jet. Un tir de bord ne passe pas l'arme à `performRoll` : sinon la localisation des dégâts de personnage se lancerait. La carte dit « Touché (dégâts en 0.7.2) ».

Hors périmètre : dégâts localisés, dépressurisation et missiles en vol (0.7.2), chaleur, Pousser, réparations (0.7.3). Pas d'initiative de personnage pour les vaisseaux.

## Tester sous Foundry v14

Cible : FoundryVTT 14 (`compatibility.minimum` et `compatibility.verified` valent `"14"` dans `system.json`).

Avant de pousser du code, sans lancer Foundry :

```bash
node --check module/sol.mjs
node --check module/config.mjs
node --check module/guards.mjs
node --check module/data/fields.mjs
node --check module/data/base-item.mjs
node --check module/data/person.mjs
node --check module/data/npc-migrate.mjs
node --check module/npc-ready-migration.mjs
node --check module/data/character.mjs
node --check module/data/actors.mjs
node --check module/data/ship.mjs
node --check module/ships/hull.mjs
node --check module/ships/migrate.mjs
node --check module/ships/types.mjs
node --check module/ships/combat.mjs
node --check module/ships/post-skills.mjs
node --check module/ships/guard.mjs
node --check module/ships/space-ui.mjs
node --check module/data/skill.mjs
node --check module/data/weapon.mjs
node --check module/data/armor.mjs
node --check module/data/gear.mjs
node --check module/data/augmentation.mjs
node --check module/data/injury.mjs
node --check module/data/provisional.mjs
node --check module/sheets/prepare-fields.mjs
node --check module/sheets/item-list.mjs
node --check module/sheets/character-sheet.mjs
node --check module/sheets/actor-sheet.mjs
node --check module/sheets/ship-sheet.mjs
node --check module/sheets/item-sheet.mjs
node --check module/dice/d100.mjs
node --check module/dice/derived.mjs
node --check module/dice/attack.mjs
node --check module/dice/skill-score.mjs
node --check module/dice/roll-dialog.mjs
node --check module/dice/chat.mjs
node --check module/dice/damage.mjs
node --check module/dice/initiative.mjs
node --check module/dice/apply-damage.mjs
node --check module/dice/endurance.mjs
node --check module/dice/status-mods.mjs
node --check module/dice/breach-clock.mjs
node --check module/dice/breach-countdown.mjs
node --check module/dice/seal.mjs
node --check module/dice/seal-apply.mjs
node --check module/dice/seal-joints.mjs
node --check module/dice/state-status.mjs
node --check module/sheets/states.mjs
node --check module/data/armor-migrate.mjs
node --check module/combat/initiative.mjs
node --check tests/models.test.mjs
node --check tests/d100.test.mjs
node --check tests/damage.test.mjs
node --check tests/initiative.test.mjs
node --check tests/ship.test.mjs
node --check tests/space.test.mjs
node --input-type=module -e 'import {readFileSync} from "node:fs"; for (const f of ["system.json","lang/fr.json"]) JSON.parse(readFileSync(f, "utf8"));'
node tests/d100.test.mjs
node tests/damage.test.mjs
node tests/initiative.test.mjs
node tests/ship.test.mjs
node tests/space.test.mjs
node tests/models.test.mjs
```

`tests/models.test.mjs` instancie un document de chacun des 21 types et valide les défauts (`validate()` doit renvoyer `true`), avec un faux `game.i18n.localize` qui utilise `this` (le piège de la méthode détachée). Foundry n'est pas dans ce dépôt et on ne le télécharge pas : sans la variable `FOUNDRY_PATH` (dossier d'installation FoundryVTT), le script s'arrête tout de suite, code 0. Si `FOUNDRY_PATH` est défini mais que le code commun ne se charge pas, le script s'arrête avec le code 1. Exemple : `FOUNDRY_PATH=/chemin/vers/FoundryVTT node tests/models.test.mjs`.

Puis le scénario manuel de [TESTER.md](TESTER.md). L'étape 2 reste dans [docs/tests/etape-2.md](docs/tests/etape-2.md), l'étape 3 dans [docs/tests/etape-3.md](docs/tests/etape-3.md), l'étape 4 dans [docs/tests/etape-4.md](docs/tests/etape-4.md), les dégâts 0.5.0 à 0.5.4 dans [docs/tests/etape-5.md](docs/tests/etape-5.md), l'initiative 0.5.11 dans [docs/tests/initiative-0.5.md](docs/tests/initiative-0.5.md). Le message `Sol, Nouvelle Ère | Initialisation du système` confirme que `module/sol.mjs` a tourné.

## Jets (étape 4)

`module/dice/d100.mjs` ne charge pas Foundry. `tests/d100.test.mjs` se lance avec `node` seul. On n'y recopie pas une formule ailleurs : la feuille et `chat.mjs` appellent ces fonctions.

Score de compétence (`skill-score.mjs`, Réf. LdR v0.2 §4) : caractéristique actuelle + formation. Si `trainingRequired` et formation 0, moitié arrondie au supérieur quand `untrainedAllowed` est vrai, sinon le jet est refusé. Décision Marc 18/10/2026 : la moitié est calculée avant la difficulté. `SkillData.migrateData` recopie `specialized` dans `trainingRequired`.

Difficultés : `SOL.difficulties`, défaut `normal`. Le total difficulté + modificateur libre est borné à ±50 (`cappedModifier`). Le score visé n'est pas reborné. Décision Marc 18/10/2026.

Décision Marc 18/10/2026 : 18 % de critiques par jet (01–05, 96–00, doubles 11–88), voulu.

Arme : `weapon.system.skill` est le nom d'une compétence de l'acteur (casse ignorée). Sinon `SOL.weaponSkillDefaults` (Armes de poing et d'épaule → COO, Corps-à-corps → FOR), et ces compétences ne sont pas (F). Réf. LdR v0.2 §15 : nom vide ou inconnu, on lance quand même sur la caractéristique. Décision Marc 20/10/2026 : ce nom ne dit pas tir ou corps-à-corps, le repli est COO. Le dé n'est affiché que si `equipped` est vrai. Sans tir visé, réussite : localisation par inversion des chiffres. Avec un tir visé qui touche, la zone est celle choisie (visière = tête, drapeau `visor`). Dégâts = dégâts de l'arme + DR. Une réussite critique ne choisit pas la zone. La fenêtre d'arme ajoute « Zone visée » et « Actions de visée » (`AIM_MODIFIERS`, seulement Viser : +10 par action, max +30). Ces termes entrent dans le plafond ±50.

`performRoll` (`chat.mjs`) ouvre `DialogV2.wait`. Annuler ne lance pas le dé. Le modificateur libre est un entier (`step="1"`, `Math.trunc`). Décision Marc 18/10/2026. Le dé est `new Roll("1d100")`, puis `ChatMessage.create` avec `rolls`, `sound: CONFIG.sounds.dice`, `ChatMessage.getSpeaker({ actor })` et `flags["sol-nouvelle-ere"]` (type, score visé, dé, réussite, critique, DR, DE, zone, dégâts = arme + DR, libellé). Le gabarit est `templates/chat/roll-card.hbs`. Une réussite d'arme y ajoute le bouton « Appliquer les dégâts ». Les cartes déjà postées en 0.4 n'ont pas ces drapeaux dans le HTML : pas de bouton.

Visibilité (foundryvtt#8856) : en v14 le réglage client est `core.messageMode`. On appelle `ChatMessage.applyMode(data, mode)` (il modifie `data`) et on garde cet objet, sans utiliser la valeur renvoyée. Sans mode, le réglage du client. `game.settings.get("core", "rollMode")` lève, le réglage n'est plus enregistré. En v13, si `applyMode` est absent et que `game.settings.settings.has("core.rollMode")`, on appelle `ChatMessage.applyRollMode` de la même façon. `mapMessageMode` traduit les clés (`publicroll`/`public`, `gmroll`/`gm`, `blindroll`/`blind`, `selfroll`/`self`) : sans ça, `public` en v13 part en chuchotement aux MJ. Un appelant peut passer `messageMode` ou `messageOptions`. `foundry.utils.mergeObject` fusionne `messageOptions` : `speaker`, `rolls`, `content` et `sound` du système gagnent, les drapeaux d'un autre scope restent.

Pour ajouter un type de jet : calculer un score (helper existant, ou nouveau fichier sans Foundry s'il y a une formule), ajouter un bouton `data-action`, appeler `performRoll`. Une difficulté nouvelle se déclare dans `SOL.difficulties` et `lang/fr.json`, pas dans le gabarit. Une ligne nouvelle sur la carte se prépare dans `chat.mjs` et s'affiche dans `roll-card.hbs`. Ne pas dupliquer `resolveD100`.

## Dégâts (étape 5)

`module/dice/damage.mjs` ne charge pas Foundry. `tests/damage.test.mjs` se lance avec `node` seul. Réf. LdR v0.2 §7.

Dégâts nets = (dégâts de l'arme + DR) − somme des `protection[zone]` des armures **équipées**. Décision Marc 18/10/2026 : les couches s'additionnent. Réf. LdR v0.2 §7 : nets ≤ 0, pas de blessure, mais brèche possible. Aucun acteur n'a d'armure par zone hors objets `armor`. Une protection stockée en chaîne numérique (« 3 ») est convertie. Décision Marc 20/10/2026 : visière, on additionne d'abord la protection de tête des couches équipées, puis une seule division par 2, arrondie au supérieur (`visorHeadProtection`, 1 + 3 → 2).

Seuil = `ceil((FOR + CON) / SEUIL_DIVISOR)` sur les valeurs actuelles, avec `SEUIL_DIVISOR = 20`. Réf. LdR v0.2 §3. Exemple du LdR v0.2 §7 : carabine 10 + 2 DR, renforcée (torse 3, seuil 8), FOR 30 CON 40 → SB 4, nets 9, critique, brèche car 12 > 8. Gravité : < SB légère, SB à 2 SB − 1 grave, 2 SB à 3 SB − 1 critique, ≥ 3 SB mortelle. Un Seuil inférieur à 1 n'écrit pas de blessure. La brèche s'applique quand même.

Décision Marc 18/10/2026 : créature, synthétique et drone ont FOR, CON et PER, le même schéma que le PNJ (`characteristicSchema`, Base jusqu'à 100, Actuelle bornée 0 à 100). Pas les six autres caractéristiques. Leur feuille affiche ces trois lignes, le Seuil, et le jet (même action que le personnage). Ils reçoivent la blessure standard. À confirmer par Marc : blessures propres aux machines (synthétique, drone) à définir. Véhicule et vaisseau n'ont toujours pas de caractéristiques : l'application est refusée. Pas de `migrateData` pour PER : le `initial` du schéma suffit, comme pour FOR et CON.

Pas de `migrateData` pour ces FOR/CON. Un diff client passe par `migrateData` avant le nettoyage (v13 `client-backend.mjs` l.207-214, toujours le cas en v14). Y poser les défauts écraserait une Force déjà saisie lors d'une mise à jour de la description. Le nettoyage du schéma (`initial`) complète une fiche ancienne qui n'a pas encore ces champs, et un `cleanData` partiel ne les ajoute pas. Les autres `migrateData` ne transforment que si l'ancienne clé est dans la source : `specialized` → `trainingRequired` (compétence), portée objet → `short` (arme). Le PNJ ne copie `description` vers `biography` que si les deux clés `description` et `notes` sont là et que `biography` n'y est pas. Aucune de ces migrations n'injecte un défaut sur un diff qui ne contient pas l'ancien champ.

Gravité : < SB légère (−10), SB à 2 SB − 1 grave (−20, `bleeding`), 2 SB à 3 SB − 1 critique, ≥ 3 SB mortelle. Décision Marc 18/10/2026 : critique et mortelle n'ont pas de pénalité chiffrée. La conséquence est écrite dans `description`. Le MJ et les joueurs réagissent à la main.

Brèche, Réf. LdR v0.2 §7 : une armure pressurisée équipée qui couvre la zone est percée quand les dégâts **bruts** dépassent `breachThreshold`, même si les nets sont ≤ 0. Égal au seuil : pas de brèche. Pas de seuil (`null`, pas 0) : pas de brèche. Pas d'usure. `resolveBreaches` renvoie une entrée par armure (`id`, `threshold`, `breached`, `zone`, `visor`). Seule l'armure dont le seuil est dépassé passe à `sealState: breached`. Décision Marc 20/10/2026 : visière, le seuil de tête de chaque couche équipée est divisé par 2, arrondi supérieur, et la brèche est vérifiée couche par couche (pont : 5 → 3, seuil 12 → 6). Les seuils ne s'additionnent pas. À confirmer par Marc : la zone est couverte dès que la clé existe, y compris à 0. La condition `sol-nouvelle-ere.suitBreach` est enregistrée dans `CONFIG.statusEffects` (`name` = clé i18n `SOL.Status.suitBreach`, `img` = `icons/svg/hazard.svg`). `init` tourne avant les traductions : on n'appelle pas `localize` à l'enregistrement.

Horloge, Réf. LdR v0.2 §7 : `breachClock` (5 × 60 s, puis + 2 × 60 s). Le MJ actif pose le drapeau `breachClock.startedAt` sur `game.time.worldTime` quand la condition apparaît (`createActiveEffect`), et le retire quand elle part. `updateWorldTime` (`https://foundryvtt.com/api/v14/functions/hookEvents.updateWorldTime.html`) fait avancer. `CONFIG.time.roundTime` vaut 5 (un tour ≈ 5 s, LdR) : à 0 le temps du monde ne bouge pas en combat. Les jetons non liés ne sont pas dans `game.actors`. `collectClockUuids` retient leur uuid (`Scene.<id>.Token.<id>`), le réglage monde `breachClocks` le garde, et `tick` résout avec `fromUuid`. À 5 minutes : statut cœur `unconscious` et message au MJ. À 7 minutes : `CONFIG.specialStatusEffects.DEFEATED`, sinon `dead`, et message au MJ. Décision Marc 20/10/2026 : la mort est appliquée d'office. Retirer ce statut à la main l'annule : `breachClock.death` reste vrai, `advance` ne le repose pas. Le rappel de réserve d'air est du texte. La fiche affiche le temps restant tant que la condition est là. Décision Marc 20/10/2026 : retirer ou déséquiper l'armure ne coupe pas l'horloge. Le bouton « Arrêter le compte à rebours » (MJ, fiche et message) pose `stopped: true`. `ensureClock` et `advance` ne relancent pas tant que ce drapeau est là et que le statut reste. Retirer le statut efface le drapeau entier, pour qu'une brèche suivante reparte de zéro.

Réf. LdR v0.2 §11 : une blessure grave pose aussi la condition `sol-nouvelle-ere.bleeding` (`name` = `SOL.Status.bleeding`, `img` = `icons/svg/blood.svg`) si elle n'est pas déjà active. L'Endurance (−1 par tour) n'est pas automatisée.

Les effets de zone (inconscience, objet lâché, mouvement / 2, réserve d'air) sont du texte sur la carte de résultat. Le saignement (−1 Endurance par tour) n'est pas automatisé. Décision Marc 18/10/2026 : la fin d'ordre suit la case `endOfOrder` de la blessure, cochée à la création si grave ou pire. `activeRoundOne` reste décochée pour une blessure née pendant le combat. Au démarrage, une blessure déjà là ne compte que si les deux cases sont cochées. À confirmer par Marc : le rappel « réserve d'air » n'apparaît que si une blessure est créée. La fenêtre d'application montre la zone de la carte (dé inversé, ou zone visée), l'armure, les nets, le Seuil, la gravité, le seuil de brèche et la brèche.

Bouton : `renderChatMessageHTML` retire le bouton si `game.user.isGM` est faux, et le handler le revérifie. Cibles : `game.user.targets`, sinon `canvas.tokens.controlled`. Déduplication par `token.actor.uuid` : deux jetons liés du même acteur ne comptent qu'une fois ; deux jetons non liés du même acteur de base sont chacun touchés. Aucune : avertissement. `DialogV2.wait` montre zone, dégâts bruts, armure, nets, Seuil, gravité, brèche. Annuler n'écrit rien. Confirmer crée la blessure, met à jour les joints, pose les conditions, poste `templates/chat/damage-card.hbs`. Si au moins une cible a réussi, le message d'attaque reçoit le drapeau `applied`. Le bouton affiche alors « Dégâts déjà appliqués » (le HTML stocké date du jet : le texte est mis à jour dans le hook). Un nouveau clic ouvre un `DialogV2` « Dégâts déjà appliqués, recommencer ? ». Annuler cette question n'écrit rien. Une fenêtre de dégâts annulée ne pose pas le drapeau. La carte reprend `whisper` et `blind` du jet. Grave : bouton de test de VOL. Critique : test de CON. Les deux passent par `performRoll`, avec `characteristicRollLabel` (`abbr` et `label`, jamais l'objet). Le bouton n'est visible et utilisable que par le propriétaire de la cible (`fromUuidSync(uuid)?.isOwner`) ou le MJ. Un double clic est ignoré le temps que la fenêtre est ouverte.

## Initiative glissante (0.5.10)

Réf. LdR v0.2 §7. Décision Marc 18/10/2026 : les réussites passent avant les échecs ; parmi les échecs, le moins de DE joue d'abord ; une égalité de degré se départage à la RÉF, puis au score de Vigilance (réussites et échecs), puis à l'identifiant. Une réussite critique passe avant une réussite normale du même DR. Un échec critique ne change pas le rang. Aucun bonus lié à la place.

`module/dice/initiative.mjs` ne charge pas Foundry. `tests/initiative.test.mjs` se lance avec `node` seul.

Cause du plantage « Unresolved StringTerm undefined » : `system.json` n'a pas de clé `initiative`, et [`CONFIG.Combat.initiative.formula`](https://foundryvtt.com/api/v14/variables/CONFIG.Combat.html) vaut `null`. `Combatant._getInitiativeFormula` fait `String(formula || game.system.initiative)`, donc la chaîne `"undefined"`. `Roll` en fait un StringTerm. On ne met pas une formule de dés dans le manifeste. `registerInitiative` pose `formula` à `"0"` seulement comme garde-fou, et `SolCombat.rollInitiative` fait le D100.

Score : objet compétence `SOL.vigilanceSkill` (`"Vigilance"`) via `skillScore`. Sans l'objet, Vigilance n'est pas (F) : PER actuelle, pas la moitié (LdR v0.2 §4). Décision Marc 18/10/2026 : créature, synthétique et drone ont une PER (bornes du PNJ, `initial` du schéma, pas de `migrateData`). Ils testent Vigilance sur cette PER. Plus d'avertissement « test à 0 ». Le jet passe par `performRoll`. Un seul combattant, ou « se replacer », ouvre la fenêtre. Plusieurs d'un coup (`rollAll`, `rollNPC`, qui appellent `rollInitiative`) : difficulté Normale, sans fenêtre. Décision Marc 18/10/2026.

Encodage de `Combatant.initiative` (tri décroissant du cœur). Cases, de la plus significative à la moins : réussite ou échec (`INITIATIVE_SUCCESS_BASE` = 202_000_000), degré (`INITIATIVE_DEGREE_SLOT` = 202_000), réussite critique seulement (`INITIATIVE_CRIT_SLOT` = 101_000), RÉF (`INITIATIVE_REF_SLOT` = 1_000), score de Vigilance (0 à 999). L'écart minimum entre deux rangs différents est 1 : le pas d'un recul (0,001) y tient. Le plus gros échec (0 DE, RÉF 100, score 999) vaut 201_898_999, sous la plus petite réussite. Décision Marc 18/10/2026 : un DR, un DE ou un score au-dessus de 999 est ramené à 999. L'égalité qui reste se départage par identifiant (`(bv - av) || (a.id > b.id ? 1 : -1)`). À confirmer par Marc : sans RÉF (créature, synthétique, drone), le départage vaut 0.

Types qui combattent : `character`, `npc`, `creature`, `synthetic`, `drone`. `vehicle` et `ship` : avertissement `SOL.Initiative.notAllowed`, pas d'exception. Décision Marc 18/10/2026 : ils restent hors initiative (le pilote ou l'équipage agit). À revoir avec le combat spatial.

L'ordre n'est pas relancé. Une blessure créée avec `endOfOrder` coché, ou la condition `sol-nouvelle-ere.stunned` (`SOL.Status.stunned`, icône `icons/svg/daze.svg`), pose le drapeau `deferEnd`. Sonné ajouté à un effet déjà là : `preUpdateActiveEffect` ne tourne que chez le demandeur, et un joueur n'est pas le MJ actif. On y pose `options.solStunnedAdded` si le statut n'y était pas. `updateActiveEffect` tourne sur tous les clients et appelle `flagStunned` quand la marque est là. `createActiveEffect` couvre un effet nouveau. `isActiveGM` est réservé à ces hooks. Une action directe utilise `isGM` : `apply-damage`, et le menu. Décision Marc 18/10/2026 : retirer Sonné n'annule pas une fin d'ordre déjà marquée. Décision Marc 18/10/2026 : posé avant le combat, il envoie en fin d'ordre dès le round 1. `markDeferEnd` ne fait rien tant qu'il n'y a pas de combat. `startCombat` (MJ actif, avant `super`) écrit la fin d'ordre de ceux qui ont déjà une initiative (Sonné, ou blessure avec les deux cases). Initiative encore vide : drapeau `deferEnd`, sans nombre fictif. `resolveDeferred` ne leur invente pas un nombre et ne retire pas le drapeau tant que l'initiative n'est pas un nombre fini. Un drapeau de combat `stunnedStart` empêche le secours de `_onStartRound` de les reculer une seconde fois. À confirmer par Marc : hors du combat en cours, on ne pose pas le drapeau.

Cause de l'absence de Sonné dans le HUD (build 369) : c'était le seul statut inséré avec une `description`. Saignement et Combinaison percée, `{id, name, img}` seuls, apparaissaient. En v14, `CONFIG.statusEffects` est un objet indexé par id ([issue 13122](https://github.com/foundryvtt/foundryvtt/issues/13122), compatibilité tableau jusqu'en v16). Un `push` ne met pas à jour la vue par id que le HUD lit (`Object.values`, constaté aussi dans SR5 #1960). `TokenHUD#_getStatusEffectChoices` saute `hud === false`. `registerHudStatus` assigne `effects[id] = {id, name, img, hud: true}` d'abord, pousse seulement si l'itérateur ne voit pas encore l'id, puis pose `description` sur l'objet stocké. Le `ready` traduit cette description (`SOL.Status.stunnedHint`) : « Pas d'action ce tour, réaction possible ; posé avant le combat, envoie en fin d'ordre dès le round 1. » `name` reste une clé : `init` est avant les traductions.

Les déplacements reportés (fin d'ordre, reculs, `pendingInitiative`) partent dans `nextRound`, avant `super`, quand le client est le MJ actif : une seule écriture, `{ combatTurn: this.turn, turnEvents: false }`, drapeaux retirés en même temps. L'ancien premier n'est pas réactivé. Si c'est un joueur qui passe le round, `_onStartRound` ([doc v14](https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html), MJ désigné, après l'écriture) applique la même fonction, sans `turnEvents: false`. Les drapeaux sont déjà retirés : le second passage est vide. Sans MJ connecté, Foundry n'appelle pas `_onStartRound` : les déplacements attendent son retour. Réf. LdR v0.2 §7 : plusieurs départs le même round gardent leur ordre relatif. Si tout le monde part, rien ne change. Décision Marc 18/10/2026.

Menu du tracker, v14 ([`ContextMenuEntry`](https://foundryvtt.com/api/v14/interfaces/foundry.ContextMenuEntry.html)) : `label`, `visible`, `onClick(event, target)`. Pas de `name` à côté de `label`. `condition` lève pendant `ContextMenu#renderEntries` (« ContextMenuEntry#condition is deprecated », build 369). v13 : `name`, `condition` et `callback`. « Interrompu : recule d'une place » (tout MJ). « Se replacer » : `canReposition`, combat commencé, combattant actif, propriétaire ou MJ. Décision Marc 18/10/2026 : il sacrifie le mouvement (`SOL.Initiative.sacrificed`), pas l'action, et comme il est actif le nouveau rang part au round suivant. « Surpris » (tout MJ) bascule le statut `sol-nouvelle-ere.surprised`. Le statut est la marque, visible dans le HUD ; le menu est le chemin dans le tracker. Réf. LdR v0.2 §7, ligne 158.

`Combatant._preUpdateOperation` suit le combattant actif. Décision Marc 18/10/2026 : `interruptTiming` reporte le recul (`deferStep`) quand l'index est inférieur ou égal à `combat.turn`. Sinon le recul est immédiat, avec `{ combatTurn }`. Deux nombres différents ne s'échangent pas : le suivant entrerait dans le groupe d'égalité de ceux qui précèdent, et le tri par id le remonterait. On les pose juste sous la valeur actuelle (`current - pas`, `current - 2 pas`). Déjà dernier, on ne fait rien. À nombre égal, on n'écarte que ce groupe d'une place. À confirmer par Marc : déjà dernier, rien ; à initiative égale, une seule place dans le groupe. Le départage d'égalité est celui du cœur, par code de caractère, pas `localeCompare`. Les reculs reportés sont appliqués sur une copie figée des ids, de la fin vers le début. `repositionPlacement` regarde l'index actuel et l'index du nouveau jet. Actif ou déjà joué : `pendingInitiative`, posé au round suivant. Décision Marc 18/10/2026. Pas encore joué, mais le nouveau rang tombe sur le tour actif ou avant : au round suivant aussi. À confirmer par Marc : ce second cas (Relancer, d20, Tout lancer). Sinon écriture immédiate, et `{ combatTurn }` garde l'index. « Relancer », le d20 et « Tout lancer » sur un combattant qui a **déjà** une initiative suivent cette règle (`isLikeReposition` : round commencé, un seul id, `Number.isFinite(initiative)`). Un premier jet (initiative encore `null` : arrivée en cours de round, ou le dernier sans initiative de « Lancer les PNJ » / « Tout lancer ») est écrit tout de suite. On ne fige pas l'index : le combattant qui avait le tour le garde (`preserveActive`). Sonné ne retire pas l'action : le texte est un rappel.

Surprise, round 1 : `_onStartTurn(combatant, context)` ([doc v14](https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html#_onStartTurn), MJ actif) lit `surprisedTurnIndex`. Si le courant est surpris, un seul `update({ turn })` va au prochain qui ne l'est pas. Le dernier surpris, ou tout le monde surpris, appelle `nextRound`. On n'appelle pas `nextTurn` depuis ce hook. La marque est retirée une seule fois, dans `_onStartRound` quand le round est déjà ≥ 2 (MJ actif). `nextRound` ne rappelle pas `clearSurprise`. Sans MJ connecté, le tour n'est pas sauté.

`rollInitiative` avec `updateTurn: false` passe aussi `{ combatTurn: this.turn }`. La carte de Vigilance reçoit `messageMode` et `messageOptions`. Un combattant `hidden` force le mode `gm` (chuchoté aux MJ). Le tracker (`_prepareTurnContext`) affiche `flags.sol-nouvelle-ere.rank` (« 2 DR · RÉF 57 », « 2 DR crit. · RÉF 57 », « 3 DE ») seulement si `Number.isFinite(combatant.initiative)`. Effacer l'initiative ou taper un nombre à la main retire `rank` dans `SolCombatant._preUpdate`. `resetAll` du cœur (v13 : `Combat.update({combatants}, {diff: false})`) n'appelle pas `_preUpdate` : `SolCombat.resetAll` retire `rank` et `pendingInitiative` et pose `deferStep` et `deferEnd` à false avant `super`. La suppression de clé est `foundry.data.operators.ForcedDeletion` ([doc v14](https://foundryvtt.com/api/v14/classes/foundry.data.operators.ForcedDeletion.html), `-=` déprécié jusqu'en v16) avec repli `-=` si l'opérateur est absent. Une écriture du système (`solInitiativeWrite`, ou une écriture qui pose `rank`) garde le rang : recul et fin d'ordre ne l'effacent pas. Avec l'objet Vigilance, le score est `skillScore` (PER + formation).

## Endurance à 0 (0.6.0)

Réf. LdR v0.2 §3 et §11. Champ `endurance` nullable, `initial: null`, pas de `migrateData`, sur Personnage, PNJ, créature, synthétique et drone. Décision Marc 19/10/2026 : un nombre, pas `{ value, max }` du §15. `resolveEndurance` : null ou undefined prend `ceil(CON/5)` ; 0 reste 0. Le MJ actif écrit ce remplissage au `ready` seulement (option `solFillEndurance`), et seulement si `foundry.utils.isNewerVersion("0.6.1", actor._stats.systemVersion ?? "0")` : fiches d'avant la 0.6.1. Pas dans `createActor` : une CON par défaut écrirait 5, puis la fiche montrerait 5/8 après une CON à 40. Une valeur déjà stockée, sur une fiche récente, n'est pas réécrite. Tant que le champ est vide, l'affichage lit déjà le maximum : une fiche neuve commence pleine dès que la CON est posée. Ce remplissage ne propose pas le test. `preUpdateActor` retient la valeur d'avant. `updateActor`, seulement chez l'auteur, appelle `enduranceZeroOffer`. Passage à 0 : drapeau `enduranceZeroOffered` puis une carte. Rester à 0 ne la reposte pas. Repasser au-dessus de 0 retire le drapeau. Créer une fiche déjà à 0 ne poste pas (ce n'est pas un `update`). Bouton : propriétaire ou MJ, test de CON via `performRoll`. La résolution est le drapeau d'acteur `enduranceCards` (le joueur ne peut pas `setFlag` une carte créée par le MJ). `pruneResolvedCards` retire les ids de messages qui n'existent plus et garde celui qu'on vient d'écrire. Le jet et **Ignorer** relisent ce drapeau avant d'écrire : un second clic ne relance pas. Réussite : `sol-nouvelle-ere.exhausted`. Échec : statut cœur `unconscious`. Ignorer ne pose aucun statut. Décision Marc 20/10/2026 : le −20 d'Épuisé passe par `statusRollModifiers` et entre dans `cappedModifier` avec la difficulté, le modificateur libre, le tir visé et Viser. La fenêtre et la carte l'affichent. À confirmer par Marc : l'Atout qui dispense du test n'est pas joué.

Case « Envoie en fin d'ordre » : sur la ligne de la section Blessures (pas de `name`, `data-action` écrit `system.endOfOrder`) et dans la fenêtre de l'objet. `injuryDefer` est la liste des ids. La cocher ajoute cet id ; la décocher retire cet id seulement, même s'il reste d'autres cases cochées. Le MJ actif écrit, y compris quand c'est un joueur qui a coché. `preUpdate` pose `solEndOfOrderWas`. S'il n'arrive pas, `endOfOrderWas` relit la présence de l'id dans la liste. Les écritures d'un même acteur sont enchaînées. Un booléen `true` hérité de la 0.6.1 compte encore une fois. `deferEnd` (Sonné) n'est pas effacé par cette case. Au passage de round, l'un ou l'autre envoie en fin d'ordre, puis la liste est vidée (`[]`). La case peut rester cochée : elle ne renvoie pas une seconde fois tant qu'on ne la décoche pas et qu'on ne la recoche pas.

Armure : `equipped` part à `true`. Décision Marc 20/10/2026 : équipée par défaut au glisser-déposer. Un `false` déjà stocké reste `false`. La case est sur la ligne d'armure. Seules les pièces équipées comptent pour la protection, le seuil, la pressurisation et la réserve d'air.

Rustine : `SOL.sealMethods`, première entrée `{ id: "patch", name: "Rustine" }`. Bouton Colmater sur l'équipement dont le nom correspond et dont la quantité est au moins 1. Au calme : pas de test. Sous le feu : `performRoll` sans choix préparé. Décision Marc 20/10/2026 : sous le feu, Survie, pas « Systèmes de survie », par l'id de compendium `SOL.sealSkillId` (`Hs6fnCes2ZtRhEJK`), pas par le nom. La fenêtre liste les compétences de la fiche, Survie présélectionnée si `_stats.compendiumSource` ou `flags.core.sourceId` s'y termine. Difficulté normale, le MJ peut changer la compétence et la difficulté. « Test simple » du LdR s'oppose au test prolongé, ce n'est pas la difficulté Aisée. Réussite : condition retirée, horloge effacée, joints équipés encore `breached` repassent `intact`, quantité − 1, message au MJ. Décision Marc 20/10/2026 : un échec ne consomme pas l'objet. Décision Marc 20/10/2026 : le propriétaire peut ouvrir la fenêtre, pas seulement le MJ.

Joints à la main, `module/dice/seal-joints.mjs`. Décision Marc 20/10/2026 : une armure non pressurisée n'a pas de joints étanches. Le champ est grisé (« Sans effet : armure non pressurisée ») et passer à `breached` ne pose rien. Équipée et pressurisée : `breached` pose `sol-nouvelle-ere.suitBreach` (le MJ actif, y compris sur un jeton non lié), ce qui lance l'horloge et le message de départ. Décision Marc 20/10/2026 : `intact` à la main est un outil du MJ. Sur la dernière de ces armures, ça appelle `repairBreach` (colmatage, sans Rustine ni test). Les règles de réparation viendront plus tard. L'option `solSealApply` évite que cette écriture, et l'écriture des dégâts, relancent le hook une fois par couche. Un verrou `starting` et `shouldPoseSuit` empêchent un second statut et un second message.

Section États : `presentStatuses` lit `actor.statuses` et les effets qui ne sont pas `disabled`. Déposer une page (ou un journal d'une seule page) du pack `states` lit `flags.sol-nouvelle-ere.statusId` et appelle `toggleStatusEffect`. Pas de statut dans `CONFIG.statusEffects` : notification, rien d'inventé. Hypoxie, Exposé, Irradié, Condamné, Sous accélération, Choqué et Ancré / Flottant / En vol n'ont pas de statut.

Épuisé et les autres malus de statut : un seul module, `module/dice/status-mods.mjs`. Ne pas en disperser un second.

Arrondis au supérieur, Réf. LdR v0.2 §2 : SB `(FOR+CON)/20`, Endurance `CON/5`, tolérance aux g `CON/20`, Sang-froid `VOL/5`, moitié sans formation, visière `/2`. La dizaine du DR et du DE reste `Math.floor` : le LdR dit qu'elle se lit directement. `Math.trunc` du modificateur libre et le pas d'un recul d'initiative ne sont pas des divisions de règle.

## Compendiums (étape 5, contenu 0.5.1, armures 0.6.0, États et Blessures 0.6.2)

Déclarés dans `system.json`, format v14 [`PackageCompendiumData`](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageCompendiumData.html) : `name`, `label`, `path`, `type`, `system`. Le `path` est un dossier dont le nom est le `name`. `system` est obligatoire pour les Items ; on le met aussi sur le journal et les tables.

`ownership` n'est pas un champ de cette interface v14. La visibilité est le défaut du cœur (joueur : Observer, le pack est visible). On ne l'invente pas dans le manifeste. Le MJ peut la changer ensuite par le menu du compendium (`CompendiumCollection#configure`).

[`PackFolderData`](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackFolderData.html) : `name`, `sorting` (`m`), `color`, `packs`, `folders`. Trois dossiers : Objets, Journal, Tables. Les libellés ne passent pas par l'i18n : ils sont déjà en français. Les dossiers ne sont créés qu'une fois par monde : un monde déjà ouvert peut garder l'ancienne disposition tant que le réglage `core.compendiumConfiguration` n'est pas vidé.

La source lisible est `packs/_source/<pack>/*.json` (un document par fichier, `_id` stable, `_key` `!items!<id>`). Foundry lit le LevelDB `packs/<pack>/`, produit par l'outil officiel :

```bash
npm install --no-save @foundryvtt/foundryvtt-cli
node packs/build.mjs
```

`packs/build.mjs` appelle `compilePack` pour chaque dossier de `packs/_source`. On commit les JSON et le LevelDB (CURRENT, MANIFEST, `.ldb`, `.log` de la base). On ne commit pas `LOCK`, `LOG`, `LOG.old` (voir `.gitignore`) : Foundry les recrée. `.gitattributes` marque `packs/**` en `binary` pour que `autocrlf` sous Windows ne réécrive pas CURRENT, MANIFEST, `.ldb` ni `.log`. `binary` pose aussi `-diff` et `-merge`, que `text` ne retire pas. Les lignes suivantes rétablissent le texte : `packs/_source/** text eol=lf diff merge` et `packs/build.mjs text eol=lf diff merge`.

Rempli depuis le LdR v0.2, sans valeur inventée : Compétences (§4, une entrée par spécialité listée), Origines, Milieux, Professions (§9), Armes et Armures (§7), Rustine dans Équipement (§7), Blessures (une par gravité, plus des entrées de machine marquées à confirmer), États (journal, une page par état du §11). Décision Marc 20/10/2026 : la page Hypoxie aligne le §11 sur le §8 (stade 1 : −10, stade 2 : −20, stade 3 : inconscience). Ce n'est pas un statut. Les blessures grave, critique et mortelle ont `endOfOrder: true`, y compris les repères de machine ; la légère ne l'a pas. Le texte qui n'a pas de champ va dans `description`. Les champs non écrits restent au défaut du modèle. L'armure de pont stocke la réserve d'air pleine : 0,5 / 0,5 h. Vides : Atouts, Augmentations, Substances, Logiciels, Modules de vaisseau, Séquelles, Univers et factions, Tables. Les tables du §15 (localisation, séquelles de radiation) ne sont pas créées. Le journal États a `_key` `!journal!<id>`. `_stats.systemVersion` des packs Équipement (Rustine), Blessures et États est 0.6.2. On ne reconstruit un pack LevelDB que dans un dossier vidé : `compilePack` sur un dossier déjà ouvert change de génération.

Les milieux et les professions citent des noms de compétences parentes qui n'existent dans le compendium que comme spécialités : Pilotage, Réacteurs et propulsion, Médecine, Sciences de la vie, Sciences physiques. « Sciences (au choix) » (milieu Élite académique) ne correspond à aucune entrée. C'est fidèle au LdR : on ne réécrit pas ces listes. L'automatisation future des bonus devra les résoudre.

Ajouter un objet (Marc, dans Foundry) : ouvrir le compendium, le déverrouiller, créer l'objet ou le glisser, reverrouiller, puis `fvtt package unpack` vers `packs/_source/<pack>` pour que le JSON suive. Ajouter un objet (agent) : un JSON de plus dans `packs/_source/<pack>/`, puis `node packs/build.mjs`. Ne pas inventer un champ que le LdR ne donne pas.

## Feuille à onglets (étape 3)

`CharacterSheet` est enregistrée pour `character` et `npc`. `static TABS.main` décrit Principal, Inventaire et Roleplay. `tabGroups = { main: "principal" }` est la valeur de départ ; `changeTab` la remplace, donc un rendu après une saisie garde l'onglet. Chaque onglet est une part dont la racine a `class="tab {{tab.cssClass}}"`, `data-group="main"` et `data-tab`. L'en-tête est une part à part, toujours visible. Le gabarit de navigation est celui du cœur : `templates/generic/tab-navigation.hbs`.

## API Foundry utilisées (v14)

Documentation officielle, version 14 :

- [TypeDataModel](https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html) — `defineSchema`, `prepareDerivedData`
- [NumberField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.NumberField.html), [StringField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.StringField.html), [HTMLField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.HTMLField.html), [SchemaField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.SchemaField.html)
- [ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html) et [ItemSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ItemSheetV2.html)
- [HandlebarsApplicationMixin](https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html) et [PARTS](https://foundryvtt.com/api/v14/classes/foundry.HandlebarsApplication.html#PARTS)
- [ApplicationV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html) — `TABS`, `tabGroups`, `_prepareTabs`, `changeTab`. Navigation : `templates/generic/tab-navigation.hbs`
- [formGroup](https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.formGroup.html)
- [Actors.registerSheet](https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Actors.html#registerSheet) / `unregisterSheet` (feuilles V1 : `foundry.appv1.sheets.ActorSheet` et `ItemSheet`)
- [Hooks](https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html) — `init`, `preCreateItem`
- [DialogV2.wait](https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html) — fenêtre de jet et fenêtre d'application
- [Roll](https://foundryvtt.com/api/v14/classes/foundry.dice.Roll.html) — `new Roll("1d100")`, `evaluate`
- [ChatMessage](https://foundryvtt.com/api/v14/classes/foundry.documents.ChatMessage.html) — `create`, `getSpeaker`, `applyMode`, `getFlag`
- [renderChatMessageHTML](https://foundryvtt.com/api/v14/functions/hookEvents.renderChatMessageHTML.html)
- [statusEffects](https://foundryvtt.com/api/v14/variables/CONFIG.statusEffects.html) et [toggleStatusEffect](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect)
- [Combat](https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html) — `rollInitiative`, `rollAll`, `rollNPC`, `nextRound` ; [CONFIG.Combat](https://foundryvtt.com/api/v14/variables/CONFIG.Combat.html) (`documentClass`, `initiative.formula`)
- [Combatant](https://foundryvtt.com/api/v14/classes/foundry.documents.Combatant.html) — `_getInitiativeFormula` ; [CONFIG.Combatant](https://foundryvtt.com/api/v14/variables/CONFIG.Combatant.html)
- [CombatTracker](https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.CombatTracker.html) — `_getEntryContextOptions` ; [CONFIG.ui.combat](https://foundryvtt.com/api/v14/variables/CONFIG.ui.html)
- [combatRound](https://foundryvtt.com/api/v14/functions/hookEvents.combatRound.html) — non utilisé pour écrire la fin d'ordre (`Hooks.call` n'attend pas la promesse)
- [PackageCompendiumData](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageCompendiumData.html) et [PackFolderData](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackFolderData.html)
- [renderTemplate](https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.renderTemplate.html)

Articles utiles : [System Data Models](https://foundryvtt.com/article/system-data-models/), [Localization](https://foundryvtt.com/article/localization/).
