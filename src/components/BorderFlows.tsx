import type { EcoMixRecord } from '../lib/eco2mix'
import { EUROPE_FLOWS, FRANCE_CENTROID } from '../lib/europe'
import type { View } from './ParticleCanvas'

const LABELS: Record<string, string> = {
  angleterre: 'UK',
  allemagne_belgique: 'DE·BE',
  espagne: 'ES',
  italie: 'IT',
  suisse: 'CH',
}

const EXPORT = '#38bdf8'
const IMPORT = '#f97316'

function arrowhead(tx: number, ty: number, dx: number, dy: number, s: number): string {
  const a = Math.atan2(dy, dx)
  const a1 = a + Math.PI * 0.82
  const a2 = a - Math.PI * 0.82
  return `${tx},${ty} ${tx + Math.cos(a1) * s},${ty + Math.sin(a1) * s} ${tx + Math.cos(a2) * s},${ty + Math.sin(a2) * s}`
}

interface Props {
  data: EcoMixRecord
  view: View
  visible: boolean
}

export function BorderFlows({ data, view, visible }: Props) {
  if (!visible || !data.ech) return null
  const ech = data.ech
  const [cx, cy] = FRANCE_CENTROID

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {Object.entries(EUROPE_FLOWS).map(([key, anchor]) => {
        const value = ech[key as keyof typeof ech]
        const exporting = value < 0
        const mag = Math.abs(value)
        if (mag < 1) return null

        const [ax, ay] = anchor
        // direction France → pays
        let dx = ax - cx
        let dy = ay - cy
        const len = Math.hypot(dx, dy) || 1
        dx /= len
        dy /= len

        const f = Math.min(1, mag / 6000)
        const L = 20 + f * 26
        const color = exporting ? EXPORT : IMPORT
        const w = 2 + f * 2.5
        const headSize = 7 + f * 3.5

        // export : flux vers le pays (tip = ancre) ; import : flux vers la France
        const [x1, y1, tx, ty, hx, hy] = exporting
          ? [ax - dx * L, ay - dy * L, ax, ay, dx, dy]
          : [ax, ay, ax - dx * L, ay - dy * L, -dx, -dy]

        const lx = ax + dx * 12
        const ly = ay + dy * 12
        const anchorPos = dx > 0.3 ? 'start' : dx < -0.3 ? 'end' : 'middle'

        return (
          <g key={key} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
            <line
              x1={x1}
              y1={y1}
              x2={tx}
              y2={ty}
              stroke={color}
              strokeWidth={w}
              strokeLinecap="round"
              strokeDasharray="5 5"
              className="border-flow"
            />
            <polygon points={arrowhead(tx, ty, hx, hy, headSize)} fill={color} />
            <text
              x={lx}
              y={ly}
              textAnchor={anchorPos}
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={700}
              fill={color}
              style={{ fontFamily: 'inherit', letterSpacing: '0.05em' }}
            >
              {LABELS[key]} {mag.toLocaleString('fr-FR')}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
