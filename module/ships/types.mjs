/**
 * Liste du type de vaisseau. Réf. Vaisseaux v0.1 §2 (Guide §3).
 * Décision Marc 21/10/2026 : un menu groupé, plus « Autre » en texte libre.
 * Les libellés sont des clés i18n. `module/config.mjs` en fait les choix
 * plats du schéma (la validation Foundry ne connaît pas les groupes).
 */

/** @type {{ id: string, label: string, types: { id: string, label: string }[] }[]} */
export const SHIP_TYPE_GROUPS = [
  {
    id: "atmospheric",
    label: "SOL.Ship.category.atmospheric",
    types: [
      ["heavyReusableLauncher", "SOL.Ship.type.heavyReusableLauncher"],
      ["lineShuttle", "SOL.Ship.type.lineShuttle"],
      ["suborbitalHopper", "SOL.Ship.type.suborbitalHopper"],
      ["orbitalTanker", "SOL.Ship.type.orbitalTanker"],
      ["lunarLander", "SOL.Ship.type.lunarLander"],
      ["martianLander", "SOL.Ship.type.martianLander"],
      ["descentCargoCapsule", "SOL.Ship.type.descentCargoCapsule"],
      ["titanCargoAirship", "SOL.Ship.type.titanCargoAirship"],
      ["titanExplorerAircraft", "SOL.Ship.type.titanExplorerAircraft"],
      ["lakeSkimmer", "SOL.Ship.type.lakeSkimmer"],
      ["titanLauncher", "SOL.Ship.type.titanLauncher"],
      ["venusianShuttle", "SOL.Ship.type.venusianShuttle"],
      ["extractionAerostat", "SOL.Ship.type.extractionAerostat"],
      ["atmosphericLifeboat", "SOL.Ship.type.atmosphericLifeboat"]
    ]
  },
  {
    id: "void",
    label: "SOL.Ship.category.void",
    types: [
      ["fusionLiner", "SOL.Ship.type.fusionLiner"],
      ["fusionPassenger", "SOL.Ship.type.fusionPassenger"],
      ["luxuryYacht", "SOL.Ship.type.luxuryYacht"],
      ["slowPlasmaFreighter", "SOL.Ship.type.slowPlasmaFreighter"],
      ["nuclearThermalTug", "SOL.Ship.type.nuclearThermalTug"],
      ["rockPusher", "SOL.Ship.type.rockPusher"],
      ["prospector", "SOL.Ship.type.prospector"],
      ["mobileRefinery", "SOL.Ship.type.mobileRefinery"],
      ["waterCarrier", "SOL.Ship.type.waterCarrier"],
      ["heliumCoffer", "SOL.Ship.type.heliumCoffer"],
      ["reactionMassTender", "SOL.Ship.type.reactionMassTender"],
      ["watchPatrol", "SOL.Ship.type.watchPatrol"],
      ["shepherd", "SOL.Ship.type.shepherd"],
      ["escort", "SOL.Ship.type.escort"],
      ["disguisedPrivateer", "SOL.Ship.type.disguisedPrivateer"],
      ["doubleHull", "SOL.Ship.type.doubleHull"],
      ["voidGuard", "SOL.Ship.type.voidGuard"],
      ["salvager", "SOL.Ship.type.salvager"],
      ["hospitalShip", "SOL.Ship.type.hospitalShip"],
      ["scienceVessel", "SOL.Ship.type.scienceVessel"],
      ["courier", "SOL.Ship.type.courier"],
      ["pressRelay", "SOL.Ship.type.pressRelay"],
      ["colonistConvoy", "SOL.Ship.type.colonistConvoy"],
      ["yardSpider", "SOL.Ship.type.yardSpider"],
      ["orbitalTaxi", "SOL.Ship.type.orbitalTaxi"],
      ["debrisDredge", "SOL.Ship.type.debrisDredge"],
      ["roboticProbe", "SOL.Ship.type.roboticProbe"]
    ]
  },
  {
    id: "fixed",
    label: "SOL.Ship.category.fixed",
    types: [
      ["rotatingHabitat", "SOL.Ship.type.rotatingHabitat"],
      ["buriedHabitat", "SOL.Ship.type.buriedHabitat"],
      ["roadstead", "SOL.Ship.type.roadstead"],
      ["orbitalShipyard", "SOL.Ship.type.orbitalShipyard"],
      ["fuelDepot", "SOL.Ship.type.fuelDepot"],
      ["heliumVault", "SOL.Ship.type.heliumVault"],
      ["commRelay", "SOL.Ship.type.commRelay"],
      ["satellites", "SOL.Ship.type.satellites"],
      ["orbitalHotel", "SOL.Ship.type.orbitalHotel"],
      ["refuge", "SOL.Ship.type.refuge"],
      ["rotatingMaternity", "SOL.Ship.type.rotatingMaternity"],
      ["scienceStation", "SOL.Ship.type.scienceStation"],
      ["quarantineLab", "SOL.Ship.type.quarantineLab"],
      ["watchPost", "SOL.Ship.type.watchPost"],
      ["electromagneticCatapult", "SOL.Ship.type.electromagneticCatapult"],
      ["solarFoundry", "SOL.Ship.type.solarFoundry"],
      ["floatingStation", "SOL.Ship.type.floatingStation"],
      ["orbitalFarm", "SOL.Ship.type.orbitalFarm"],
      ["patienceYard", "SOL.Ship.type.patienceYard"]
    ]
  },
  {
    id: "other",
    label: "SOL.Ship.typeGroup.other",
    types: [
      ["other", "SOL.Ship.type.other"]
    ]
  }
].map(group => ({
  id: group.id,
  label: group.label,
  types: group.types.map(([id, label]) => ({ id, label }))
}));

/**
 * Choix plats : valeur stockée → clé i18n.
 * La validation Foundry ne lit que les clés.
 *
 * @returns {Record<string, string>}
 */
export function shipTypeChoices() {
  /** @type {Record<string, string>} */
  const choices = {};
  for ( const group of SHIP_TYPE_GROUPS ) {
    for ( const type of group.types ) choices[type.id] = type.label;
  }
  return choices;
}
