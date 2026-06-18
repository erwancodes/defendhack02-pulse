import { useEffect, useRef, useState } from 'react'
import type { Centrale } from '../lib/regions'
import type { Dest } from '../lib/electron'
import { SOURCE_COLOR } from '../lib/eco2mix'
import type { View } from './ParticleCanvas'

interface Props {
  centrale: Centrale
  dest: Dest
  view: View
}

export function ElectronJourney({ centrale, dest, view }: Props) {
  const [p, setP] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    const t0 = performance.now()
    const dur = 1700
    const tick = (now: number) => {
      const prog = ((now - t0) % dur) / dur
      setP(prog)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [centrale.nom, dest.name])

  const color = SOURCE_COLOR[centrale.type]
  const x = centrale.x + (dest.x - centrale.x) * p
  const y = centrale.y + (dest.y - centrale.y) * p
  const tt = Math.max(0, p - 0.12)
  const tx = centrale.x + (dest.x - centrale.x) * tt
  const ty = centrale.y + (dest.y - centrale.y) * tt

  return (
    <>
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      >
        {/* trajet */}
        <line x1={centrale.x} y1={centrale.y} x2={dest.x} y2={dest.y} stroke={color} strokeWidth={0.8} opacity={0.4} strokeDasharray="3 4" />
        {/* centrale source */}
        <circle cx={centrale.x} cy={centrale.y} r={6} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        {/* ville d'arrivée */}
        <circle cx={dest.x} cy={dest.y} r={4} fill="none" stroke="var(--text-primary)" strokeWidth={1} opacity={0.7} />
        {/* traînée */}
        <line x1={tx} y1={ty} x2={x} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.5} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        {/* l'électron */}
        <circle cx={x} cy={y} r={3.5} fill="var(--text-primary)" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>

      {/* narration */}
      <div
        className="control-panel pointer-events-none absolute bottom-6 left-1/2 z-30 w-[360px] -translate-x-1/2 border p-4 text-center fade-up"
      >
        <div className="t-label" style={{ color }}>trajet électron en direct</div>
        <p className="t-narration mt-2 text-[var(--text-primary)]" style={{ fontSize: 13, lineHeight: 1.55 }}>
          Né à <span style={{ color }}>{centrale.nom}</span>, il file vers{' '}
          <span className="text-[var(--text-primary)]">{dest.name}</span> à travers{' '}
          <span className="text-[var(--text-primary)]">{dest.km.toLocaleString('fr-FR')} km</span> de très
          haute tension — et arrive en <span style={{ color }}>~{dest.ms} ms</span>.
        </p>
      </div>
    </>
  )
}
