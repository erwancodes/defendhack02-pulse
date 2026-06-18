// Destination d'un « électron » partant d'une centrale, le long du réseau.
import { LIGNES, NODES, type Centrale } from './regions'

const KM_PER_PX = 2.9 // ~950 km pour la largeur projetée de la France

export interface Dest {
  x: number
  y: number
  name: string
  km: number
  ms: number
}

function nearestNodeName(xy: [number, number]): string {
  let best = 'une ville'
  let bestD = Infinity
  for (const [name, p] of Object.entries(NODES)) {
    const d = (p[0] - xy[0]) ** 2 + (p[1] - xy[1]) ** 2
    if (d < bestD) {
      bestD = d
      best = name
    }
  }
  return best
}

export function electronDestination(c: Centrale): Dest {
  // une ligne haute tension partant de la centrale
  const ligne = LIGNES.find((l) => Math.abs(l.from[0] - c.x) < 1.5 && Math.abs(l.from[1] - c.y) < 1.5)
  const to: [number, number] = ligne ? ligne.to : [NODES.Paris[0], NODES.Paris[1]]
  const name = nearestNodeName(to)
  const km = Math.max(40, Math.round((Math.hypot(to[0] - c.x, to[1] - c.y) * KM_PER_PX) / 10) * 10)
  const ms = Math.max(0.3, Math.round((km / 200) * 10) / 10) // ~200 000 km/s
  return { x: to[0], y: to[1], name, km, ms }
}
