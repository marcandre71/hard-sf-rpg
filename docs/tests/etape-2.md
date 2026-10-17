# Tester l'étape 2 (archive)

Cette procédure correspond à la **version 0.2.0**, déjà validée par Marc.
Le système en cours est l'étape 3 : suivre [TESTER.md](../../TESTER.md).
Ce fichier est conservé pour ne pas perdre le scénario de l'étape 2.
Sur une 0.3.0, le PNJ n'a plus de champ Description (il est dans Biographie) et la feuille du personnage est en onglets : ne pas rejouer ce scénario tel quel sur la version actuelle.

# Tester le système « Sol, Nouvelle Ère » (étape 2)

Guide pas à pas, sans connaissances techniques. Durée : environ 30 minutes.
Version attendue : **0.2.0**.

Gardez la console ouverte (étape 3) pendant tout le test. À la fin, elle ne doit contenir **aucune ligne rouge**.

## 1. Installer ou mettre à jour

1. Fermez Foundry s'il est ouvert.
2. Le dossier du système doit s'appeler **exactement** `sol-nouvelle-ere`, dans `Data/systems`.
   (Chemin des données : écran d'accueil de Foundry → *Configuration* → *Chemin des données utilisateur*.)
3. Si vous avez déjà cloné le dépôt : ouvrez un terminal dans `Data/systems/sol-nouvelle-ere` et lancez `git pull`.
   Sinon, suivez l'installation du [README](README.md).
4. Vérifiez que le fichier `Data/systems/sol-nouvelle-ere/system.json` est directement dans ce dossier.
5. Lancez Foundry (version 14). Onglet **Systèmes de jeu** : « Sol, Nouvelle Ère », version **0.2.0**.

## 2. Monde

- **Vous avez déjà le monde de l'étape 1** : ouvrez-le. Il sert à vérifier qu'Ilka n'a pas été effacée.
- **Sinon** : onglet **Mondes** → **Créer un monde**. Titre : « Test Sol ». Système : **Sol, Nouvelle Ère**. Lancez-le en **Gamemaster**.

## 3. Console

Appuyez sur **F12** (ou Cmd+Option+I sur Mac), onglet **Console**.
Vous devez y voir : `Sol, Nouvelle Ère | Initialisation du système`.

## 4. Ilka Moravec est intacte

### Si Ilka existe déjà

1. Barre de droite, onglet **Acteurs** → ouvrez **Ilka Moravec**.
2. Le type affiché sur la feuille est **Personnage**.
3. Le tableau des caractéristiques est **celui que vous aviez saisi** (voir le tableau ci-dessous). Rien n'a été remis à 25 tout seul.
4. De nouveaux blocs apparaissent : Identité, Contacts, Défauts, Biographie, Notes, Objets.
   Leurs valeurs de départ sont les défauts du système, pas un effacement d'Ilka :
   Concept vide, Lieu de naissance vide, **Gravité natale 1**, État / Faction / Bloc vides, **Âge 25**, Taille vide, **Masse 70**, Contacts et Défauts vides.
   L'âge 25 et la masse 70 ne veulent pas dire qu'Ilka a changé : ces cases n'existaient pas à l'étape 1.

### Si vous partez d'un monde vide

1. Onglet **Acteurs** → **Créer un acteur**. Nom : `Ilka Moravec`. Type : **Personnage**.
2. Au départ, toutes les bases valent 25 et la colonne **Actuelle** affiche 25.
3. Saisissez le tableau (clic dans la case, nombre, puis Tab ou clic ailleurs : l'enregistrement est automatique). Laissez **Temp.** à 0.

| Caractéristique | Base | Origine | Progression | Temp. | **Actuelle attendue** |
|---|---|---|---|---|---|
| FOR Force | 30 | −5 | 0 | 0 | **25** |
| CON Constitution | 40 | −5 | 0 | 0 | **35** |
| COO Coordination | 45 | 0 | 0 | 0 | **45** |
| RÉF Réflexes | 35 | 0 | 0 | 0 | **35** |
| ADA Adaptation spatiale | 45 | +15 | 0 | 0 | **60** |
| PER Perception | 40 | 0 | 0 | 0 | **40** |
| INT Intellect | 55 | 0 | 0 | 0 | **55** |
| VOL Volonté | 35 | 0 | 1 | 0 | **36** |
| PRÉ Présence | 30 | 0 | 0 | 0 | **30** |

(Pour −5, tapez `-5` ; pour +15, tapez `15`.)

## 5. Modifier l'identité, puis vérifier que ça reste

Sur la feuille d'Ilka :

1. Concept : `Ingénieure de remorqueur née à Cérès`.
2. Lieu de naissance : `Cérès`. Gravité natale : `0,35` (si la virgule est refusée, tapez `0.35`). Âge : `34`. Taille : `1,86 m`. Masse : `58`.
3. Contacts (texte libre, plusieurs lignes) : un nom, puis à la ligne une note.
4. Défauts : une phrase.
5. Biographie : une phrase.
6. Fermez la feuille, rouvrez-la. Tout est encore là, y compris le tableau des caractéristiques.
7. Rechargez la page (F5), rouvrez Ilka : même résultat.
8. Le nom se modifie depuis la feuille. Cliquer sur le portrait ouvre le choix d'une image.
9. La colonne **Actuelle** n'est pas une case : on ne peut pas y écrire.

## 6. Valeur hors limites (pas de message d'erreur)

Bornes **stockées** : Base 1 à 60, Origine −10 à +15, Progression 0 à 10. Temp. n'a pas de borne. L'**Actuelle** est calculée (Base + Origine + Progression + Temp.) puis ramenée entre **0 et 100**. Foundry **ne montre pas d'avertissement** : il ramène le nombre tout seul. Si la case garde le nombre tapé, fermez et rouvrez la fiche.

Tout se fait sur la ligne **FOR**, sauf la Progression (sur **VOL**). Départ d'Ilka : FOR Base 30, Origine −5, Progression 0, Temp. 0, Actuelle 25. VOL Base 35, Origine 0, Progression 1, Temp. 0, Actuelle 36. Ne testez pas l'Origine sur ADA : elle y vaut déjà +15, le plafond, et le changement ne se verrait pas.

1. Ligne **FOR**, Base = `80`, puis Tab. Attendu : Base **60** (pas 80, pas 100), Actuelle **55** (60 − 5).
2. Remettez la Base de FOR à `30`. Actuelle **25**.
3. Ligne **FOR**, Origine = `20`. Attendu : Origine **15**, Actuelle **45** (30 + 15).
4. Toujours FOR, Origine = `-30`. Attendu : Origine **−10**, Actuelle **20** (30 − 10).
5. Remettez l'Origine de FOR à `-5`. Actuelle **25**.
6. Ligne **VOL**, Progression = `-3`. Attendu : Progression **0**, Actuelle de VOL **35**.
7. Remettez la Progression de VOL à `1`. Actuelle de VOL **36**.
8. Ligne **FOR**, Temp. = `-3`. Elle **reste −3**. Actuelle de FOR **22** (25 − 3).
9. Temp. de FOR = `80`. Elle reste 80. Actuelle **100** (30 − 5 + 80 = 105, ramenée à 100).
10. Temp. de FOR = `-40`. Elle reste −40. Actuelle **0** (30 − 5 − 40 = −25, ramenée à 0).
11. Remettez la Temp. de FOR à `0`. Actuelle **25**. Le tableau est celui de l'étape 4.

Âge, dégâts, protection, quantités et coûts sont des **entiers** : une décimale est ramenée au nombre entier. La Formation aussi (0 à 60). La portée d'une arme n'est pas un nombre. Gravité natale (sur le personnage), masse, encombrement, munitions et réserve d'un équipement **gardent la décimale**.

## 7. Créer chaque type d'acteur

Onglet **Acteurs** → **Créer un acteur**. Pour chaque ligne : le type dans la liste est le libellé français, la feuille affiche ce même libellé, vous modifiez le champ indiqué, vous fermez, vous rouvrez, la valeur est toujours là.

| Nom à donner | Type dans la liste | Ce qu'il faut voir et modifier |
|---|---|---|
| `Cobaye PNJ` | **PNJ** | Description et Notes. Écrivez une phrase dans Description. Pas de tableau de caractéristiques. |
| `Cobaye Créature` | **Créature** | Idem. |
| `Cobaye Synthétique` | **Synthétique** | Idem. |
| `Cobaye Drone` | **Drone** | Idem. |
| `Cobaye Véhicule` | **Véhicule** | Liste **Catégorie** : Terrestre, Maritime, Aérien. Choisissez Maritime. |
| `Cobaye Vaisseau` | **Vaisseau** | Liste **Catégorie** : Vaisseau, Station. Choisissez Station. |

Aucun de ces acteurs ne doit proposer de Force, de Constitution, etc.

## 8. Créer chaque type d'objet

Onglet **Objets** (icône de sac) → **Créer un objet**. Le type proposé est le libellé français. Ouvrez la feuille : le même libellé est sous le nom. Modifiez le champ indiqué, fermez, rouvrez.

| Nom | Type | Champ à modifier |
|---|---|---|
| `Pilotage` | **Compétence** | Formation : case numérique (pas un curseur), tapez `10`. Domaine : la liste contient « Espace et vaisseaux », « Technique », « Sciences et médecine », « Combat », « Corps et terrain », « Relations », « Savoirs ». Le défaut est Technique : choisissez **Combat**. |
| `Pied marin du vide` | **Atout** | Coût en XP : `15`. |
| `Ceinture` | **Origine** | Particularité : un mot. Il n'y a **pas** de case Gravité natale (elle est seulement sur le personnage). |
| `Famille de sociétaires` | **Milieu** | Lien : un mot. Le type s'appelle **Milieu**, pas « Background ». |
| `Ingénieure` | **Profession** | Réseau : un mot. |
| `Pistolet à rivets` | **Arme** | Dégâts : `8`. Portée : une liste Courte, Moyenne, Longue (défaut Courte) — choisissez **Longue**. Dans Description, notez une distance indicative, par exemple `30 m`. Type de munitions : Frangible, Perforante, Fléchette, Aucune. |
| `Combinaison souple` | **Armure/Vêtement** | Protection Tête : tapez `2` (le défaut est 0). Joints : Intacte ou Percée — choisissez **Percée**. |
| `Kit d'ingénieure` | **Équipement** | Quantité : `2` (le défaut est déjà 1). Bonus d'outils : `10`. |
| `Thérapie ADN` | **Augmentation** | Genre : Thérapie, Prothèse, Organe cultivé, Héréditaire. Le défaut est Thérapie : choisissez **Prothèse**. |
| `Médicament` | **Substance** | Description seulement. |
| `Brûlure` | **Blessure** | Localisation : choisissez **Torse**. Gravité : Légère, Grave, Critique, Mortelle — choisissez **Grave**. |
| `Os fragiles` | **Séquelle** | Type : liste Radiation, Déconditionnement, Trauma (défaut Radiation). Choisissez **Déconditionnement**. Cochez Permanente. |
| `Greffier` | **Logiciel** | Description seulement. |
| `Propulseur` | **Module de vaisseau** | Type : un mot. État : un mot. |

Tous ces objets ont aussi une case **Description** en bas de la feuille.

## 9. Objet sur le personnage

1. Rouvrez Ilka.
2. En bas, liste **Créer** : choisissez **Compétence**, cliquez sur **Créer**.
3. Une ligne « Compétence » apparaît. Cliquez son nom, mettez Formation à `20`, fermez la feuille de la compétence.
4. Fermez Ilka, rouvrez-la : la compétence est toujours là.
5. La liste **Créer** d'Ilka ne propose **pas** « Module de vaisseau ».
6. La même liste, selon l'acteur :
   - **Ilka** et **Cobaye PNJ** : les mêmes types, y compris Origine, Milieu et Profession. Pas de Module de vaisseau.
   - **Cobaye Créature** : seulement Arme, Armure/Vêtement, Blessure, Atout.
   - **Cobaye Synthétique** : comme Ilka, sauf Origine, Milieu, Profession et Substance.
   - **Cobaye Drone** : Arme, Armure/Vêtement, Équipement, Logiciel, Blessure.
   - **Cobaye Véhicule** : Arme, Armure/Vêtement, Équipement, Logiciel.
   - **Cobaye Vaisseau** : les mêmes que le véhicule, plus Module de vaisseau.

## 10. Refus : Module de vaisseau sur un Personnage

1. L'objet **Propulseur** (Module de vaisseau) est dans l'onglet Objets, depuis l'étape 8. S'il n'y est pas, créez-le.
2. Glissez-le **sur la feuille d'Ilka** (la fenêtre ouverte). Le déposer sur son nom dans la liste des acteurs ne fait rien : ce n'est pas le test.
3. Un avertissement jaune apparaît, du genre : `Module de vaisseau ne peut pas être ajouté à Ilka Moravec (Personnage).`
4. Ilka **n'a pas** gagné cet objet. Propulseur est toujours dans l'onglet Objets.

## 11. Une seule Origine

1. Sur Ilka, **Créer** → **Origine**. La ligne apparaît.
2. Créez une **deuxième** Origine de la même façon.
3. Avertissement exact : `Ilka Moravec a déjà un objet « Origine ». Un seul est autorisé.` La deuxième n'est pas ajoutée.
4. Même principe pour **Milieu** et **Profession** (inutile de tout refaire si Origine a fonctionné ; une vérification rapide suffit).
5. Sur **Cobaye PNJ**, créez une Origine, puis une deuxième : elle est refusée de la même façon (le nom du PNJ remplace celui d'Ilka dans l'avertissement).

## 12. Liste de contrôle

- [ ] Le système affiche la version **0.2.0** et le monde se lance.
- [ ] La console montre `Sol, Nouvelle Ère | Initialisation du système`.
- [ ] Ilka est un **Personnage**, son tableau de caractéristiques est celui de l'étape 1 (ou celui saisi à l'étape 4).
- [ ] Les nouveaux champs d'identité s'enregistrent et survivent à F5.
- [ ] Une valeur hors limites est ramenée sans message (FOR Base 80 → 60 ; Actuelle jamais sous 0 ni au-dessus de 100).
- [ ] Les six autres types d'acteurs se créent avec leur nom français, sans caractéristiques inventées.
- [ ] Véhicule : Terrestre / Maritime / Aérien. Vaisseau : Vaisseau / Station.
- [ ] Les quatorze types d'objets se créent avec leur nom français (Atout, Milieu, Armure/Vêtement, Module de vaisseau…).
- [ ] Glisser un Module de vaisseau sur Ilka est refusé, avec un avertissement.
- [ ] Une deuxième Origine sur Ilka est refusée, et aussi sur le PNJ.
- [ ] Les listes **Créer** (créature, synthétique, drone, véhicule, vaisseau) sont celles de l'étape 9.
- [ ] **Aucune ligne rouge** dans la console pendant tout le test.

## 13. Si quelque chose ne va pas

Faites une capture de la feuille **et** de la console F12 (lignes rouges), et notez l'étape où le problème est apparu.
