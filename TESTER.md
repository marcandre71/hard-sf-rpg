# Tester le système « Sol, Nouvelle Ère » (0.5.7, initiative)

Guide pas à pas, sans connaissances techniques. Durée : environ 15 minutes.
Version attendue : **0.5.7**.

La procédure des dégâts (versions 0.5.0 à 0.5.4) est dans [docs/tests/etape-5.md](docs/tests/etape-5.md).

Gardez la console ouverte (**F12**, onglet **Console**) pendant tout le test. À la fin, elle ne doit contenir **aucune ligne rouge**. L'erreur ancienne « Unresolved StringTerm undefined » ne doit plus apparaître.

## 1. Mettre à jour

1. Fermez Foundry s'il est ouvert.
2. Le dossier du système doit s'appeler **exactement** `sol-nouvelle-ere`, dans `Data/systems`.
3. Mettez le dossier à jour (`git pull`, ou remplacez le contenu par le ZIP). Le fichier `system.json` doit rester directement dans ce dossier.
4. Relancez Foundry (version 14). Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.5.7**.
5. Ouvrez votre monde. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`.

## 2. Deux combattants

1. Posez deux jetons : un **Personnage** (PER et RÉF déjà remplies, par exemple Ilka) et un **Synthétique**.
2. Sélectionnez les deux. Clic droit sur un jeton, bouton des épées : ils entrent dans le combat.
3. Dans le **Combat Tracker**, lancez l'initiative des **PNJ** seulement (le bouton du tracker qui ne vise pas les joueurs). Une carte **Vigilance** apparaît pour le synthétique. Un avertissement dit qu'il n'a ni Vigilance ni Perception et que le test est à **0**. Pas de ligne rouge. Le personnage n'a pas encore de carte.
4. Lancez ensuite l'initiative de **tout le monde** (l'autre bouton du tracker). Seul le personnage, qui n'a pas encore lancé, a une carte. La fenêtre de difficulté s'ouvre s'il est seul à lancer : choisissez **Normale**. S'il y en a plusieurs d'un coup, il n'y a pas une fenêtre par personne : c'est **Normale**.
5. Le personnage en **réussite** est au-dessus du synthétique (échec). Dans le tracker, la case d'initiative affiche le jet, par exemple **2 DR · RÉF 57** ou **3 DE**, pas un grand nombre du genre 1002057. La carte de discussion montre les mêmes DR ou DE. Ce n'est pas un bonus.
6. Jouer en premier ne change aucun jet suivant : lancez une compétence, le score n'a pas de bonus d'ordre.
7. Cochez le synthétique comme **caché** dans le tracker, effacez son initiative, et relancez-la. La carte est **chuchotée au MJ** : un joueur ne la voit pas.

## 3. L'ordre reste

1. Démarrez le combat s'il ne l'est pas, puis passez au **round suivant**.
2. L'ordre des deux noms est le même. Aucune nouvelle carte de Vigilance.

## 4. Blessure grave, puis Sonné

1. Sur le personnage qui joue en premier : Base de **FOR** à **30**, Base de **CON** à **40** (Origine, acquis et temporaire à 0). Le Seuil vaut **4**.
2. Armure équipée, protection du **torse** à **6**.
3. Une arme à **10** dégâts, lancée en réussite, zone **torse**, dégâts affichés **10, 11, 12 ou 13** (DR 0 à 3). Appliquez : la gravité est **Grave**.
4. Passez au round suivant. Ce personnage est **en bas** de l'ordre, dans le même geste que le nouveau round : il ne redevient pas actif une seconde (pas de « à vous », pas de surbrillance qui saute). Pas de nouveau jet de Vigilance. Le tour en cours reste le premier de la liste. Si c'est un compte **joueur** qui clique, le déplacement a quand même lieu au début du nouveau round, pas un round plus tard.
5. Sur l'autre combattant, clic droit sur le jeton, conditions, **Sonné**. Le texte rappelle : pas d'action ce tour, une réaction reste possible. Rien ne bloque le tour : c'est un rappel.
6. Passez au round suivant. Le sonné passe **en bas**. Les autres ne bougent pas entre eux.

## 5. Interrompu, et se replacer

Il faut au moins trois combattants, et le combat **démarré**. Avant le début, **Se replacer** n'est pas dans le menu.

1. Le premier est en surbrillance. Clic droit sur un combattant **plus bas, qui n'a pas encore joué** et qui n'est pas le dernier. **Interrompu : recule d'une place**. Il échange tout de suite avec le suivant. La surbrillance reste sur la même personne. Pas de carte de dés.
2. Clic droit sur la personne **en surbrillance** (ou sur quelqu'un au-dessus, déjà joué). **Interrompu**. L'ordre ne change pas tout de suite. Passez au round suivant : il a reculé d'une place. Personne n'a sauté son tour, et personne n'a rejoué.
3. **Se replacer** (MJ, ou le joueur propriétaire) sur quelqu'un **qui n'a pas encore joué**. La fenêtre de Vigilance s'ouvre. La carte dit que **l'action de ce tour est sacrifiée**. Sa place suit le nouveau jet tout de suite. La surbrillance ne change pas de personne.
4. **Se replacer** sur la personne **en surbrillance**, ou sur quelqu'un **déjà joué** (au-dessus). La carte apparaît, l'ordre **ne change pas** ce round. Passez au round suivant : il prend la place du nouveau jet. Personne ne rejoue, personne n'est sauté.
5. Sur le **dernier** de la liste, **Interrompu** ne change rien.
6. **Effacer l'initiative** d'une ligne qui affiche « 2 DR » : le libellé disparaît, le bouton de dé revient. Si le MJ tape un nombre à la main dans la case, l'ancien « 2 DR » disparaît aussi.
7. Avec **deux MJ**, le second (pas celui qui a la main) voit **Interrompu** et ça recule bien. Une blessure grave appliquée par ce second MJ envoie quand même en fin d'ordre au round suivant.

## 6. Véhicule

1. Posez un **Véhicule** et ajoutez-le au combat.
2. Lancez son initiative (le dé sur sa ligne). Un avertissement dit qu'il ne peut pas. Pas de ligne rouge, pas de nombre d'initiative.

## 7. Liste de contrôle

- [ ] Version **0.5.7**, aucune ligne rouge. Plus d'erreur « StringTerm undefined ».
- [ ] Personnage, PNJ, créature, synthétique et drone peuvent lancer. Véhicule et vaisseau : avertissement, pas de plantage.
- [ ] Carte de Vigilance. Réussites au-dessus des échecs. Le tracker affiche « 2 DR · RÉF 57 » ou « 3 DE », pas le code de tri. Pas de bonus.
- [ ] Un PNJ caché : la carte est chuchotée au MJ.
- [ ] Round suivant : même ordre, pas de nouveau jet.
- [ ] Blessure grave (ou pire) : en bas au début du round suivant, même si c'est un joueur qui change de round. **Sonné** : pareil, et le tour n'est pas bloqué.
- [ ] **Interrompu** sur quelqu'un qui n'a pas encore joué : tout de suite, la surbrillance ne bouge pas. Sur l'actif ou un déjà joué : au round suivant, sans tour sauté ni rejoué.
- [ ] **Se replacer** seulement une fois le combat démarré (propriétaire ou MJ). La carte rappelle l'action sacrifiée. Pas encore joué : tout de suite, la surbrillance ne bouge pas. Actif ou déjà joué : au round suivant, sans tour sauté ni rejoué.
- [ ] Effacer l'initiative, ou taper un nombre à la main, retire le libellé « 2 DR » et le bouton de dé revient si la case est vide.
- [ ] Un second MJ peut interrompre, et sa blessure grave pose la fin d'ordre.
- [ ] « Tout lancer » et « lancer les PNJ » posent des cartes, sans erreur rouge.
