# Tester le système « Sol, Nouvelle Ère » (0.7.4)

Pour Marc, sans connaissances techniques.
Les sections 1 à 10 correspondent à la **0.7.0**, déjà sur `main`.
La section 11 est la **0.7.2**, plus le correctif **0.7.2.1** (delta-v visible), déjà sur `main`.
La section 12 est la **0.7.3** (dégâts, critiques, missiles), déjà sur `main`. Prenez le ZIP de `main`.
La section 13 est la **0.7.4** (chaleur, Pousser, réparations, canon). Elle sert à la séance de test de la v1, avec le ZIP de `main`.

Les sections 1 à 9 sont les essais de la 0.6.3, toujours valables ici. La section 10 est la fiche Vaisseau. La section 11 est le combat spatial simplifié.

L'initiative 0.5.11 est dans [docs/tests/initiative-0.5.md](docs/tests/initiative-0.5.md). Les dégâts 0.5.0 à 0.5.4 sont dans [docs/tests/etape-5.md](docs/tests/etape-5.md).

Gardez la console ouverte (**F12**, onglet **Console**). À la fin : aucune ligne rouge.

## Mettre à jour

1. Fermez Foundry. Le dossier du système s'appelle exactement `sol-nouvelle-ere`, dans `Data/systems`.
2. Mettez-le à jour (`git pull`, ou remplacez par le ZIP). `system.json` reste directement dans ce dossier.
3. Relancez Foundry 14. Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère ». Pour la section 11, la version affichée est **0.7.2.1** (ZIP de `main`, en section 11). Les sections 1 à 10 se faisaient en **0.7.0**.
4. Ouvrez le monde. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`.

Si le monde existait déjà, ouvrez une fois le compendium **Armures et vêtements** pour voir les trois combinaisons à jour.

Armures déjà présentes dans un monde ou sur une fiche avant la 0.6.0 (ex. Ilka, 6/6/6/6) : après migration elles n'ont pas de seuil de brèche (null) et ne percent plus jamais. Supprime-les et reglisse-les depuis le compendium **Armures et vêtements**.

## Préparer

Il faut deux jetons : **Ilka** (celle qui tire) et un **mineur** (la cible).

Sur le mineur, onglet **Principal** : Base de **FOR** à **30**, Base de **CON** à **40**. Origine, acquis et temporaire à **0**. Les Actuelles sont 30 et 40. Le Seuil de blessure vaut **4** (il apparaît dans la fenêtre, pas sur la feuille du personnage). **Endurance** : **8 / 8** (elle part pleine). Un **0** déjà écrit reste 0 : ce n'est pas rempli.

Sur Ilka, une **carabine** : dégâts **10**, compétence `Armes d'épaule`, cochée **Équipé**. COO d'Ilka assez haute pour toucher (par exemple 50).

## 1. L'exemple du mineur

1. Depuis le compendium **Armures et vêtements**, glissez **Combinaison renforcée** sur le mineur. Ouvrez-la : torse **3**, tête **3**, bras **2**, jambes **2**, **Pressurisée**, seuil de brèche **8**. **Équipé** est déjà coché (décision du 20/10/2026 : équipée par défaut au glisser-déposer). Décochez-la, puis recochez-la : décochée, elle ne compte plus. Joints : **Intacte**.
2. Ciblez le mineur. Sur Ilka, lancez la carabine.
3. Dans la fenêtre : difficulté **Normale**, zone visée **Torse (−10)**, actions de visée **0**. Le total affiché est **−10**. Lancez jusqu'à une **réussite** dont la carte dit **Dégâts : 12** (arme 10 + 2 DR) et **Localisation : Torse**.
4. **Appliquer les dégâts** (MJ). La fenêtre montre : bruts **12**, armure **3**, nets **9**, Seuil **4**, gravité **Critique**, seuil de brèche **8**, brèche **Oui**.
5. Confirmez. La blessure est **Critique**, la case **Envoie en fin d'ordre** est cochée, **Active pour le round 1** ne l'est pas. Les joints de la combinaison passent à **Percée**. La condition **Combinaison percée** est sur le jeton. Pas de **Saignement** (ce n'est pas une blessure grave).

## 2. Brèche sans blessure

1. Remettez les joints de la renforcée sur **Intacte**, ou retirez la condition et les joints à la main.
2. Donnez à la renforcée une protection de torse **12** le temps de cet essai (ou empilez une seconde armure non pressurisée qui absorbe tout). Il faut que les dégâts **nets** tombent à 0 ou moins, avec des bruts **supérieurs à 8**.
3. Relancez la carabine, zone **Torse**, jusqu'à des dégâts bruts d'au moins **9** (par exemple 10 + 0 DR = 10, ou 12). Appliquez.
4. La fenêtre dit **Aucune blessure** et brèche **Oui**, avec le seuil **8**. Confirmez : pas de nouvelle blessure, joints **Percée**.

Remettez ensuite la protection du torse à **3**.

## 3. Visière sur l'armure de pont

1. Retirez la renforcée (ou décochez **Équipé**). Glissez **Armure de pont**. Torse **6**, tête **5**, bras **4**, jambes **4**, pressurisée, seuil **12**. La description parle d'une autonomie courte (30 à 60 minutes) et d'un risque de surchauffe. Réserve d'air : **0,5 / 0,5**. Elle est déjà équipée. Joints **Intacte**.
2. Glissez le **Pistolet frangible** du compendium **Armes** sur Ilka. Dégâts **6**, compétence `Armes de poing`. Cochez **Équipé**. La carabine part à 10 : elle ne peut pas tomber sur 6 bruts.
3. Mettez la COO d'Ilka à **59** pour cet essai. Avec **−40**, le score est **19** : environ une chance sur dix d'un 0 DR, et presque autant d'un 1 DR. Une COO de 50 donnerait un score de 10, et un 0 DR n'y arrive presque jamais. Lancez le pistolet. Zone visée : **Visière (−40)**. Actions de visée : **0**. Le total est **−40**. Une réussite dit **Visière** et la localisation **Tête**.
4. **Appliquer les dégâts**. La fenêtre rappelle la visière : armure **3** (moitié de 5), seuil de brèche **6** (moitié de 12). Deux couches équipées s'additionnent d'abord (1 + 3 = 4, puis 2). Les seuils, eux, restent un par couche.
5. Deux réussites, en annulant entre les deux si ce n'est pas le cas voulu :
   - **Dégâts : 6** (arme 6 + 0 DR). Bruts égaux au seuil : brèche **Non**. L'égalité ne perce pas.
   - **Dégâts : 7** (arme 6 + 1 DR). Bruts au-dessus du seuil : brèche **Oui**.

## 4. Viser, sans zone

1. Relancez le pistolet, zone visée **Aucune**, actions de visée **3**. Le total est **+30**. La localisation d'une réussite est celle du dé, pas une zone choisie.

## 5. Arme sans compétence

1. Sur la carabine, effacez la compétence. Elle reste équipée. Le jet part quand même (sur la COO d'Ilka, sans bonus de formation). Remettez `Armes d'épaule` ensuite.
2. Créez une arme dont la compétence est un nom inconnu, par exemple `Lance-flammes`, équipée. Le jet part aussi, sur la COO. On ne refuse plus le dé.

## 6. Endurance à 0

1. Sur le mineur, mettez **Endurance** à **4**, puis à **0**. Une carte apparaît : test de Constitution. Le propriétaire du mineur, ou le MJ, voit les boutons.
2. **Ignorer** : aucun statut n'est posé. Remettez l'Endurance à **4**, puis encore à **0** : une nouvelle carte apparaît.
3. Cette fois, lancez le test. **Réussite** : condition **Épuisé**. Un jet suivant montre **Épuisé (−20)** dans la fenêtre et sur la carte, et le total le compte (dans le plafond ±50, avec la difficulté et le tir visé). **Échec** : condition **Inconscient** du cœur (l'icône habituelle, pas une seconde condition inventée). Le MJ retire le statut depuis le HUD du jeton s'il veut annuler. Si c'est le MJ qui a mis l'Endurance à 0, le joueur propriétaire voit quand même **Ignorer** et le test : la résolution est sur la fiche, pas sur la carte du MJ.
4. Tant que l'Endurance reste à **0**, une seconde carte ne doit pas sortir. Remettez une valeur au-dessus de 0 : un nouveau passage à 0 peut reproposer le test.

## 7. Fin d'ordre

1. Démarrez un combat avec le mineur **déjà** porteur d'une blessure grave dont **Envoie en fin d'ordre** est cochée, et **Active pour le round 1** décochée. Au round 1 il ne part pas en bas à cause de cette blessure.
2. Cochez aussi **Active pour le round 1**, sur quelqu'un qui a déjà lancé son initiative, **avant** de démarrer un nouveau combat. Il part en bas dès le round 1.
3. Une blessure **légère** créée par **Appliquer les dégâts** a la case **Envoie en fin d'ordre** décochée.
4. Pendant un combat déjà lancé, cochez **Envoie en fin d'ordre** sur une blessure : au round suivant, le personnage part en bas. Décochez-la avant ce round : il ne part pas à cause de cette case. Un renvoi **Sonné** déjà marqué, lui, reste.

## 8. Compte à rebours et Rustine

1. Avec la combinaison percée (section 1 ou 3), la fiche du mineur affiche le temps qui reste, environ **5 min**, et un rappel de réserve d'air si l'armure en a une. Le MJ reçoit un message, avec le bouton **Arrêter le compte à rebours**.
2. Décochez **Équipé**, ou retirez l'armure percée de la fiche. Le compte **continue** : la fiche affiche encore le temps, le statut **Combinaison percée** reste. Remettez l'armure et recochez **Équipé** pour la suite, ou laissez-la de côté : l'horloge ne dépend pas d'elle.
3. En MJ, **Arrêter le compte à rebours** (sur la fiche, ou sur le message). L'horloge s'arrête. Le statut **Combinaison percée** reste. La fiche le dit. Un message au MJ le dit. Le bouton disparaît. `await game.time.advance(300)` ne rend plus Inconscient à cause de cette horloge. Retirez le statut à la main : une brèche suivante peut relancer un compte neuf.
4. Repercez. Dans la console, en MJ : `await game.time.advance(300)`. Le mineur passe **Inconscient**. Un message au MJ le dit. La fiche parle des **2 min** avant la mort. Un tour de combat fait avancer le temps du monde de 5 secondes : ce n'est plus figé.
5. `await game.time.advance(120)`. Le statut **Mort** du cœur est posé d'office, avec un message au MJ (décision du 20/10/2026). Rien de silencieux.
6. Recommencez une brèche (remettez les joints à **Intacte**, retirez Inconscient et Mort, percez à nouveau). Avant les 5 minutes, glissez **Rustine** depuis **Équipement**. Bouton **Colmater**, **Au calme**. La condition part, l'horloge s'arrête, la quantité de la Rustine baisse de 1, les joints repassent **Intacte**. Pas de dé. Le MJ reçoit un message « brèche colmatée ». Le propriétaire de la fiche peut ouvrir **Colmater**, pas seulement le MJ.
7. Percez encore, avec une seconde Rustine (ou remettez la quantité à 1). **Colmater**, **Sous le feu**. La compétence **Survie** est déjà choisie si elle est sur la fiche (décision du 20/10/2026 : Survie, pas « Systèmes de survie » ; sinon un message le dit, et on en choisit une autre). La fenêtre de jet habituelle s'ouvre, difficulté **Normale** (pas Aisée). Le MJ peut changer la compétence et la difficulté. **Réussite** : même effet qu'au calme, message au MJ compris. **Échec** : la brèche reste et la Rustine n'est pas consommée (décision du 20/10/2026).
8. Compendium **États** : un journal, une page par état (Saignement, Sonné, Épuisé, Combinaison percée, etc.). La page **Hypoxie** dit stade 1 = −10, stade 2 = −20, stade 3 = inconscience, sans note d'écart entre le §11 et le §8. La page **Combinaison percée** dit « Survie par défaut, le meneur peut changer la compétence et la difficulté », sans mention à confirmer. Compendium **Blessures** : légère (case fin d'ordre décochée), grave, critique et mortelle (case cochée), et des entrées de machine marquées à confirmer (grave et pire : case cochée aussi). Les icônes du pion ne deviennent pas des objets.

## 9. Retour de la 0.6.2

Les points 1 à 6 ont déjà marché. Ici, seulement ce qui a changé.

1. Onglet **Principal** du mineur, section **Blessures**. Chaque blessure a une case **Fin d'ordre** (l'info-bulle dit « Envoie en fin d'ordre au prochain round »). Cochez-la : elle se coche aussi dans la fenêtre de la blessure. Décochez-la : elle se décoche. Le joueur propriétaire peut le faire, pas seulement le MJ. Pendant un combat, cocher envoie en bas au round suivant ; décocher avant ce round annule, même s'il reste une autre blessure cochée lors d'un round précédent.
2. Glissez la compétence **Survie** du compendium **Compétences** sur le mineur (décision du 20/10/2026 : Survie, pas « Systèmes de survie »). Percez une combinaison, **Colmater**, **Sous le feu**. **Survie** est déjà sélectionnée. La difficulté proposée est **Normale**. Le MJ peut changer les deux. **Au calme** ne demande toujours pas de dé.
3. Armure **pressurisée** et **équipée**, joints **Intacte**. Passez les joints à **Percée** (laissez Pressurisée cochée). Tout de suite, un message au MJ dit que le compte à rebours a démarré, et la fiche affiche le temps. Dans la console, en MJ : `await game.time.advance(300)`. Le mineur passe **Inconscient**. Remettez les joints à **Intacte** : le statut part, le MJ a un message « brèche colmatée », sans dépenser de Rustine. C'est un outil du MJ (décision du 20/10/2026), sans test. Les règles de réparation viendront plus tard.
4. Décochez **Pressurisée** : Joints se grise et affiche « Sans effet : armure non pressurisée ». Recochez **Pressurisée** pour la suite, ou laissez.
5. Autre façon de lancer le compte : clic droit sur le pion, conditions, **Combinaison percée**. Le même message au MJ part. `await game.time.advance(300)` rend **Inconscient** si le compte n'avait pas déjà été arrêté.
6. Onglet **Principal**, au-dessus des **Blessures**, section **États**. Elle liste ce qui est actif sur le pion (icône, nom). Posez **Épuisé** ou **Combinaison percée** depuis le pion : la ligne apparaît. Le bouton pour retirer est là pour le MJ et pour le propriétaire.
7. Depuis le compendium **États**, glissez la page **Saignement** sur la fiche. La ligne **Saignement** apparaît. Glissez **Hypoxie** : un message dit qu'il n'y a pas de condition, et rien n'est posé. Glissez le journal entier (pas une page) : un message demande de glisser une page.
8. Après la mort par perforation, retirer le statut vaincu (Mort) à la main suffit : il ne revient pas.

## 10. 0.7.0 Vaisseaux

**Testez dans une copie du monde ou un monde neuf, et ne rouvrez pas ce monde en 0.6.3.** Les catégories `void` et `fixed` sont refusées par la 0.6.3.

https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip

Le dossier décompressé s'appelle `hard-sf-rpg-main`. Renommez-le `sol-nouvelle-ere` et remplacez `Data/systems/sol-nouvelle-ere`. Fermez Foundry avant. Au retour, la version affichée est **0.7.2.1** si la section 11 est déjà fusionnée, **0.7.0** sinon.

1. Compendiums, dossier **Acteurs**, pack **Vaisseaux**. Glissez **Petite Fortune** dans le monde (l'onglet Acteurs). Ouvrez la fiche.
2. Onglet **Général**. Type : **Prospecteur**. Catégorie : **Vaisseau du vide**. Faction et économie sont remplies. Masse à vide **80**, masse de réaction **150**, nature **Eau**. Le total au départ affiche **230** (vous ne le tapez pas). Accélération **21**. Delta-v **3,6 / 3,6**. Réserves : air **90**, eau **180**, vivres **150**. Chaleur **0** (la jauge va jusqu'à 10, réacteur seul). Pièces de rechange **6**. Équipage PNJ : **Entraîné (50)**.
3. Onglet **Sections & modules**. Proue **20 / 20**, blindage **8 / 8**, plaque affichée **8**. Flancs **15 / 15** et blindage **4**. Poupe **20 / 20** et blindage **4**. Radiateurs : pas de case de blindage, et pas de saisie d'Intégrité de section. La ligne **Radiateurs repliables** montre **6 / 6** et l'état **Intact**. Le **Moteur nucléaire thermique** (poupe) dit 21 milli-g au plein, 350 s, environ 60 milli-g presque à vide, environ 47 kN, durée indicative environ 2,9 h. Comptez les modules : **13**, répartis sur les sections (le laser de forage est en proue, catégorie Arme).
4. Onglet **Postes**. Les sept postes sont vides, avec la mention équipage PNJ **50**. Depuis l'onglet Acteurs, glissez un **personnage** sur **Pilote**. Son nom apparaît. **Retirer** : le poste redevient vide. Glisser un acteur encore dans un compendium (sans l'importer dans le monde) avertit et ne remplit pas le poste. Un PNJ du monde, lui, peut tenir le poste.
5. Onglet **Notes**. La description parle de l'équipage et de la coque. Vous pouvez écrire une note : fermez la fiche, rouvrez, elle est encore là.
6. Sur la proue, le **Laser de forage** : passez son Intégrité de **4 / 4** à **2 / 4**. L'état devient **Dégradé**, avec le rappel −20. Passez-la à **0** : **Hors service**. Remettez **4 / 4** : **Intact**.
7. Bouton **Créer — Module de vaisseau**. Tant que l'Intégrité reste **0 / 0**, l'état est **Non renseigné** (pas Hors service) et la plaque de la proue reste **8**. Ouvrez le module : catégorie **Blindage**, section **Proue** (la section se change aussi sur la ligne du vaisseau), points de blindage **3**. Le maximum d'abord : une valeur au-dessus du maximum est ramenée au maximum. Passez le maximum à **4**, puis la valeur à **4**. La plaque affichée passe de **8** à **11**. Mettez la valeur à **0** en laissant le maximum à **4** : **Hors service**, la plaque redescend à **8**.
8. Onglet Général, catégorie **Objet fixe**. Propulsion et delta-v se grisent. Remettez **Vaisseau du vide** : les chiffres **21** et **3,6 / 3,6** sont encore là.
9. Onglet Acteurs, créez un acteur **Vaisseau** vide (bouton de création, type Vaisseau). Ouvrez-le. Les quatre onglets sont là. Type **Autre**, avec une case de texte libre. Catégorie **Vaisseau du vide** (le défaut d'une fiche neuve). Les sections sont à **0**. Aucun module. Changez le type pour **Navette de ligne** (groupe Vaisseaux atmosphériques) : la liste est groupée.

## 11. 0.7.2 Combat spatial simplifié

**Testez en MJ, dans une copie du monde.** Ne rouvrez pas cette copie en 0.6.3 : les catégories `void` et `fixed` y sont refusées.

On fusionne cette branche dans `main` avant de vous envoyer le test. La version affichée au retour est **0.7.2.1**. Les points 1 à 10 ont été validés par Marc le 25/10/2026, sauf le delta-v alors invisible (correctif 0.7.2.1).

1. Quittez Foundry complètement.
   **Résultat attendu :** l'application est fermée. Recharger le monde ne suffit pas.
2. Remplacez le dossier du système par le ZIP https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip . Le dossier décompressé s'appelle `hard-sf-rpg-main` : renommez-le `sol-nouvelle-ere`.
   **Résultat attendu :** le fichier `Data/systems/sol-nouvelle-ere/system.json` est là, sans dossier en double.
3. Relancez Foundry. Jouez en MJ, dans une copie du monde.
   **Résultat attendu :** l'onglet Systèmes de jeu affiche **0.7.2.1**.
4. Dans le compendium **Vaisseaux**, glissez **Petite Fortune** sur la scène, deux fois : deux jetons. Clic droit sur chaque jeton, icône Combat. Ouvrez chaque fiche **depuis son jeton** (double-clic sur le jeton), pas depuis la barre latérale.
   **Résultat attendu :** les deux jetons sont dans le Combat Tracker. La fiche ouverte est celle de ce jeton.
5. Lancez l'initiative (« Lancer l'initiative », ou « Lancer pour les PNJ »).
   **Résultat attendu :** chaque vaisseau a une initiative. Le score se lit sur la carte du chat, pas dans le tracker. Poste Opérateur vide : l'équipage PNJ, score 50.
6. Sur le tour d'un vaisseau, onglet Postes : un bouton par poste (Commandant, Opérateur, Navigateur, Pilote, Artilleur, Ingénieur, Médecin).
   **Résultat attendu :** chaque bouton ouvre un jet. Vous pouvez annuler.
7. Sur les deux fiches ouvertes depuis les jetons, mettez d'abord la **même** portée (par exemple Moyenne). Survolez le jeton adverse et appuyez sur **T** : une seule cible. Puis **Changer de portée**.
   **Résultat attendu :** l'issue dépend des jets. Deux échecs : la portée ne change pas. Sinon le gagnant rapproche ou éloigne, et les deux fiches affichent la même nouvelle portée.
8. Passez les deux fiches à **Proche**. Le laser de forage ne tire qu'en proche, et une fiche neuve est en Moyenne. Puis **Tirer**.
   **Résultat attendu :** le tir part. Une réussite dit « Touché. Le bouton « Appliquer les dégâts » est sur la carte. » S'il n'y a pas une seule cible, la carte le dit et le bouton n'est pas là. Le détail du bouton est en section 12.
9. Dans le compendium **Modules de vaisseau**, glissez **Canon électromagnétique** (Proche et Moyenne) sur la fiche qui tire. Survolez le jeton adverse et appuyez sur **T** (une seule cible), puis réussissez **Verrouiller**. Ensuite **Donner +10** ou **Calculer**. Le MJ passe le round lui-même.
   **Résultat attendu :** l'onglet Postes affiche « Verrouillé : » et le nom de la cible. Le +10 n'est plus dans le modificateur du jet suivant. Repassez la fiche qui tire en **Moyenne**, gardez **T** sur la cible verrouillée : le tir ne propose pas −20. Retirez la cible (**T**) : le tir propose −20. Ce −20 se lit dans le modificateur de la fenêtre de jet. Le bouton **Retirer le verrouillage** (MJ) enlève le nom.
10. Onglet Général, bloc Propulsion : **Delta-v (km/s)**, actuel et maximum. Tapez « 3,5 » dans l'actuel. Fermez la fiche et rouvrez-la. Effacez ensuite la case de l'actuel, ou tapez « abc », puis cliquez ailleurs.
    **Résultat attendu :** les deux saisies sont visibles. Après fermeture et réouverture, la valeur est encore 3,5. Effacer la case ou taper « abc » affiche un avertissement, et l'ancienne valeur réapparaît tout de suite.
11. Passez un vaisseau en **objet fixe**, puis essayez **Changer de portée**.
    **Résultat attendu :** un message refuse la manœuvre. Remettez **Vaisseau du vide** ensuite.
12. Terminez le combat.
    **Résultat attendu :** le tracker se vide. Un combat neuf ne garde pas l'ancien verrouillage.
13. Contrôles courts.
    - Glissez un **véhicule** dans le tracker. **Résultat attendu :** il est refusé.
    - Sur un jet de poste, mettez un modificateur de −60 : le total reste −60. Faites de même pour l'initiative d'**un seul** vaisseau (pas « Lancer l'initiative » pour tout le monde) : −60 reste −60. Sur un jet de personnage, −60 devient −50. **Résultat attendu :** le vaisseau dépasse ±50, le personnage non.
    - Si vous avez encore une copie de monde en 0.7.1, ouvrez-la avec ce système. **Résultat attendu :** le monde s'ouvre, sans message d'erreur.
    - Onglet Général : Delta-v actuel/max visible, saisie 3,5 acceptée, grisé sur objet fixe. **Résultat attendu :** les deux cases se voient, 3,5 reste après fermeture et réouverture. Effacer une case ou taper « abc » affiche un avertissement et l'ancienne valeur réapparaît tout de suite. Un objet fixe a le bloc Propulsion grisé (les nombres restent).
    - Console (**F12**). **Résultat attendu :** pas de ligne rouge, hors l'icône manquante déjà connue.

## 12. 0.7.3 Dégâts, critiques et missiles

**Testez en MJ, dans une copie du monde.** Ne rouvrez pas cette copie avec un système plus ancien.

La 0.7.3 est sur `main`. Prenez le ZIP :

https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip

Le dossier décompressé s'appelle `hard-sf-rpg-main`. Renommez-le `sol-nouvelle-ere`. Fermez Foundry avant de remplacer `Data/systems/sol-nouvelle-ere`.

Il vous faut **deux Petite Fortune**, chacune ouverte **depuis son jeton**.

**Astuce pour aller vite à 0.** Vous n'êtes pas obligé de tirer dix fois. Sur l'onglet **Sections & modules**, baissez à la main la plaque, l'Intégrité d'un module, ou l'Intégrité d'une section. Mettez par exemple la plaque de proue à **1**, ou un module à **1**. Le prochain tir qui touche fera passer à 0. Pour annuler une section détruite, remontez l'Intégrité **et** décochez **Section détruite**.

1. Quittez Foundry. Remplacez le système par le ZIP de `main` : https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip . Le dossier décompressé s'appelle `hard-sf-rpg-main`. Renommez-le `sol-nouvelle-ere`. Relancez. Jouez en MJ, dans une copie du monde.
   **Résultat attendu :** l'onglet Systèmes de jeu affiche **0.7.3**. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`. Pas de ligne rouge, hors l'icône manquante déjà connue.
2. Glissez **Petite Fortune** deux fois sur la scène. Mettez les deux jetons dans le Combat Tracker. Ouvrez chaque fiche **depuis son jeton**. Lancez l'initiative. Cliquez sur **Commencer le combat** pour passer du round 0 au round 1. Mettez les deux fiches à portée **Proche**.
   **Résultat attendu :** les deux vaisseaux sont dans le tracker. Les fiches ouvertes sont celles des jetons.
3. Survolez le jeton adverse et appuyez sur **T** (une seule cible). Onglet Postes, **Tirer**, avec le **Laser de forage**. Choisissez **Sans visée particulière**. Relancez jusqu'à une **réussite**.
   **Résultat attendu :** la carte dit touché, et elle a un bouton **Appliquer les dégâts**.
4. Cliquez **Appliquer les dégâts**.
   **Résultat attendu :** une petite fenêtre montre la **section** (lue sur le dé inversé), un **module** déjà choisi que vous pouvez changer, et le détail : plaque, module, section, perdus. Confirmez. Le chat dit ce qui a été retiré. Le bouton devient **Dégâts appliqués** et il est grisé. Un second clic ne rouvre pas la fenêtre.
5. Sur la cible, onglet Sections, préparez la **proue** : plaque à **1** (la valeur, pas le maximum), un module encore au-dessus de 0. **T** sur ce vaisseau. **Tirer**, **Section (−20)**, choisissez **Proue**. Relancez jusqu'à une réussite, puis **Appliquer les dégâts**.
   Le dégradé, ou le hors service, n'arrive que sur un **6** au dé de critique : une chance sur 6. Astuce : mettez tous les modules de la proue à un maximum de **1**, et remettez la plaque à **1** entre deux essais.
   **Résultat attendu :** la fenêtre montre **Proue**, pas la section du dé inversé. Un tir visé saute la localisation. La plaque passe à **0**. Le chat annonce un critique de plaque (Vaisseaux v0.1 §5). Sur un **6**, si le maximum du module tiré est **supérieur à 1**, il passe à **Dégradé**. S'il est à **1**, il passe **Hors service** et le chat le dit clairement. Les éclats et la décompression sont écrits dans le chat : rien ne se coche tout seul sur l'équipage.
6. Laissez la plaque de proue à **0**. Mettez l'Intégrité d'un module de la proue à **1** (la valeur, pas le maximum). **Tirer**, **Module (−40)**, sur **Proue** et ce module. Réussite, **Appliquer les dégâts**.
   **Résultat attendu :** la fenêtre propose ce module. Il passe à **0** et l'état devient **Hors service**. Le chat annonce le critique de module. S'il s'agit des capteurs, le jet suivant de l'Opérateur et de l'Artilleur propose **−20**. Une arme hors service n'apparaît plus dans **Tirer**. Si le module est les communications ou le support vital, le chat le rappelle, et rien d'autre ne se coupe.
7. Choisissez une section à plaque. Mettez sa plaque à **0**, son Intégrité à **1**, et tous ses modules à **0**. **Tirer**, **Section (−20)**, sur cette section. Réussite, **Appliquer les dégâts**. La fenêtre ne doit pas proposer un module vivant : confirmez.
   **Résultat attendu :** un critique de section. Le **5** et le **6** sont chacun une chance sur 6 : il faut cette face sur le dé, quitte à retirer. Sur un **5**, la case **Structure tordue** se coche et le jet suivant du Pilote propose **−20**. Sur un **6**, la case **Section détruite** se coche (la section compte comme à 0) et tous les modules de la section sont **Hors service**. Si vous en aviez laissé un au-dessus de 0, choisissez **Aucun** dans la fenêtre pour que le coup aille à la section : le 6 met aussi ce module hors service. Entre deux essais, remettez l'Intégrité de la section à **1**, et décochez **Structure tordue** ou **Section détruite** si la case s'est cochée.
8. Sur la cible, onglet Général, cochez **En fuite**. Tirez sans visée, réussite, ouvrez **Appliquer les dégâts** sans confirmer tout de suite. Notez le dé du tir (par exemple 61, qui s'inverse en 16).
   **Résultat attendu :** la section proposée est l'autre bout. Sans la case, 16 à 35 c'est la poupe. Avec **En fuite**, c'est la proue. Décochez ensuite **En fuite**. Annulez la fenêtre si vous ne voulez pas appliquer.
> **Munitions :** chaque lancement, réussi ou raté, retire 1 missile. Si elles tombent à 0, retapez **4 / 4** sur la fiche.

9. Glissez le module **Missile** (compendium **Modules de vaisseau**) sur le vaisseau qui tire. Les munitions doivent montrer **4 / 4** sans que vous les tapiez. Mettez les deux fiches en portée **Moyenne**. **T** sur l'autre jeton. **Tirer**, choisissez le missile. Il n'y a pas de choix de visée. Réussite.
   **Résultat attendu :** les munitions baissent de 1 (**3 / 4** si c'était le premier lancement). Une carte **Missile en vol** donne la cible et le round d'arrivée (le round actuel + 1). Il n'y a pas de bouton **Appliquer les dégâts** sur le jet de lancement. À portée **Proche**, le missile n'est pas dans la liste des armes.
10. Toujours en **Moyenne**, une seule cible, **Tirer** le missile et ratez le jet (échec).
    **Résultat attendu :** les munitions baissent de 1. Le chat dit **missile perdu**. Il n'y a pas de carte **Missile en vol**, et pas d'impact.
11. Cliquez sur **Commencer le combat** pour passer du round 0 au round 1 si ce n'est pas déjà fait, puis passez au round suivant (le MJ, dans le Combat Tracker), pour le missile de l'étape 9.
    **Résultat attendu :** les munitions ne changent pas. Une carte **Missile à l'arrivée**, avec **Contre-mesures**, **Laser de défense** et **Appliquer les dégâts**. Le texte dit que le missile arrive à ce round. Le missile perdu de l'étape 10 n'a pas cette carte.
12. Sur cette carte, **Contre-mesures**. C'est un jet d'Opérations de bord du vaisseau ciblé. S'il gagne contre le jet de lancement, le missile est leurré.
    **Résultat attendu :** les munitions ne changent pas. Le chat dit si le missile est leurré. S'il l'est, **Appliquer les dégâts** ne l'applique plus. À égalité, le missile n'est pas leurré. Vous pouvez relancer un missile si celui-ci a été leurré, pour l'étape suivante.
13. Envoyez un autre missile en **Moyenne**, passez le round, et sur la carte d'arrivée cliquez **Laser de défense**. Choisissez le **Laser de forage** (ou un laser de défense). Si besoin, remettez l'Intégrité du laser de forage de la cible : il a pu être mis hors service aux étapes 6 ou 7. Réussite.
    **Résultat attendu :** le nouveau missile retire 1 munition. Le chat dit que le missile est détruit. **Appliquer les dégâts** ne pose pas l'impact. Un échec laisse le missile : **Appliquer les dégâts** ouvre alors la fenêtre, dégâts **20 + le DR du lancement**.
14. Sur une fiche, mettez l'Intégrité de la **poupe** à **0**, et celle de la **proue** à **0** (les maximums restent au-dessus de 0).
    **Résultat attendu :** le badge **Épave** apparaît en haut de la fiche. Le chat le dit. **Esquiver** et **Changer de portée** sont refusés. L'avertissement dit « Piloter, Esquiver et Changer de portée » : il n'y a pas de troisième bouton, le code ne bloque que ces deux actions du poste Pilote. Remontez une des deux Intégrités au-dessus de 0 : le badge disparaît, et ces deux boutons fonctionnent de nouveau. Si une section est cochée **Section détruite**, décochez-la aussi, sinon elle compte encore comme à 0.
15. Console (**F12**).
    **Résultat attendu :** pas de ligne rouge, hors l'icône manquante déjà connue.

## 13. 0.7.4 Chaleur, Pousser, réparations et canon

Cette section est pour la séance de test de la v1. Prenez le ZIP de `main` :

https://github.com/marcandre71/hard-sf-rpg/archive/refs/heads/main.zip

Le dossier décompressé s'appelle `hard-sf-rpg-main`. Renommez-le `sol-nouvelle-ere`. Fermez Foundry avant de remplacer `Data/systems/sol-nouvelle-ere`.

Il vous faut **une Petite Fortune**, ouverte **depuis son jeton**, dans le Combat Tracker. Cliquez sur **Commencer le combat** pour passer du round 0 au round 1.

**Astuce.** Vous n'êtes pas obligé d'attendre que la jauge monte. Onglet **Général**, changez **Chaleur du réacteur** à la main (6, 8, 9 ou 10). Les **Pièces de rechange** se changent aussi à la main. Pour un module, mettez son Intégrité à 0 ou à 1.

1. Mettez la fiche à portée **Proche**. **Tirer** avec le **Laser de forage**, réussite ou échec.
   **Résultat attendu :** la chaleur monte de **1**. Un tir raté compte aussi. À une autre portée, ce laser n'est pas dans la liste.
2. Mettez la chaleur à **6**, radiateurs intacts (pas repliés, Intégrité au-dessus de la moitié). Passez au round suivant.
   **Résultat attendu :** la chaleur passe à **3** (retrait de 3). Cochez **Radiateurs repliés**, remettez la chaleur à **6**, passez encore un round : elle passe à **5** (retrait de 1). Le texte de la case rappelle la protection, rien d'autre ne se coche. Décochez **Radiateurs repliés**. Reculer d'un round puis revenir ne retire pas la chaleur une seconde fois.
3. Mettez la chaleur à **7**. Lancez un jet de poste (par exemple **Calculer**), ou relancez l'initiative.
   **Résultat attendu :** le modificateur proposé comprend **−10**, en plus des autres bonus ou malus.
4. Mettez la chaleur à **9**. Onglet Postes, **Pousser**.
   **Résultat attendu :** le bouton est refusé.
5. Mettez la chaleur à **10** à la main. Vous pouvez aussi l'y amener par des tirs : les deux façons postent la carte.
   **Résultat attendu :** une carte propose **Couper le réacteur** et **Laisser tourner**. Une seule des deux options part. **Couper** coche **Réacteur coupé**. Ensuite **Esquiver**, **Changer de portée**, le laser et le canon sont refusés. Un missile reste dans la liste si la portée le permet. **Laisser tourner**, ou ne pas cliquer, laisse le réacteur allumé : le critique attend le changement de round si la chaleur est encore à 10. Remettez la chaleur à **5** à la main et cliquez **Redémarrer** : un jet de Réacteurs et propulsion. Réussite : la case se décoche. Échec : elle reste cochée, on peut réessayer au tour suivant. Au-dessus de 5, **Redémarrer** est refusé.
6. Chaleur à **10**, case **Réacteur coupé** décochée. **Laisser tourner**, puis passez le round.
   **Résultat attendu :** un critique de réacteur (1D6) est dans le chat, avec le dé, **avant** que la chaleur baisse. Sur **1-2**, la case se coche. Sur **5**, le module réacteur passe à **0** et la poupe perd le 1D10 sans blindage. S'il tombe sur 5, remettez le module réacteur à **8** avant de continuer. Sur **3-4** et **6**, le chat rappelle la fuite ou la dose, et rien d'autre n'est écrit. La chaleur baisse ensuite (3, ou 1 si les radiateurs sont repliés ou hors service).
7. Remettez la chaleur à **0** entre deux essais. Chaleur à **8** ou moins, réacteur allumé. **Pousser**, jusqu'à une réussite.
   **Résultat attendu :** la chaleur monte de **1**. Trois choix : **+10 par DR au Pilote** (au moins +10) jusqu'à la fin du round, en plus de Calculer ; **Poussée augmentée de moitié**, le chat dit que le MJ ajuste le delta-v ; **Un tir de laser sans chaleur**, et le prochain laser ne fait pas monter la jauge. Un échec simple monte de **2** au total, sans ces choix. Un échec à **3 DE** ou plus, ou un échec critique, monte aussi de **2** et tire le critique du réacteur.
8. Remettez la chaleur à **0** entre deux essais. **Esquiver** ou **Changer de portée**, jusqu'à un échec à **3 DE** ou plus.
   **Résultat attendu :** la chaleur monte de **1**, et une carte pour le MJ propose **+1 chaleur** ou **Un module dégradé**. Vous choisissez le module. S'il a une Intégrité max de **1**, il passe **hors service** et le chat le dit. Sinon il devient **dégradé**.
9. Mettez un module à **0** (hors service). Laissez au moins **1** Pièce. **Réparation de fortune**, réussite.
   **Résultat attendu :** le jet est à **−20**. Une Pièce part seulement si le jet réussit. Le module passe à **1**. Supprimez le combat : le module revient à **0**, et le chat le dit. Un échec ne retire pas la Pièce.
10. Hors combat, avec des Pièces. Mettez une plaque **sous la moitié** de son maximum (par exemple 2 sur un maximum de 8). **Réparer**. Choisissez un personnage qui a **Mécanique**, ou **Équipage PNJ**, cette plaque, et **1 h en route** (ou **10 min en urgence**). Réussite.
    **Résultat attendu :** une Pièce en moins, **+5** et **+5 par DR**, sans dépasser le maximum. La plaque s'arrête à la **moitié** de son maximum. Si elle y est déjà, le jet ne part pas et aucune Pièce n'est dépensée. Recommencez en cochant **Au chantier** : la plaque peut aller jusqu'au maximum. L'intervalle est seulement écrit dans le chat. Le MJ voit les personnages. Un joueur ne voit que l'équipage du vaisseau et les acteurs qu'il possède. Mettez les Pièces à **0** : le bouton est refusé et le chat dit **Bricolage : le meneur décide**. Réparer une section ne décoche pas **Section détruite** et ne remet pas ses modules en service. Seul le MJ décoche **Section détruite** et **Structure tordue**.
11. Glissez le **Canon électromagnétique** (compendium **Modules de vaisseau**). S'il n'affiche pas **20 / 20**, le compteur du compendium le porte déjà. **Tirer**, réussite ou échec.
    **Résultat attendu :** les munitions baissent de **1**. Le laser de forage, lui, ne baisse pas. Le MJ recharge le canon à la main.
12. Console (**F12**).
    **Résultat attendu :** pas de ligne rouge, hors l'icône manquante déjà connue.
