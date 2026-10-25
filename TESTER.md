# Tester le système « Sol, Nouvelle Ère » (0.7.2.1)

Pour Marc, sans connaissances techniques.
Les sections 1 à 10 correspondent à la **0.7.0**, déjà sur `main`.
La section 11 est la **0.7.2**, plus le correctif **0.7.2.1** (delta-v visible). On fusionne `dev/0.7.2.1` dans `main` avant de vous envoyer ce test : prenez le ZIP de `main`.

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
   **Résultat attendu :** le tir part. Une réussite dit « Touché (dégâts en 0.7.3) ».
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
