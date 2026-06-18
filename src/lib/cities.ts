import { geoConicConformal } from 'd3-geo'
import type { Departement } from './departements'

export interface MajorCity {
  code: string
  nom: string
  population: number
  postalCode: string | null
  lng: number
  lat: number
  x: number
  y: number
  rank: number
}

interface CommuneApiRow {
  code?: string
  nom?: string
  population?: number
  codesPostaux?: string[]
  centre?: {
    coordinates?: [number, number]
  }
}

const projection = geoConicConformal()
  .rotate([-3, 0])
  .parallels([44, 49])
  .scale(1792.3417987664798)
  .translate([447.80466321545066, 1949.5376300839416])

const cache = new Map<string, Promise<MajorCity[]>>()

function toCity(row: CommuneApiRow, rank: number): MajorCity | null {
  const coords = row.centre?.coordinates
  if (!row.code || !row.nom || !row.population || !coords) return null
  const [lng, lat] = coords
  const projected = projection([lng, lat])
  if (!projected) return null
  return {
    code: row.code,
    nom: row.nom,
    population: row.population,
    postalCode: row.codesPostaux?.[0] ?? null,
    lng,
    lat,
    x: Math.round(projected[0] * 10) / 10,
    y: Math.round(projected[1] * 10) / 10,
    rank,
  }
}

function fallbackFromDept(dept: Departement): MajorCity[] {
  const [x, y] = dept.label
  return [
    {
      code: `${dept.code}-chef-lieu`,
      nom: dept.nom,
      population: 0,
      postalCode: null,
      lng: 0,
      lat: 0,
      x,
      y,
      rank: 1,
    },
  ]
}

export function fetchMajorCities(dept: Departement, limit = 5): Promise<MajorCity[]> {
  const cached = cache.get(dept.code)
  if (cached) return cached

  const request = fetch(
    `https://geo.api.gouv.fr/communes?codeDepartement=${encodeURIComponent(dept.code)}&fields=nom,population,centre,codesPostaux&format=json&geometry=centre`,
    { cache: 'force-cache' },
  )
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = (await res.json()) as CommuneApiRow[]
      const cities = rows
        .filter((row) => typeof row.population === 'number' && row.population > 0)
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .slice(0, limit)
        .map((row, index) => toCity(row, index + 1))
        .filter((city): city is MajorCity => city !== null)
      return cities.length > 0 ? cities : fallbackFromDept(dept)
    })
    .catch(() => fallbackFromDept(dept))

  cache.set(dept.code, request)
  return request
}
