# AGENTS.md — système Foundry « Sol, Nouvelle Ère »

Ce guide s'adresse aux agents IA qui interviennent sur ce dépôt. Lisez-le en entier avant de modifier quoi que ce soit. Il résume les règles du projet. Le détail technique, plus ancien, est dans [CONTRIBUTING.md](CONTRIBUTING.md). Si les deux documents se contredisent, celui-ci fait foi.

État vérifié le 14/11/2026 : `main` en **1.1.6**. 27 tests `node tests/*.test.mjs` passent. `tests/models.test.mjs` s'arrête tout de suite sans `FOUNDRY_PATH`. `tests/catalog-080.test.mjs` saute le passage DataModel dans le même cas, puis continue.

## 1. Contexte

- Jeu de rôle de science-fiction réaliste (hard SF), au D100. L'action se passe en 2187, dans le système solaire. Le moteur est FoundryVTT **v14**, build **369** (`compatibility.minimum` et `verified` = `"14"`).
- Propriétaire : **Marc-André Potheret** (Marc). Il est francophone et n'est pas développeur. Tout ce qui lui est destiné est en français simple, sans jargon.
- Identifiant du système : `sol-nouvelle-ere`. Le dossier Foundry, l'`id` de `system.json`, le scope de `registerSheet` et le canal socket (`system.sol-nouvelle-ere`) portent ce nom.
- Chez Marc, le système vit dans `D:\FoundryVTT\Data\systems\sol-nouvelle-ere`. **Ne touchez jamais au PC de Marc** sans une demande explicite de sa part. Tout passe par GitHub.
- Ce dépôt est **public**. La partie meneur du kit de démarrage est dans le dépôt **privé** `marcandre71/sol-kit-mj`. Voir le §6.

## 2. Règles intangibles

1. **Tout le code passe par GitHub.** On ne livre pas de fichier à Marc à la main.
2. **Aucun secret du MJ ni de l'Atlas dans ce dépôt.** Ne mettez ici ni livret de scénario, ni guide du meneur, ni plan MJ, ni PNJ d'intrigue, ni note « Quand la donner », ni extrait de l'Atlas. Tout cela va dans `sol-kit-mj`. `tests/kit-110.test.mjs` vérifie par exemple que la chaîne « secret de l'Atlas » n'apparaît pas dans les prétirés ni dans les journaux du kit.
3. **Les sources de Marc ne se modifient pas.** La Bible, le Guide des vaisseaux et le Livre de règles (LdR) original ne changent que si Marc le demande. Un alignement de règles s'écrit dans un **nouveau** document, jamais dans la source.
4. **Règles légères.** On n'ajoute pas de mécanique que Marc n'a pas demandée. En cas de doute, on lui pose la question (voir le §9) plutôt que d'inventer.
5. **Terminologie.** On reprend celle de la Bible v0.6 et du LdR v0.3. Les termes de lore suivants sont **obsolètes** et ne doivent pas apparaître dans un nouveau texte : Mutuelle, Règle Sereguine, Partants, Veille, Glossaire v0.2. Le dépôt en contient encore beaucoup (voir le §10) : leur remplacement est un chantier à part, qui ne se fait pas en passant.
6. **Toujours dire que Foundry n'a pas été exécuté.** Aucun agent n'a de runtime Foundry. Chaque message de livraison, entrée CHANGELOG et ligne de ROADMAP le précise (« Runtime Foundry non exécuté »).
7. Pas de balise « à valider » dans un document destiné aux joueurs. Le dépôt en contient encore : voir le §10.

## 3. Décisions de design figées

Ne revenez pas dessus sans une demande de Marc. Entre parenthèses : la version qui les applique.

- Le **tir en rafale** est supprimé. Les champs restent, aucun jet ne les lit (1.0.0).
- Le **test de recul en apesanteur** est supprimé (1.0.0).
- **Commandant** : il faut un test de Commandement réussi pour obtenir le +10 (1.0.0).
- Module **Blindage** : sa valeur s'ajoute à la protection de la coque. Hors service ou non renseigné, il vaut 0. Dégradé, il compte tous ses points (1.0.0).
- **Esquive** en combat personnel : jet opposé à l'attaque, en réaction après une attaque réussie et avant les dégâts (0.9.8).
- Le **drone TATI** est supprimé : l'acteur `DroneTati0000001` et le blindage `ArmTatiBlind0001`. Luciole et Crabe restent. Il n'y a pas de migration des mondes (1.1.1).
- **Tolérance aux g** = CON actuelle / 20, arrondie au supérieur, plus le modificateur d'origine (1.0.3).
- **Seuil de blessure** = `ceil((FOR + CON) / 20)` (décision du 18/10/2026).
- L'**Endurance actuelle** est un seul nombre, pas `{ value, max }`. Le maximum, `ceil(CON/5)`, est calculé.
- La valeur dérivée Initiative (RÉF/10) est retirée. Vice et Lueur n'existent pas.
- Les **vaisseaux** passent par le Combat Tracker habituel. Les jets de poste ne sont pas plafonnés à ±50 ; ceux des personnages le sont.
- Les autres décisions datées sont dans [ROADMAP.md](ROADMAP.md), [CHANGELOG.md](CHANGELOG.md) et [CONTRIBUTING.md](CONTRIBUTING.md). Dans le code, citez-les sous la forme `// Décision Marc JJ/MM/AAAA`.

## 4. Sources de vérité

| Sujet | Où | Remarque |
| :--- | :--- | :--- |
| Univers | Bible v0.6 (Google Doc de Marc) | Ne pas modifier |
| Règles | Livre de règles v0.3 (Google Doc de Marc), LdR original | Ne pas modifier |
| Vaisseaux | Guide des vaisseaux (Google Doc de Marc) ; brouillon copié `docs/regles-vaisseaux-v0.1.md` | Chiffres provisoires |
| Secrets du MJ | Atlas (Google Doc, réservé au MJ) | **Jamais** dans ce dépôt |
| Décisions et versions | `ROADMAP.md`, `CHANGELOG.md` | Mis à jour à chaque version |
| Tests de Marc | `TESTER.md` (§1 à §33), `docs/tests/` | En français, pour un non-développeur |
| Contenu MJ du kit | Dépôt privé `sol-kit-mj` | Voir son `AGENTS.md` |
| Kit (sources Markdown, fiches papier, portraits) | Box de l'agent, `/workspace/kit/` ; livrables sur le Drive de Marc | Voir le §10 (risque) |

Les identifiants Drive des documents de Marc sont notés dans le `AGENTS.md` du dépôt privé, pas ici.

## 5. Architecture

```
system.json            manifeste : documentTypes (+ htmlFields), 22 packs, 5 packFolders, socket, hotReload
module/sol.mjs         point d'entrée (hook init) : CONFIG.SOL, dataModels, feuilles, garde-fous
module/config.mjs      caractéristiques, bornes, listes de choix, objets autorisés (source unique)
module/guards.mjs      refuse un objet interdit sur un acteur (preCreateItem)
module/icons.mjs       icône par type à la création (getDefaultArtwork / _preCreate)
module/kit-import.mjs  bouton « Importer le kit (joueurs) » + détection du module privé
module/data/           un TypeDataModel par type, migrations (*-migrate.mjs)
module/dice/           D100, dégâts, esquive, initiative, brèche… (logique pure testable)
module/combat/         initiative dans le Combat Tracker
module/ships/          vaisseaux : coque, réacteur, postes, combat spatial, dégâts
module/sheets/         feuilles ApplicationV2 (Personnage/PNJ, Vaisseau, générique acteur/objet)
templates/             gabarits Handlebars (.hbs)
lang/fr.json           tous les libellés (clés TYPES.* et SOL.*) ; « en » pointe sur le même fichier
styles/sol.css         thème sombre (variables --sol-*)
fonts/                 IBM Plex Sans Condensed, IBM Plex Mono, Atkinson Hyperlegible Next (OFL)
assets/icons/          22 SVG originaux : actors/ (7) et items/ (15)
assets/portraits/      portraits WebP des 6 prétirés du kit
assets/kit/            5 plans joueurs (WebP) des scènes du kit
packs/_source/<pack>/  source JSON des compendiums (1 document par fichier)
packs/<pack>/          LevelDB construit (commité)
tests/                 tests Node sans Foundry (node tests/x.test.mjs)
docs/                  brouillon des règles des vaisseaux, anciens scénarios de test
```

Types d'acteurs : `character`, `npc`, `creature`, `synthetic`, `drone`, `vehicle`, `ship`.
Types d'objets : `skill`, `talent`, `origin`, `background`, `profession`, `weapon`, `armor`, `gear`, `augmentation`, `substance`, `injury`, `sequel`, `software`, `shipModule`.

## 6. Lien avec le module privé `sol-kit-mj`

- `module/kit-import.mjs` : `KIT_IMPORTS` importe les 3 packs joueurs (`kit-pregens`, `kit-scenes`, `kit-journals`).
- `GM_KIT_MODULE_ID = "sol-kit-mj"` et `GM_KIT_FOLDER = "Kit MJ — La Cale du quai 9"`. Si le module est actif et que l'utilisateur est le MJ actif, le système importe chaque pack déclaré dans `game.modules.get("sol-kit-mj").packs`, sans toucher à `ownership`.
- `KIT_GM_PACKS` **reste une liste vide** (décision de Marc du 14/11/2026). N'écrivez ici aucun nom de pack, de PNJ ni de lieu du module privé.
- Le système ne doit pas dépendre de `game.modules.get("sol-kit-mj").api`.

## 7. Conventions de code

- **Clés en anglais**, sans accent ni espace (`ship`, `talent`, `background` pour le Milieu). **Libellés en français**, uniquement dans `lang/fr.json`, sous `TYPES.Actor.*`, `TYPES.Item.*` ou `SOL.*`. Pas de français en dur dans un `.mjs`, un `.hbs` ou un `.css`, sauf dans les commentaires.
- **Commentaires en français**, avec la source : `// Réf. LdR v0.3 §x`, `// Réf. Vaisseaux v0.1 §x`, `// Décision Marc JJ/MM/AAAA`, `// À confirmer par Marc`. Les anciens commentaires citent encore le LdR v0.2.
- Les bornes et les listes de choix vivent dans `module/config.mjs`. Ne recopiez pas de nombre magique dans un gabarit ni dans `defineSchema`.
- Les saisies lisent la source stockée (`document._source`, `system._source`), pas la valeur préparée.
- **Migration** : renommer ou supprimer une clé déjà stockée exige un `static migrateData(source)`. Ajouter un champ avec `initial` n'en demande pas. Les remplissages au chargement (par exemple `fillEndurance`) sont faits par le MJ actif, jamais dans `migrateData`.
- **Ajouter un type** : suivez la procédure en 7 points de CONTRIBUTING.md, « Ajouter un type ».
- Liens de doc : toujours l'API **v14** (`https://foundryvtt.com/api/v14/...`), dans un `@see`.
- Classes CSS de fenêtre : `sol`, `sol-nouvelle-ere`, puis `actor` ou `item`.

## 8. Style graphique et icônes

- Le thème est sombre, façon SF. Les variables sont dans `styles/sol.css` : `--sol-bg #0c1117`, `--sol-panel #141c24`, `--sol-line #2b3b4a`, `--sol-text #dbe3ea`, `--sol-muted #8fa0ae`, `--sol-accent #4cc4dc`, `--sol-alert #f0685c`, `--sol-ok #5cc28a`, `--sol-warn #e6a940`, `--sol-cut 10px`.
- **Polices dans Foundry** : `--sol-f-label` IBM Plex Sans Condensed, `--sol-f-text` Atkinson Hyperlegible Next, `--sol-f-num` IBM Plex Mono, embarquées dans `fonts/`. Les fiches papier du kit utilisent d'autres polices (Orbitron, Rajdhani, Inter, JetBrains Mono) : voir le `AGENTS.md` du kit. Ne mélangez pas les deux jeux.
- **Boutons d'en-tête** : ne posez jamais de `font-family` sur un sélecteur qui touche `.fa`, `.fas`, `.fa-solid` ou `[class*="fa-"]`. C'était le bug corrigé en 1.1.4, qui transformait le bouton fermer en carré vide. Les contrôles d'en-tête gardent `font-family: var(--font-awesome)`, un poids de 900, 16 px et la couleur `#4cc4dc`. `tests/icons-114.test.mjs` surveille cette exclusion. `tests/style.test.mjs` surveille la version et la palette.
- **Icônes de type** : des SVG originaux de 512×512. Fond `#0c1117`, cadre octogonal `#141c24` bordé de `#4cc4dc` (épaisseur 14), coins `#2ad4c8`, pictogramme au trait `#4cc4dc`, et un `<title>` en français. `module/icons.mjs` ne remplace qu'une image absente ou une image par défaut du cœur : `item-bag.svg` et `mystery-man.svg`, plus `blood.svg` pour une blessure et `ship.svg` pour un vaisseau. Un portrait choisi n'est jamais remplacé. Les statuts de jeton (Saignement, Sonné…) gardent les icônes du cœur : les refaire n'est pas encore décidé.
- **Portraits** : un WebP par prétiré dans `assets/portraits/<prénom>.webp`, 864×1152, qualité 80. Il sert d'image de l'acteur et de texture du jeton.

## 9. Compendiums

- Déclarés dans `system.json` (`name`, `label`, `path` = `packs/<name>`, `type`, `system`). Les libellés sont en français dans le manifeste.
- La source est `packs/_source/<pack>/*.json` : un document par fichier, `_id` de **16 caractères alphanumériques**, `_key` sous la forme `!items!<id>`, `!actors!<id>`, `!journal!<id>` ou `!scenes!<id>`. Les ids récents sont lisibles (`KitPregenAnouk001`, `ArmTatiBlind0001`…).
- Construction :
  ```bash
  npm install --no-save @foundryvtt/foundryvtt-cli
  node packs/build.mjs
  ```
  On commite les JSON **et** le LevelDB (CURRENT, MANIFEST, `.ldb`, `.log`). On ne commite pas `LOCK`, `LOG` ni `LOG.old`. `.gitattributes` passe `packs/**` en binaire. Ne reconstruisez un pack que dans un dossier vidé.
- Le pack `tables` est déclaré mais n'a pas de dossier source : `build.mjs` ne le touche pas.
- On n'invente aucune valeur que le LdR ne donne pas.

## 10. Points connus à ne pas « corriger en passant »

Chacun de ces points demande une décision de Didier ou de Marc.

- Les termes obsolètes sont encore présents : « Veille » (pack `ships` « Patrouilleur de la Veille », armes, professions, `lang/fr.json`, `module/test-scene.mjs`…), « Mutuelle », « Sereguine », « Partants » (milieu « Communauté des Partants ») et le Glossaire du pack `universe`.
- Des balises « à valider » restent dans des documents joueurs : `KitPregenAnouk001` (Réseau) et `KitPregenBosco001`.
- Les `_id` invalides corrigés en 1.1.6 : le talent « Miracle de la clé de 12 » (`TlnCleDe12_00010` → `TlnCleDe12000010`) et la page « Le Directoire de Tharsis » (`PgDirectTharsis` → `PgDirectTharsis1`). Un monde qui avait déjà importé ce talent garde l'ancien document. `tests/ids-116.test.mjs` vérifie le format.
- Les en-têtes de `README.md`, `CONTRIBUTING.md` et `TESTER.md` renvoient ici. Leurs corps gardent l'historique des versions 0.7 à 0.9.
- CONTRIBUTING dit que `ownership` n'est pas un champ de pack en v14, alors que `sol-kit-mj/module.json` l'utilise. À vérifier dans Foundry.

## 11. Workflow de version

1. Une branche par lot, depuis `main`, nommée `cursor/<sujet>-<version>[-suffixe]` (par exemple `cursor/icones-115-c85e`). Les anciennes branches s'appelaient `dev/x.y.z`.
2. Version suivante dans `system.json` (`version`). Pas de champ `manifest` ni `download` aujourd'hui.
3. Entrée dans `CHANGELOG.md` en tête : ce qui change, qui l'a décidé, Relecteur ou non, « Runtime Foundry non exécuté » et la section TESTER.
4. Ligne cochée dans `ROADMAP.md`, même formule.
5. Nouvelle section **`TESTER.md` §N** (la dernière est le §33), en français pour Marc. Elle donne des étapes numérotées, en gras ce qu'il faut cliquer, un **Résultat attendu :** par étape, et finit par la console F12 sans ligne rouge.
6. Un test Node dans `tests/` si la logique est testable sans Foundry, puis tous les tests : `for t in tests/*.test.mjs; do node "$t" || echo "ÉCHEC $t"; done`. Plus `node --check` sur les fichiers modifiés et un `JSON.parse` de `system.json` et `lang/fr.json`.
7. Une PR vers `main`. Un message de commit sous la forme `X.Y.Z : résumé.`, en français.
8. **Relecture** : Relecteur Foundry, seulement pour un changement majeur (DataModels, jets, combat). Sinon, Didier (le coordinateur) valide.
9. **Merge fast-forward** sur `main`, sans commit de merge.
10. Message à Marc, en français simple, avec le lien ZIP https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip, la section TESTER à suivre et la mention « Foundry n'a pas été exécuté ».

Jusqu'à la v1, Didier a carte blanche sur les choix techniques. Marc ne tranche que les vrais choix de game design, **une question à la fois**. Marc testera la v1 complète en une séance (décision du 30/10/2026).

## 12. Interdits, en bref

- Publier un secret MJ ou de l'Atlas ici.
- Modifier la Bible, le Guide des vaisseaux ou le LdR original.
- Modifier quoi que ce soit sur le PC de Marc sans sa demande.
- Réintroduire la rafale, le test de recul en apesanteur, le drone TATI, Vice, Lueur ou l'Initiative dérivée.
- Écrire un nouveau texte avec un terme obsolète.
- Annoncer qu'une version « marche dans Foundry » : elle n'y a pas été lancée.
