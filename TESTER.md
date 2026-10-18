# Tester le système « Sol, Nouvelle Ère » (0.5.10, initiative)

Pour Marc, sans connaissances techniques. Environ 15 minutes.
Version attendue : **0.5.10**.

La procédure des dégâts (0.5.0 à 0.5.4) est dans [docs/tests/etape-5.md](docs/tests/etape-5.md).

Gardez la console ouverte (**F12**, onglet **Console**). À la fin : aucune ligne rouge. L'ancienne erreur « Unresolved StringTerm undefined » ne doit plus apparaître. L'erreur « ContextMenuEntry#condition is deprecated » non plus.

## Mettre à jour

1. Fermez Foundry. Le dossier du système s'appelle exactement `sol-nouvelle-ere`, dans `Data/systems`.
2. Mettez-le à jour (`git pull`, ou remplacez par le ZIP). `system.json` reste directement dans ce dossier.
3. Relancez Foundry 14. Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.5.10**.
4. Ouvrez le monde. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`.

## À revérifier

Il faut un **personnage** (PER et RÉF remplies), un **PNJ**, une **créature** ou un **synthétique**, et un second jeton pour la surprise.

1. **Sonné dans le HUD.** Clic droit sur un jeton, icône des conditions. **Sonné** est dans la liste, à côté de Saignement et de Combinaison percée. Le texte dit : pas d'action ce tour, réaction possible ; posé avant le combat, envoie en fin d'ordre dès le round 1. Posez-le sur quelqu'un qui a déjà son initiative, **avant** de démarrer le combat. Démarrez : il est en bas dès le round 1. Rien ne bloque le tour à sa place.
2. **Menu du tracker.** Démarrez un combat, **Tout lancer**. Clic droit sur une ligne du tracker. **Interrompu : recule d'une place** est là, et il recule bien (tout de suite si la personne n'a pas encore joué et n'est pas dernière ; au round suivant si c'est la personne en surbrillance). Pas de ligne rouge.
3. **Se replacer.** Le bouton n'apparaît que sur la personne **en surbrillance**, pour le propriétaire ou le MJ. La carte dit que le **mouvement** de ce tour est sacrifié. L'ordre ne change pas ce round : la nouvelle place arrive au round suivant.
4. **Perception.** Ouvrez la créature ou le synthétique. La feuille a **FOR**, **CON** et **PER**, et un bouton de jet sur PER. Dans le combat, **Tout lancer** : pas de message « test à 0 ».
5. **Critique.** Si une Vigilance est une réussite critique, le tracker affiche par exemple **2 DR crit. · RÉF 57**, au-dessus d'une réussite normale du même nombre de DR.
6. **Surpris.** Avant le round 1, ou au début du round 1, le MJ marque **Surpris** : menu du tracker, ou la condition du même nom sur le jeton. Au round 1, son tour est sauté (la surbrillance passe au suivant). Au round 2, la marque a disparu.
