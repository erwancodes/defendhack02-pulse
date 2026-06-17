// ── Simulations "et si..." : arithmétique simple sur le mix ──
import type { EcoMixRecord } from './eco2mix'

export type ScenarioId = 'no-nuclear' | 'all-renewable' | 'cold-wave' | 'disconnect-idf'

export interface Scenario {
  id: ScenarioId
  label: string
}

export const SCENARIOS: Scenario[] = [
  { id: 'no-nuclear', label: 'on coupe le nucléaire ?' },
  { id: 'all-renewable', label: 'on passe 100% renouvelable ?' },
  { id: 'cold-wave', label: "c'est une vague de froid (-10°C) ?" },
  { id: 'disconnect-idf', label: "on déconnecte l'Île-de-France ?" },
]

export interface SimResult {
  data: EcoMixRecord
  blackout: boolean
  region: string | null // id de région à éteindre en premier
  titre: string | null // texte plein écran si blackout
}

export function simulate(id: ScenarioId, base: EcoMixRecord): SimResult {
  const d: EcoMixRecord = { ...base }

  switch (id) {
    case 'no-nuclear': {
      d.nucleaire = 0
      // On tente de compenser par le gaz, mais la marge ne suffit pas la nuit.
      d.gaz = base.gaz + Math.min(base.nucleaire * 0.3, 12000)
      d.taux_co2 = 210
      const prod = totalProd(d)
      const blackout = prod < base.consommation * 0.85
      return {
        data: d,
        blackout,
        region: 'idf',
        titre: blackout ? 'BLACKOUT PARTIEL — RÉGION PARISIENNE' : null,
      }
    }
    case 'all-renewable': {
      d.nucleaire = 0
      d.gaz = 0
      d.fioul = 0
      d.charbon = 0
      // On laisse éolien/solaire/hydraulique tels quels.
      d.taux_co2 = 18
      const prod = totalProd(d)
      const blackout = prod < base.consommation * 0.9
      return {
        data: d,
        blackout,
        region: 'naq',
        titre: blackout ? 'RÉSEAU INSUFFISANT — PRODUCTION RENOUVELABLE TROP FAIBLE' : null,
      }
    }
    case 'cold-wave': {
      // +2400 MW par degré sous la normale, ~5°C de chute.
      d.consommation = base.consommation + 12000
      d.gaz = base.gaz + 6000
      d.fioul = base.fioul + 2000
      d.taux_co2 = base.taux_co2 + 28
      const blackout = totalProd(d) < d.consommation * 0.97
      return {
        data: d,
        blackout,
        region: 'ges',
        titre: blackout ? 'TENSION RÉSEAU — VAGUE DE FROID' : null,
      }
    }
    case 'disconnect-idf': {
      d.consommation = Math.round(base.consommation * 0.81)
      return {
        data: d,
        blackout: true,
        region: 'idf',
        titre: 'ÎLE-DE-FRANCE DÉCONNECTÉE',
      }
    }
  }
}

function totalProd(d: EcoMixRecord): number {
  return d.nucleaire + d.eolien + d.solaire + d.hydraulique + d.gaz + d.fioul + d.charbon
}
