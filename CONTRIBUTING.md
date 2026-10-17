# Contribuer à Sol, Nouvelle Ère

Guide pour les agents IA et les développeurs qui poursuivent ce système FoundryVTT.
L'étape en cours est la **0.1.0** : squelette jouable, rien de plus.

## Petites étapes jouables, validées par Marc

On n'enchaîne pas les mécaniques. Chaque étape doit être **jouable et validée par Marc**
(Marc-André Potheret, propriétaire du dépôt) avant la suivante.

Une étape est acceptable quand :

- le périmètre annoncé dans le README est respecté, sans fonctionnalité en plus ;
- un personnage peut être créé et ses données survivent à la fermeture de la feuille et au rechargement ;
- [TESTER.md](TESTER.md) passe sans ligne rouge dans la console Foundry.

Tant que Marc n'a pas validé l'étape, on ne commence pas la suivante. En cas de doute sur une règle, on lui demande plutôt que d'inventer.

Hors périmètre de l'étape 1 (ne pas les ajouter) : valeurs dérivées (seuil de blessure, tolérance aux g, initiative, Endurance, Sang-froid), compétences, jets de dés, objets, origines comme documents, blessures, vaisseaux, compendiums.

## Où sont les règles du jeu

Les règles ne sont **pas dans ce dépôt**. Elles vivent dans des **Google Docs dont Marc est propriétaire**.
Ce dépôt ne contient que le système Foundry. Ne pas recopier les règles ici, ne pas en créer une version parallèle, et ne pas deviner une formule absente du code ou d'une consigne de Marc.

## Arborescence

```
system.json                         Manifeste Foundry : id, version 0.1.0, compatibilité 14,
                                    esmodules, styles, langue fr, type d'acteur character.
module/sol.mjs                      Point d'entrée. Hook init : CONFIG.SOL, dataModels, registerSheet.
module/config.mjs                   Liste unique des caractéristiques (clés + clés de traduction).
module/data/character.mjs           TypeDataModel du Personnage : schéma et valeur actuelle dérivée.
module/sheets/character-sheet.mjs   Feuille ApplicationV2 (ActorSheetV2 + HandlebarsApplicationMixin).
templates/actor/character-sheet.hbs Gabarit Handlebars de la feuille.
lang/fr.json                        Tous les libellés français.
styles/sol.css                      Mise en forme minimale de la feuille (préfixe .sol).
README.md                           Présentation du jeu, périmètre de l'étape, installation.
TESTER.md                           Scénario de test manuel dans Foundry (Ilka Moravec).
CONTRIBUTING.md                     Ce guide.
```

`module/sol.mjs` est le seul fichier listé dans `esmodules`. Les autres modules sont importés depuis lui. Le gabarit est référencé par un chemin `systems/sol-nouvelle-ere/...` : le dossier installé dans Foundry doit porter cet identifiant.

## Conventions de nommage

- **Clés de code en anglais** : type `character`, champs `base`, `origin`, `advance`, `temp`, `value`, clés de caractéristiques `for`, `con`, `coo`, `ref`, `ada`, `per`, `int`, `vol`, `pre`. Pas d'accent ni d'espace dans une clé stockée.
- **Libellés en français via `lang/fr.json`** uniquement. Le code et le gabarit passent par `{{localize}}` ou par une clé (`SOL.Sheet.Character`, `TYPES.Actor.character`). On n'écrit pas de français en dur dans un `.mjs`, un `.hbs` ou un `.css`.
- **Caractéristiques centralisées dans `module/config.mjs`**. Le modèle et la feuille parcourent `SOL.characteristics`. Pour ajouter ou renommer une caractéristique : la clé dans `config.mjs`, puis le libellé et l'abréviation dans `lang/fr.json`. Ne pas recopier la liste dans un autre fichier.
- Identifiant du système, scope de `registerSheet` et nom du dossier Foundry : `sol-nouvelle-ere`.
- Commentaires et documentation de ce dépôt : en français. Les liens d'API Foundry restent dans leur forme officielle anglaise.

Bornes actuelles, définies dans `CharacterData.defineSchema` (ne pas les déplacer dans le gabarit seul : le schéma est la source de vérité, les `min`/`max` du HTML ne font que guider la saisie) :

| Champ | Initial | Minimum | Maximum |
|---|---|---|---|
| `base` | 25 | 1 | 100 |
| `origin` | 0 | −10 | 15 |
| `advance` | 0 | 0 | 10 |
| `temp` | 0 | aucune | aucune |

`value` n'est pas un champ du schéma. `prepareDerivedData` la recalcule : `base + origin + advance + temp`.

## Tester sous Foundry v14

Cible : FoundryVTT 14 (`compatibility.minimum` et `compatibility.verified` valent `"14"` dans `system.json`).

Avant de pousser du code, sans lancer Foundry :

```bash
node --check module/sol.mjs
node --check module/config.mjs
node --check module/data/character.mjs
node --check module/sheets/character-sheet.mjs
node --input-type=module -e 'import {readFileSync} from "node:fs"; for (const f of ["system.json","lang/fr.json"]) JSON.parse(readFileSync(f, "utf8"));'
```

Puis le scénario manuel de [TESTER.md](TESTER.md) : installer le dépôt comme `Data/systems/sol-nouvelle-ere`, créer un monde « Sol, Nouvelle Ère », ouvrir la console (F12), créer Ilka Moravec, saisir le tableau, vérifier la colonne Actuelle et l'absence de ligne rouge. Le message `Sol, Nouvelle Ère | Initialisation du système` confirme que `module/sol.mjs` a tourné.

## API Foundry utilisées (v14)

Documentation officielle, version 14 :

- [TypeDataModel](https://foundryvtt.com/api/v14/classes/foundry.abstract.TypeDataModel.html) — `defineSchema`, `prepareDerivedData`
- [NumberField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.NumberField.html) et [SchemaField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.SchemaField.html)
- [ActorSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.sheets.ActorSheetV2.html)
- [HandlebarsApplicationMixin](https://foundryvtt.com/api/v14/functions/foundry.applications.api.HandlebarsApplicationMixin.html) et [PARTS](https://foundryvtt.com/api/v14/classes/foundry.HandlebarsApplication.html#PARTS)
- [DocumentSheetV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.DocumentSheetV2.html) — formulaire, `_prepareContext`, action `editImage`
- [Actors.registerSheet](https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Actors.html#registerSheet), qui délègue à [DocumentSheetConfig.registerSheet](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.DocumentSheetConfig.html#registerSheet)
- [Hooks.once](https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html#once)

Articles utiles : [System Data Models](https://foundryvtt.com/article/system-data-models/), [Localization](https://foundryvtt.com/article/localization/).
