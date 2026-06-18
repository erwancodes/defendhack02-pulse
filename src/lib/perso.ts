// ── « Et toi, là, maintenant ? » — relier le live à la vie réelle ──

export interface PersoAction {
  id: string
  label: string
  kWh: number
}

// Conso typique d'un geste du quotidien (kWh).
export const ACTIONS: PersoAction[] = [
  { id: 'machine', label: 'je lance une machine à laver', kWh: 1 },
  { id: 'voiture', label: 'je recharge ma voiture', kWh: 40 },
  { id: 'clim', label: 'je mets la clim une heure', kWh: 1.5 },
  { id: 'douche', label: 'je prends une douche chaude', kWh: 3 },
]

const WORST_CO2 = 420 // un soir d'hiver, gaz à fond (~gCO2/kWh)
const CAR_G_PER_KM = 120 // voiture thermique moyenne

export interface PersoImpactResult {
  nowG: number
  worstG: number
  ratio: number
  km: number
}

export function persoImpact(kWh: number, co2: number): PersoImpactResult {
  const c = Math.max(1, co2)
  const nowG = kWh * c
  const worstG = kWh * WORST_CO2
  return {
    nowG,
    worstG,
    ratio: Math.max(1, Math.round(WORST_CO2 / c)),
    km: nowG / CAR_G_PER_KM,
  }
}

export function fmtCO2(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.0', '')} kg`
  return `${Math.round(g)} g`
}

export function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}
