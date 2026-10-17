/**
 * Configuration centrale du système « Sol, Nouvelle Ère ».
 *
 * Rôle : unique liste des neuf caractéristiques. `module/sol.mjs` la publie
 * sous `CONFIG.SOL` pendant le hook `init`. Le modèle
 * (`module/data/character.mjs`) et la feuille
 * (`module/sheets/character-sheet.mjs`) lisent cet objet ; ils ne recopient
 * pas les clés.
 *
 * Clé = nom de code anglais, stocké dans les données de l'acteur.
 * `label` et `abbr` = clés de traduction résolues par `lang/fr.json`.
 * Pour renommer, ajouter ou retirer une caractéristique : modifier cet objet
 * et les libellés correspondants, rien d'autre.
 */

/**
 * Registre du système. Étape 1 : uniquement `characteristics`.
 *
 * @type {{
 *   characteristics: Record<string, { label: string, abbr: string }>
 * }}
 */
export const SOL = {
  characteristics: {
    for: { label: "SOL.Characteristic.for.label", abbr: "SOL.Characteristic.for.abbr" },
    con: { label: "SOL.Characteristic.con.label", abbr: "SOL.Characteristic.con.abbr" },
    coo: { label: "SOL.Characteristic.coo.label", abbr: "SOL.Characteristic.coo.abbr" },
    ref: { label: "SOL.Characteristic.ref.label", abbr: "SOL.Characteristic.ref.abbr" },
    ada: { label: "SOL.Characteristic.ada.label", abbr: "SOL.Characteristic.ada.abbr" },
    per: { label: "SOL.Characteristic.per.label", abbr: "SOL.Characteristic.per.abbr" },
    int: { label: "SOL.Characteristic.int.label", abbr: "SOL.Characteristic.int.abbr" },
    vol: { label: "SOL.Characteristic.vol.label", abbr: "SOL.Characteristic.vol.abbr" },
    pre: { label: "SOL.Characteristic.pre.label", abbr: "SOL.Characteristic.pre.abbr" }
  }
};
