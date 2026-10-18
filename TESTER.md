# Tester le système « Sol, Nouvelle Ère » (étape 4)

Guide pas à pas, sans connaissances techniques. Durée : environ 10 à 15 minutes.
Version attendue : **0.4.0**.

La procédure de l'étape 3 (version 0.3.0, déjà validée) est dans [docs/tests/etape-3.md](docs/tests/etape-3.md).

Gardez la console ouverte (**F12**, onglet **Console**) pendant tout le test. À la fin, elle ne doit contenir **aucune ligne rouge**.

## 1. Mettre à jour

1. Fermez Foundry s'il est ouvert.
2. Le dossier du système doit s'appeler **exactement** `sol-nouvelle-ere`, dans `Data/systems`.
3. Téléchargez le ZIP du dépôt, décompressez-le, et remplacez le contenu de `Data/systems/sol-nouvelle-ere` (le fichier `system.json` doit rester directement dans ce dossier).
4. Relancez Foundry (version 14). Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.4.0**.
5. Ouvrez votre monde. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`.

## 2. Jet de caractéristique

Ouvrez **Ilka Moravec**, onglet **Principal**.

1. Cliquez sur **FOR** (le nom Force, avec le dé). Une fenêtre s'ouvre : le score affiché est l'Actuelle de FOR.
2. Laissez **Normale (0)** et le modificateur à **0**. Le total affiché est **0**. Cliquez **Lancer**.
3. Une carte apparaît dans la discussion. **Annuler** dans la fenêtre ne doit rien envoyer : rouvrez le jet et cliquez Annuler pour le vérifier.

### Lire la carte

- La première ligne est ce qui a été testé (ici FOR).
- **Score** : l'Actuelle, avant la difficulté.
- **Difficulté** : le libellé et son modificateur (Normale, 0).
- **Modificateur** : le nombre libre saisi (0).
- **Total** : difficulté + modificateur, jamais en dessous de −50 ni au-dessus de +50.
- **Score visé** : score + total.
- **Dé** : deux chiffres. **00** veut dire 100.
- Le résultat est **Réussite**, **Échec**, **Réussite critique** ou **Échec critique**.
- **DR** (degrés de réussite) si ça réussit, **DE** (degrés d'échec) sinon. Un 0 est une réussite de justesse, ou un échec sans gravité.

4. Relancez FOR. Choisissez **Extrême (−40)** et mettez le modificateur à **−20**. Le total affiché doit être **−50** (plafonné), pas −60. Lancez. La carte reprend Extrême, modificateur −20, total −50, et un score visé égal à l'Actuelle moins 50.

## 3. Compétence

1. Dans **Compétences**, **Créer**. Ouvrez l'objet (clic sur le nom, pas sur le dé).
2. Nommez-le **Pilotage**. Caractéristique : **Coordination**. Formation : **0**. Cochez **Formation requise (F)**. Laissez **Utilisable sans formation** coché. Fermez la feuille de l'objet.
3. Sur la ligne, le score est la moitié de l'Actuelle de COO, arrondie au supérieur. Exemple : COO 51 → score 26. COO 50 → score 25.
4. Cliquez le **dé** à côté du nom (le nom, lui, rouvre l'objet). La fenêtre montre ce score. Vous pouvez annuler.
5. Rouvrez Pilotage, décochez **Utilisable sans formation**, fermez. La ligne affiche **Impossible**. Le dé prévient et **n'envoie pas** de carte.

## 4. Arme

1. Onglet **Inventaire**, liste **Armes**, **Créer**.
2. Sur la feuille de l'arme : Compétence = `Armes de poing` (cette écriture), Dégâts = un nombre, par exemple 6. Fermez.
3. Sur la ligne, cochez **Équipé**. Le dé n'est là qu'une fois la case cochée. Décochez pour le voir disparaître, puis recochez.
4. Cliquez le dé. Le score est l'Actuelle de COO (Ilka n'a pas de compétence nommée Armes de poing : on utilise COO). Lancez en **Normale**.
5. **Échec** : la carte a un DE, pas de zone. Relancez jusqu'à une **Réussite**.
6. **Réussite** : la carte ajoute une **Localisation** (tête, bras, torse ou jambe) et des **Dégâts** = dégâts de l'arme + DR. Une **Réussite critique** ajoute la phrase « Réussite critique : la zone peut être choisie ». Rien n'est appliqué à une cible : pas d'armure, pas de blessure créée.

## 5. PNJ

Ouvrez **Cobaye PNJ** (ou créez un acteur **PNJ**). Dans le tableau, mettez la **Base** de FOR à **80**. Elle reste 80 (sur un Personnage, la Base s'arrête à 60).

## 6. Liste de contrôle

- [ ] Version **0.4.0**, aucune ligne rouge dans la console.
- [ ] FOR en Normale envoie une carte lisible. Annuler n'envoie rien.
- [ ] Extrême et modificateur −20 : total **−50** dans la fenêtre et sur la carte.
- [ ] Pilotage, formation requise, formation 0 : score = moitié de COO, arrondie au-dessus.
- [ ] Sans « Utilisable sans formation », le jet est refusé.
- [ ] Arme équipée « Armes de poing » : en cas de réussite, localisation et dégâts sur la carte.
- [ ] Base d'un PNJ à **80**.
