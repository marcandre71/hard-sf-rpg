# Tester le système « Sol, Nouvelle Ère » (étape 5)

Guide pas à pas, sans connaissances techniques. Durée : environ 15 minutes.
Version attendue : **0.5.4**.

La procédure de l'étape 4 (versions 0.4.0 et 0.4.1, déjà validée) est dans [docs/tests/etape-4.md](docs/tests/etape-4.md).

Gardez la console ouverte (**F12**, onglet **Console**) pendant tout le test. À la fin, elle ne doit contenir **aucune ligne rouge**.

## 1. Mettre à jour

1. Fermez Foundry s'il est ouvert.
2. Le dossier du système doit s'appeler **exactement** `sol-nouvelle-ere`, dans `Data/systems`.
3. Téléchargez le ZIP du dépôt, décompressez-le, et remplacez le contenu de `Data/systems/sol-nouvelle-ere` (le fichier `system.json` doit rester directement dans ce dossier).
4. Relancez Foundry (version 14). Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.5.4**.
5. Ouvrez votre monde. Dans la console : `Sol, Nouvelle Ère | Initialisation du système`.

Si le monde existait déjà, les dossiers de compendiums peuvent rester à l'ancienne place. Dans la console, collez `game.settings.set("core", "compendiumConfiguration", {})`, validez, puis rechargez la page **deux fois** (attendez la fin du premier rechargement).

## 2. Préparer la cible

1. Posez deux jetons sur la scène : **Ilka Moravec** (celle qui tire) et un second personnage ou PNJ (la cible).
2. Sur la cible, onglet **Principal** : Base de **FOR** à **30**, Base de **CON** à **40**. Origine, acquis et temporaire à **0**. Les Actuelles sont donc 30 et 40. Le Seuil de blessure vaut **4** (on ne le voit pas sur la feuille du personnage : il apparaît dans la fenêtre plus bas). Le livre dit encore 7 : ce chiffre est périmé, Marc mettra le LdR à jour.
3. Onglet **Inventaire**, liste **Armures**, **Créer**. Ouvrez l'armure. Protection du **torse** : **3**. Cochez **Pressurisée**. Joints : **Intacte**. Fermez, puis cochez **Équipé** sur la ligne.
4. Sur Ilka, créez une arme. Dégâts : **10**. Compétence : `Armes de poing`. Cochez **Équipé**.

## 3. L'exemple du livre

1. Connecté en **MJ**, ciblez le jeton de la cible (clic droit, ou la cible habituelle : le jeton est entouré).
2. Sur Ilka, lancez l'arme en **Normale** jusqu'à une **Réussite**.
3. La carte a un bouton **Appliquer les dégâts**. S'il n'y est pas, la carte est un échec, ou c'est une vieille carte d'avant cette version : relancez. La ligne de résultat : tester en interface claire ET sombre, la ligne doit rester lisible.
4. Cliquez le bouton.
   - Si la zone n'est pas le **torse**, annulez et relancez. Une réussite critique ne permet pas de choisir la zone : c'est toujours celle écrite sur la carte.
   - Il faut aussi que la carte affiche **Dégâts : 12** (l'arme 10, plus 2 de DR). Sinon annulez et relancez.
5. La fenêtre doit afficher, pour cette cible : zone **Torse**, dégâts bruts **12**, armure **3**, dégâts nets **9**, Seuil **4**, gravité **Critique**, brèche **Oui**.
6. Cliquez **Appliquer**. Sur la cible : une blessure **Critique — Torse**, saignement **non** coché, pénalité **0**. L'armure a les joints **Percée**. Le jeton a la condition **Combinaison percée**. Il n'a **pas** la condition **Saignement** : elle n'est posée que pour une blessure grave.
7. Une carte de résultat apparaît : cible, torse, dégâts nets 9, Critique, brèche Oui, et un rappel pour le test de Constitution. Le bouton **Test de Constitution** ouvre la fenêtre de jet habituelle pour le propriétaire de la cible, ou le MJ. Un autre joueur ne le voit pas. Vous pouvez annuler.
8. Le bouton de la carte d'attaque affiche maintenant **Dégâts déjà appliqués**. Cliquez-le : la question est « Dégâts déjà appliqués, recommencer ? ». Cliquez **Annuler** : pas de seconde blessure.

## 4. Dégâts absorbés

1. Rouvrez l'armure. Remettez les joints sur **Intacte**. Protection du **torse** : **30**. Elle reste équipée.
2. Relancez l'arme jusqu'à une réussite au **torse**. Les dégâts affichés sur la carte sont inférieurs à 30.
3. La fenêtre doit afficher des dégâts nets **0 ou moins**, gravité **Aucune blessure**, brèche **Non**.
4. Confirmez. Pas de nouvelle blessure. Les joints restent **Intacte**.

## 5. Un joueur ne voit pas le bouton

1. Relancez une attaque **réussie** en tant que MJ.
2. Regardez la même carte avec un compte **joueur** (autre navigateur). Le bouton **Appliquer les dégâts** n'y est pas. S'il arrivait à le déclencher, un message dit que seul le MJ peut le faire.

## 6. Une créature peut être blessée

1. Créez un acteur **Créature**. Sa feuille montre **Force** et **Constitution**, et le **Seuil de blessure**. Base de FOR à **30**, Base de CON à **40**, le reste à **0**. Le Seuil affiché est **4**.
2. Cliquez **FOR** : la fenêtre de jet habituelle s'ouvre, score **30**. Vous pouvez annuler.
3. Posez son jeton, ciblez-le, et appliquez une attaque réussie dont les dégâts nets sont au moins 1. Une blessure est créée.
4. Un **Véhicule** ou un **Vaisseau** n'a pas ces caractéristiques : l'application est refusée, pas de blessure.

## 7. Compendiums

1. Onglet **Compendiums** (la barre de droite).
2. Trois dossiers : **Objets**, **Journal**, **Tables**.
3. **Compétences** contient les compétences du livre, dont **Pilotage : vaisseaux à fusion** et **Médecine : chirurgie**. **Origines** contient **Terre**. **Milieux** en contient six, **Professions** huit.
4. **Armes** : **Pistolet frangible** (dégâts 6) et **Carabine** (dégâts 10). **Armures et vêtements** : **Combinaison souple**, **Combinaison renforcée**, **Armure de pont**.
5. Restent vides : Atouts, Équipement, Augmentations, Substances, Logiciels, Modules de vaisseau, Séquelles, **Univers et factions**, **Tables**. Pas de table de localisation ni de séquelles.

## 8. Liste de contrôle

- [ ] Version **0.5.4**, aucune ligne rouge dans la console.
- [ ] Ligne de résultat de la carte : tester en interface claire ET sombre, la ligne doit rester lisible.
- [ ] Armure pressurisée, torse 3, équipée. Carabine 10 + DR 2, FOR 30 et CON 40, Seuil **4** : nets **9**, **Critique**, brèche **Oui**. Pas de condition **Saignement**.
- [ ] Blessure créée, joints **Percée**, condition **Combinaison percée**.
- [ ] Dégâts nets à 0 ou moins : pas de blessure, pas de nouvelle brèche.
- [ ] Après application, le bouton dit que les dégâts sont déjà appliqués. Un second clic demande confirmation ; **Annuler** n'écrit rien de plus.
- [ ] Un joueur ne voit pas le bouton **Appliquer les dégâts**.
- [ ] Une créature avec FOR et CON reçoit une blessure. Le Seuil est sur sa feuille. Cliquer **FOR** ouvre le jet. Véhicule et vaisseau sont refusés.
- [ ] Compétences, origines, milieux, professions, armes et armures contiennent les entrées du livre. Les autres compendiums sont vides.
