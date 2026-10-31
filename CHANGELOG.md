# Journal des versions

## 0.9.3

Branche `dev/0.9.3`, créée depuis `dev/0.9.2`. PR brouillon vers `main`. Elle dépend de la 0.9.2 : on la rebasera sur `main` après la fusion de cette branche. Ne pas fusionner. La section 17 de TESTER.md sert à la séance de test de la v1.

Décision Marc 30/10/2026. Réf. Blessures v0.3, Origines v0.3, Bible v0.1 §6, Glossaire v0.1, Vaisseaux v0.1 §2 et §8.

- Blessures : les 8 entrées déjà là gardent leur id. Les 24 blessures humaines nommées du catalogue sont ajoutées. Les 4 repères de machine restent tels quels : la table des machines attend la 0.8.0.
- Séquelles : les 8 séquelles de radiation du catalogue. Le tirage au dé est [à compléter]. Cancer radio-induit et troubles cognitifs aussi.
- Origines : les 6 concordent, sauf l'habitat tournant, dont la gravité perd « selon l'habitat ».
- Journaux : une page par faction, recopiée de la Bible v0.1 §6, et le glossaire en une page.
- Vaisseaux : Patrouilleur de la Veille et Cargo, provisoires, chiffres de coque repris de la Petite Fortune et marqués à confirmer. Le patrouilleur porte le laser lourd du pack. Le cargo porte le propulseur à plasma du pack. La Petite Fortune n'est pas modifiée.

## 0.9.2

Branche `dev/0.9.2`, PR brouillon vers `main`. Ne pas fusionner. `main` est en 0.9.1 (`eabc8a4`, notes de fusion `9877ce2`). La section 16 de TESTER.md sert à la séance de test de la v1. Le ZIP de `main` ne contient la 0.9.2 qu'après fusion.

Décision Marc 30/10/2026. Réf. Atouts v0.3, Augmentations v0.3, Logiciels v0.3, Substances v0.3. Effets en texte seulement. Pas d'ActiveEffect, pas de jet autonome, pas de champ `geneTherapy` sur le personnage.

- Atouts : les 25 du catalogue, coût 15. Champ `domain` (espace, technique, endurance, combat, social), vide par défaut. Un diff partiel ne le reçoit pas.
- Augmentations : les 14 du catalogue. Le coût reste 0. Là où le catalogue dit [à compléter], la description le dit.
- Logiciels : les 15 du catalogue. Catégorie fermée de 5, utilitaire par défaut. Support pad, tablette ou vaisseau, un seul, vide par défaut. Compétences assistées en texte. Score autonome affiché, sans bouton. Verrou Sereguine coché par défaut ; « Sans-Témoin » est décoché.
- Substances : les 15 du catalogue. Administration et durée en texte. Doses : le maximum vient du catalogue, la valeur actuelle est pleine (`doses.value` égale `doses.max`). Décision Marc 31/10/2026. Une substance créée sans valeur copie ce maximum dans `_preCreate`, seulement si c'est un entier. Un 0 stocké reste 0. Une création sans maximum reste vide. Un diff partiel ne reçoit pas cette valeur. Légalité vide quand le catalogue dit [à compléter]. Chélateur, Souffle Noir et Dortoir gardent [à compléter] dans l'effet.

Décision Marc 31/10/2026, tranchée par Didier : le coût des augmentations reste affiché, à 0. Le verrou Sereguine reste coché par défaut ; « Sans-Témoin » reste décoché. Un objet créé à la main garde ses champs vides, sauf la catégorie de logiciel, qui part sur Utilitaire. Les doses actuelles d'une substance sont pleines.

## 0.9.1

Entrée dans `main` en avance rapide depuis `dev/0.9.1` (`eabc8a4`), accord de Didier le 31/10/2026. Relue par Relecteur. La section 15 de TESTER.md sert à la séance de test de la v1, avec le ZIP de `main`.

Décision Marc 30/10/2026. Réf. Équipement v0.3 et Modules v0.3.

- Équipement : le catalogue. Les trois drones ne sont pas des coquilles : ils viennent en 0.8.0. Masse du TATI : à compléter (Équipement v0.3 §5). Décision Marc 31/10/2026. La Rustine garde son id et son nom, quantité 3, masse 0,2 kg. Les cinq accessoires déjà là restent : le catalogue ne les reprend pas.
- Modules : les 38 du catalogue. Les noms exacts et les 13 noms proches gardent l'id déjà là. Le nom vient du catalogue. Les doublons sont retirés. Deux réservoirs restent, bâbord et tribord. La plaque de proue reste à 8. Le Whipple vaut +4, plafond +4. Les intégrités, les munitions et la chaleur que les tests lisent ne bougent pas. Laser de défense (tourelle) : 3 t. Casier lance-missiles (4 missiles) : 4 t. Réf. Modules v0.3. Ces deux modules ne sont pas sur la Petite Fortune : sa masse de modules reste 52 t. Les effets du moteur gardent 47 kN et 2,9 h : le catalogue ne donne pas ces chiffres.
- Type d'arme de vaisseau : laser, railgun, missile, autre. Il prime sur le nom. Absent d'un diff, il n'est pas inventé : le nom décide encore. Le tir copie ce champ. Décision Marc 31/10/2026 : la tourelle électromagnétique double reste un railgun (munitions, refus si le réacteur est coupé). Le cône d'impacteurs « Berger » reste « autre », et n'est pas un missile.
- Armures : les trois paires proches sont fondues dans l'id déjà là, avec les valeurs du catalogue. La phrase « −10 ou −20 ? » est retirée. Le choix de portée du jet reste libre. Il est masqué pour une arme de contact. Il reste pour le Lance-filet, l'électrochoc (5 m) et le pistolet de scellement (4 m). Décision Marc 31/10/2026 : champ `melee`, case « Arme de contact » sur la fiche d'arme. Foundry écrit déjà `false` dans la source : la case est le moyen de cocher une arme créée à la main. La migration ne l'écrit pas dans un diff partiel. Le mot « contact » dans la description ne sert que si la clé est encore absente. Les malus des descriptions s'ajoutent à la main au malus de portée.

Journal des règles, Armes v0.3 §6, à compléter (pas sur chaque arme) : réduction chiffrée des munitions frangibles ; conséquence d'un tir perforant manqué dans un compartiment pressurisé.

## 0.9.0

Entrée dans `main` en avance rapide depuis `dev/0.9.0` (`ae781ea`), accord de Didier le 30/10/2026. La section 14 de TESTER.md sert à la séance de test de la v1, avec le ZIP de `main`.

Décision Marc 30/10/2026. Réf. Armes v0.3 et Armures v0.3. Pas de citation d'une Bible v0.4 ni d'un Glossaire v0.2. Décision Marc 30/10/2026 : après la 0.9.0, l'ordre est 0.9.1 (équipement et modules), 0.9.2 (atouts, augmentations, logiciels, substances), 0.9.3 (blessures, journaux, vaisseaux PNJ), 0.8.0 (machines), 0.8.1 (habillage SF, ancienne 0.10.0), puis 1.0.0.

- Compendium Armes : les 24 armes du catalogue sauf le lanceur 40 mm, plus la Carabine et le Pistolet frangible déjà là (mêmes ids, mêmes noms, mêmes dégâts). Palier retenu par Marc pour la Q1 le 30/10/2026 (convention, pas une règle du LdR ; Réf. Armes v0.3 §1, qui dit encore « [à compléter : convention à valider] ») : courte jusqu'à 100 m, moyenne jusqu'à 200 m, longue au-delà. Les mètres restent dans la description. Les effets sans base au LdR restent du texte.
- Compendium Armures : les 17 armures du catalogue, plus Combinaison souple, Combinaison renforcée et Armure de pont déjà là (mêmes ids, mêmes noms, mêmes protections). La renforcée de chantier a une pénalité de −10. Réduction de dose, couvert, autonomie du masque de Shangri-La et cadence de surchauffe restent du texte, avec « à compléter » là où la source le dit.
- Les 2 accessoires d'arme et les 3 accessoires d'armure sont de l'équipement : les types arme et armure ne les portent pas. Masse, encombrement ou réserve marqués « à compléter » sont à 0, et la description le dit. La Rustine reste à 1 : la quantité 3 est la 0.9.1.
- Jet d'attaque d'un personnage : choix de portée, courte par défaut. Courte 0, moyenne −10, longue −20, dans le plafond de ±50. Un poste de vaisseau n'a pas ce choix.

## 0.7.4

Branche `dev/0.7.4`, PR brouillon vers `main`. Ne pas fusionner. `main` est en 0.7.3 (`ddbf0d7`, feuille de route `e33862b`). La section 13 de TESTER.md sert à la séance de test de la v1, avec le ZIP de `main` une fois la branche fusionnée.

Décision Marc 30/10/2026. Réf. Vaisseaux v0.1 §6 et §7. Pas d'autre refroidissement que celui des radiateurs, une fois par round.

- Chaleur 0 à 10, réacteur seul. +1 à chaque Esquiver ou Changer de portée, réussi ou raté. +1 par tir de laser, y compris raté et y compris le laser de défense contre un missile (`heatPerShot`). À 7 : −10 à tous les jets de poste, initiative et Pousser compris, en plus du reste. La jauge ne dépasse pas 10.
- Refroidissement au changement de round, par le MJ actif, avant le rappel des missiles : radiateurs intacts −3, dégradés −2, hors service −1. Plusieurs modules : le meilleur. Aucun module : −1. Case « Radiateurs repliés » : −1 seulement. La protection est un rappel, sans automatisme. Hors combat, le MJ change la jauge à la main.
- À 10 : carte « Couper le réacteur » ou « Laisser tourner », pour l'ingénieur ou le MJ. Réacteur coupé : Esquiver, Changer de portée, lasers et canon électromagnétique refusés. Les missiles restent permis. « Redémarrer » : Réacteurs et propulsion, seulement à chaleur ≤ 5. Un échec laisse le réacteur coupé. Un module réacteur hors service compte comme un réacteur coupé, sans redémarrage.
- « Laisser tourner » : au round suivant, si la chaleur est encore à 10 et que le réacteur tourne, critique réacteur 1D6 avant le refroidissement. Le dé est joint à la carte. 1-2 : réacteur coupé. 3-4 : rappel de fuite toxique. 5 : module réacteur à 0, 1D10 à la poupe sans blindage, critique de section si la poupe passe à 0, pas de critique de module en plus. 6 : rappel de dose, rien d'automatique.
- Pousser (Ingénieur, Réacteurs et propulsion, ou score PNJ). Refusé à 9 et si le réacteur est coupé. +1 quel que soit le résultat. Réussite, au choix : +10 par DR au Pilote (au moins +10) jusqu'à la fin du round ; poussée de moitié, rappel dans le chat ; un tir de laser qui ne chauffe pas. Échec : +2 au total. Échec à 3 DE ou plus, ou échec critique : +2 et le critique réacteur.
- Incident du Pilote (échec à 3 DE ou plus sur Esquiver ou Changer de portée) : carte pour le MJ, +1 chaleur ou un module dégradé qu'il choisit.
- Réparation de fortune en combat : Mécanique −20 sur un module hors service. La Pièce part seulement en cas de réussite. Le module passe à 1. À la suppression du combat, il revient à 0 et le chat le dit.
- Réparer hors combat : personnage, cible (module, plaque ou section), intervalle noté seulement (1 h ou 10 min). Réussite : −1 Pièce, +5 +5 par DR, plafonné au maximum. Échec : rien n'est perdu. Une plaque s'arrête à la moitié de son maximum, sauf si « Au chantier » est coché. Réparer une section ne remet pas ses modules, et ne décoche pas Section détruite ni Structure tordue : seul le MJ le fait. Sans Pièces : bouton refusé, « Bricolage : le meneur décide ».
- Chaque tir de canon électromagnétique retire 1 munition. Le rechargement reste à la main. Les lasers n'ont pas de munitions.
- Relecture 0.7.3 : si l'écriture des dégâts échoue, la coque revient en arrière, la marque « appliqué » est retirée, et le chat le dit. Au retour d'un MJ actif, les cartes concernées sont redessinées une par une, les missiles dus sont rappelés, et les tirs jamais enregistrés le sont. Le réglage des tirs déjà appliqués est purgé à la suppression du message. Vider une case de munitions ne vide que cette case. La fiche lit `item._source.system`. L'infobulle du bonus de blindage dit qu'il n'est pas compté aux dégâts. Une carte de tir modifiée après coup, ou un missile hors du chemin missile, n'est pas appliquée. Décision Marc 30/10/2026 : l'auteur peut être le MJ, un propriétaire du vaisseau tireur, ou le propriétaire du personnage assis au poste Artilleur.
- Relecture 0.7.4 : seul le MJ décoche Section détruite et Structure tordue (`user` est l'objet User). Le refroidissement et le critique à 10 ne se rejouent pas si on recule puis on avance. Le critique réacteur 5 qui rompt la poupe met les modules hors service sans jet de critique de module, et le chat le dit, avec de vrais dés. Les boutons Chaleur et Incident ne se prennent qu'une fois, par le MJ actif, après vérification du type de carte, du vaisseau, du poste Ingénieur et de l'action. L'incident est refusé à un non-MJ. Une connexion ne réécrit pas un tir déjà enregistré. Une réparation qui dépasse 1 retire le drapeau de fortune, qui vise le combat du vaisseau. Une cible déjà au plafond ne lance pas le jet. « Canon laser » est un laser. Deux jetons du même acteur ne refroidissent qu'une fois. À confirmer par Marc : le −10 de chaleur à 7 s'ajoute à la réparation de fortune, pas à Réparer hors combat.

## 0.7.3

Branche `dev/0.7.3`, PR brouillon vers `main`. Ne pas fusionner avant la relecture. `main` est en 0.7.2.1 (`bb0aaa7`). Le test pour Marc est TESTER §12, ZIP de `dev/0.7.3`, pas de `main`.

Décision Marc 25/10/2026. Réf. Vaisseaux v0.1 §4 et §5. La chaleur, Pousser et les réparations restent en 0.7.4.

- Bouton « Appliquer les dégâts » sur la carte d'un tir qui touche, réservé au MJ, une fois par carte, puis grisé. La cible est le jeton visé au moment du tir. Dégâts = valeur de l'arme + DR. Plaque de la section, puis module, puis Intégrité de la section. Le surplus est perdu. Les radiateurs n'ont pas de plaque.
- Localisation : dé du tir inversé, tableau §5. Case « En fuite » (MJ) : proue et poupe s'échangent. Un tir visé réussi touche la section ou le module choisi, sans localisation. Le module est tiré au hasard parmi ceux de la section dont l'Intégrité est > 0. Fenêtre de confirmation : section, module modifiable, détail des dégâts.
- Critique 1D6 une seule fois quand une plaque, un module ou une section passe à 0. Plaque 6 : un module vivant de la section devient dégradé. Décision Marc 26/10/2026 : si son Intégrité max est 1, il passe hors service, et le chat le dit. Module à 0 : hors service. Module 6 : 1D10 à l'Intégrité de la section, sans blindage. Section 3–4 : modules de la section hors service. Section 5 : case « Structure tordue », −20 aux tests de Pilotage tant que le MJ ne la décoche pas. Section 6 : section détruite, elle compte comme à 0, y compris pour l'épave, et tous ses modules encore vivants passent hors service (Décision Marc 26/10/2026). Éclats, décompression, fuite, incendie, survie, combinaison percée : annoncés dans le chat avec la référence, pas de compte à rebours sur le vaisseau.
- Capteurs hors service : −20 à l'Opérateur et à l'Artilleur. Arme hors service : elle ne tire pas. Communications et support vital hors service : rappel dans le chat.
- Épave (poupe et une autre section à 0) : badge « Épave », message dans le chat, Piloter / Esquiver / Changer de portée refusés.
- Munitions du module arme : compteur valeur/max. « 4 » devient 4/4. Un texte qui n'est pas un nombre n'écrit pas 0 : le MJ saisit. Un diff sans l'ancien texte ne gagne pas de compteur. À 0, l'arme ne tire plus. Le MJ recharge à la main. Vider une case remet le compteur à vide. Une valeur au-dessus du maximum est ramenée. Décision Marc 26/10/2026 : un lancement de missile consomme une munition, réussi ou raté. Canon et laser : le compteur ne baisse pas tout seul (0.7.4).
- Missile : tir d'Armement de bord, interdit à portée proche, sans visée. Réussite : le missile part, garde son DR, consomme une munition. Arrivée au round suivant en moyenne, deux rounds plus tard en lointaine. Carte « Missile en vol », puis rappel au round d'arrivée (MJ actif) avec contre-mesures, laser de défense et « Appliquer les dégâts ». Échec : le missile part et manque, la munition est consommée, le chat dit « missile perdu ». Pas de carte « Missile en vol », pas d'impact (Décision Marc 26/10/2026). Contre-mesures : test opposé d'Opérations de bord contre le jet de lancement. S'il l'emporte, le missile est leurré. Laser de défense : l'artilleur du vaisseau ciblé, n'importe quel laser, portée proche, sans malus de verrouillage, sans esquive. Touché : missile détruit. Sinon impact automatique, 20 + DR du lancement, localisation par le dé de lancement inversé. Les actions ne sont pas bloquées toutes seules.
- Relecture (Décision Marc 26/10/2026, points déjà tenus et confirmés) : seule la plaque de la section est consommée, le bonus des modules Blindage reste affiché. L'explosion d'un module Radiateurs (1D10) est annoncée puis perdue. Un capteur seulement dégradé n'a pas le −20. Le bouton « Appliquer les dégâts » est réservé au MJ actif. Les dégâts sont relus sur le module arme (missile : 20 + DR du lancement gardé), DR borné 0–10, pas sur le nombre de la carte. L'application est notée dans un réglage de monde avant d'écrire la coque. La liste des missiles est écrite par le MJ actif, à la file, et le rappel est noté avant la carte. Les dés de critique sont joints à la carte de résolution. Les compendiums d'armes portent le compteur (canon 20/20, missile 4/4, lasers vides).
- Deux jetons liés du même acteur, fiche sans jeton : « Un vaisseau = un acteur : dupliquez l'acteur pour avoir deux vaisseaux ».
- Delta-v : le souvenir d'avertissement repart dès que la valeur enregistrée est remise dans la case. Si le texte saisi n'est pas la valeur arrondie affichée, la case est réécrite.

## 0.7.2.1

Branche `dev/0.7.2.1`. Elle n'entre dans `main` qu'après la relecture. `main` reste en 0.7.2 jusque-là.

Marc a testé la 0.7.2 le 25/10/2026 (TESTER §11, points 1 à 10). Le delta-v de l'onglet Général ne s'affichait pas : `system.propulsion.deltaV` est un SchemaField dans le SchemaField Propulsion, et `{{formGroup}}` ne le dessine pas (doc v14).

- Correctif : le bloc Propulsion montre « Delta-v (km/s) », actuel et maximum. L'input est écrit à la main (`type="text"`, `inputmode="decimal"`) : `{{formGroup}}` passe par `createNumberInput`, qui force `type="number"` (doc v14). « 3,5 » devient 3,5, au dixième. La saisie n'accepte qu'un nombre positif simple (`1`, `3,5`, `3.5`). « -1 », « 1e3 », « 0x10 », « Infinity », une case vide ou « abc » sont retirés du formulaire : on n'envoie ni null ni 0. La case retrouve tout de suite la valeur enregistrée. L'avertissement part une fois par saisie invalide. Objet fixe : ces champs sont grisés (visuel ; la garde réelle reste le refus de manœuvre). La migration n'applique pas ce filtre : elle arrondit les nombres déjà présents, sans injecter de clé dans un diff partiel. Dans cet arrondi, `null` ou une chaîne vide donne 0.
- Les autres paires value/max étaient déjà visibles : intégrité et blindage des sections, intégrité des modules (fiche vaisseau et fiche module), munitions, réserve d'air, réserve d'équipement. Leurs règles ne changent pas.
- Version `0.7.2.1` : nombres séparés par des points, forme acceptée par `system.json` et `isNewerVersion` (doc v14). Pas de suffixe `0.7.2-1`.

## 0.7.2

Branche `dev/0.7.2`. Elle n'entre dans `main` qu'après le test de Marc. `main` reste en 0.7.1 jusque-là. Le test (TESTER §11) prend le ZIP de `main` une fois la branche fusionnée.

Décision Marc 23/10/2026 : la 0.7.1 est trop lourde. La fenêtre Combat spatial est retirée. Les vaisseaux utilisent le Combat Tracker.

- Initiative : jet d'Opérations de bord du poste Opérateur, classé par le même mécanisme que la Vigilance des personnages. Poste vide : équipage PNJ (35/50/65/80 ; inconnu, 50). « Lancer l'initiative » et « Lancer pour les PNJ » lancent ce jet. Un véhicule reste refusé dans le tracker. Un vaisseau y entre. Décision Marc 25/10/2026 : ce jet n'est pas plafonné à ±50. L'initiative des personnages garde le plafond. À égalité, le vaisseau passe après les personnages : le nombre encodé ne change pas, le MJ réordonne.
- Boutons des postes : Commandant (+10), Opérateur (verrouillage), Navigateur (Calculer : +10 sur tous les jets du Pilote de ce tour), Pilote (esquiver, changer de portée), Artilleur (tir), Ingénieur et Médecin (jet simple). Esquive : au moins −10, puis −10 par DR, au plus −30. Sans verrouillage, tir à −20 au-delà de la portée proche. Visée section −20, module −40. Arme dégradée −20. Arme hors service : pas de tir.
- Au round suivant, le MJ actif retire les bonus du tour (commandant, Calculer, esquive), seulement si le round augmente. Il lit `Combat.previous` (doc v14), donc un joueur ou un MJ non actif qui passe le round vide aussi les bonus. Reculer d'un round les garde. Décision Marc 25/10/2026 : le verrouillage vise une seule cible, le jeton visé au moment du jet. Sans cible, ou avec plusieurs, pas de jet. Il reste jusqu'à la suppression du combat. Un nouveau verrouillage réussi le remplace. Le MJ le retire par un bouton sur l'onglet Postes, qui montre le nom de la cible. Au-delà de Proche, le tir est à −20, sauf s'il vise cette cible. Le relais emporte cette cible, avec les mêmes contrôles.
- Décision Marc 25/10/2026 : les jets de poste ne sont pas plafonnés à ±50, initiative du vaisseau comprise. Commandant, Calculer, verrouillage ou son absence, tir visé, arme dégradée et le reste s'additionnent tels quels. Les jets ordinaires des personnages, hors postes de vaisseau, gardent le plafond ±50.
- Delta-v : champ manuel en km/s, au dixième. Plus de « Poussée ce tour », plus de retrait automatique, plus de valeur exacte à 3 décimales. La migration arrondit la valeur et le maximum déjà présents. Elle n'ajoute pas de clé absente. La saisie de la fiche est arrondie de la même façon. Petite Fortune : 3,6 / 3,6.
- Portée : champ de chaque fiche (proche, moyenne, lointaine). Le tir le lit. Décision Marc 25/10/2026 : une manœuvre gagnée part de la portée du vaisseau qui manœuvre, et met les deux fiches sur ce cran. Si les deux fiches différaient, le chat le dit (`SOL.Space.rangeDiffer`, `{maneuver}` et `{other}` ; le français et l'anglais lisent `lang/fr.json`). Sans cible, le jet reste dans le chat. Plusieurs vaisseaux ciblés : avertissement, la portée ne change pas. Deux échecs : personne ne gagne (LdR §6). Un objet fixe refuse la manœuvre.
- Deux jetons du même acteur ne partagent plus le verrouillage, l'esquive ni l'effet : on reconnaît le jeton, ou l'uuid d'acteur s'il n'y a qu'un combattant. Depuis la barre latérale, `actorId` ne sert que s'il n'y a qu'un candidat. Un verrouillage relayé n'accepte qu'un jeton de la scène du combat. S'il est refusé, l'avertissement s'affiche aussi chez le joueur.
- Le relais `system.sol-nouvelle-ere` reste (`"socket": true`). Un joueur qui possède le poste mais pas le vaisseau, le combat ou la cible ne peut pas écrire l'effet tout seul. Le MJ refuse une action qui n'est pas celle du poste, vérifie le propriétaire, et borne le DR (0–10) et le score (0–200). L'identifiant `userId` du message est déclaratif.
- Le réglage de monde `spaceCombat` n'est plus enregistré. Un monde ancien le garde en base, sans lecture.
- Hors de cette version : dégâts localisés, critiques, dépressurisation, missiles (0.7.3) ; chaleur, Pousser, réparations (0.7.4). Les compendiums ne sont pas reconstruits : la Petite Fortune est déjà à 3,6.

## 0.7.1

Branche `dev/0.7.0`. Elle n'entre dans `main` qu'après la relecture. `main` reste en 0.7.0 jusque-là. Le test pour Marc (TESTER §11) prend le ZIP de `main` une fois la branche fusionnée.

Réf. Vaisseaux v0.1 §1 et §3. `// Réf. Vaisseaux v0.1 §3`.

- Jets depuis l'onglet Postes. Commandement, Opérations de bord, Pilotage (spécialités « Pilotage : … »), Mécanique orbitale, Armement de bord. Ingénieur : Réacteurs et propulsion, ou Mécanique (pas Mécanique orbitale). Médecin : Médecine, ou Premiers secours. Un acteur au poste utilise sa compétence. Sinon le score de l'équipage PNJ (35/50/65/80). Le modificateur proposé est prérempli ; le MJ peut le changer. Le plafond ±50 reste celui du dialogue.
- Combat spatial : fenêtre du MJ, état dans le réglage de monde `spaceCombat`. Pas un document Combat, pour ne pas mélanger avec le tracker des personnages. Deux vaisseaux, portée, ordre, tour, poste, côté, poussée, verrouillage, esquive, bonus : tout est modifiable à la main.
- Ouverture : Opérations de bord opposées. Le vainqueur agit en premier à chaque poste. Égalité de DR : le meilleur score. Décision Marc 21/10/2026 : encore égal, le MJ choisit. Les DE ne départagent pas.
- Décision Marc 21/10/2026 : ordre Commandant, Opérateur, Navigateur, Pilote, Artilleur, Ingénieur, Médecin. Le navigateur calcule, le pilote exécute : le +10 de Calculer reste jusqu'au jet de Pilote du même tour. À chaque poste, le premier vaisseau puis l'autre. Un côté sans vaisseau est sauté. « Poste suivant », « Tour suivant », compteur de tours (environ une minute). Le temps du monde n'avance pas.
- Effets immédiats, proposés dans le dialogue, effacés en fin de tour sauf le verrouillage : commandant +10 sur un poste choisi ; verrouillage (sans lui, l'artilleur tire à −20 au-delà de la portée proche ; Décision Marc 21/10/2026 : il dure tout le combat, sauf si le MJ l'enlève) ; esquive, Décision Marc 21/10/2026 : au moins −10 sur une réussite, puis −10 par DR, au plus −30 (0 DR donne −10 ; un échec donne 0) ; changement de portée (LdR §6 : le score ne départage que deux réussites au même DR ; deux échecs, la portée ne bouge pas ; le déclarant perd un tour de delta-v, réussite ou échec, s'il en reste assez) ; navigateur +10 au pilote ce tour ; tir : touche seulement, portées de l'arme, arme dégradée −20, visée section −20 ou module −40, carte « Touché (dégâts en 0.7.2) ». Ingénieur et médecin : jet simple. Un même personnage sur deux postes : avertissement, sans blocage. Un joueur envoie l'effet au MJ actif, avec son identifiant ; le MJ vérifie qu'il possède le vaisseau ou l'acteur du poste, borne le DR (0–10) et le score (0–200), et lance le jet adverse. `system.json` a `"socket": true`.
- Poussée cochée : en fin de tour, accélération × 60 s ôtée du delta-v. Décision Marc 21/10/2026 : valeur exacte stockée (21 milli-g → 12,356 m/s), affichée à 3 décimales (un tour : 3,588 ; dix tours : 3,476), plancher 0. Simplification : coût constant par tour, la masse n'est pas recalculée. Delta-v insuffisant : la manœuvre est refusée. Poussée déjà cochée : on ne paie qu'une fois. Un objet fixe ne change pas de portée et ne coche pas Poussée. Le MJ peut corriger le delta-v à la main. Un vaisseau supprimé est ignoré. Fin du combat : le réglage repart à vide.
- Décision Marc 18/10/2026 : un vaisseau ou un véhicule ne peut pas être ajouté au combat des personnages.
- Reliquats de relecture : la section Radiateurs n'a plus d'Intégrité (migration `-=integrity`, sans injecter `sections` dans un diff qui ne l'a pas). Le bornage valeur ≤ maximum lit le maximum de l'acteur de base pour un token non lié. Une case numérique vidée n'écrit pas 0.
- Hors de cette version : dégâts, localisation, critiques, missiles en vol (0.7.2) ; chaleur, Pousser, réparations (0.7.3).

## 0.7.0

Livrée sur `dev/0.7.0`, puis avancée sur `main` après la validation de la 0.6.3 par Marc.

Décision Marc 21/10/2026. Réf. `docs/regles-vaisseaux-v0.1.md` (brouillon, chiffres provisoires).

- Une fiche Vaisseau (onglets Général, Sections & modules, Postes, Notes). Type groupé, catégorie atmosphérique / vide / objet fixe. Décision Marc 21/10/2026 : `station` devient `fixed`, `ship` devient `void`.
- Intégrité par section, plaque de blindage, module. Les radiateurs n'ont pas de plaque et la fiche ne saisit pas leur Intégrité de section : seul le module compte. La plaque affichée ajoute les modules Blindage de la section (hors service ou non renseigné : 0 ; dégradé : tous les points, Décision Marc 21/10/2026).
- Jauge de chaleur du réacteur du vaisseau, 0 à 10, stockée seulement. Pas de lien avec la surchauffe du blindage (LdR §8).
- Un seul objet Module de vaisseau, onze catégories, armes comprises. État dérivé : intact, dégradé, hors service, ou non renseigné si le maximum est 0. Un module neuf part en proue ; la section se change sur la fiche du module et sur celle du vaisseau. Une valeur au-dessus du maximum est ramenée au maximum, sans ajouter de champ à un diff qui ne le contient pas.
- Compendiums Vaisseaux (Petite Fortune) et Modules de vaisseau (ses 13 modules, plus trois repères d'armes en Intégrité 4/4, effets « Intégrité provisoire, ajustable en jeu »). La masse de ces repères reste non écrite.
- Petite Fortune ajustée le 21/10/2026 (avis Expert Science) : accélération 21 milli-g au plein, delta-v 3,6 / 3,6 km/s, Isp 350 s, environ 60 milli-g presque à vide, environ 47 kN, durée indicative environ 2,9 h de poussée. 21 milli-g pour 230 t font 47 kN. Masses inchangées (80 t, 150 t, 230 t). Radiateurs inchangés (environ 50 m²). Le delta-v accepte les décimales.
- Décision Marc 21/10/2026 : un PNJ peut tenir un poste. Un acteur encore dans un compendium est refusé. Abri anti-radiation, position, cap et champs de station ne sont pas codés. Une seule accélération, en milli-g au plein. Delta-v en km/s. Masse au départ calculée.
- Pas de jets, pas de dégâts, pas de chaleur ni de réparations automatisées (0.7.1 à 0.7.3). Décision Marc 18/10/2026 : pas d'initiative de vaisseau, donc pas de garde de combat dans cette version.

## 0.6.3

- Case **Fin d'ordre** sur chaque ligne de blessure de l'onglet Principal. Le propriétaire peut la cocher. Si l'ancien état n'arrive pas jusqu'au MJ actif, on le relit dans la liste `injuryDefer`.
- Décision Marc 20/10/2026 : Rustine sous le feu, compétence Survie par l'id du compendium (`Hs6fnCes2ZtRhEJK`), difficulté normale. Le MJ peut changer les deux. Au calme, toujours sans test.
- Décision Marc 20/10/2026 : joints **Percée** sur une armure équipée et pressurisée posent Combinaison percée et démarrent l'horloge. Les remettre à **Intacte** sur la dernière colmate, avec un message au MJ, sans consommer de Rustine. Une armure non pressurisée n'a pas de joints étanches : la fiche le dit, rien ne démarre.
- Section **États** sur la fiche (statuts actifs du pion). Déposer une page du compendium États pose le statut lié par `flags.sol-nouvelle-ere.statusId`. Une page sans statut correspondant avertit et n'invente rien.
- Le registre de brèche et `injuryDefer` s'écrivent l'un après l'autre, pour ne pas perdre une mise à jour simultanée.
- Décision Marc 20/10/2026 : une Rustine ratée n'est pas consommée. La mort par perforation est appliquée d'office, avec un message au MJ. Retirer le statut vaincu à la main suffit : l'horloge ne le repose pas.
- Relecture : une brèche sur plusieurs couches ne pose Combinaison percée qu'une fois (`solSealApply`, verrou d'horloge, garde de pose). Le `ready` d'Endurance ne remplit que les fiches d'avant la 0.6.1. Une valeur stockée sur une fiche récente n'est pas touchée. Tant que le champ est vide, l'affichage reste le maximum, donc une fiche neuve commence pleine dès que la CON est posée.
- Décision Marc 20/10/2026 : remettre les joints à Intact à la main est un outil du MJ. Ça vaut colmatage, sans Rustine ni test. Les règles de réparation viendront plus tard.
- Décision Marc 20/10/2026 : sous le feu, c'est Survie, pas « Systèmes de survie ». L'id reste `Hs6fnCes2ZtRhEJK`.

## 0.6.2

- Compte à rebours : les jetons non liés avancent aussi (registre d'uuids, relu au chargement). Un tour de combat dure 5 secondes, le temps du monde n'est plus figé. Le statut vaincu est `CONFIG.specialStatusEffects.DEFEATED`, avec repli `dead`.
- Décision Marc 20/10/2026 : retirer ou déséquiper l'armure percée ne coupe pas l'horloge. Le MJ peut l'arrêter (fiche et message) sans retirer le statut Combinaison percée.
- Fin d'ordre : `injuryDefer` est la liste des ids de blessure. Décocher retire cet id seulement. Un drapeau booléen de la 0.6.1 part encore une fois, puis la liste est vidée. Le MJ actif écrit, y compris si c'est un joueur qui a coché.
- Endurance : plus d'écriture à la création de fiche. Un double clic sur la carte ne relance pas un test déjà résolu. Les ids de messages disparus sont retirés du drapeau.
- Décision Marc 20/10/2026 : Rustine sous le feu, fenêtre de jet habituelle, difficulté normale par défaut. Le propriétaire peut colmater. Au calme comme en réussite, un message part au MJ. L'échec ne consomme pas l'objet.
- Décision Marc 20/10/2026 : une armure glissée sur la fiche est équipée. Blessures grave, critique et mortelle du compendium : case fin d'ordre cochée, y compris les repères de machine.
- Décision Marc 20/10/2026 : Hypoxie, le « −10 par stade » du §11 est cumulatif (stade 1 : −10, stade 2 : −20, stade 3 : inconscience), comme le §8. Pas d'automatisation nouvelle.

## 0.6.1

- Compte à rebours de perforation sur le temps du monde : 5 minutes, inconscience, puis mort 2 minutes plus tard si la brèche n'est pas colmatée. Messages au MJ. Temps restant sur la fiche. Rappel de réserve d'air.
- Rustine dans le compendium Équipement. Au calme, pas de test. Sous le feu, test simple, compétence choisie dans la fenêtre. Registre `SOL.sealMethods`.
- Compendiums consultables : États (journal, une page par état du LdR §11) et Blessures (une par gravité, plus des entrées de machine marquées à confirmer). Les états du pion restent des statuts.
- Case Équipé sur l'armure. Seules les pièces équipées comptent. Une armure sans cette clé part équipée.
- Endurance absente remplie au maximum. Un 0 stocké reste 0. Affichage actuelle / max. Le schéma reste un nombre, pas `{ value, max }`.
- Épuisé : −20 automatique sur les jets, visible dans la fenêtre et sur la carte, dans le plafond ±50.
- Visière : somme des protections de tête équipées, puis division par 2. Seuil de chaque couche divisé par 2, brèche couche par couche. Décision Marc 20/10/2026.
- Arme sans compétence : COO, et FOR pour Corps-à-corps. Décision Marc 20/10/2026.
- Armure de pont : réserve d'air 0,5 / 0,5 h.
- Corrections : carte d'Endurance résolue sur l'acteur, malus de tir visé affiché une fois, case de fin d'ordre relue pendant le combat, surprise retirée une seule fois, brèche même si le Seuil est inférieur à 1, protection lue aussi depuis une chaîne numérique.

## 0.6.0

- Armure par zone, brèche au seuil, tir visé et Viser, Endurance à 0.
