import { useState, type ReactNode } from 'react'
import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR, foyers } from '../lib/eco2mix'
import {
  REGIONS,
  CENTRALES,
  LIGNES,
  type RegionState,
  type Centrale,
} from '../lib/regions'
import type { View } from './ParticleCanvas'

const VB_H = 700

function regionFill(state: RegionState): { fill: string; stroke: string; cls: string } {
  switch (state) {
    case 'stress':
      return { fill: 'rgba(249,115,22,0.13)', stroke: '#f97316', cls: 'glow' }
    case 'blackout':
      return { fill: '#000000', stroke: 'rgba(239,68,68,0.4)', cls: 'flick' }
    default:
      return { fill: '#0d1f3c', stroke: '#1e3a5f', cls: '' }
  }
}

interface Props {
  data: EcoMixRecord
  regionStates: Record<string, RegionState>
  view: View
  focusedRegion: string | null
  onFocus: (id: string) => void
  onVoice: (action: string) => void
}

export function FranceMap({ data, regionStates, view, focusedRegion, onFocus, onVoice }: Props) {
  const [hoverCentrale, setHoverCentrale] = useState<Centrale | null>(null)
  const [hoverRegion, setHoverRegion] = useState<string | null>(null)

  const total = data.consommation || 1

  return (
    <div className="relative h-full w-full select-none map-cursor">
      {/* halo de profondeur sous la carte */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 52% 48% at 50% 46%, rgba(59,130,246,0.07), transparent 72%)',
        }}
      />
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        {/* lignes haute tension, très subtiles */}
        <g stroke="#16335c" strokeWidth={0.8} opacity={0.7} strokeLinecap="round">
          {LIGNES.map((l, i) => (
            <line key={i} x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} />
          ))}
        </g>

        {/* régions */}
        {REGIONS.map((r) => {
          const state = regionStates[r.id] ?? 'normal'
          const base = regionFill(state)
          const focused = focusedRegion === r.id
          const dimmed = focusedRegion !== null && !focused
          const isHover = (hoverRegion === r.id || focused) && state === 'normal'
          const fill = isHover ? '#15355c' : base.fill
          const stroke = isHover ? '#3b82f6' : base.stroke
          const filter = base.cls === 'glow'
            ? 'drop-shadow(0 0 6px #f97316)'
            : isHover
              ? `drop-shadow(0 0 ${focused ? 7 : 5}px rgba(59,130,246,0.55))`
              : undefined
          return (
            <path
              key={r.id}
              d={r.d}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHover ? 1.1 : 0.8}
              strokeLinejoin="round"
              style={{
                filter,
                opacity: dimmed ? 0.28 : 1,
                cursor: 'pointer',
                animation: base.cls === 'flick' ? 'flicker 0.5s steps(2) infinite' : undefined,
                transition: 'fill 0.35s ease, stroke 0.35s ease, filter 0.35s ease, opacity 0.4s ease',
              }}
              onMouseEnter={() => {
                setHoverRegion(r.id)
                const conso = Math.round(total * r.consoShare)
                onVoice(`region:${r.nom}:${conso}`)
              }}
              onMouseLeave={() => setHoverRegion((p) => (p === r.id ? null : p))}
              onClick={() => onFocus(r.id)}
            />
          )
        })}

        {/* centrales pulsantes (taille ~ constante à l'écran via le facteur de zoom) */}
        {CENTRALES.map((c) => {
          const color = SOURCE_COLOR[c.type as EnergySource]
          const z = view.h / VB_H // <1 quand on est zoomé
          const dur = Math.max(1.1, 3.4 - c.mw / 2000)
          const active = hoverCentrale?.nom === c.nom
          const dimmed = focusedRegion !== null && c.region !== focusedRegion
          return (
            <g key={c.nom} style={{ opacity: dimmed ? 0.18 : 1, transition: 'opacity 0.4s ease' }}>
              {active && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={14 * z}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.8 * z}
                  opacity={0.5}
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
              )}
              <circle
                cx={c.x}
                cy={c.y}
                r={(active ? 9 : 5) * z}
                fill={color}
                opacity={0.9}
                style={{
                  filter: `drop-shadow(0 0 ${active ? 10 : 5}px ${color})`,
                  animation: `pulse-centrale ${dur}s ease-in-out infinite`,
                }}
                onMouseEnter={() => {
                  setHoverCentrale(c)
                  onVoice(`centrale:${c.nom}:${c.type}:${c.mw}`)
                }}
                onMouseLeave={() => setHoverCentrale((p) => (p?.nom === c.nom ? null : p))}
              />
            </g>
          )
        })}
      </svg>

      {/* tooltip centrale (HTML, reprojeté selon la view) */}
      {hoverCentrale && (
        <Tooltip x={hoverCentrale.x} y={hoverCentrale.y} view={view}>
          <div className="t-label" style={{ color: SOURCE_COLOR[hoverCentrale.type] }}>
            {hoverCentrale.nom}
          </div>
          <div className="mt-1 t-num" style={{ fontSize: 18 }}>
            {hoverCentrale.mw.toLocaleString('fr-FR')} MW
          </div>
          <div className="t-label mt-1 text-[var(--text-muted)]">
            {hoverCentrale.type} · {(foyers(hoverCentrale.mw) / 1_000_000).toFixed(1)}M foyers
          </div>
        </Tooltip>
      )}

      {/* tooltip région (masqué quand on est en vue régionale) */}
      {hoverRegion &&
        !hoverCentrale &&
        !focusedRegion &&
        (() => {
          const r = REGIONS.find((x) => x.id === hoverRegion)!
          const conso = Math.round(total * r.consoShare)
          return (
            <Tooltip x={r.label[0]} y={r.label[1]} view={view}>
              <div className="t-label text-[var(--text-primary)]">{r.nom}</div>
              <div className="mt-1 t-num" style={{ fontSize: 16 }}>
                {conso.toLocaleString('fr-FR')} MW
              </div>
              <div className="t-label text-[var(--text-muted)]">consommés ce soir · clic pour explorer</div>
            </Tooltip>
          )
        })()}
    </div>
  )
}

function Tooltip({
  x,
  y,
  view,
  children,
}: {
  x: number
  y: number
  view: View
  children: ReactNode
}) {
  return (
    <div
      className="pointer-events-none absolute z-20 border border-[#1e3a5f] bg-[#00000a]/90 px-3 py-2 fade-up"
      style={{
        left: `${((x - view.x) / view.w) * 100}%`,
        top: `${((y - view.y) / view.h) * 100}%`,
        transform: 'translate(-50%, calc(-100% - 14px))',
        backdropFilter: 'blur(2px)',
        boxShadow: '0 0 20px rgba(59,130,246,0.15)',
      }}
    >
      {children}
    </div>
  )
}
