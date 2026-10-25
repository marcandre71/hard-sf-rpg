# Journal des versions

## 0.7.2.1

Branche `dev/0.7.2.1`. Elle n'entre dans `main` qu'après la relecture. `main` reste en 0.7.2 jusque-là.

Marc a testé la 0.7.2 le 25/10/2026 (TESTER §11, points 1 à 10). Le delta-v de l'onglet Général ne s'affichait pas : `system.propulsion.deltaV` est un SchemaField dans le SchemaField Propulsion, et `{{formGroup}}` ne le dessine pas (doc v14).

- Correctif : le bloc Propulsion montre « Delta-v (km/s) », actuel et maximum. L'input est écrit à la main (`type="text"`, `inputmode="decimal"`) : `{{formGroup}}` passe par `createNumberInput`, qui force `type="number"` (doc v14). « 3,5 » devient 3,5, au dixième. Une case vide ou illisible est retirée du formulaire : on n'envoie ni null ni 0, la valeur enregistrée reste, et un avertissement s'affiche. Objet fixe : ces champs sont grisés (visuel ; la garde réelle reste le refus de manœuvre). La migration n'arrondit toujours que les clés déjà présentes. Dans cet arrondi, `null` ou une chaîne vide donne 0.
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
