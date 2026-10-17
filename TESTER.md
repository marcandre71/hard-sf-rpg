# Tester le système « Sol, Nouvelle Ère » (étape 3)

Guide pas à pas, sans connaissances techniques. Durée : environ 10 à 15 minutes.
Version attendue : **0.3.0**.

La procédure de l'étape 2 (version 0.2.0, déjà validée) est dans [docs/tests/etape-2.md](docs/tests/etape-2.md).

Gardez la console ouverte (étape 2) pendant tout le test. À la fin, elle ne doit contenir **aucune ligne rouge**.

## 1. Mettre à jour

1. Fermez Foundry s'il est ouvert.
2. Le dossier du système doit s'appeler **exactement** `sol-nouvelle-ere`, dans `Data/systems`.
3. **Avec git** : dans ce dossier, lancez `git pull`.
   **Sans git** : téléchargez le ZIP du dépôt, décompressez-le, et remplacez le contenu de `Data/systems/sol-nouvelle-ere` (le fichier `system.json` doit rester directement dans ce dossier).
4. Relancez Foundry (version 14). Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.3.0**.

## 2. Console

Ouvrez le monde de l'étape 2. **F12**, onglet **Console**.
Vous devez y voir : `Sol, Nouvelle Ère | Initialisation du système`.

## 3. Ilka : trois onglets

Ouvrez **Ilka Moravec**. L'en-tête (portrait, nom, type **Personnage**) reste visible quel que soit l'onglet.

### Principal

- Identité : Concept, Faction, État ou statut politique, Bloc.
- Trois emplacements : **Origine**, **Milieu**, **Profession**. Vides : une phrase du genre « Aucune origine. » et un bouton **Créer**. Remplis : le nom (cliquable), un bouton modifier, un bouton retirer.
- Le tableau des caractéristiques est **celui de l'étape 2** (FOR Base 30, etc.). On peut encore y écrire. La colonne Actuelle n'est pas une case.
- **Compétences** : nom, abréviation (FOR, INT…), Formation. Pas de score calculé.
- **Atouts**.
- **État physique** : **Blessures** et **Séquelles**.

Atouts, Origine, Milieu, Profession, Blessures et Séquelles sont sur **Principal**, pas dans l'inventaire.

### Inventaire

Listes séparées : **Armes** (dégâts et portée en lecture seule), **Armures/Vêtements** (protection du torse), **Équipement** (quantité), **Augmentations**, **Substances**, **Logiciels**. Chaque liste a son bouton **Créer**.

### Roleplay

Taille, Masse, Âge, Lieu de naissance, Gravité natale, Contacts, Défauts, Biographie, Notes.
Ce qu'Ilka avait déjà dans ces cases (concept mis à part, qui est sur Principal) est encore là.

## 4. Créer un objet par section

Sur Ilka, pour chaque liste ou emplacement vide, cliquez **Créer** (un objet de ce type apparaît ; le nom ouvre sa feuille).

Si l'étape 2 a déjà posé une Origine, un Milieu, une Profession ou une Compétence, c'est bon : ne créez pas un deuxième exemplaire d'Origine, de Milieu ou de Profession (un seul est autorisé). Les autres listes acceptent un objet de plus.

L'en-tête est toujours visible après ces créations.

## 5. L'onglet ne saute pas

1. Allez sur **Roleplay**.
2. Changez l'Âge (un nombre différent de celui affiché), puis cliquez ailleurs.
3. L'onglet reste **Roleplay**. L'âge modifié est toujours affiché.
4. Fermez la feuille, rouvrez-la : l'âge est conservé. L'onglet de départ est de nouveau Principal (le souvenir de l'onglet vaut tant que la feuille n'est pas fermée).

## 6. PNJ

1. Ouvrez **Cobaye PNJ** (créé à l'étape 2). Même feuille qu'Ilka : trois onglets, en-tête **PNJ**, tableau de caractéristiques.
2. Les caractéristiques sont aux défauts : Base **25**, Actuelle **25** (ce PNJ n'avait pas de tableau avant).
3. Onglet **Roleplay**, case **Biographie** : la phrase que vous aviez écrite dans Description à l'étape 2 est là. Elle n'a pas disparu.
4. S'il n'y a pas de Cobaye PNJ : créez un acteur **PNJ**, vérifiez les trois onglets et les caractéristiques à 25.

## 7. Liste de contrôle

- [ ] Version **0.3.0**, console : `Sol, Nouvelle Ère | Initialisation du système`.
- [ ] Ilka : onglets Principal, Inventaire, Roleplay. L'en-tête reste visible.
- [ ] Principal : Origine, Milieu, Profession, caractéristiques, Compétences, Atouts, Blessures, Séquelles.
- [ ] Inventaire : Armes, Armures/Vêtements, Équipement, Augmentations, Substances, Logiciels.
- [ ] Un **Créer** par section vide ajoute le bon type.
- [ ] Changer l'âge sur Roleplay ne ramène pas à Principal.
- [ ] Le PNJ a la même feuille. L'ancienne description est dans Biographie.
- [ ] **Aucune ligne rouge** dans la console.
