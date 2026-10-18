# Tester le système « Sol, Nouvelle Ère » (0.5.9, initiative)

Pour Marc, sans connaissances techniques. Environ 15 minutes.
Version attendue : **0.5.9**.

La procédure des dégâts (0.5.0 à 0.5.4) est dans [docs/tests/etape-5.md](docs/tests/etape-5.md).

Gardez la console ouverte (**F12**, onglet **Console**). À la fin : aucune ligne rouge. L'ancienne erreur « Unresolved StringTerm undefined » ne doit plus apparaître.

## Mettre à jour

1. Fermez Foundry. Le dossier du système s'appelle exactement `sol-nouvelle-ere`, dans `Data/systems`.
2. Mettez-le à jour (`git pull`, ou remplacez par le ZIP). `system.json` reste directement dans ce dossier.
3. Relancez Foundry 14. Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.5.9**.
4. Ouvrez le monde. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`.

## Initiative glissante

Il faut quatre jetons : un **personnage** (PER et RÉF remplies, par exemple Ilka), un **PNJ**, et **deux synthétiques identiques** (les sbires).

1. Sélectionnez les quatre. Clic droit, bouton des épées : ils entrent dans le combat.
2. Dans le Combat Tracker, **Tout lancer**. Une carte **Vigilance** par personne. Les sbires préviennent qu'ils n'ont ni Vigilance ni Perception et que le test est à **0**. Pas une fenêtre par personne : difficulté **Normale**. Pas de ligne rouge.
3. Le tracker affiche le jet, par exemple **2 DR · RÉF 57** ou **3 DE**, pas un grand nombre du genre 1002057. Une réussite est au-dessus d'un échec. Ce n'est pas un bonus : une compétence lancée ensuite n'en gagne pas.
4. Démarrez le combat. Passez au **round 2**. Le même ordre. Aucune nouvelle carte de Vigilance.
5. Sur celui qui joue en premier : Base de **FOR** à **30**, Base de **CON** à **40**. Le Seuil vaut **4**. Armure équipée, torse à **6**. Une arme à **10** dégâts, réussite, zone **torse**. Appliquez : gravité **Grave**. Round suivant : il est **en bas**. Pas de nouveau jet. La surbrillance reste sur le premier de la liste.
6. Sur un autre, clic droit sur le jeton, conditions, **Sonné**. Le texte rappelle qu'il ne joue pas d'action, une réaction reste possible. Rien ne bloque le tour. Round suivant : le sonné passe **en bas**.
7. **Interrompu** (clic droit dans le tracker) sur quelqu'un qui n'a pas encore joué et qui n'est pas dernier : il échange tout de suite avec le suivant. La surbrillance ne change pas de personne. **Interrompu** sur la personne en surbrillance : l'ordre ne change pas ce round. Au round suivant, elle a reculé d'une place. Personne ne rejoue, personne n'est sauté.
8. **Se replacer** (combat déjà démarré, propriétaire ou MJ). La carte dit que l'action de ce tour est sacrifiée. S'il reste derrière la surbrillance, sa place change tout de suite. S'il passe devant, l'ordre attend le round suivant.
9. **Relancer**, le **d20**, ou **Tout lancer** sur quelqu'un qui a **déjà** un libellé « 2 DR · RÉF 57 » : même règle que Se replacer. Effet immédiat ou au round suivant : à confirmer. Quelqu'un **ajouté en cours de round**, qui n'a encore aucune initiative : son premier jet s'écrit tout de suite, même s'il passe devant. La personne en surbrillance garde le tour. Le d20 ne reste pas affiché.
10. Cochez le PNJ comme **caché**, **Effacer l'initiative**, relancez-la. La carte est **chuchotée au MJ** : un joueur ne la voit pas. Le libellé « 2 DR » a disparu tant que la case est vide, et le bouton de dé est revenu.
