# Feuille de route

Cette feuille est mise à jour à chaque version.

Décision Marc 30/10/2026 : Marc testera la v1.0 complète. D'ici là, une version est validée par la relecture de Relecteur Foundry puis l'accord de Didier. Le test de chaque version est reporté à la séance de test v1 (TESTER.md).

## Déjà jouable

- [x] 0.1 à 0.4 — personnages, caractéristiques, compétences, jets D100.
- [x] 0.5 à 0.6.0 — armes et dégâts des personnages, armure par zone, initiative.
- [x] 0.6.1 à 0.6.3 — compendiums, états, combinaison percée, Rustine, fin d'ordre.
- [x] 0.7.0 — fiche Vaisseau : sections, modules, postes, Petite Fortune.
- [x] 0.7.1 — premier combat spatial (fenêtre à part). Remplacé par la 0.7.2.
- [x] 0.7.2 — combat spatial simplifié, dans le Combat Tracker habituel. Testée par Marc le 25/10/2026, correctif 0.7.2.1 delta-v.
- [x] 0.7.3 — dégâts localisés des vaisseaux, critiques, dépressurisation, missiles. Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.7.4 — chaleur du réacteur, Pousser, réparations. Règles des vaisseaux §6-7. Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.9.0 — armes, armures et portée. Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.9.1 — équipement et modules. Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.9.2 — atouts, augmentations, logiciels et substances. Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.9.3 — habillage SF des fiches (ancienne 0.8.1 / 0.10.0). Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.9.4 — blessures, journaux, vaisseaux PNJ, et une munition retirée à chaque tir. Relue par Relecteur, test Marc reporté à la v1.
- [x] 0.9.5 Machines (ex-0.8.0) — fiches du drone, du synthétique, du véhicule et de la créature ; 24 blessures de machine. Luciole, Crabe et TATI. Masse du TATI : 350 kg. Revue ciblée positive. DataModels, validation stricte et Foundry non testés : runtime absent. Test Marc reporté à la v1. Décision Didier/Marc 31/10/2026.

## Ensuite

- [x] 0.7.5 — malus de blessure −10/−20, livré en 0.9.9. Cases décochées dans le jet personnel. L'Esquive personnelle est la 0.9.8, fusionnée dans `main` (`541f420`). Le malus de portée des personnages est dans la 0.9.0.

Noté pour plus tard, pas codé : un vrai test de `rollItem` avec un acteur et un `performRoll` factices ; une notification légère quand le verrou de tir refuse un double-clic. Réserves mineures de Relecteur sur la 0.9.4 (`84517bb`).
- [x] 0.9.6 — lore public actualisé, tests disponibles passés, runtime Foundry non exécuté. Test Marc reporté à la v1. Extraits publics du 08/11/2026.
- [x] 0.9.7 — blessures des machines. Fuite narrative, zone choisie par le MJ avant application, arrêt d'urgence du châssis critique, épave du châssis mortel. Décision 08/11/2026. Contrôles ciblés passés, runtime Foundry non exécuté, test Marc à la v1.
- [x] 0.9.8 — esquive personnelle opposée. Décision Marc 08/11/2026. Fusionnée dans `main` (`541f420`).
- [x] 0.9.9 — malus de blessure personnels (jalon 0.7.5). Décision Didier, délégation v1 de Marc. Pas de Relecteur.
- [x] 1.0.0 — Rafale et test de recul en apesanteur retirés (les champs restent, aucun jet ne les lit). Blindage ajouté à la protection de coque dans les dégâts : hors service ou non renseigné = 0, dégradé = tous les points (règle déjà dans le code). Blessure Soignée hors des cases de malus. Chaleur 0.7.4 inchangée. Le +10 du commandant reste un Commandement réussi. Séance de test : TESTER.md section 24. Runtime Foundry non exécuté.
- [x] 1.0.1 — scène de test au premier chargement du MJ actif, une seule fois. Case « Recréer la scène de test ». Pas de Relecteur. Runtime Foundry non exécuté. Séance : TESTER.md section 25.
- [x] 1.0.2 — les trois personnages d'essai sont préremplis. Une fiche déjà modifiée n'est pas réécrite. Pas de Relecteur. Runtime Foundry non exécuté. Séance : TESTER.md section 25.
- [x] 1.0.3 — tolérance aux g = CON actuelle / 20, arrondi au supérieur, plus le modificateur d'origine. Dose de départ 50 à 500, ajoutée une fois à la dose aiguë. Pas de Relecteur. Runtime Foundry non exécuté. Séance : TESTER.md section 26.

Décision Marc 31/10/2026, puis 08/11/2026 : l'ordre est 0.9.2, 0.9.3 habillage, 0.9.4, 0.9.5 Machines (ex-0.8.0), 0.9.6 lore public, 0.9.7 blessures des machines, 0.9.8 esquive, 0.9.9 malus de blessure (jalon 0.7.5), 1.0.0, 1.0.1, 1.0.2, 1.0.3.

Décision Didier/Marc 31/10/2026 : un maximum de munitions à 0 veut dire sans chargeur. Le tir passe et rien n'est retiré. Un 0 avec un maximum supérieur à 0 refuse le tir. Un non-propriétaire ne tire pas une arme à chargeur, sans relais au MJ. Le patrouilleur accélère à 50 milli-g, poussée 113 kN pour 230 t. Le cargo accélère à 0,05 milli-g, type plasma. Delta-v, masse de réaction, durée et accélération à vide restent provisoires. La fragilité cellulaire est à 150 mSv. Les séquelles de radiation sont une liste, en texte seulement.
