# Journal des versions

## 0.7.0

Branche `dev/0.7.0`. **main reste en 0.6.3** tant que Marc n'a pas validé cette version. Pas de fusion avant son feu vert.

Décision Marc 21/10/2026. Réf. `docs/regles-vaisseaux-v0.1.md` (brouillon, chiffres provisoires).

- Une fiche Vaisseau (onglets Général, Sections & modules, Postes, Notes). Type groupé, catégorie atmosphérique / vide / objet fixe. L'ancienne catégorie `station` devient `fixed`. L'ancienne clé `ship` devient `void` (à confirmer).
- Intégrité par section, plaque de blindage, module. Les radiateurs n'ont pas de plaque : la fiche suit l'Intégrité du module Radiateurs. La plaque affichée ajoute les modules Blindage de la section (hors service : 0 ; dégradé : points entiers, à confirmer).
- Jauge de chaleur du réacteur, 0 à 10, stockée seulement.
- Un seul objet Module de vaisseau, onze catégories, armes comprises. État dérivé (intact, dégradé, hors service). Déplaçable de section.
- Compendiums Vaisseaux (Petite Fortune, §8) et Modules de vaisseau (ses 13 modules, plus trois repères d'armes du §4).
- Pas de jets, pas de dégâts, pas de chaleur ni de réparations automatisées (0.7.1 à 0.7.3).

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
