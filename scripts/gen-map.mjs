// Génère src/lib/regions.ts à partir du GeoJSON officiel des régions.
// Projection Lambert conique conforme (comme l'IGN) → viewBox SVG.
import { readFileSync, writeFileSync } from 'node:fs'
import { geoConicConformal, geoPath, geoContains } from 'd3-geo'

const W = 600
const H = 700
const PAD = 22

const geo = JSON.parse(readFileSync(new URL('../regions.geojson', import.meta.url)))

const projection = geoConicConformal()
  .rotate([-3, 0])
  .parallels([44, 49])
  .fitExtent(
    [
      [PAD, PAD],
      [W - PAD, H - PAD],
    ],
    geo,
  )

const path = geoPath(projection)
const P = (lng, lat) => projection([lng, lat]).map((n) => Math.round(n * 10) / 10)

const CODE_TO_ID = {
  '11': 'idf', '24': 'cvl', '27': 'bfc', '28': 'nor', '32': 'hdf',
  '44': 'ges', '52': 'pdl', '53': 'bre', '75': 'naq', '76': 'occ',
  '84': 'ara', '93': 'pac', '94': 'cor',
}
const CONSO = {
  idf: 0.19, cvl: 0.04, bfc: 0.05, nor: 0.06, hdf: 0.1, ges: 0.09,
  pdl: 0.06, bre: 0.05, naq: 0.12, occ: 0.09, ara: 0.13, pac: 0.07, cor: 0.01,
}

const r1 = (n) => Math.round(n * 10) / 10

const regions = geo.features.map((f) => {
  const id = CODE_TO_ID[f.properties.code]
  const d = path(f)
  const c = path.centroid(f).map(r1)
  const b = path.bounds(f) // [[x0,y0],[x1,y1]] dans le repère du viewBox
  const bbox = [b[0].map(r1), b[1].map(r1)]
  return { id, code: f.properties.code, nom: f.properties.nom, d, label: c, bbox, consoShare: CONSO[id] }
})

import { geoCentroid } from 'd3-geo'
// Quelle région contient ce point GPS ? (fallback : région la plus proche)
const regionOf = (lng, lat) => {
  const f = geo.features.find((feat) => geoContains(feat, [lng, lat]))
  if (f) return CODE_TO_ID[f.properties.code]
  let best = null
  let bestD = Infinity
  for (const feat of geo.features) {
    const [clng, clat] = geoCentroid(feat)
    const dd = (clng - lng) ** 2 + (clat - lat) ** 2
    if (dd < bestD) {
      bestD = dd
      best = CODE_TO_ID[feat.properties.code]
    }
  }
  return best
}

// Centrales (vraies coordonnées GPS)
const CENTRALES = [
  { nom: 'Flamanville', type: 'nucleaire', mw: 2600, ll: [-1.8817, 49.5366] },
  { nom: 'Paluel', type: 'nucleaire', mw: 5320, ll: [0.6358, 49.8581] },
  { nom: 'Gravelines', type: 'nucleaire', mw: 5440, ll: [2.1361, 51.0153] },
  { nom: 'Cattenom', type: 'nucleaire', mw: 5200, ll: [6.2181, 49.4158] },
  { nom: 'Bugey', type: 'nucleaire', mw: 3600, ll: [5.2706, 45.7986] },
  { nom: 'Civaux', type: 'nucleaire', mw: 2840, ll: [0.6531, 46.4564] },
  { nom: 'Belleville', type: 'nucleaire', mw: 2640, ll: [2.8753, 47.5097] },
  { nom: 'Saint-Alban', type: 'nucleaire', mw: 2660, ll: [4.7556, 45.4044] },
  { nom: 'Cruas', type: 'nucleaire', mw: 3660, ll: [4.7567, 44.6331] },
  { nom: 'Tricastin', type: 'nucleaire', mw: 3600, ll: [4.7322, 44.3294] },
  { nom: 'Parc éolien Manche', type: 'eolien', mw: 1200, ll: [-1.65, 49.75] },
  { nom: 'Serre-Ponçon', type: 'hydraulique', mw: 1200, ll: [6.3469, 44.4861] },
].map((c) => ({ nom: c.nom, type: c.type, mw: c.mw, xy: P(...c.ll), region: regionOf(...c.ll) }))

const CITIES = {
  Paris: [2.3522, 48.8566],
  Lyon: [4.8357, 45.764],
  Marseille: [5.3698, 43.2965],
  Bordeaux: [-0.5792, 44.8378],
  Toulouse: [1.4442, 43.6047],
  Strasbourg: [7.7521, 48.5734],
  Nantes: [-1.5536, 47.2184],
  Lille: [3.0573, 50.6292],
}
const NODES = Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, P(...v)]))

const out = `// AUTO-GÉNÉRÉ par scripts/gen-map.mjs — ne pas éditer à la main.
// Régions issues du GeoJSON officiel, projection Lambert conique (viewBox ${W}x${H}).
import type { EnergySource } from './eco2mix'

export const VIEWBOX = { w: ${W}, h: ${H} }

export type RegionState = 'normal' | 'stress' | 'blackout'

export type BBox = [[number, number], [number, number]]

export interface Region {
  id: string
  code: string
  nom: string
  d: string
  label: [number, number]
  bbox: BBox
  consoShare: number
}

export const REGIONS: Region[] = ${JSON.stringify(regions, null, 2)
    .replace(/"label": \[\s*([\d.-]+),\s*([\d.-]+)\s*\]/g, '"label": [$1, $2]')
    .replace(/"bbox": \[\s*\[\s*([\d.-]+),\s*([\d.-]+)\s*\],\s*\[\s*([\d.-]+),\s*([\d.-]+)\s*\]\s*\]/g, '"bbox": [[$1, $2], [$3, $4]]')}

export interface Centrale {
  nom: string
  type: EnergySource
  mw: number
  x: number
  y: number
  region: string | null
}

export const CENTRALES: Centrale[] = [
${CENTRALES.map(
      (c) =>
        `  { nom: ${JSON.stringify(c.nom)}, type: '${c.type}', mw: ${c.mw}, x: ${c.xy[0]}, y: ${c.xy[1]}, region: ${c.region ? `'${c.region}'` : 'null'} },`,
    ).join('\n')}
]

export const NODES: Record<string, [number, number]> = {
${Object.entries(NODES)
      .map(([k, v]) => `  ${k}: [${v[0]}, ${v[1]}],`)
      .join('\n')}
}

export interface Ligne {
  from: [number, number]
  to: [number, number]
  type: EnergySource
}

const C = Object.fromEntries(CENTRALES.map((c) => [c.nom, [c.x, c.y] as [number, number]]))

export const LIGNES: Ligne[] = [
  { from: C['Gravelines'], to: NODES.Lille, type: 'nucleaire' },
  { from: C['Gravelines'], to: NODES.Paris, type: 'nucleaire' },
  { from: C['Paluel'], to: NODES.Paris, type: 'nucleaire' },
  { from: C['Cattenom'], to: NODES.Strasbourg, type: 'nucleaire' },
  { from: C['Cattenom'], to: NODES.Paris, type: 'nucleaire' },
  { from: C['Flamanville'], to: NODES.Paris, type: 'nucleaire' },
  { from: C['Belleville'], to: NODES.Paris, type: 'nucleaire' },
  { from: NODES.Paris, to: NODES.Lyon, type: 'nucleaire' },
  { from: C['Bugey'], to: NODES.Lyon, type: 'nucleaire' },
  { from: C['Saint-Alban'], to: NODES.Lyon, type: 'nucleaire' },
  { from: NODES.Lyon, to: NODES.Marseille, type: 'nucleaire' },
  { from: C['Cruas'], to: NODES.Marseille, type: 'nucleaire' },
  { from: C['Tricastin'], to: NODES.Marseille, type: 'nucleaire' },
  { from: C['Civaux'], to: NODES.Bordeaux, type: 'nucleaire' },
  { from: NODES.Bordeaux, to: NODES.Toulouse, type: 'nucleaire' },
  { from: NODES.Bordeaux, to: NODES.Paris, type: 'nucleaire' },
  { from: C['Parc éolien Manche'], to: NODES.Paris, type: 'eolien' },
  { from: NODES.Lille, to: NODES.Paris, type: 'eolien' },
  { from: C['Serre-Ponçon'], to: NODES.Lyon, type: 'hydraulique' },
  { from: NODES.Toulouse, to: NODES.Marseille, type: 'hydraulique' },
]

// Région -> voisins (cascade de blackout).
export const VOISINS: Record<string, string[]> = {
  idf: ['hdf', 'nor', 'ges', 'cvl', 'bfc'],
  hdf: ['idf', 'nor', 'ges'],
  nor: ['hdf', 'idf', 'bre', 'pdl', 'cvl'],
  ges: ['hdf', 'idf', 'bfc'],
  bre: ['nor', 'pdl'],
  pdl: ['bre', 'nor', 'cvl', 'naq'],
  cvl: ['idf', 'nor', 'pdl', 'naq', 'ara', 'bfc'],
  bfc: ['ges', 'idf', 'cvl', 'ara'],
  naq: ['pdl', 'cvl', 'ara', 'occ'],
  ara: ['bfc', 'cvl', 'naq', 'occ', 'pac'],
  occ: ['naq', 'ara', 'pac'],
  pac: ['ara', 'occ'],
  cor: ['pac'],
}
`

writeFileSync(new URL('../src/lib/regions.ts', import.meta.url), out)
console.log('wrote src/lib/regions.ts —', regions.length, 'regions,', CENTRALES.length, 'centrales')
