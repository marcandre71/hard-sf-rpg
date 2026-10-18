# Contribuer à Sol, Nouvelle Ère

Guide pour les agents IA et les développeurs qui poursuivent ce système FoundryVTT.
L'étape en cours est la **0.5.4** : le MJ applique les dégâts d'une attaque, et une partie des compendiums reprend le texte explicite du LdR v0.2. Le Seuil de blessure est `ceil((FOR + CON) / 20)`. Pas d'automatisation des origines, ni de l'Endurance.

## Petites étapes jouables, validées par Marc

On n'enchaîne pas les mécaniques. Chaque étape doit être **jouable et validée par Marc**
(Marc-André Potheret, propriétaire du dépôt) avant la suivante.

Une étape est acceptable quand :

- le périmètre annoncé dans le README est respecté, sans fonctionnalité en plus ;
- un personnage peut être créé et ses données survivent à la fermeture de la feuille et au rechargement ;
- [TESTER.md](TESTER.md) passe sans ligne rouge dans la console Foundry.

Tant que Marc n'a pas validé l'étape, on ne commence pas la suivante. En cas de doute sur une règle, on lui demande plutôt que d'inventer.

Hors périmètre (ne pas les ajouter) : valeurs dérivées affichées sur la feuille autres que l'Actuelle des caractéristiques, le score de compétence, et le Seuil de blessure des créatures, synthétiques et drones (tolérance aux g, Endurance, Sang-froid, encombrement, mouvement), initiative glissante, Active Effects autres que les conditions « Combinaison percée » et « Saignement », automation des origines. Sur le Personnage et le PNJ, le Seuil n'est pas une colonne : il est calculé à l'application des dégâts. Décision Marc 18/10/2026 : la valeur dérivée Initiative (RÉF/10) est retirée, elle ne sera pas ajoutée. Vice et Lueur n'existent pas : ne pas les réintroduire.

## Où sont les règles du jeu

Les règles ne sont **pas dans ce dépôt**. Elles vivent dans des **Google Docs dont Marc est propriétaire**
(Livre de règles v0.2, Fiche de personnage v0.2).
Ce dépôt ne contient que le système Foundry. Ne pas recopier les règles ici, ne pas en créer une version parallèle, et ne pas deviner une formule absente du code ou d'une consigne de Marc.

Quand un champ est marqué « non défini » ou « à préciser » dans le code, c'est volontaire : les docs donnent le nom, pas le type. Ne pas le « compléter » sans une décision de Marc.

## Arborescence

```
system.json                         Manifeste : id, version 0.5.4, compatibilité 14,
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
module/dice/damage.mjs              Dégâts, Seuil, gravité, brèche. Test : tests/damage.test.mjs.
module/dice/skill-score.mjs         Score de compétence et nom de compétence d'une arme.
module/dice/roll-dialog.mjs         DialogV2 : difficulté, modificateur libre, total borné.
module/dice/chat.mjs                Roll 1d100, ChatMessage, gabarit templates/chat/roll-card.hbs.
module/dice/apply-damage.mjs        Bouton MJ, DialogV2, blessure, brèche, carte de résultat.
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
module/data/actors.mjs              PNJ (migrateData), Créature, Synthétique, Drone, Véhicule, Vaisseau.
module/data/skill.mjs               Compétence. Le score n'est pas calculé.
module/data/weapon.mjs              Arme portative. Portée = palier short / medium / long.
module/data/armor.mjs               Armure/Vêtement.
module/data/gear.mjs                Équipement.
module/data/augmentation.mjs        Augmentation (genre : thérapie, prothèse, organe cultivé, héréditaire).
module/data/injury.mjs              Blessure.
module/data/provisional.mjs         Atout, Origine, Milieu, Profession, Séquelle, Module de vaisseau.
                                    Champs en String / Number / HTML, défauts neutres.
module/sheets/character-sheet.mjs   Feuille à onglets du Personnage et du PNJ (groupe main).
module/sheets/actor-sheet.mjs       Feuille générique des autres acteurs, objets groupés par type.
module/sheets/item-sheet.mjs        Une feuille pour tous les objets (formGroup sur le schéma).
module/sheets/prepare-fields.mjs    Schéma → lignes de formulaire, valeurs lues dans _source.
module/sheets/item-list.mjs         Liste d'objets embarqués (créer, ouvrir, retirer).
templates/                          Gabarits. Pas de français en dur : {{localize}}.
lang/fr.json                        Tous les libellés, y compris TYPES.Actor et TYPES.Item.
styles/sol.css                      Préfixe .sol-nouvelle-ere uniquement.
README.md                           Présentation, périmètre, installation.
TESTER.md                           Scénario de test manuel de l'étape en cours.
docs/tests/etape-2.md               Scénario de l'étape 2, conservé.
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
node --check module/sheets/item-sheet.mjs
node --check module/dice/d100.mjs
node --check module/dice/skill-score.mjs
node --check module/dice/roll-dialog.mjs
node --check module/dice/chat.mjs
node --check module/dice/damage.mjs
node --check module/dice/apply-damage.mjs
node --check tests/models.test.mjs
node --check tests/d100.test.mjs
node --check tests/damage.test.mjs
node --input-type=module -e 'import {readFileSync} from "node:fs"; for (const f of ["system.json","lang/fr.json"]) JSON.parse(readFileSync(f, "utf8"));'
node tests/d100.test.mjs
node tests/damage.test.mjs
node tests/models.test.mjs
```

`tests/models.test.mjs` instancie un document de chacun des 21 types et valide les défauts (`validate()` doit renvoyer `true`), avec un faux `game.i18n.localize` qui utilise `this` (le piège de la méthode détachée). Foundry n'est pas dans ce dépôt et on ne le télécharge pas : sans la variable `FOUNDRY_PATH` (dossier d'installation FoundryVTT), le script s'arrête tout de suite, code 0. Si `FOUNDRY_PATH` est défini mais que le code commun ne se charge pas, le script s'arrête avec le code 1. Exemple : `FOUNDRY_PATH=/chemin/vers/FoundryVTT node tests/models.test.mjs`.

Puis le scénario manuel de [TESTER.md](TESTER.md). L'étape 2 reste dans [docs/tests/etape-2.md](docs/tests/etape-2.md), l'étape 3 dans [docs/tests/etape-3.md](docs/tests/etape-3.md), l'étape 4 dans [docs/tests/etape-4.md](docs/tests/etape-4.md). Le message `Sol, Nouvelle Ère | Initialisation du système` confirme que `module/sol.mjs` a tourné.

## Jets (étape 4)

`module/dice/d100.mjs` ne charge pas Foundry. `tests/d100.test.mjs` se lance avec `node` seul. On n'y recopie pas une formule ailleurs : la feuille et `chat.mjs` appellent ces fonctions.

Score de compétence (`skill-score.mjs`, Réf. LdR v0.2 §4) : caractéristique actuelle + formation. Si `trainingRequired` et formation 0, moitié arrondie au supérieur quand `untrainedAllowed` est vrai, sinon le jet est refusé. Décision Marc 18/10/2026 : la moitié est calculée avant la difficulté. `SkillData.migrateData` recopie `specialized` dans `trainingRequired`.

Difficultés : `SOL.difficulties`, défaut `normal`. Le total difficulté + modificateur libre est borné à ±50 (`cappedModifier`). Le score visé n'est pas reborné. Décision Marc 18/10/2026.

Décision Marc 18/10/2026 : 18 % de critiques par jet (01–05, 96–00, doubles 11–88), voulu.

Arme : `weapon.system.skill` est le nom d'une compétence de l'acteur (casse ignorée). Sinon `SOL.weaponSkillDefaults` (Armes de poing et d'épaule → COO, Corps-à-corps → FOR), et ces compétences ne sont pas (F). Nom inconnu : avertissement, pas de jet. Le dé n'est affiché que si `equipped` est vrai. Réussite : localisation par inversion des chiffres, dégâts = dégâts de l'arme + DR. Décision Marc 18/10/2026 : une réussite critique ne permet pas de choisir la zone. La phrase « la zone peut être choisie » n'est pas affichée.

`performRoll` (`chat.mjs`) ouvre `DialogV2.wait`. Annuler ne lance pas le dé. Le modificateur libre est un entier (`step="1"`, `Math.trunc`). Décision Marc 18/10/2026. Le dé est `new Roll("1d100")`, puis `ChatMessage.create` avec `rolls`, `sound: CONFIG.sounds.dice`, `ChatMessage.getSpeaker({ actor })` et `flags["sol-nouvelle-ere"]` (type, score visé, dé, réussite, critique, DR, DE, zone, dégâts = arme + DR, libellé). Le gabarit est `templates/chat/roll-card.hbs`. Une réussite d'arme y ajoute le bouton « Appliquer les dégâts ». Les cartes déjà postées en 0.4 n'ont pas ces drapeaux dans le HTML : pas de bouton.

Visibilité (foundryvtt#8856) : en v14 le réglage client est `core.messageMode`. On appelle `ChatMessage.applyMode(data)` sans mode (il modifie `data`) et on garde cet objet, sans utiliser la valeur renvoyée. `game.settings.get("core", "rollMode")` lève, le réglage n'est plus enregistré. En v13, si `applyMode` est absent et que `game.settings.settings.has("core.rollMode")`, on appelle `ChatMessage.applyRollMode` de la même façon.

Pour ajouter un type de jet : calculer un score (helper existant, ou nouveau fichier sans Foundry s'il y a une formule), ajouter un bouton `data-action`, appeler `performRoll`. Une difficulté nouvelle se déclare dans `SOL.difficulties` et `lang/fr.json`, pas dans le gabarit. Une ligne nouvelle sur la carte se prépare dans `chat.mjs` et s'affiche dans `roll-card.hbs`. Ne pas dupliquer `resolveD100`.

## Dégâts (étape 5)

`module/dice/damage.mjs` ne charge pas Foundry. `tests/damage.test.mjs` se lance avec `node` seul. Réf. LdR v0.2 §7.

Dégâts nets = (dégâts de l'arme + DR) − somme des `protection[zone]` des armures **équipées**. Décision Marc 18/10/2026 : les couches s'additionnent. Décision Marc 18/10/2026 : nets ≤ 0, ni blessure ni brèche. Aucun acteur n'a d'armure par zone hors objets `armor` (vérifié : Personnage, PNJ, Créature, Synthétique, Drone).

Seuil = `ceil((FOR + CON) / SEUIL_DIVISOR)` sur les valeurs actuelles, avec `SEUIL_DIVISOR = 20`. Décision Marc 18/10/2026 : combat très dangereux, SB divisé par 2 (LdR v0.2 §3 disait /10, LdR à mettre à jour). Le texte de l'exemple du LdR v0.2 §7 (FOR 30 + CON 40 → SB 7, puis carabine 10 + 2 de DR − 3 d'armure = 9, blessure grave) est périmé tant que Marc n'a pas mis le livre à jour : le même coup donne maintenant SB 4, nets 9, critique et brèche, sans saignement. Les seuils de gravité ne changent pas : < SB légère, SB à 2 SB − 1 grave, 2 SB à 3 SB − 1 critique, ≥ 3 SB mortelle. À confirmer par Marc : un Seuil inférieur à 1 est aussi refusé.

Décision Marc 18/10/2026 : créature, synthétique et drone ont FOR et CON, le même schéma que le PNJ (`characteristicSchema`, Base jusqu'à 100, Actuelle bornée 0 à 100). Pas les sept autres caractéristiques. Leur feuille affiche ces deux lignes, le Seuil, et le jet (même action que le personnage). Ils reçoivent la blessure standard. À confirmer par Marc : blessures propres aux machines (synthétique, drone) à définir. Véhicule et vaisseau n'ont toujours pas de FOR ni de CON : l'application est refusée.

Pas de `migrateData` pour ces FOR/CON. Un diff client passe par `migrateData` avant le nettoyage (v13 `client-backend.mjs` l.207-214, toujours le cas en v14). Y poser les défauts écraserait une Force déjà saisie lors d'une mise à jour de la description. Le nettoyage du schéma (`initial`) complète une fiche ancienne qui n'a pas encore ces champs, et un `cleanData` partiel ne les ajoute pas. Les autres `migrateData` ne transforment que si l'ancienne clé est dans la source : `specialized` → `trainingRequired` (compétence), portée objet → `short` (arme). Le PNJ ne copie `description` vers `biography` que si les deux clés `description` et `notes` sont là et que `biography` n'y est pas. Aucune de ces migrations n'injecte un défaut sur un diff qui ne contient pas l'ancien champ.

Gravité : < SB légère (−10), SB à 2 SB − 1 grave (−20, `bleeding`), 2 SB à 3 SB − 1 critique, ≥ 3 SB mortelle. Décision Marc 18/10/2026 : critique et mortelle n'ont pas de pénalité chiffrée. La conséquence est écrite dans `description`. Le MJ et les joueurs réagissent à la main.

Brèche : une blessure (nets > 0) qui traverse une armure équipée `pressurized` couvrant la zone. À confirmer par Marc : la zone est couverte dès que la clé existe, y compris à 0. `sealState` passe à `breached`. La condition `sol-nouvelle-ere.suitBreach` est enregistrée dans `CONFIG.statusEffects` (`name` = clé i18n `SOL.Status.suitBreach`, `img` = `icons/svg/hazard.svg`, icône du cœur). `init` tourne avant les traductions : on n'appelle pas `localize` à l'enregistrement. Foundry traduit `name` en créant l'effet. Pas d'horloge de décompression. La tête suit la même règle, sans second mécanisme.

Réf. LdR v0.2 §11 : une blessure grave pose aussi la condition `sol-nouvelle-ere.bleeding` (`name` = `SOL.Status.bleeding`, `img` = `icons/svg/blood.svg`) si elle n'est pas déjà active. L'Endurance (−1 par tour) n'est pas automatisée.

Les effets de zone (inconscience, objet lâché, mouvement / 2, réserve d'air) sont du texte sur la carte de résultat. Décision Marc 18/10/2026 : rien n'est automatisé, ni l'Endurance, ni l'initiative. À confirmer par Marc : le rappel « réserve d'air » n'apparaît que si une blessure est créée. La fenêtre d'application n'a pas de liste de zones : la zone est celle du dé.

Bouton : `renderChatMessageHTML` retire le bouton si `game.user.isGM` est faux, et le handler le revérifie. Cibles : `game.user.targets`, sinon `canvas.tokens.controlled`. Déduplication par `token.actor.uuid` : deux jetons liés du même acteur ne comptent qu'une fois ; deux jetons non liés du même acteur de base sont chacun touchés. Aucune : avertissement. `DialogV2.wait` montre zone, dégâts bruts, armure, nets, Seuil, gravité, brèche. Annuler n'écrit rien. Confirmer crée la blessure, met à jour les joints, pose les conditions, poste `templates/chat/damage-card.hbs`. Si au moins une cible a réussi, le message d'attaque reçoit le drapeau `applied`. Le bouton affiche alors « Dégâts déjà appliqués » (le HTML stocké date du jet : le texte est mis à jour dans le hook). Un nouveau clic ouvre un `DialogV2` « Dégâts déjà appliqués, recommencer ? ». Annuler cette question n'écrit rien. Une fenêtre de dégâts annulée ne pose pas le drapeau. La carte reprend `whisper` et `blind` du jet. Grave : bouton de test de VOL. Critique : test de CON. Les deux passent par `performRoll`, avec `characteristicRollLabel` (`abbr` et `label`, jamais l'objet). Le bouton n'est visible et utilisable que par le propriétaire de la cible (`fromUuidSync(uuid)?.isOwner`) ou le MJ. Un double clic est ignoré le temps que la fenêtre est ouverte.

## Compendiums (étape 5, contenu 0.5.1)

Déclarés dans `system.json`, format v14 [`PackageCompendiumData`](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageCompendiumData.html) : `name`, `label`, `path`, `type`, `system`. Le `path` est un dossier dont le nom est le `name`. `system` est obligatoire pour les Items ; on le met aussi sur le journal et les tables.

`ownership` n'est pas un champ de cette interface v14. La visibilité est le défaut du cœur (joueur : Observer, le pack est visible). On ne l'invente pas dans le manifeste. Le MJ peut la changer ensuite par le menu du compendium (`CompendiumCollection#configure`).

[`PackFolderData`](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackFolderData.html) : `name`, `sorting` (`m`), `color`, `packs`, `folders`. Trois dossiers : Objets, Journal, Tables. Les libellés ne passent pas par l'i18n : ils sont déjà en français. Les dossiers ne sont créés qu'une fois par monde : un monde déjà ouvert peut garder l'ancienne disposition tant que le réglage `core.compendiumConfiguration` n'est pas vidé.

La source lisible est `packs/_source/<pack>/*.json` (un document par fichier, `_id` stable, `_key` `!items!<id>`). Foundry lit le LevelDB `packs/<pack>/`, produit par l'outil officiel :

```bash
npm install --no-save @foundryvtt/foundryvtt-cli
node packs/build.mjs
```

`packs/build.mjs` appelle `compilePack` pour chaque dossier de `packs/_source`. On commit les JSON et le LevelDB (CURRENT, MANIFEST, `.ldb`, `.log` de la base). On ne commit pas `LOCK`, `LOG`, `LOG.old` (voir `.gitignore`) : Foundry les recrée. `.gitattributes` marque `packs/**` en `binary` pour que `autocrlf` sous Windows ne réécrive pas CURRENT, MANIFEST, `.ldb` ni `.log`. `binary` pose aussi `-diff` et `-merge`, que `text` ne retire pas. Les lignes suivantes rétablissent le texte : `packs/_source/** text eol=lf diff merge` et `packs/build.mjs text eol=lf diff merge`.

Rempli depuis le LdR v0.2, sans valeur inventée : Compétences (§4, une entrée par spécialité listée), Origines, Milieux, Professions (§9), Armes et Armures (§7). Le texte qui n'a pas de champ va dans `description`. Les champs non écrits restent au défaut du modèle. Vides : Atouts, Équipement, Augmentations, Substances, Logiciels, Modules de vaisseau, Séquelles, Univers et factions, Tables. Les tables du §15 (localisation, séquelles de radiation) ne sont pas créées.

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
- [PackageCompendiumData](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackageCompendiumData.html) et [PackFolderData](https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.PackFolderData.html)
- [renderTemplate](https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.renderTemplate.html)

Articles utiles : [System Data Models](https://foundryvtt.com/article/system-data-models/), [Localization](https://foundryvtt.com/article/localization/).
