# Journal des versions

## 1.1.2

Portraits des prétirés du kit. Décision de Marc. Images WebP, qualité 80, 864×1152, dans `assets/portraits/`. Chaque acteur du compendium Kit — Prétirés les utilise comme portrait et comme texture de jeton. L'import copie ces champs. Le clic sur le portrait ouvre toujours le sélecteur de fichier.

## 1.1.1

Drone TATI retiré.

Décision de Marc. L'acteur `DroneTati0000001` et le blindage `ArmTatiBlind0001` ne sont plus dans les catalogues. Luciole et Crabe restent, avec les mêmes chiffres. Les phrases de sas et de symbiose ne le nomment plus. Aucune migration : une copie déjà dans un monde n'est ni effacée ni modifiée.

## 1.1.0

Branche `cursor/kit-joueur-110-13b2`, depuis `main` (`1b3559c`). Pas de Relecteur : aucun changement de DataModel, de jet ou de combat.

Kit de démarrage « La Cale du quai 9 », limité à ce que les joueurs peuvent lire. Aucun livret, aucun guide du meneur, aucun plan MJ, aucun PNJ d'intrigue.

- Compendium Acteurs « Kit — Prétirés » : Joachim Ferraz, Kesi Varga, Dr Inès Okafor-Lund, Tariq Benali, Anouk Sall, et Bosco. Équipement repris des catalogues existants.
- Compendium Scènes « Kit — Plans » : cinq plans joueurs. Grille visuelle, les schémas du kit sont sans échelle.
- Compendium Journaux « Kit — Pour les joueurs » : Introduction, Guide du joueur, Fiches de référence, aides A1 à A9, légendes des plans. Permission Observateur. Les lignes « Quand la donner » et les notes pour le meneur ont été retirées des aides.
- Case « Importer le kit (joueurs) ». `KIT_GM_PACKS` est vide.
- Runtime Foundry non exécuté.

## 1.0.3

Branche `cursor/tg-dose-103-13b2`, depuis `main` (`3dff461`). Décision Didier, délégation v1 de Marc. Pas de Relecteur.

- Tolérance aux g : CON actuelle (après origine) / 20, arrondi au supérieur, plus `gToleranceModifier` de l'objet Origine. Le champ existait déjà dans le compendium, avec le tableau du LdR v0.3 §9. Il est lu. Sans origine, +0.
- Dose de départ : case vide par défaut, 50 à 500 si on la remplit. Dose aiguë : case vide, compte 0. Le cumul affiché est la somme, non stockée. La dose de départ n'est pas recopiée dans la dose aiguë. Pas de `migrateData` : une fiche ancienne ne reçoit pas 50.
- Le palier affiché reprend les seuils déjà écrits pour la dose aiguë (journal États, LdR v0.2 §8). Le livre v0.3 ne donne pas une autre échelle pour la dose de toute une vie.
- L'anglais lit `lang/fr.json`, comme le reste du système.
- Runtime Foundry non exécuté.

## 1.0.2

Branche `cursor/fiches-essai-102-13b2`, depuis `main` (`96886ae`). Décision Didier, délégation v1 de Marc, 11/11/2026. Pas de Relecteur.

- Humain d'essai : création au total de 130 points, plafond 60 avant origine, origine Terre, milieu Enfant de la Veille, profession Garde ou soldat. Cinq compétences, formations cumulées.
- Adversaire d'essai : bases 35, valeur moyenne choisie, origine Terre, tir à +20.
- Synthétique d'essai : FOR, CON et PER à 40, valeur moyenne choisie. Esquive à +20, score 20 sans RÉF.
- Une fiche d'essai déjà modifiée n'est pas réécrite. La passe n'a lieu qu'une fois, chez le MJ actif.
- La dose de départ et la tolérance aux g modifiée par l'origine ne sont pas des champs : elles ne sont pas stockées.
- Runtime Foundry non exécuté.

## 1.0.1

Branche `cursor/scene-test-101-13b2`, depuis `main` (`c84adcc`). Décision Marc, relayée par Didier, 11/11/2026. Pas de Relecteur.

- Au premier `ready`, le MJ actif crée la scène « Scène de test » et l'active. Un réglage de monde mémorise que c'est fait. Un joueur ne crée rien.
- La case « Recréer la scène de test », dans les réglages du système, remplace la scène. Les acteurs du même nom, ou déjà marqués, sont réutilisés.
- Crabe, Petite Fortune et le Patrouilleur viennent des compendiums. L'humain, le synthétique et l'adversaire n'ont pas de compendium d'acteurs : fiches minimales, défauts du schéma. Esquive, le pistolet et la combinaison souple viennent des compendiums d'objets. Un compendium absent ne plante pas.
- Journal « Lisez-moi test », avec le lien du dépôt et les sections du guide. Fond uni et grille, aucun asset externe.
- Runtime Foundry non exécuté.

## 1.0.0

Branche `cursor/v1-1-0-13b2`, depuis `main` (`4d04917`). Décision Marc, relayée par Didier.

- La Rafale et le test de recul en apesanteur ne changent plus aucun jet. Les champs `burst` et `recoil` restent sur les armes, pour ne pas casser les fiches. Le rappel d'esquive garde la zone, l'explosion et l'attaque non perçue.
- Le Blindage s'ajoute à la plaque pour le calcul des dégâts de vaisseau. Il n'est pas recopié dans la plaque stockée. Hors service ou non renseigné : 0. Dégradé : tous les points, règle déjà dans le code (Décision Marc 21/10/2026).
- Une blessure marquée Soignée n'entre pas dans les cases de malus.
- Le +10 du commandant était déjà un test de Commandement réussi. Rien n'est changé de ce côté. La chaleur reste celle de la 0.7.4.
- Runtime Foundry non exécuté.

## 0.9.8

Branche `dev/0.9.8-esquive`, depuis `main` (`8df43ae`). PR brouillon. Ne pas fusionner. Relecture ciblée demandée. La section 22 de TESTER.md sert à la séance de test de la v1.

Décision Marc 08/11/2026. Esquive personnelle opposée. Réf. LdR v0.2 §2, §6, §7 et §11. Aucun malus de blessure. Aucun changement de lore ni de combat spatial. L'esquive de vaisseau (−10 par DR) n'est pas réutilisée.

- Après une attaque personnelle réussie, avant les dégâts, chaque défenseur qui a une RÉF peut esquiver. Le jet d'attaque n'est pas relancé. Un raté n'ouvre pas d'esquive.
- Opposition : `compareOpposed`, score modifié, sans priorité au critique. Une seule réussite gagne. Deux réussites : DR, puis score. Égalité parfaite ou double échec : pas de touche. Si l'attaque l'emporte, les dégâts gardent son DR initial.
- Une réaction par défenseur. Elle est dépensée quand le dé d'Esquive est vraiment lancé, même si l'esquive rate. Annuler la fenêtre ne dépense rien et laisse les dégâts bloqués. Le MJ peut passer : les dégâts continuent, la réaction reste. Elle revient au début du prochain tour de ce défenseur, pas à chaque round. Le même début de tour rejoué ne la rend pas. Hors combat suivi, un rappel dit au MJ de la noter : rien n'est automatisé.
- Sonné garde la réaction. Tant qu'une offre est ouverte, la carte d'attaque le dit : le MJ passe pour une zone, une explosion, des rafales multiples ou un coup non perçu. Une arme cochée Rafale peut tirer au coup par coup : ce coup reste esquivable. Aucune nouvelle règle de rafale ou de zone.
- Sans la compétence, personnage et PNJ lancent sur la RÉF. Pas d'offre si la RÉF manque et qu'aucune compétence Esquive exploitable n'est sur la fiche. Le synthétique qui a cette compétence utilise exactement `skillScore` (RÉF absente lue 0, plus la formation). Sans elle, pas d'offre. Créature et drone restent sans offre. Pas de COO, d'ADA, ni de score autonome.
- Les écritures passent par le MJ actif, via `User#query` (`CONFIG.queries`, délai 15 s) : l'identité est `context.user`. Un échec de demande affiche un avertissement et n'est pas relancé. Le délai n'annule pas une écriture déjà commencée. Chaque création (blessure, statut, brèche, fin d'ordre, récapitulatif, checkpoint) revérifie le MJ actif et s'arrête sinon. Reprendre un verdict déjà écrit lève seulement la réservation restante, sans nouveau dé ni restitution. Le statut Saignement est une étape à part, reprise s'il manque ; une machine ne le reçoit pas. L'identifiant d'opération aide à retrouver une blessure déjà visible. Il ne garantit pas l'unicité si une création encore en vol est invisible. Une écriture déjà remise au serveur peut arriver après la reprise. Runtime Foundry non exécuté.
- DataModels, validation stricte et Foundry : non exécutés, runtime absent. Ce n'est pas une validation Foundry.

## 0.9.7

Branche `dev/0.9.7-machines`, depuis `main` (`8f53b38`). PR brouillon. Ne pas fusionner. La section 21 de TESTER.md sert à la séance de test de la v1.

Décision 08/11/2026. Quatre rappels des blessures de machine. Aucun calcul d'autonomie, d'explosion ou de récupération. L'Esquive personnelle et les malus automatiques de blessure restent en attente : aucun code.

- Fuite : le rappel de carte dit « Fuite ». Sur la fiche d'un synthétique ou d'un drone, la ligne dit « Fuite » quand le champ `bleeding` est vrai. Rien n'est retiré en Endurance ni en autonomie. Le statut biologique Saignement n'est pas posé sur ces deux types. Un personnage, un PNJ ou une créature garde le rappel Saignement et le statut.
- Zone : le MJ choisit parmi les six zones avant d'appliquer, seulement si toutes les cibles sont des synthétiques ou des drones. Le défaut est la zone du tir. Annuler, ou une valeur hors des six clés, n'écrit rien. Un personnage, un PNJ ou une créature garde la zone du tir, même si le formulaire est modifié.
- Châssis critique : le texte dit arrêt d'urgence. Le danger secondaire reste au MJ. Pas de jet d'explosion.
- Châssis mortel : le texte dit épave. Les pièces restent au choix du MJ. Elles ne deviennent pas des pièces de vaisseau.
- Les objets d'ancien lore (Mutuelle, Caisse Noire, Partants, talents +10) ne sont pas touchés. Avertissement narratif reporté au lot suivant.
- Contrôles ciblés passés, runtime Foundry non exécuté, test Marc à la v1. DataModels et validation stricte non exécutés.

## 0.9.6

Branche `dev/0.9.6-lore`, depuis `main` (`b01e6f5`). PR brouillon. Ne pas fusionner. La section 20 de TESTER.md sert à la séance de test de la v1.

Extraits publics de la Bible, contenu du 08/11/2026, §3, §6 et §7. Lore des journaux et du glossaire seulement. Aucune règle d'objet n'est changée.

- Journal Factions : six pages. L'id `PgMutuelleCeint0` devient le Consortium de la Ceinture. Nouvelle page `PgDirectTharsis`. Page retirée : `PgPartantsLongs0`. Les autres ids de page sont gardés.
- Glossaire : factions, parts de risque, Cérès, greffiers, double clé, Traité d'Asimov, principe Sereguine. La Mutuelle et les Partants ne sont plus des puissances principales de la liste. La double clé reprend « charges nucléaires de déviation, sous double clé ». L'Entente de Vesta et la définition de sociétaire ne sont pas reprises : les extraits ne les étayent pas. Provenance : extraits publics et reformulations sourcées, Bible v0.6 §§3,6,7.
- Limites : plusieurs objets de jeu citent encore l'ancienne Mutuelle, la Caisse Noire ou les Partants. Leurs effets ne sont pas modifiés. Quatre `[à compléter]` des blessures de machine restent ceux de la 0.9.5.
- DataModels, validation stricte et Foundry : non testés si le runtime est absent. Test Marc reporté à la v1.

## 0.9.5

Branche `dev/0.8.0`, entrée dans `main` en avance rapide. Ancienne 0.8.0. Le manifeste dit 0.9.5 pour que Foundry la voie plus récente que la 0.9.4. Revue ciblée de `bf88162` : aucun défaut de code. Exécution réelle des DataModels, de la validation stricte et de Foundry : non testée, runtime absent. Test Marc reporté à la v1. La section 19 de TESTER.md sert à cette séance, avec le ZIP de `main`.

Décision Didier/Marc 31/10/2026. Réf. Équipement v0.3 §5. Réf. Blessures et Séquelles v0.3 corrigée §3. Réf. LdR v0.2 §3. Décision Marc 18/10/2026 : Base des machines jusqu'à 100.

- Luciole, Crabe et TATI sont des acteurs Drone. FOR, CON, PER, COO, ADA, score autonome, Endurance et Seuil sont ceux du catalogue. La masse du TATI est 350 kg. Le sas concerne le TATI et le Crabe. Les bonus +10 restent en texte.
- La fiche Drone a COO, ADA et le Score autonome. Chacun se lance comme une caractéristique. La migration ne les injecte pas dans un diff partiel. La protection vient des armures de la fiche. Coque de Luciole, Carapace de Crabe et Blindage alu-titane oléophobe sont dans Armures et vêtements, et embarqués sur le drone.
- Blessures de machine : 24 objets du tableau, six zones. Les ids `InjLightMachine1`, `InjSeriousMach01`, `InjCritMach00001` et `InjMortalMach001`, déjà sur `main`, deviennent les quatre optiques. Les vingt autres ids sont nouveaux. Restent visibles : conversion de la fuite, explosion du châssis, pièces récupérables, report sur une zone absente.
- L'Endurance calculée (CON/5, arrondi au supérieur) redonne 3, 9 et 13. Le Seuil redonne 1, 5 et 7. Les blessures de machine suivent la Blessure standard, test de CON sur critique compris. Rien de plus n'est codé.
- Limites de données, non tranchées : la protection 3 du Crabe et la protection 4 du TATI sont posées sur les six zones. La masse des trois objets armure reste le défaut 0 du schéma. Les masses 2,5 kg, 45 kg et 350 kg sont dans le texte du drone. Quatre `[à compléter]` du tableau restent visibles : conversion de la fuite, explosion du châssis, pièces récupérables, report sur une zone absente.
- Réserves de Relecteur sur la 0.9.4, notées, pas codées : un vrai test de `rollItem` avec un acteur et un `performRoll` factices ; une notification légère quand le verrou de tir refuse un double-clic.

## 0.9.4

Branche `dev/0.9.4`, entrée dans `main` en avance rapide. Relue par Relecteur, test Marc reporté à la v1. La section 17 de TESTER.md sert à la séance de test de la v1, avec le ZIP de `main`.

Décision Marc 30/10/2026. Réf. Blessures v0.3, Origines v0.3, Bible v0.1 §6, Glossaire v0.2, Vaisseaux v0.1 §2 et §8. Séquelles v0.3.

- Blessures : les 8 entrées déjà là gardent leur id. Les 24 blessures humaines nommées du catalogue sont ajoutées. Les 4 repères de machine restent tels quels : la table des machines attend la 0.8.0.
- Séquelles : les 8 séquelles de radiation du catalogue. Le dé, le cancer, les troubles cognitifs et la fragilité sont tranchés plus bas.
- Origines : les 6 concordent, sauf l'habitat tournant, dont la gravité perd « selon l'habitat ».
- Journaux : une page par faction, recopiée de la Bible v0.1 §6, et le Glossaire v0.2 en une page. Le texte recopié n'est pas modifié. La mention de version suit le titre du document.
- Vaisseaux : Patrouilleur de la Veille et Cargo, provisoires, chiffres de coque repris de la Petite Fortune et marqués à confirmer. Le patrouilleur porte le laser lourd du pack. Le cargo porte le propulseur à plasma du pack. La Petite Fortune n'est pas modifiée.
- Munitions : chaque tir d'une arme de personnage ou de PNJ retire 1 à `system.ammo.value`. Décision Didier/Marc 31/10/2026. Réf. Vaisseaux v0.1 §4. Un 0 avec un maximum supérieur à 0 refuse le tir, comme le canon. Valeur null, maximum null, ou maximum 0 : le tir part, rien n'est écrit. Un maximum 0 veut dire sans chargeur (couteau, mains nues). Le rechargement reste manuel.
- Vaisseaux PNJ : le patrouilleur a une accélération de 50 milli-g (Réf. Vaisseaux v0.1 §8). Le cargo a 0,05 milli-g, le milieu de la fourchette du plasma. Décision Didier/Marc 31/10/2026.
- Décision Didier/Marc 31/10/2026 : la poussée du moteur du patrouilleur est 113 kN, ce qui correspond à 50 milli-g pour 230 t. L'Isp reste ~350 à 380 s : il ne dépend pas de la poussée. Décision Marc 21/10/2026. Réf. Vaisseaux v0.1 §8. Durée de poussée, accélération à vide, masse et delta-v restent provisoires jusqu'à la 1.0. Les masses stockées restent 80 t et 150 t. Le delta-v reste 3,6 / 3,6.
- Décision Didier/Marc 31/10/2026 : le type de propulsion du cargo est le Propulseur à plasma (cargo lent), le même libellé que le module. Delta-v et masse de réaction : provisoire, copie de la Petite Fortune.
- Séquelles : pas de dé. C'est une liste, le MJ choisit. Le cancer se déclare plus tard, sans effet immédiat. Les troubles cognitifs rappellent −10 aux tests d'INT, sans malus automatique.
- Décision Didier/Marc 31/10/2026 : la fragilité cellulaire a un seuil de 150 mSv, comme dans Séquelles v0.3. Texte seulement, sans nouveau champ.
- Munitions, relecture : après la fenêtre, on relit `system.ammo.value` et on écrit cette valeur moins 1. Une saisie pendant la fenêtre n'est pas écrasée. Si la valeur relue est 0 et que le maximum est supérieur à 0, on n'écrit rien et on notifie `SOL.Item.ammoEmpty`. Un verrou par `item.uuid` est libéré dans un `finally`.
- Décision Didier/Marc 31/10/2026 : un joueur qui n'est pas propriétaire d'une arme à chargeur ne peut pas tirer. Notification `SOL.Item.notOwner`. Pas de relais au MJ. Une arme sans chargeur n'est pas concernée.

Réserves mineures de Relecteur sur la 0.9.2, traitées :

- La case Administration garde la clé stockée (`autoInjector`). La ligne `sol-admin-reading` en dessous dit **auto-injecteur**. TESTER §16.7 le contrôle.
- `autoInjector ou timbre` est une entrée de `SOL.substanceAdministrationLabels`. La ligne dit **auto-injecteur ou timbre**.

## 0.9.3

Branche `dev/0.9.3-style`, entrée dans `main` (`20be91c`). Relue par Relecteur, test Marc reporté à la v1. La section 18 de TESTER.md sert à la séance de test de la v1.

Décision Marc 31/10/2026. Ancienne 0.8.1 / 0.10.0. Habillage seulement : aucune règle, aucun modèle, aucune migration. Réf. proposition de style et maquette validées (« très joli et dans le thème »).

- Palette en variables CSS, sous `.sol-nouvelle-ere.actor` et `.sol-nouvelle-ere.item`. Pas sur `:root`. Les cartes de chat gardent leurs teintes.
- Polices SIL OFL dans `fonts/` (woff2 et OFL). IBM Plex Sans Condensed, IBM Plex Mono, Atkinson Hyperlegible Next. Pas de CDN. Le manifeste v14 n'a pas de clé `fonts` : `@font-face` dans `styles/sol.css` (clé `styles`), et `CONFIG.fontDefinitions` au démarrage.
- Fiche de personnage : en-tête, caractéristiques, compétences, armures par zone, équipement, états, Endurance, notes. Le portrait ouvre `foundry.applications.apps.FilePicker` (action `editImage`) sur toutes les fiches d'acteur.
- Jauges : Endurance, munitions, chaleur (segments), Intégrité des sections. Elles suivent le rendu de `updateActor` ou `updateItem`. Un objet incorporé rafraîchit déjà la fiche parente.
- Fiche vaisseau : même palette, tuiles de section, jauge de chaleur. L'ambre commence à 7, avec le malus. Réf. 0.7.4-decisions. À 7, le 7ᵉ segment est ambre ; à 10, le dernier est rouge. Aucun tir ne retire de munition : la jauge suit l'édition de l'arme. Largeur de fiche 960 px. La maquette de 1232 px était un aperçu.
- Texte au moins 12 px. Focus visible. L'état ne passe pas que par la couleur (mot ou ▲).

## 0.9.2

Entrée dans `main` en avance rapide depuis `dev/0.9.2` (`8db71c4`). Relue par Relecteur, test Marc reporté à la v1. La section 16 de TESTER.md sert à la séance de test de la v1, avec le ZIP de `main`.

Décision Marc 30/10/2026. Réf. Atouts v0.3, Augmentations v0.3, Logiciels v0.3, Substances v0.3. Effets en texte seulement. Pas d'ActiveEffect, pas de jet autonome, pas de champ `geneTherapy` sur le personnage.

- Atouts : les 25 du catalogue, coût 15. Champ `domain` (espace, technique, endurance, combat, social), vide par défaut. Un diff partiel ne le reçoit pas.
- Augmentations : les 14 du catalogue. Le coût reste 0. Là où le catalogue dit [à compléter], la description le dit.
- Logiciels : les 15 du catalogue. Catégorie fermée de 5, utilitaire par défaut. Support pad, tablette ou vaisseau, un seul, vide par défaut. Compétences assistées en texte. Score autonome affiché, sans bouton. Verrou Sereguine coché par défaut ; « Sans-Témoin » est décoché. « Aussi sur … » reste dans la description. Pas de champ multi-support.
- Substances : les 15 du catalogue. Administration : texte libre, pas de liste fermée. Une clé connue (`autoInjector`, et le texte déjà stocké `autoInjector ou timbre`) s'affiche **auto-injecteur**, ou **auto-injecteur ou timbre**. Une voie saisie à la main, par exemple « sous-cutanée », reste telle quelle. Durée en texte. Doses : le maximum vient du catalogue, la valeur actuelle est pleine (`doses.value` égale `doses.max`). Décision Marc 31/10/2026. Une substance créée sans valeur copie ce maximum dans `_preCreate`, seulement si c'est un entier. Un 0 stocké reste 0. Une création sans maximum reste vide. `cleanData` ne copie pas le maximum. Un diff partiel ne reçoit pas cette valeur. Légalité vide quand le catalogue dit [à compléter]. Chélateur, Souffle Noir et Dortoir gardent [à compléter] dans l'effet.

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
