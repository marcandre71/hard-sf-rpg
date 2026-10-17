# Contribuer à Sol, Nouvelle Ère

Guide pour les agents IA et les développeurs qui poursuivent ce système FoundryVTT.
L'étape en cours est la **0.2.0** : tous les types de documents validés, feuilles minimales, rien de plus.

## Petites étapes jouables, validées par Marc

On n'enchaîne pas les mécaniques. Chaque étape doit être **jouable et validée par Marc**
(Marc-André Potheret, propriétaire du dépôt) avant la suivante.

Une étape est acceptable quand :

- le périmètre annoncé dans le README est respecté, sans fonctionnalité en plus ;
- un personnage peut être créé et ses données survivent à la fermeture de la feuille et au rechargement ;
- [TESTER.md](TESTER.md) passe sans ligne rouge dans la console Foundry.

Tant que Marc n'a pas validé l'étape, on ne commence pas la suivante. En cas de doute sur une règle, on lui demande plutôt que d'inventer.

Hors périmètre de l'étape 2 (ne pas les ajouter) : jets de dés, valeurs dérivées (seuil de blessure, tolérance aux g, initiative, Endurance, Sang-froid, encombrement, mouvement), Active Effects, compendiums, automation des origines (remplir les caractéristiques toutes seules). Vice et Lueur n'existent pas : ne pas les réintroduire.

## Où sont les règles du jeu

Les règles ne sont **pas dans ce dépôt**. Elles vivent dans des **Google Docs dont Marc est propriétaire**
(Livre de règles v0.2, Fiche de personnage v0.2).
Ce dépôt ne contient que le système Foundry. Ne pas recopier les règles ici, ne pas en créer une version parallèle, et ne pas deviner une formule absente du code ou d'une consigne de Marc.

Quand un champ est marqué « non défini » ou « à préciser » dans le code, c'est volontaire : les docs donnent le nom, pas le type. Ne pas le « compléter » sans une décision de Marc.

## Arborescence

```
system.json                         Manifeste : id, version 0.2.0, compatibilité 14,
                                    esmodules, styles, langues fr et en (en → lang/fr.json),
                                    documentTypes avec htmlFields pour chaque HTMLField.
module/sol.mjs                      Point d'entrée. Hook init : CONFIG.SOL, dataModels,
                                    retrait des feuilles V1 du cœur, registerSheet, garde-fou.
module/config.mjs                   Caractéristiques, characteristicFields, choix d'énumération,
                                    actorTypes, itemTypes, allowedItems, uniqueOnCharacter.
module/guards.mjs                   Hook preCreateItem : refuse un objet interdit, et un
                                    second origin / background / profession sur un personnage.
module/data/fields.mjs              Constructeurs de champs (html, string, number, bool).
module/data/base-item.mjs           Description HTML commune. Substance et Logiciel s'arrêtent là.
module/data/character.mjs           Personnage : caractéristiques + identité + textes.
module/data/actors.mjs              PNJ, Créature, Synthétique, Drone, Véhicule, Vaisseau.
module/data/skill.mjs               Compétence. Le score n'est pas calculé.
module/data/weapon.mjs              Arme portative. Portée = { short, medium, long } en mètres.
module/data/armor.mjs               Armure/Vêtement.
module/data/gear.mjs                Équipement.
module/data/augmentation.mjs        Augmentation (genre : thérapie, prothèse, organe cultivé, héréditaire).
module/data/injury.mjs              Blessure.
module/data/provisional.mjs         Atout, Origine, Milieu, Profession, Séquelle, Module de vaisseau.
                                    Champs en String / Number / HTML, défauts neutres.
module/sheets/character-sheet.mjs   Feuille du Personnage.
module/sheets/actor-sheet.mjs       Feuille générique des autres acteurs.
module/sheets/item-sheet.mjs        Une feuille pour tous les objets (formGroup sur le schéma).
module/sheets/prepare-fields.mjs    Schéma → lignes de formulaire, valeurs lues dans _source.
module/sheets/item-list.mjs         Liste d'objets embarqués (créer, ouvrir, retirer).
templates/                          Gabarits. Pas de français en dur : {{localize}}.
lang/fr.json                        Tous les libellés, y compris TYPES.Actor et TYPES.Item.
styles/sol.css                      Préfixe .sol uniquement.
README.md                           Présentation, périmètre, installation.
TESTER.md                           Scénario de test manuel.
CONTRIBUTING.md                     Ce guide.
```

`module/sol.mjs` est le seul fichier listé dans `esmodules`. Le gabarit est référencé par un chemin `systems/sol-nouvelle-ere/...` : le dossier installé dans Foundry doit porter cet identifiant.

## Ajouter un type

1. Clé anglaise dans `documentTypes` de `system.json`. Si le modèle a un `HTMLField`, son chemin (relatif à `system`, par exemple `"description"` ou `"effect"`) va dans `htmlFields`.
2. Classe `TypeDataModel` dans `module/data/`, une classe par type, ou la base commune si le type n'a que `description`.
3. L'enregistrer dans `CONFIG.Actor.dataModels` ou `CONFIG.Item.dataModels` (`module/sol.mjs`).
4. Ajouter la clé à `SOL.actorTypes` ou `SOL.itemTypes`, et mettre à jour `SOL.allowedItems` si l'objet n'est pas permis partout.
5. Libellé français dans `lang/fr.json` sous `TYPES.Actor` ou `TYPES.Item`, et les libellés de champs sous `SOL.*`.
6. Les feuilles génériques (`GenericActorSheet`, `GenericItemSheet`) reprennent les champs du schéma toutes seules. Le Personnage a sa feuille dédiée : un champ nouveau s'y ajoute à la main.
7. Une ligne dans TESTER.md : créer le type, vérifier le libellé français, modifier un champ, rouvrir.

Les choix d'une liste (domaine, munition, genre d'augmentation, catégorie…) vivent dans `module/config.mjs`, valeurs anglaises (ou celles écrites dans la Fiche) et libellés = clés i18n. Pas de tableau de choix recopié dans un gabarit.

## Conventions de nommage

- **Clés de code en anglais** : `character`, `ship`, `talent`, `background`, `base`, `origin`, `advance`, `temp`, `value`. Pas d'accent ni d'espace dans une clé stockée. Les docs utilisent ces clés (`ship`, pas `starship` ; `talent`, pas `asset` ; `background` pour le Milieu).
- **Libellés en français via `lang/fr.json`** uniquement. Le code et les gabarits passent par `{{localize}}` ou par une clé (`SOL.Sheet.Character`, `TYPES.Actor.character`). On n'écrit pas de français en dur dans un `.mjs`, un `.hbs` ou un `.css` (les commentaires, si).
- **Caractéristiques et leurs bornes** : `SOL.characteristics` et `SOL.characteristicFields` dans `module/config.mjs`. Le modèle et la feuille lisent ces objets. Ne pas recopier `1`, `100`, `-10`, `15` dans le gabarit ni dans `defineSchema`.
- **Commentaires en français**, avec la source de la règle quand elle existe : `// Réf. LdR v0.2 §15`, `// Réf. Fiche v0.2 §4`. Un champ dont le type n'est pas écrit dans les docs porte `// À préciser : types non définis dans LdR v0.2`.
- Identifiant du système, scope de `registerSheet` et nom du dossier Foundry : `sol-nouvelle-ere`.
- Classes CSS de fenêtre : `sol`, `sol-nouvelle-ere`, puis `actor` / `item`.
- Les saisies lisent la source stockée (`document._source` pour le nom, `system._source` pour les champs du modèle), pas la valeur préparée. `value` des caractéristiques est la seule colonne dérivée, et ce n'est pas un input.

### Migration

Renommer ou supprimer une clé **déjà stockée** (une caractéristique, `base` / `origin` / `advance` / `temp`, un champ d'identité, un type de document) exige une méthode statique `migrateData(source)` sur le TypeDataModel. Sans elle, les fiches déjà créées gardent l'ancienne clé et affichent le défaut du nouveau nom.

Ajouter un champ avec une valeur `initial` ne demande pas de migration : Foundry complète les documents existants au chargement. C'est le cas des champs d'identité ajoutés à l'étape 2 sur le Personnage de l'étape 1.

Bornes actuelles (`SOL.characteristicFields`) :

| Champ | Initial | Minimum | Maximum |
|---|---|---|---|
| `base` | 25 | 1 | 100 |
| `origin` | 0 | −10 | 15 |
| `advance` | 0 | 0 | 10 |
| `temp` | 0 | aucune | aucune |

`value` n'est pas un champ du schéma. `prepareDerivedData` la recalcule : `base + origin + advance + temp`.
Un `NumberField` hors bornes est **ramené silencieusement** à la borne la plus proche, sans message. Les `min` / `max` du HTML ne font que guider la saisie.

## Carte des objets autorisés

`SOL.allowedItems` dans `module/config.mjs` est un **choix provisoire à valider par Marc**. Le hook `preCreateItem` s'en sert. Règles posées par la consigne de l'étape 2 :

- `shipModule` uniquement sur `ship` ;
- `ship` et `vehicle` : pas de skill, talent, origin, background, profession, injury, sequel, augmentation, substance ;
- `drone` : pas de origin, background, profession, talent ;
- origin, background et profession uniquement sur `character`, et au plus un de chaque (ça, c'est écrit : Fiche v0.2 §4).

Tout ce que ces règles n'interdisent pas est autorisé, y compris sur les types dont les docs ne précisent rien (PNJ, Créature, etc.). Ne pas durcir cette carte sans Marc.

## Tester sous Foundry v14

Cible : FoundryVTT 14 (`compatibility.minimum` et `compatibility.verified` valent `"14"` dans `system.json`).

Avant de pousser du code, sans lancer Foundry :

```bash
node --check module/sol.mjs
node --check module/config.mjs
node --check module/guards.mjs
node --check module/data/fields.mjs
node --check module/data/base-item.mjs
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
node --input-type=module -e 'import {readFileSync} from "node:fs"; for (const f of ["system.json","lang/fr.json"]) JSON.parse(readFileSync(f, "utf8"));'
```

Puis le scénario manuel de [TESTER.md](TESTER.md). Le message `Sol, Nouvelle Ère | Initialisation du système` confirme que `module/sol.mjs` a tourné.

## API Foundry utilisées (v14)

Documentation officielle, version 14 :

- [TypeDataModel](https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html) — `defineSchema`, `prepareDerivedData`
- [NumberField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.NumberField.html), [StringField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.StringField.html), [HTMLField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.HTMLField.html), [SchemaField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.SchemaField.html)
- [ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html) et [ItemSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ItemSheetV2.html)
- [HandlebarsApplicationMixin](https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html) et [PARTS](https://foundryvtt.com/api/v14/classes/foundry.HandlebarsApplication.html#PARTS)
- [formGroup](https://foundryvtt.com/api/v14/functions/foundry.applications.handlebars.formGroup.html)
- [Actors.registerSheet](https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Actors.html#registerSheet) / `unregisterSheet` (feuilles V1 : `foundry.appv1.sheets.ActorSheet` et `ItemSheet`)
- [Hooks](https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html) — `init`, `preCreateItem`

Articles utiles : [System Data Models](https://foundryvtt.com/article/system-data-models/), [Localization](https://foundryvtt.com/article/localization/).
