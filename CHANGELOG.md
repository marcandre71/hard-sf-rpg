# Journal des versions

## 0.6.2

- Compte à rebours : les jetons non liés avancent aussi (registre d'uuids, relu au chargement). Un tour de combat dure 5 secondes, le temps du monde n'est plus figé. Le statut vaincu est `CONFIG.specialStatusEffects.DEFEATED`, avec repli `dead`.
- Décision Marc 20/10/2026 : retirer ou déséquiper l'armure percée ne coupe pas l'horloge. Le MJ peut l'arrêter (fiche et message) sans retirer le statut Combinaison percée.
- Fin d'ordre : `injuryDefer` est la liste des ids de blessure. Décocher retire cet id seulement. Un drapeau booléen de la 0.6.1 part encore une fois, puis la liste est vidée. Le MJ actif écrit, y compris si c'est un joueur qui a coché.
- Endurance : plus d'écriture à la création de fiche. Un double clic sur la carte ne relance pas un test déjà résolu. Les ids de messages disparus sont retirés du drapeau.
- Décision Marc 20/10/2026 : Rustine sous le feu, fenêtre de jet habituelle, difficulté normale par défaut. Le propriétaire peut colmater. Au calme comme en réussite, un message part au MJ. L'échec ne consomme toujours pas l'objet (à confirmer).
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
