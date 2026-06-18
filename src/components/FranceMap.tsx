import { useState, type ReactNode } from 'react'
import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR } from '../lib/eco2mix'
import { equivalences } from '../lib/pedago'
import {
  REGIONS,
  CENTRALES,
  LIGNES,
  VIEWBOX,
  type RegionState,
  type Centrale,
} from '../lib/regions'
import { DEPARTEMENTS } from '../lib/departements'
import { EUROPE } from '../lib/europe'
import type { MajorCity } from '../lib/cities'
import type { View } from './ParticleCanvas'

const VB_H = VIEWBOX.h
const MARKER_STROKE = 'rgba(232,244,255,0.88)'

function regionFill(state: RegionState): { fill: string; stroke: string; cls: string } {
  switch (state) {
    case 'stress':
      return { fill: 'rgba(249,115,22,0.13)', stroke: '#f97316', cls: 'glow' }
    case 'blackout':
      return { fill: '#010713', stroke: 'rgba(239,68,68,0.4)', cls: 'flick' }
    default:
      return { fill: '#06182b', stroke: '#174468', cls: '' }
  }
}

interface Props {
  data: EcoMixRecord
  regionStates: Record<string, RegionState>
  view: View
  focusedRegion: string | null
  focusedDept: string | null
  cityMarkers: MajorCity[]
  selectedCity: MajorCity | null
  onFocus: (id: string) => void
  onFocusDept: (code: string) => void
  onSelectCity: (city: MajorCity) => void
  onElectron: (c: Centrale) => void
  onVoice: (action: string) => void
}

export function FranceMap({
  data,
  regionStates,
  view,
  focusedRegion,
  focusedDept,
  cityMarkers,
  selectedCity,
  onFocus,
  onFocusDept,
  onSelectCity,
  onElectron,
  onVoice,
}: Props) {
  const [hoverCentrale, setHoverCentrale] = useState<Centrale | null>(null)
  const [hoverRegion, setHoverRegion] = useState<string | null>(null)
  const [hoverDept, setHoverDept] = useState<string | null>(null)

  const total = data.consommation || 1
  const depts = focusedRegion ? DEPARTEMENTS.filter((d) => d.region === focusedRegion) : []

  return (
    <div className="relative h-full w-full select-none map-cursor">
      {/* halo de profondeur sous la carte */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 52% 48% at 50% 46%, rgba(0,166,214,0.10), transparent 72%)',
        }}
      />
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        {/* fond Europe (pays voisins, très sombre, non interactif) */}
        <g pointerEvents="none">
          {EUROPE.map((p) => (
            <path
              key={p.name}
              d={p.d}
              fill="#041020"
              stroke="#123450"
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* lignes haute tension, très subtiles */}
        <g stroke="#1a5277" strokeWidth={0.8} opacity={0.55} strokeLinecap="round">
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
          const fill = isHover ? '#0a2f4f' : base.fill
          const stroke = isHover ? '#00a6d6' : base.stroke
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

        {/* départements de la région ouverte (couche cliquable) */}
        {depts.map((d) => {
          const z = view.h / VB_H
          const focused = focusedDept === d.code
          const hov = hoverDept === d.code
          const dimmed = focusedDept !== null && !focused
          const active = focused || hov
          return (
            <path
              key={d.code}
              d={d.d}
              fill={active ? 'rgba(0,166,214,0.16)' : 'transparent'}
              stroke={active ? '#00a6d6' : 'rgba(0,166,214,0.32)'}
              strokeWidth={(focused ? 1.1 : 0.6) * z}
              strokeLinejoin="round"
              style={{
                opacity: dimmed ? 0.25 : 1,
                cursor: 'pointer',
                filter: active ? 'drop-shadow(0 0 4px rgba(0,166,214,0.5))' : undefined,
                transition: 'fill 0.25s ease, stroke 0.25s ease, opacity 0.35s ease',
              }}
              onMouseEnter={() => setHoverDept(d.code)}
              onMouseLeave={() => setHoverDept((p) => (p === d.code ? null : p))}
              onClick={() => onFocusDept(d.code)}
            />
          )
        })}

        {/* villes importantes du département ouvert */}
        {focusedDept && cityMarkers.length > 0 && (
          <g>
            {cityMarkers.map((city) => {
              const z = view.h / VB_H
              const active = selectedCity?.code === city.code
              return (
                <g key={city.code}>
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={(active ? 5.5 : 3.8) * z}
                    fill={active ? 'var(--engie-blue-soft)' : 'var(--nuclear)'}
                    stroke="var(--background)"
                    strokeWidth={1.2 * z}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectCity(city)
                    }}
                  />
                  {active && (
                    <>
                      <circle
                        cx={city.x}
                        cy={city.y}
                        r={10 * z}
                        fill="none"
                        stroke="var(--engie-blue-soft)"
                        strokeWidth={0.7 * z}
                        opacity={0.55}
                      />
                      <text
                        x={city.x + 7 * z}
                        y={city.y - 7 * z}
                        fill="var(--text-primary)"
                        fontSize={10 * z}
                        fontFamily="JetBrains Mono, ui-monospace, monospace"
                        style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'var(--background)', strokeWidth: 3 * z }}
                      >
                        {city.nom}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </g>
        )}

        {/* centrales pulsantes (taille ~ constante à l'écran via le facteur de zoom) */}
        {CENTRALES.map((c) => {
          const color = SOURCE_COLOR[c.type as EnergySource]
          const z = view.h / VB_H // <1 quand on est zoomé
          const active = hoverCentrale?.nom === c.nom
          const dimmed = focusedRegion !== null && c.region !== focusedRegion
          const size = (5.2 + Math.min(c.mw, 5600) / 1650) * z
          return (
            <g
              key={c.nom}
              style={{
                opacity: dimmed ? 0.18 : 1,
                cursor: 'pointer',
                transition: 'opacity 0.4s ease',
              }}
              onMouseEnter={() => {
                setHoverCentrale(c)
                onVoice(`centrale:${c.nom}:${c.type}:${c.mw}`)
              }}
              onMouseLeave={() => setHoverCentrale((p) => (p?.nom === c.nom ? null : p))}
              onClick={() => onElectron(c)}
            >
              {active && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={size + 5.5 * z}
                  fill="none"
                  stroke={color}
                  strokeWidth={1 * z}
                  opacity={0.72}
                />
              )}
              <PlantMarker
                x={c.x}
                y={c.y}
                size={active ? size * 1.16 : size}
                z={z}
                type={c.type}
                color={color}
                active={active}
              />
            </g>
          )
        })}
      </svg>

      {/* tooltip département (en vue régionale, hors centrale) */}
      {hoverDept &&
        !hoverCentrale &&
        !focusedDept &&
        (() => {
          const d = depts.find((x) => x.code === hoverDept)
          if (!d) return null
          return (
            <Tooltip x={d.label[0]} y={d.label[1]} view={view}>
              <div className="t-label text-[var(--text-primary)]">{d.nom}</div>
              <div className="t-label text-[var(--text-muted)]">clic pour le parc installé</div>
            </Tooltip>
          )
        })()}

      {/* tooltip centrale (HTML, reprojeté selon la view) */}
      {hoverCentrale && (
        <Tooltip x={hoverCentrale.x} y={hoverCentrale.y} view={view}>
          <div className="t-label" style={{ color: SOURCE_COLOR[hoverCentrale.type] }}>
            {hoverCentrale.nom}
          </div>
          <div className="mt-1 t-num" style={{ fontSize: 18 }}>
            {hoverCentrale.mw.toLocaleString('fr-FR')} MW
          </div>
          <div className="t-label text-[var(--text-muted)]">{hoverCentrale.type}</div>
          {/* équivalences tangibles : « c'est quoi, X MW ? » */}
          <div className="mt-2 flex flex-col gap-1 border-t border-[var(--line-strong)] pt-2">
            {equivalences(hoverCentrale.mw).map((eq) => (
              <div key={eq} className="t-label flex items-center gap-1.5 normal-case text-[var(--text-primary)]" style={{ letterSpacing: '0.02em' }}>
                <span style={{ color: SOURCE_COLOR[hoverCentrale.type] }}>=</span>
                {eq}
              </div>
            ))}
          </div>
              <div className="t-label mt-2 text-[var(--nuclear)]">clic = suivre un électron</div>
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

function PlantMarker({
  x,
  y,
  size,
  z,
  type,
  color,
  active,
}: {
  x: number
  y: number
  size: number
  z: number
  type: EnergySource
  color: string
  active: boolean
}) {
  const strokeWidth = (active ? 1.4 : 1.1) * z
  const core = '#041020'
  const opacity = active ? 1 : 0.94
  const transition = 'opacity 0.2s ease'

  if (type === 'nucleaire') {
    return (
      <g opacity={opacity} style={{ transition }}>
        <polygon points={hexPoints(x, y, size)} fill={core} stroke={MARKER_STROKE} strokeWidth={strokeWidth} />
        <circle cx={x} cy={y} r={size * 0.56} fill="none" stroke={color} strokeWidth={strokeWidth} />
        <circle cx={x} cy={y} r={size * 0.22} fill={color} />
      </g>
    )
  }

  if (type === 'eolien') {
    return (
      <g opacity={opacity} style={{ transition }}>
        <polygon
          points={`${x},${y - size} ${x + size * 0.88},${y + size * 0.5} ${x - size * 0.88},${y + size * 0.5}`}
          fill={core}
          stroke={MARKER_STROKE}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <line x1={x} y1={y - size * 0.42} x2={x} y2={y + size * 0.48} stroke={color} strokeWidth={strokeWidth} />
        <line x1={x - size * 0.42} y1={y + size * 0.1} x2={x + size * 0.42} y2={y + size * 0.1} stroke={color} strokeWidth={strokeWidth} />
      </g>
    )
  }

  if (type === 'hydraulique') {
    return (
      <g opacity={opacity} style={{ transition }}>
        <path
          d={`M${x} ${y - size} C${x + size * 0.9} ${y - size * 0.1} ${x + size * 0.58} ${y + size} ${x} ${y + size} C${x - size * 0.58} ${y + size} ${x - size * 0.9} ${y - size * 0.1} ${x} ${y - size}Z`}
          fill={core}
          stroke={MARKER_STROKE}
          strokeWidth={strokeWidth}
        />
        <path
          d={`M${x - size * 0.46} ${y + size * 0.18} Q${x} ${y - size * 0.12} ${x + size * 0.46} ${y + size * 0.18}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </g>
    )
  }

  if (type === 'solaire') {
    return (
      <g opacity={opacity} style={{ transition }}>
        <rect
          x={x - size * 0.82}
          y={y - size * 0.82}
          width={size * 1.64}
          height={size * 1.64}
          fill={core}
          stroke={MARKER_STROKE}
          strokeWidth={strokeWidth}
          transform={`rotate(45 ${x} ${y})`}
        />
        <circle cx={x} cy={y} r={size * 0.36} fill={color} />
      </g>
    )
  }

  return (
    <g opacity={opacity} style={{ transition }}>
      <rect
        x={x - size * 0.75}
        y={y - size * 0.75}
        width={size * 1.5}
        height={size * 1.5}
        fill={core}
        stroke={MARKER_STROKE}
        strokeWidth={strokeWidth}
      />
      <rect x={x - size * 0.34} y={y - size * 0.34} width={size * 0.68} height={size * 0.68} fill={color} />
    </g>
  )
}

function hexPoints(x: number, y: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`
  }).join(' ')
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
      className="control-panel pointer-events-none absolute z-20 border px-3 py-2 fade-up"
      style={{
        left: `${((x - view.x) / view.w) * 100}%`,
        top: `${((y - view.y) / view.h) * 100}%`,
        transform: 'translate(-50%, calc(-100% - 14px))',
      }}
    >
      {children}
    </div>
  )
}
