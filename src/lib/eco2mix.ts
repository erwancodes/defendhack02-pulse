// ── Données : API eco2mix RTE via ODRE ──────────────────────

export type EnergySource =
  | 'nucleaire'
  | 'eolien'
  | 'solaire'
  | 'hydraulique'
  | 'gaz'
  | 'fioul'
  | 'charbon'

// Échanges commerciaux aux frontières. Convention RTE :
// négatif = la France EXPORTE, positif = la France IMPORTE.
export interface Echanges {
  angleterre: number
  allemagne_belgique: number
  espagne: number
  italie: number
  suisse: number
  total: number
}

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
  ech?: Echanges
  prevision?: number // prévision de consommation du jour (prevision_j)
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
  prevision: 56800,
  ech: {
    angleterre: -2800,
    allemagne_belgique: -1500,
    espagne: 400,
    italie: -2200,
    suisse: -1800,
    total: -7900,
  },
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Parseur signé (les échanges peuvent être négatifs = export).
function numS(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
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
      prevision: num(r.prevision_j) || num(r.prevision_j1) || undefined,
      ech: {
        angleterre: numS(r.ech_comm_angleterre),
        allemagne_belgique: numS(r.ech_comm_allemagne_belgique),
        espagne: numS(r.ech_comm_espagne),
        italie: numS(r.ech_comm_italie),
        suisse: numS(r.ech_comm_suisse),
        total: numS(r.ech_physiques),
      },
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

// Historique 24 h (pas de 15 min → 96 points), ordre chronologique.
export async function fetchHistory(points = 96): Promise<EcoMixRecord[]> {
  const url =
    `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-national-tr/records` +
    `?limit=${points}&order_by=date_heure%20desc&where=consommation%20IS%20NOT%20NULL%20AND%20nucleaire%20IS%20NOT%20NULL`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rows = (data?.results ?? [])
      .map(
        (r: Record<string, unknown>): EcoMixRecord => ({
          date_heure: (r.date_heure as string) ?? new Date().toISOString(),
          nucleaire: num(r.nucleaire),
          eolien: num(r.eolien),
          solaire: num(r.solaire),
          hydraulique: num(r.hydraulique),
          fioul: num(r.fioul),
          gaz: num(r.gaz),
          charbon: num(r.charbon),
          consommation: num(r.consommation),
          taux_co2: num(r.taux_co2),
        }),
      )
      .filter((r: EcoMixRecord) => r.consommation > 1000 && r.nucleaire > 0)
    return rows.reverse() // du plus ancien au plus récent
  } catch {
    return []
  }
}

// ── Helpers de mix ──────────────────────────────────────────

export const SOURCE_COLOR: Record<EnergySource, string> = {
  nucleaire: '#00a6d6',
  eolien: '#22c55e',
  solaire: '#d8b33f',
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

// Tension réseau : écart entre la consommation réelle et la prévision RTE.
export type TensionState = 'detendu' | 'normal' | 'tendu'
export interface Tension {
  ecart: number // MW (réel - prévu)
  pct: number // % d'écart
  state: TensionState
}

export function tension(data: EcoMixRecord): Tension | null {
  if (!data.prevision || data.prevision < 1000) return null
  const ecart = data.consommation - data.prevision
  const pctEcart = (ecart / data.prevision) * 100
  const state: TensionState = pctEcart > 1.5 ? 'tendu' : pctEcart < -1.5 ? 'detendu' : 'normal'
  return { ecart, pct: pctEcart, state }
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

// ── Parc installé par département (registre national agrégé) ──
// Pas de temps réel par département : on agrège la PUISSANCE INSTALLÉE
// (puismaxinstallee en kW) par filière depuis le registre des installations.

export interface FiliereInstall {
  filiere: string
  mw: number
  nb: number
}

export interface DeptInstall {
  filieres: FiliereInstall[]
  totalMw: number
  totalNb: number
}

const REGISTRE_DATASET =
  'registre-national-installation-production-stockage-electricite-agrege-311224'

export async function fetchDeptInstall(codeDept: string): Promise<DeptInstall | null> {
  const where = encodeURIComponent(
    `codedepartement="${codeDept}" AND regime="En service"`,
  )
  const select = encodeURIComponent(
    'filiere, sum(puismaxinstallee) as puissance, sum(nbinstallations) as nb',
  )
  const url =
    `https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/${REGISTRE_DATASET}/records` +
    `?where=${where}&group_by=filiere&select=${select}&order_by=puissance%20desc&limit=20`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rows: FiliereInstall[] = (data?.results ?? [])
      .map((r: { filiere?: string; puissance?: number; nb?: number }) => ({
        filiere: r.filiere ?? 'Autre',
        mw: num(r.puissance) / 1000, // kW → MW
        nb: num(r.nb),
      }))
      .filter((r: FiliereInstall) => r.mw > 0)
    if (rows.length === 0) return { filieres: [], totalMw: 0, totalNb: 0 }
    return {
      filieres: rows,
      totalMw: rows.reduce((s, r) => s + r.mw, 0),
      totalNb: rows.reduce((s, r) => s + r.nb, 0),
    }
  } catch {
    return null
  }
}

// Couleur / libellé par filière du registre.
export const FILIERE_COLOR: Record<string, string> = {
  Nucléaire: '#00a6d6',
  Hydraulique: '#06b6d4',
  Eolien: '#22c55e',
  Solaire: '#d8b33f',
  'Thermique non renouvelable': '#f97316',
  Bioénergies: '#84cc16',
  'Stockage non hydraulique': '#a78bfa',
  'Energies Marines': '#14b8a6',
  Autre: '#64748b',
}

export function filiereColor(f: string): string {
  return FILIERE_COLOR[f] ?? '#64748b'
}
