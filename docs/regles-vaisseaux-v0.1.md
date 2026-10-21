# Règles des vaisseaux — brouillon v0.1

*Sol, Nouvelle Ère. Document de travail pour Marc, 21 octobre 2026\. S'appuie sur le Guide des vaisseaux v0.2 (§1, §3, §5, §6, §7), la Bible v0.4 (§7, §12) et le Livre de règles v0.2 (compétences du §4, blessures, DR par dizaines, critiques, arrondis).*

**Règle d'or : de la hard SF, mais un jeu. Des règles, oui ; des règles lourdes, non.**

**Tous les chiffres de ce document sont provisoires, à tester.** Comme partout dans le jeu : on arrondit toujours au supérieur, les DR et DE se lisent sur les dizaines, les critiques suivent le §2 du Livre de règles, et le meneur peut toujours ajuster.

Ce document remplace, pour les vaisseaux, le tableau d'avaries et le Seuil d'avarie (SA) du Guide des vaisseaux §6 : on suit désormais des points d'Intégrité par section, par plaque de blindage et par module.

## 1\. Principes

- Le combat spatial est rare, bref et mortel (Guide §5) : des jours ou des semaines de poursuite visible, puis quelques minutes de tirs. La reddition est fréquente quand le delta-v manque pour fuir.  
- On ne se cache pas dans l'espace (Bible §12) : une fournaise allumée se voit dans tout le système intérieur ; moteur coupé, une coque à 300 K reste visible à environ 15 millions de km pour un réseau de veille (Guide §1). La ruse (faux transpondeur, faux profil) remplace la discrétion.  
- On cherche à neutraliser plutôt qu'à détruire : radiateurs, tuyère, capteurs et antennes sont les cibles naturelles (Guide §5).  
- Pas de carte vectorielle : des postes d'équipage et trois portées abstraites.  
- Les véhicules et vaisseaux n'ont pas d'initiative de personnage (LdR §7) : ce sont le pilote et l'équipage qui agissent, poste par poste.  
- Règle Sereguine : un tir létal, une déviation de masse ou l'abandon d'un compartiment occupé exigent qu'un humain identifié valide l'action. Les greffiers ne peuvent pas la prendre (Guide §6).

## 2\. La feuille de Vaisseau (une seule pour tous)

Tous les vaisseaux et toutes les stations utilisent la même feuille.

- **Type de vaisseau** (liste déroulante, d'après le Guide §3) :  
  - *Vaisseaux atmosphériques* : lanceur lourd réutilisable, navette de ligne, sauteur suborbital, citerne orbitale, atterrisseur lunaire, atterrisseur martien, capsule cargo de descente, dirigeable cargo de Titan, aéronef d'exploration de Titan, glisseur de lac, lanceur de Titan, navette vénusienne, aérostat d'extraction et remonteur, capsule de sauvetage atmosphérique.  
  - *Vaisseaux du vide* : long-courrier à fusion, paquebot à fusion, yacht de luxe, cargo lent à plasma, remorqueur nucléaire thermique, pousse-rocher, prospecteur, raffinerie mobile, porteur d'eau, coffre d'hélium, ravitailleur de masse de réaction, patrouilleur de la Veille, berger, escorteur, corsaire maquillé, double-coque, garde du vide, épaviste, navire-hôpital, vaisseau scientifique, estafette, navire-relais de presse, convoi de colons, araignée de chantier, taxi orbital, drague à débris, sonde robotisée.  
  - *Objets fixes* : habitat en rotation, habitat enfoui, rade, chantier naval orbital, dépôt de carburant, coffre-fort d'hélium, relais de communication, satellites, hôtel orbital, refuge, maternité tournante, station scientifique, laboratoire de quarantaine, poste de la Veille, catapulte électromagnétique, fonderie solaire et raffinerie orbitale, station flottante, ferme orbitale, chantier de la Patience.  
  - *Autre* (texte libre).  
- **Catégorie** : vaisseau atmosphérique, vaisseau du vide, ou objet fixe (station).  
- **Identité** : nom, classe ou constructeur (texte), faction, économie, transpondeur (réel et affiché).  
- **Masse** : à vide, masse de réaction (eau ou hydrogène), total au départ.  
- **Propulsion** : type, accélération en milli-g, delta-v {valeur, maximum}.  
- **Réserves** : air, eau, vivres, en jours.  
- **Chaleur du réacteur** : jauge de 0 à 10 (section 6).  
- **Pièces de rechange** : points (section 7).  
- **Sections** : Intégrité {valeur, maximum} et blindage {valeur, maximum} de chaque section (section 5).  
- **Modules** : les objets « Module de vaisseau » installés (section 4).  
- **Postes** : qui tient quel poste (personnages ou équipage PNJ).  
- **Notes**.

Une station utilise la même feuille, avec la catégorie « objet fixe » : on ignore simplement ce qui ne sert pas (propulsion, delta-v).

## 3\. Le combat par postes

### Les portées

| Portée | Distance (Guide §5) | Ce qu'on peut y faire |
| :---- | :---- | :---- |
| Proche | moins de 1 000 km | lasers contre une coque (quelques centaines de km), lasers contre radiateurs, capteurs et missiles (jusqu'à environ 1 000 km), canons électromagnétiques contre un vaisseau qui manœuvre (quelques centaines de km) ; outils (laser de forage) seulement au contact, à quelques km |
| Moyenne | de 1 000 à 10 000 km | canons électromagnétiques contre une cible en croisière, un habitat ou des radiateurs déployés (des milliers de km) ; missiles |
| Lointaine | plus de 10 000 km | missiles seulement ; on se voit, on se parle, on négocie |

Au début du combat, le meneur fixe la portée d'après la poursuite qui a précédé. Changer de portée demande de gagner un test opposé de Pilotage (voir le poste de pilote) et coûte du delta-v.

### Le tour de combat spatial

Un tour dure environ **une minute**. Au premier tour, les opérateurs des deux vaisseaux font un test opposé d'Opérations de bord : le vaisseau qui gagne agit le premier à chaque poste pendant tout le combat (égalité : le meilleur score d'Opérations de bord). Ensuite, à chaque tour, les postes agissent toujours dans le même ordre :

1. **Commandant**  
2. **Opérateur**  
3. **Pilote**  
4. **Navigateur**  
5. **Artilleur**  
6. **Ingénieur**  
7. **Médecin**

À chaque poste, le premier vaisseau agit, puis l'autre. Les effets s'appliquent tout de suite. Un personnage tient un seul poste par tour ; un poste vide ne fait rien. Un équipage de PNJ a un score unique : **bleu 35, entraîné 50, vétéran 65, élite 80** (Guide §6).

### Les postes

| Poste | Compétence (LdR §4) | Action en combat |
| :---- | :---- | :---- |
| Commandant | Commandement (PRÉ) | Donne \+10 à un poste ce tour (Guide §6). Valide les tirs létaux (Règle Sereguine). |
| Opérateur | Opérations de bord (INT) | **Verrouiller** une cible : sans verrouillage réussi, tir à \-20 au-delà de la portée proche. **Contre-mesures** : test opposé contre un missile qui arrive ; réussite, le missile est leurré. Communications. |
| Pilote | Pilotage (COO), spécialité du vaisseau | **Esquiver** : chaque DR donne \-10 aux attaques contre le vaisseau ce tour (maximum \-30). **Changer de portée** : test opposé contre le pilote adverse ; le gagnant rapproche ou éloigne d'une portée. Échec à 3 DE ou plus : incident au choix du meneur (+1 chaleur, ou un module dégradé). |
| Navigateur | Mécanique orbitale (INT) | **Calculer** : une réussite donne \+10 au pilote ce tour. Hors combat, chaque DR économise environ 5 % du delta-v prévu ; chaque DE au-delà de 1 coûte 5 % de plus ou un jour de retard (Guide §6). |
| Artilleur | Armement de bord (PER) | **Tirer** avec une arme du vaisseau (section 5). Viser une section précise : \-20 ; viser un module précis : \-40. |
| Ingénieur | Réacteurs et propulsion (INT), Mécanique (INT) | **Pousser les moteurs ou le réacteur** (section 6). **Réparation de fortune** : test de Mécanique à \-20, 1 Pièce, un module hors service redevient dégradé jusqu'à la fin du combat. |
| Médecin | Médecine (INT), Premiers secours (INT) | Soigne l'équipage avec les règles de blessures du Livre de règles. |

Autres compétences utiles à bord : Électronique et Informatique (capteurs, greffiers), Systèmes de survie (air, eau, contrôle thermique), Manœuvre en apesanteur et Sortie extravéhiculaire (travail dans le vide, colmatage de coque), Robotique et télépilotage (drones de réparation).

Chaque tour de poussée de combat coûte du delta-v : environ 12 m/s pour un vaisseau à 20 milli-g, 30 m/s à 50 milli-g (l'accélération multipliée par une minute).

**Missiles** : un missile tiré à portée moyenne arrive au début du tour suivant ; à portée lointaine, deux tours plus tard. L'opérateur de la cible peut tenter des contre-mesures, et un laser de défense peut tirer dessus (une attaque normale ; un missile touché est détruit).

## 4\. Le Module de vaisseau

Tout ce qu'on installe sur un vaisseau, armes comprises, est un objet **Module de vaisseau**. Les vaisseaux sont modifiés au fil des années : n'importe quel module peut être retiré, remplacé ou déplacé (au chantier, ou en route avec du temps, des Pièces et des tests de Mécanique).

Chaque module a :

- **Catégorie** : arme, propulsion, réacteur, radiateurs, capteurs, communications, support vital, cabines, soute, blindage, autre.  
- **Section** où il est installé.  
- **Intégrité** {valeur, maximum}.  
- **État**, qui découle de l'Intégrité : **intact** (plus de la moitié), **dégradé** (moitié ou moins : \-20 aux tests qui l'utilisent), **hors service** (0).  
- **Effets** (texte : poussée, puissance, capacité, bonus…).  
- **Masse**.  
- Pour une arme : **dégâts**, **portée** (proche, moyenne, lointaine), **munitions**, **chaleur** produite par tir.  
- Un module **blindage** ajoute ses points à la plaque de blindage de sa section.

Repères d'armes (provisoires, à tester) :

| Arme | Dégâts | Portée | Munitions | Chaleur |
| :---- | :---- | :---- | :---- | :---- |
| Laser de défense | 8 | proche | énergie | \+1 par tir |
| Canon électromagnétique | 12 | proche, moyenne | 20 projectiles | 0 |
| Missile | 20 | moyenne, lointaine | 4 | 0 |
| Laser de forage (outil) | 6 | proche, au contact seulement | énergie | \+1 par tir |

## 5\. Dégâts, Intégrité et critiques

### Sections et blindage

Chaque vaisseau a cinq sections : **proue**, **flanc bâbord**, **flanc tribord**, **poupe** (propulsion) et **radiateurs**. Chaque section a :

- une **Intégrité** (sa structure) ;  
- une **plaque de blindage**, avec ses propres points. Les radiateurs n'ont pas de blindage (Guide §6).

La section Radiateurs ne contient que les radiateurs : on suit seulement l'Intégrité du module Radiateurs.

### Toucher et localiser

L'artilleur fait un test d'Armement de bord, avec les modificateurs habituels (portée, verrouillage, esquive adverse, tir visé). S'il touche, **on inverse les chiffres du dé** (comme au LdR §7) :

| Jet inversé | Section touchée |
| :---- | :---- |
| 01 à 15 | Radiateurs |
| 16 à 35 | Poupe |
| 36 à 50 | Flanc bâbord |
| 51 à 65 | Flanc tribord |
| 66 à 00 | Proue |

Un vaisseau qui fuit présente sa poupe : on échange alors proue et poupe dans le tableau.

Le module touché est tiré au hasard par le meneur parmi les modules de la section (ou choisi par lui).

### Appliquer les dégâts

**Dégâts \= valeur de l'arme \+ DR de l'attaque.** On les applique dans cet ordre :

1. d'abord à la **plaque de blindage** de la section, jusqu'à 0 ;  
2. le reste va au **module** touché, jusqu'à 0 ;  
3. le reste va à l'**Intégrité de la section**.

S'il n'y a plus de module dans la section, le reste va directement à la section. Chaque fois qu'une plaque, un module ou une section tombe à 0, on tire **une fois** sur la table de critiques correspondante (1D6).

### Critique : plaque de blindage à 0 (1D6)

| 1D6 | Effet |
| :---- | :---- |
| 1-2 | Plaque arrachée : rien d'autre pour l'instant. |
| 3-4 | Coque entaillée : fuite lente dans le compartiment derrière (LdR §8). |
| 5 | Brèche : décompression rapide du compartiment. Chaque personnage présent prend 1D10 dégâts d'éclats sur une zone tirée au hasard (règles de blessures et de seuil de brèche du LdR §7). |
| 6 | Éventration : comme 5, et un module de la section devient dégradé. |

### Critique : module à 0 (1D6)

Le module est **hors service** : il ne fonctionne plus (arme muette, capteurs aveugles : \-20 à l'opérateur et à l'artilleur, communications coupées, support vital arrêté : l'air restant se compte en heures, etc.). Puis :

| 1D6 | Effet |
| :---- | :---- |
| 1-4 | Rien de plus. |
| 5 | Fuite ou incendie dans le compartiment (en apesanteur, la fumée ne monte pas ; Guide §4). |
| 6 | Explosion : 1D10 dégâts à l'Intégrité de la section, sans blindage. |

### Critique : section à 0 (1D6)

| 1D6 | Effet |
| :---- | :---- |
| 1-2 | Compartiment perdu : décompression rapide. Les modules de la section restent en place. |
| 3-4 | Compartiment perdu, et tous les modules de la section sont hors service. |
| 5 | Structure tordue : \-20 aux tests de Pilotage jusqu'à réparation au chantier. |
| 6 | Rupture : la section se détache ou s'effondre. Tests de survie de l'équipage présent (Guide §6). |

Un vaisseau dont la poupe et une autre section sont à 0 est une épave : il dérive, sans poussée.

### Les personnages à bord

Une décompression suit les règles du Livre de règles : les personnages sans combinaison subissent le vide (LdR §8) ; une combinaison percée déclenche le compte à rebours de perforation (5 minutes, puis inconscience, puis mort 2 minutes plus tard si la brèche n'est pas colmatée), et la Rustine se pose en une action (test de Survie sous le feu, difficulté Normale par défaut). Hors de ces critiques, un tir sur le vaisseau ne blesse pas l'équipage.

## 6\. Le réacteur, la chaleur et « Pousser les moteurs »

La **jauge de chaleur (0 à 10\) appartient au réacteur seul**.

- **Elle monte** : \+1 par tour de poussée de combat, \+1 par tir de laser, \+1 quand on pousse (voir ci-dessous).  
- **Elle descend**, à la fin de chaque tour, grâce aux radiateurs : \-3 s'ils sont intacts, \-2 s'ils sont dégradés, \-1 s'ils sont hors service. Repliés (pour les protéger), ils ne retirent que 1\.  
- **À 7 et plus** : \-10 à tous les postes (Guide §6).  
- **À 9** : on ne peut plus pousser.  
- **À 10** : l'ingénieur doit choisir. Soit il **coupe le réacteur** (plus de poussée ni de laser ; énergie de secours pour le support vital et les capteurs ; redémarrer demande un test de Réacteurs et propulsion une fois la chaleur revenue à 5 ou moins). Soit il **le laisse tourner**, et on tire sur la table de critique du réacteur à chaque tour passé à 10\.

### Pousser les moteurs ou le réacteur

Action de l'ingénieur : test de **Réacteurs et propulsion** (spécialité du moteur du vaisseau). La chaleur monte de 1 quel que soit le résultat.

- **Réussite** : un bonus pour ce tour, au choix : \+10 au pilote par DR (au moins \+10) ; ou poussée augmentée de moitié (le delta-v consommé aussi) ; ou un tir de laser supplémentaire sans chaleur en plus.  
- **Échec** : pas de bonus, et \+1 chaleur de plus.  
- **Échec à 3 DE ou plus, ou échec critique** : on tire sur la table de critique du réacteur.

### Critique : réacteur (1D6)

| 1D6 | Effet |
| :---- | :---- |
| 1-2 | Arrêt d'urgence automatique : comme si l'ingénieur avait coupé le réacteur. |
| 3-4 | Fuite de liquide de refroidissement toxique dans la poupe (Guide §4). |
| 5 | Le module réacteur tombe à 0 (hors service), et 1D10 dégâts à l'Intégrité de la poupe. |
| 6 | Fuite radioactive : 300 mSv de dose aiguë à tout l'équipage (Exposé), 1 000 mSv aux personnes présentes dans la poupe (Irradié) ; paliers de radiation du LdR §8. |

## 7\. Réparations

On reprend le Guide §6 : la réparation est un **test prolongé de Mécanique**, avec un intervalle d'**une heure en route** ou de **dix minutes en urgence**. Chaque test réussi :

- consomme **1 point de Pièces de rechange** ;  
- rend **5 points d'Intégrité, plus 5 par DR**, à un module, une plaque ou une section.

L'état du module se met à jour tout seul (hors service, dégradé, intact). Une plaque de blindage ne se répare qu'à la moitié de son maximum hors d'un chantier. Sans Pièces, on ne répare plus : on bricole (récupération d'épave, Robotique et télépilotage, ou le meneur décide). Une coque se colmate par un test prolongé (LdR §6 et §8).

## 8\. Prototype : le prospecteur « Petite Fortune »

*Un petit prospecteur de la Ceinture, sociétaire de la Mutuelle. Tous les chiffres sont provisoires, à tester. Ordres de grandeur cohérents avec la Bible (§7) et le Guide (§3b) : le moteur nucléaire thermique à l'eau est celui des remorqueurs de la Mutuelle, et l'eau se refait sur n'importe quel rocher glacé.*

*Propulsion, accélération et delta-v ajustés le 21/10/2026 (avis Expert Science). Décision Marc 21/10/2026. Masses inchangées (80 t à vide, 150 t d'eau, 230 t au départ). Radiateurs inchangés (environ 50 m²).*

- **Type de vaisseau** : prospecteur. **Catégorie** : vaisseau du vide.  
- **Faction** : indépendant, sociétaire de la Mutuelle. **Économie** : mines.  
- **Équipage** : 4 (2 au minimum, 6 au maximum) ; souvent une famille.  
- **Masse** : 80 t à vide ; 150 t d'eau de masse de réaction au plein ; 230 t au départ.  
- **Propulsion** : nucléaire thermique à l'eau, 350 s ; 21 milli-g au plein, environ 60 milli-g presque à vide, environ 49 kN, environ 2,9 h de poussée au total (un patrouilleur de la Veille monte à 50 milli-g : on ne le distance pas au plein). Ajusté le 21/10/2026.  
- **Delta-v** : 3,6 km/s au plein (de quoi sauter d'un rocher à l'autre, pas de traverser la Ceinture sans refaire le plein). Ajusté le 21/10/2026.  
- **Énergie** : le même cœur nucléaire, en mode électrique à l'arrêt, environ 100 kW électriques.  
- **Radiateurs** : environ 50 m², repliables.  
- **Réserves** : air 90 jours, eau 180 jours (recyclée), vivres 150 jours.  
- **Chaleur du réacteur** : 0 / 10\. **Pièces de rechange** : 6\.  
- **Équipage PNJ par défaut** : entraîné (50).

### Sections

| Section | Intégrité | Blindage |
| :---- | :---- | :---- |
| Proue (bouclier contre les micrométéorites) | 20 | 8 |
| Flanc bâbord | 15 | 4 |
| Flanc tribord | 15 | 4 |
| Poupe (propulsion) | 20 | 4 |
| Radiateurs | 6 (module) | 0 |

### Modules

| Module | Catégorie | Section | Intégrité | Masse | Effets |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Moteur nucléaire thermique | propulsion | poupe | 10 | 6 t | 21 milli-g au plein, eau, 350 s ; environ 60 milli-g presque à vide, environ 49 kN, environ 2,9 h de poussée au total. Ajusté le 21/10/2026 |
| Cœur du réacteur (bimodal) | réacteur | poupe | 8 | 12 t (avec le bouclier d'ombre) | porte la jauge de chaleur ; environ 100 kW électriques à l'arrêt |
| Radiateurs repliables | radiateurs | radiateurs | 6 | 3 t | environ 50 m² |
| Réservoir d'eau bâbord | autre | flanc bâbord | 8 | 3 t (vide) | 75 t d'eau ; percé, il perd sa masse de réaction et donc du delta-v |
| Réservoir d'eau tribord | autre | flanc tribord | 8 | 3 t (vide) | 75 t d'eau ; comme le réservoir bâbord |
| Capteurs (radar, lidar, télescope infrarouge) | capteurs | proue | 4 | 1 t | prospection et veille |
| Antenne et laser de communication | communications | proue | 4 | 1 t | liaison avec Cérès, avec le délai lumière |
| Passerelle, cabines et carré (4 couchettes de 2 m³) | cabines | proue | 6 | 6 t | jusqu'à 6 personnes en se serrant |
| Support vital et abri anti-éruption entouré d'eau | support vital | flanc tribord | 6 | 6 t | recyclage de l'air et de l'eau ; abri pour 6 |
| Soute à échantillons | soute | flanc bâbord | 6 | 5 t | 20 t de carottes et d'échantillons |
| Sondes et foreuses | autre | flanc bâbord | 4 | 2 t | 6 sondes de forage |
| Sas et propulseurs dorsaux | autre | flanc tribord | 4 | 2 t | sorties extravéhiculaires |
| Laser de forage | arme | proue | 4 | 2 t | outil légal : dégâts 6, portée proche au contact seulement (quelques km), énergie, \+1 chaleur par tir |

Le reste de la masse à vide (environ 28 t) est la structure de la coque.

## 9\. Questions ouvertes

1. **Catégorie de la feuille** : le système actuel distingue « vaisseau » et « station ». *Recommandation* : la remplacer par les trois catégories du Guide (atmosphérique, vide, objet fixe), « station » devenant « objet fixe ». *Décision Marc 21/10/2026 : c'est en place (`atmospheric`, `void`, `fixed`). L'ancienne clé `ship` devient `void`.*  
2. **Échelle des dégâts** : les dégâts des armes de bord et l'Intégrité des sections sont au jugé. *Recommandation* : tester un duel « Petite Fortune » contre un patrouilleur de la Veille, puis ajuster les deux ensemble.  
3. **Missiles** : temps de vol et contre-mesures sont très simplifiés. *Recommandation* : garder « arrivée au tour suivant » tant que les tests ne montrent pas de problème.  
4. **Laser de forage et armement civil** (Guide §8) : peut-on armer légalement un vaisseau civil ? *Recommandation* : le laser de forage reste un outil légal ; s'en servir contre un vaisseau est une infraction pour la Veille.  
5. **Conditions Fatigué et Tendu** (longs trajets, Guide §6) : elles n'existent pas dans le Livre de règles §11. *Recommandation* : les ajouter au LdR, avec \-10 chacune.  
6. **Blessures de l'équipage** : ici, l'équipage n'est blessé que sur certains critiques. *Recommandation* : garder cette règle légère, et voir en test si les combats manquent de danger pour les personnages.