// ── Simulations "et si..." : arithmétique simple sur le mix ──
import type { EcoMixRecord } from './eco2mix'

export type ScenarioId =
  | 'no-nuclear'
  | 'all-renewable'
  | 'cold-wave'
  | 'disconnect-idf'
  | 'no-wind'
  | 'no-solar-evening'
  | 'heat-wave'
  | 'cyber-brittany'
  | 'border-closed'

export interface Scenario {
  id: ScenarioId
  label: string
}

export const SCENARIOS: Scenario[] = [
  { id: 'no-nuclear', label: 'on coupe le nucléaire ?' },
  { id: 'all-renewable', label: 'on passe 100% renouvelable ?' },
  { id: 'cold-wave', label: "c'est une vague de froid (-10°C) ?" },
  { id: 'heat-wave', label: "c'est une canicule à 19h ?" },
  { id: 'no-wind', label: "le vent tombe d'un coup ?" },
  { id: 'no-solar-evening', label: 'le soleil disparaît au pic du soir ?' },
  { id: 'border-closed', label: 'les interconnexions européennes tombent ?' },
  { id: 'cyber-brittany', label: 'une cyberattaque isole la Bretagne ?' },
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
    case 'heat-wave': {
      // Climatisation + activité de fin de journée : le besoin monte, le solaire baisse.
      d.consommation = base.consommation + 8500
      d.solaire = Math.round(base.solaire * 0.35)
      d.gaz = base.gaz + 5200
      d.fioul = base.fioul + 800
      d.taux_co2 = base.taux_co2 + 22
      const blackout = totalProd(d) < d.consommation * 0.96
      return {
        data: d,
        blackout,
        region: 'pac',
        titre: blackout ? 'TENSION RÉSEAU — CANICULE ET PIC DU SOIR' : null,
      }
    }
    case 'no-wind': {
      d.eolien = 0
      d.gaz = base.gaz + Math.min(base.eolien * 0.65, 7000)
      d.hydraulique = base.hydraulique + Math.min(base.eolien * 0.2, 2500)
      d.taux_co2 = base.taux_co2 + 35
      const blackout = totalProd(d) < base.consommation * 0.94
      return {
        data: d,
        blackout,
        region: 'hdf',
        titre: blackout ? 'CHUTE ÉOLIENNE — LE SECOURS THERMIQUE NE SUFFIT PAS' : null,
      }
    }
    case 'no-solar-evening': {
      d.solaire = 0
      d.consommation = base.consommation + 4500
      d.hydraulique = base.hydraulique + 2500
      d.gaz = base.gaz + 3200
      d.taux_co2 = base.taux_co2 + 18
      const blackout = totalProd(d) < d.consommation * 0.96
      return {
        data: d,
        blackout,
        region: 'occ',
        titre: blackout ? 'PIC DU SOIR — LE SOLAIRE S EFFACE' : null,
      }
    }
    case 'border-closed': {
      d.ech = {
        angleterre: 0,
        allemagne_belgique: 0,
        espagne: 0,
        italie: 0,
        suisse: 0,
        total: 0,
      }
      d.consommation = base.consommation + 3000
      d.gaz = base.gaz + 2800
      d.taux_co2 = base.taux_co2 + 14
      const blackout = totalProd(d) < d.consommation * 0.97
      return {
        data: d,
        blackout,
        region: 'ges',
        titre: blackout ? 'EUROPE DÉCONNECTÉE — PLUS DE SECOURS AUX FRONTIÈRES' : null,
      }
    }
    case 'cyber-brittany': {
      d.consommation = Math.round(base.consommation * 0.95)
      d.ech = base.ech ? { ...base.ech, total: base.ech.total + 900 } : base.ech
      return {
        data: d,
        blackout: true,
        region: 'bre',
        titre: 'BRETAGNE ISOLÉE — INCIDENT CYBER SUR LE RÉSEAU',
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
