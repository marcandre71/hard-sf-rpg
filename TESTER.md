# Tester le système « Sol, Nouvelle Ère » (étape 1)

Guide pas à pas, sans connaissances techniques. Durée : environ 10 minutes.

## 1. Installer le système

1. Fermez Foundry s'il est ouvert.
2. Ouvrez votre dossier de données Foundry, puis le sous-dossier `Data/systems`.
   (Si vous ne savez pas où il est : dans l'écran d'accueil de Foundry, *Configuration* → *Chemin des données utilisateur*.)
3. Copiez-y le dossier du système. Il doit s'appeler **exactement** `sol-nouvelle-ere`
   (si vous avez téléchargé un ZIP depuis GitHub, renommez `hard-sf-rpg-main` en `sol-nouvelle-ere`).
4. Vérifiez : le fichier `Data/systems/sol-nouvelle-ere/system.json` doit exister directement dans ce dossier.
5. Lancez Foundry (version 14). Dans l'onglet **Systèmes de jeu**, « Sol, Nouvelle Ère » version 0.1.0 doit apparaître.

## 2. Créer un monde

1. Onglet **Mondes** → **Créer un monde**.
2. Titre : par exemple « Test Sol ». Système : **Sol, Nouvelle Ère**.
3. Créez le monde, puis lancez-le et connectez-vous en tant que **Gamemaster**.

## 3. Ouvrir la console (pour repérer les erreurs)

Appuyez sur **F12** (ou Cmd+Option+I sur Mac), puis cliquez sur l'onglet **Console**.
Laissez-la ouverte pendant le test. Vous devez y voir la ligne : `Sol, Nouvelle Ère | Initialisation du système`.

## 4. Créer Ilka Moravec

1. Dans la barre de droite, onglet **Acteurs** (icône de silhouette) → **Créer un acteur**.
2. Nom : `Ilka Moravec`. Type : **Personnage**. Validez.
3. La feuille s'ouvre : portrait, nom, et un tableau de 9 caractéristiques. Au départ, toutes les bases valent 25
   et la colonne **Actuelle** affiche 25 partout.

## 5. Saisir les caractéristiques d'Ilka

Ilka est née dans la Ceinture (Cérès) : son origine donne **ADA +15, FOR −5, CON −5**.
Elle a aussi dépensé 5 XP pour **+1 en Volonté** (colonne Progression).
Saisissez les valeurs ci-dessous (cliquez dans la case, tapez le nombre, puis appuyez sur Tab ou cliquez ailleurs :
l'enregistrement est automatique). Laissez **Temp.** à 0 partout.

| Caractéristique | Base | Origine | Progression | Temp. | **Actuelle attendue** |
|---|---|---|---|---|---|
| FOR Force | 30 | −5 | 0 | 0 | **25** |
| CON Constitution | 40 | −5 | 0 | 0 | **35** |
| COO Coordination | 45 | 0 | 0 | 0 | **45** |
| RÉF Réflexes | 35 | 0 | 0 | 0 | **35** |
| ADA Adaptation spatiale | 45 | +15 | 0 | 0 | **60** |
| PER Perception | 40 | 0 | 0 | 0 | **40** |
| INT Intellect | 55 | 0 | 0 | 0 | **55** |
| VOL Volonté | 35 | 0 | 1 | 0 | **36** |
| PRÉ Présence | 30 | 0 | 0 | 0 | **30** |

(Pour −5, tapez `-5` ; pour +15, tapez `15`.)

## 6. Ce qu'il faut vérifier

- [ ] Le système apparaît dans la liste et le monde se lance sans message d'erreur.
- [ ] Le type d'acteur proposé s'appelle **Personnage**.
- [ ] La feuille affiche le nom, le portrait et les 9 caractéristiques avec leurs noms français.
- [ ] Chaque saisie est enregistrée toute seule et la colonne **Actuelle** se met à jour aussitôt.
- [ ] Les valeurs Actuelles correspondent au tableau : FOR 25, CON 35, COO 45, RÉF 35, ADA 60, PER 40, INT 55, VOL 36, PRÉ 30.
- [ ] On ne peut pas écrire dans la colonne **Actuelle** (elle est calculée).
- [ ] Fermez la feuille, rouvrez-la : les valeurs sont toujours là. Même chose après avoir rechargé la page (F5).
- [ ] Le nom peut être modifié depuis la feuille ; cliquer sur le portrait ouvre le choix d'une image.
- [ ] **Aucune ligne rouge** dans la console F12 pendant tout le test.

Test volontaire (facultatif) : tapez une valeur hors limites (par exemple Base = 150, ou Origine = 20).
Foundry doit **refuser** la valeur (message d'avertissement) au lieu de l'enregistrer : c'est normal.
Les limites sont : Base 1 à 100, Origine −10 à +15, Progression 0 à 10.

## 7. Si quelque chose ne va pas

Faites une capture d'écran de la feuille **et** de la console F12 (lignes rouges), et notez l'étape où le problème est apparu.
