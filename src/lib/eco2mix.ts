// ── Données : API eco2mix RTE via ODRE ──────────────────────

export type EnergySource =
  | 'nucleaire'
  | 'eolien'
  | 'solaire'
  | 'hydraulique'
  | 'gaz'
  | 'fioul'
  | 'charbon'

export interface EcoMixRecord {
  date_heure: string
  nucleaire: number
  eolien: number
  solaire: number
  hydraulique: number
  fioul: number
  gaz: number
  charbon: number
  consommation: number
  taux_co2: number
}

// On filtre sur les lignes réellement remplies : la dernière ligne par
// date_heure est souvent une prévision aux valeurs nulles.
const ENDPOINT =
  'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-tr/records?limit=1&order_by=date_heure%20desc&where=consommation%20IS%20NOT%20NULL%20AND%20nucleaire%20IS%20NOT%20NULL'

// Données représentatives nuit — utilisées si l'API est down.
export const FALLBACK: EcoMixRecord = {
  date_heure: new Date().toISOString(),
  nucleaire: 38420,
  eolien: 8200,
  solaire: 0,
  hydraulique: 9100,
  fioul: 200,
  gaz: 1800,
  charbon: 0,
  consommation: 57720,
  taux_co2: 42,
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export async function fetchEcoMix(): Promise<EcoMixRecord> {
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const r = data?.results?.[0]
    if (!r) throw new Error('empty results')

    const rec: EcoMixRecord = {
      date_heure: r.date_heure ?? new Date().toISOString(),
      nucleaire: num(r.nucleaire),
      eolien: num(r.eolien),
      solaire: num(r.solaire),
      hydraulique: num(r.hydraulique),
      fioul: num(r.fioul),
      gaz: num(r.gaz),
      charbon: num(r.charbon),
      consommation: num(r.consommation),
      taux_co2: num(r.taux_co2),
    }

    // L'API renvoie parfois la dernière ligne incomplète (production nulle).
    const totalProd =
      rec.nucleaire + rec.eolien + rec.solaire + rec.hydraulique + rec.gaz + rec.fioul + rec.charbon
    if (totalProd < 1000 || rec.consommation < 1000) throw new Error('incomplete record')

    return rec
  } catch {
    // Fallback silencieux : la démo ne doit jamais casser.
    return { ...FALLBACK, date_heure: new Date().toISOString() }
  }
}

// ── Helpers de mix ──────────────────────────────────────────

export const SOURCE_COLOR: Record<EnergySource, string> = {
  nucleaire: '#3b82f6',
  eolien: '#22c55e',
  solaire: '#eab308',
  hydraulique: '#06b6d4',
  gaz: '#f97316',
  fioul: '#f97316',
  charbon: '#64748b',
}

export const SOURCE_LABEL: Record<EnergySource, string> = {
  nucleaire: 'nucléaire',
  eolien: 'éolien',
  solaire: 'solaire',
  hydraulique: 'hydraulique',
  gaz: 'gaz',
  fioul: 'fioul',
  charbon: 'charbon',
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

// Foyers alimentés ~ 1 MW ≈ 650 foyers (estimation grand public).
export function foyers(mw: number): number {
  return Math.round(mw * 650)
}

// ── Données régionales temps réel (eco2mix-regional-tr) ──────

export interface RegionalRecord {
  code: string
  consommation: number
  nucleaire: number
  eolien: number
  solaire: number
  hydraulique: number
  thermique: number // gaz + fioul + charbon agrégés
  bioenergies: number
  taux_co2: number | null
  date_heure: string
}

const REGIONAL_ENDPOINT =
  'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-regional-tr/records'

export async function fetchRegional(codeInsee: string): Promise<RegionalRecord | null> {
  const where = encodeURIComponent(
    `consommation IS NOT NULL AND code_insee_region="${codeInsee}"`,
  )
  const url = `${REGIONAL_ENDPOINT}?limit=1&order_by=date_heure%20desc&where=${where}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const r = data?.results?.[0]
    if (!r) return null
    return {
      code: codeInsee,
      consommation: num(r.consommation),
      nucleaire: num(r.nucleaire),
      eolien: num(r.eolien),
      solaire: num(r.solaire),
      hydraulique: num(r.hydraulique),
      thermique: num(r.thermique),
      bioenergies: num(r.bioenergies),
      taux_co2: typeof r.taux_co2 === 'number' ? r.taux_co2 : null,
      date_heure: r.date_heure ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function regionalProduction(r: RegionalRecord): number {
  return r.nucleaire + r.eolien + r.solaire + r.hydraulique + r.thermique + r.bioenergies
}
