import { useEffect, useRef } from 'react'
import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { buildParticles, step, type Particle } from '../lib/particles'

export interface View {
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  data: EcoMixRecord
  isolate: EnergySource | null
  view: View
}

export function ParticleCanvas({ data, isolate, view }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const dataRef = useRef<EcoMixRecord>(data)
  const isolateRef = useRef<EnergySource | null>(isolate)
  const viewRef = useRef<View>(view)
  const rafRef = useRef<number>(0)

  // Reconstruit le jeu de particules quand le mix change.
  useEffect(() => {
    dataRef.current = data
    particlesRef.current = buildParticles(data)
  }, [data])

  useEffect(() => {
    isolateRef.current = isolate
  }, [isolate])

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const render = () => {
      const w = canvas.width
      const h = canvas.height
      // projection selon la view courante (le conteneur a le même ratio)
      const v = viewRef.current
      const sx = w / v.w
      const sy = h / v.h
      const px = (cx: number) => (cx - v.x) * sx
      const py = (cy: number) => (cy - v.y) * sy

      const particles = particlesRef.current
      const iso = isolateRef.current

      step(particles, dataRef.current)
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        if (iso !== null && iso !== p.source) continue
        const t = p.progress
        const dx = p.toX - p.fromX
        const dy = p.toY - p.fromY
        const x = px(p.fromX + dx * t)
        const y = py(p.fromY + dy * t)
        // point de queue (légèrement en arrière sur la trajectoire)
        const tt = Math.max(0, t - (0.035 + Math.min(0.11, p.trailWidth / 60)))
        const tx = px(p.fromX + dx * tt)
        const ty = py(p.fromY + dy * tt)

        // fondu en tête et queue de trajet
        const fade = Math.sin(t * Math.PI)
        const alpha = p.opacity * (0.25 + 0.75 * fade)

        ctx.shadowColor = p.color
        ctx.shadowBlur = 7 * dpr

        // traînée façon comète
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(x, y)
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.trailWidth * dpr
        ctx.lineCap = 'round'
        ctx.globalAlpha = alpha * 0.28
        ctx.stroke()

        // tête
        ctx.beginPath()
        ctx.arc(x, y, p.size * dpr, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
