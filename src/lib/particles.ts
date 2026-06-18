// ── Logique Canvas : particules le long des lignes ──────────
import type { EcoMixRecord, EnergySource } from './eco2mix'
import { SOURCE_COLOR } from './eco2mix'
import { LIGNES } from './regions'

export interface Particle {
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  speed: number
  color: string
  size: number
  trailWidth: number
  opacity: number
  source: EnergySource
}

const PARTICLE_SOURCES: EnergySource[] = ['nucleaire', 'eolien', 'solaire', 'hydraulique', 'gaz']
const MAX_PARTICLES = 90

function getParticleCount(source: EnergySource, data: EcoMixRecord): number {
  const total = data.consommation || 1
  const part = (data[source] ?? 0) / total
  return Math.floor(part * MAX_PARTICLES)
}

// Choisit une ligne adaptée à la source (sinon n'importe laquelle).
function pickLine(source: EnergySource) {
  const matching = LIGNES.filter((l) => l.type === source)
  const pool = matching.length > 0 ? matching : LIGNES
  return pool[Math.floor(Math.random() * pool.length)]
}

function sourceLineCount(source: EnergySource): number {
  return Math.max(1, LIGNES.filter((l) => l.type === source).length)
}

function spawn(source: EnergySource, data: EcoMixRecord): Particle {
  const line = pickLine(source)
  const sourceMw = data[source] ?? 0
  const lineMw = sourceMw / sourceLineCount(source)
  const power = Math.sqrt(Math.max(250, lineMw))
  return {
    fromX: line.from[0],
    fromY: line.from[1],
    toX: line.to[0],
    toY: line.to[1],
    progress: Math.random(),
    speed: 0.0015 + Math.random() * 0.0035,
    color: SOURCE_COLOR[source],
    size: 1.5 + Math.random() * 1.5,
    trailWidth: 0.8 + Math.min(4.2, power / 18),
    opacity: 0.55 + Math.random() * 0.45,
    source,
  }
}

// (Re)construit le jeu de particules selon le mix courant.
export function buildParticles(data: EcoMixRecord): Particle[] {
  const particles: Particle[] = []
  for (const source of PARTICLE_SOURCES) {
    const count = getParticleCount(source, data)
    for (let i = 0; i < count; i++) particles.push(spawn(source, data))
  }
  // Toujours quelques particules pour que la carte ne soit jamais morte.
  if (particles.length < 12) {
    for (let i = 0; i < 12; i++) particles.push(spawn('nucleaire', data))
  }
  return particles
}

export interface RenderOptions {
  isolate: EnergySource | null // n'affiche qu'une source
}

export function step(particles: Particle[], data: EcoMixRecord): void {
  for (const p of particles) {
    p.progress += p.speed
    if (p.progress >= 1) {
      // Renaît sur une nouvelle ligne de la même source.
      const fresh = spawn(p.source, data)
      Object.assign(p, fresh, { progress: 0 })
    }
  }
}

export function draw(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  scaleX: number,
  scaleY: number,
  opts: RenderOptions,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.save()
  for (const p of particles) {
    const dimmed = opts.isolate !== null && opts.isolate !== p.source
    if (dimmed) continue

    // easeInOut le long de la ligne
    const t = p.progress
    const x = (p.fromX + (p.toX - p.fromX) * t) * scaleX
    const y = (p.fromY + (p.toY - p.fromY) * t) * scaleY

    ctx.beginPath()
    ctx.arc(x, y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 6
    ctx.globalAlpha = p.opacity
    ctx.fill()
  }
  ctx.restore()
}
