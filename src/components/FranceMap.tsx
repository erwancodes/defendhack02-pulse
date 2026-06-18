import { useState, type ReactNode } from 'react'
import type { DeptInstall, EcoMixRecord, EnergySource, RegionalRecord } from '../lib/eco2mix'
import { SOURCE_COLOR, regionalProduction, tension } from '../lib/eco2mix'
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

export type MapMode = 'mix' | 'consommation' | 'co2' | 'production' | 'tension'

const MODE_META: Record<MapMode, { label: string; unit: string; low: string; high: string }> = {
  mix: { label: 'mix live', unit: '', low: 'regions', high: 'centrales' },
  consommation: { label: 'consommation', unit: 'MW', low: 'faible', high: 'forte' },
  co2: { label: 'CO2', unit: 'g/kWh', low: 'bas', high: 'haut' },
  production: { label: 'production', unit: 'MW', low: 'faible', high: 'forte' },
  tension: { label: 'solde', unit: 'MW', low: 'importe', high: 'exporte' },
}

const DEPT_MODE_META: Record<MapMode, { label: string; unit: string; low: string; high: string }> = {
  mix: { label: 'parc departement', unit: '', low: 'departements', high: 'villes' },
  consommation: { label: 'population', unit: 'hab.', low: 'faible', high: 'forte' },
  co2: { label: 'densite villes', unit: 'rang', low: 'secondaire', high: 'majeure' },
  production: { label: 'puissance installee', unit: 'MW', low: 'faible', high: 'forte' },
  tension: { label: 'installations', unit: 'sites', low: 'peu', high: 'beaucoup' },
}

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

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function rgb(a: [number, number, number], b: [number, number, number], t: number, alpha = 0.42) {
  return `rgba(${lerp(a[0], b[0], t)},${lerp(a[1], b[1], t)},${lerp(a[2], b[2], t)},${alpha})`
}

function modeValue(mode: MapMode, data: EcoMixRecord, region: (typeof REGIONS)[number], rec?: RegionalRecord) {
  const estimatedConsumption = Math.round(data.consommation * region.consoShare)
  if (mode === 'consommation') return rec?.consommation || estimatedConsumption
  if (mode === 'co2') return rec?.taux_co2 ?? data.taux_co2
  if (mode === 'production') return rec ? regionalProduction(rec) : 0
  if (mode === 'tension') return rec ? regionalProduction(rec) - rec.consommation : 0
  return estimatedConsumption
}

function modePaint(
  mode: MapMode,
  data: EcoMixRecord,
  region: (typeof REGIONS)[number],
  rec?: RegionalRecord,
): { fill: string; stroke: string; glow?: string; label: string } | null {
  if (mode === 'mix') return null
  const value = modeValue(mode, data, region, rec)

  if (mode === 'consommation') {
    const t = clamp01(value / 12000)
    return {
      fill: rgb([6, 24, 43], [216, 179, 63], t, 0.18 + t * 0.42),
      stroke: t > 0.72 ? '#d8b33f' : '#24739b',
      glow: t > 0.72 ? 'drop-shadow(0 0 7px rgba(216,179,63,0.42))' : undefined,
      label: `${value.toLocaleString('fr-FR')} MW`,
    }
  }

  if (mode === 'co2') {
    const t = clamp01(value / 180)
    return {
      fill: rgb([34, 197, 94], [249, 115, 22], t, 0.18 + t * 0.48),
      stroke: t > 0.5 ? '#f97316' : '#22c55e',
      glow: t > 0.62 ? 'drop-shadow(0 0 7px rgba(249,115,22,0.48))' : undefined,
      label: `${Math.round(value)} g/kWh`,
    }
  }

  if (mode === 'production') {
    const t = clamp01(value / 16000)
    return {
      fill: rgb([6, 24, 43], [0, 166, 214], t, 0.18 + t * 0.45),
      stroke: t > 0.6 ? '#65d9ff' : '#24739b',
      glow: t > 0.6 ? 'drop-shadow(0 0 7px rgba(101,217,255,0.42))' : undefined,
      label: value > 0 ? `${value.toLocaleString('fr-FR')} MW` : 'chargement',
    }
  }

  const t = clamp01((value + 5000) / 10000)
  return {
    fill: rgb([249, 115, 22], [34, 197, 94], t, 0.24 + Math.abs(t - 0.5) * 0.72),
    stroke: value >= 0 ? '#22c55e' : '#f97316',
    glow: Math.abs(value) > 2500 ? `drop-shadow(0 0 7px ${value >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(249,115,22,0.52)'})` : undefined,
    label: value === 0 ? 'chargement' : `${value > 0 ? '+' : '-'}${Math.abs(value).toLocaleString('fr-FR')} MW`,
  }
}

function deptModePaint(
  mode: MapMode,
  dept: (typeof DEPARTEMENTS)[number],
  install?: DeptInstall | null,
  cities: MajorCity[] = [],
): { fill: string; stroke: string; glow?: string; label: string } | null {
  if (mode === 'mix') return null

  if (mode === 'production') {
    const value = install?.totalMw ?? 0
    const t = clamp01(value / 2600)
    return {
      fill: rgb([6, 24, 43], [0, 166, 214], t, 0.12 + t * 0.46),
      stroke: t > 0.55 ? '#65d9ff' : 'rgba(0,166,214,0.46)',
      glow: t > 0.62 ? 'drop-shadow(0 0 6px rgba(101,217,255,0.45))' : undefined,
      label: value > 0 ? `${Math.round(value).toLocaleString('fr-FR')} MW installes` : 'chargement',
    }
  }

  if (mode === 'tension') {
    const value = install?.totalNb ?? 0
    const t = clamp01(value / 900)
    return {
      fill: rgb([6, 24, 43], [34, 197, 94], t, 0.12 + t * 0.44),
      stroke: t > 0.55 ? '#22c55e' : 'rgba(34,197,94,0.42)',
      glow: t > 0.65 ? 'drop-shadow(0 0 6px rgba(34,197,94,0.42))' : undefined,
      label: value > 0 ? `${value.toLocaleString('fr-FR')} installations` : 'chargement',
    }
  }

  const value = cities.reduce((sum, city) => sum + Math.max(0, city.population), 0)
  const t = clamp01(value / 850000)
  return {
    fill: rgb([6, 24, 43], mode === 'co2' ? [249, 115, 22] : [216, 179, 63], t, 0.12 + t * 0.46),
    stroke: mode === 'co2' ? '#f97316' : '#d8b33f',
    glow: t > 0.65 ? `drop-shadow(0 0 6px ${mode === 'co2' ? 'rgba(249,115,22,0.45)' : 'rgba(216,179,63,0.42)'})` : undefined,
    label: value > 0 ? `${value.toLocaleString('fr-FR')} hab. villes` : `${dept.nom}`,
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
  mapMode: MapMode
  regionalRecords: Record<string, RegionalRecord | null>
  deptInstalls: Record<string, DeptInstall | null>
  deptCitiesByCode: Record<string, MajorCity[]>
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
  mapMode,
  regionalRecords,
  deptInstalls,
  deptCitiesByCode,
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
          const overlay = state === 'normal' ? modePaint(mapMode, data, r, regionalRecords[r.id] ?? undefined) : null
          const fill = isHover ? '#0a2f4f' : overlay?.fill ?? base.fill
          const stroke = isHover ? '#00a6d6' : overlay?.stroke ?? base.stroke
          const filter = base.cls === 'glow'
            ? 'drop-shadow(0 0 6px #f97316)'
            : isHover
              ? `drop-shadow(0 0 ${focused ? 7 : 5}px rgba(59,130,246,0.55))`
              : overlay?.glow
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
          const overlay = deptModePaint(mapMode, d, deptInstalls[d.code], deptCitiesByCode[d.code])
          return (
            <path
              key={d.code}
              d={d.d}
              fill={active ? 'rgba(0,166,214,0.18)' : overlay?.fill ?? 'transparent'}
              stroke={active ? '#00a6d6' : overlay?.stroke ?? 'rgba(0,166,214,0.32)'}
              strokeWidth={(focused ? 1.1 : 0.6) * z}
              strokeLinejoin="round"
              style={{
                opacity: dimmed ? 0.25 : 1,
                cursor: 'pointer',
                filter: active ? 'drop-shadow(0 0 4px rgba(0,166,214,0.5))' : overlay?.glow,
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
              const popWeight = clamp01(city.population / 220000)
              const filtered = mapMode !== 'mix'
              const cityColor = filtered
                ? mapMode === 'co2'
                  ? rgb([216, 179, 63], [249, 115, 22], popWeight, 1)
                  : mapMode === 'production'
                    ? rgb([6, 182, 212], [0, 166, 214], popWeight, 1)
                    : rgb([34, 197, 94], [216, 179, 63], popWeight, 1)
                : 'var(--nuclear)'
              const cityRadius = (active ? 5.8 : 3.4 + popWeight * 3.2) * z
              return (
                <g key={city.code}>
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={cityRadius}
                    fill={active ? 'var(--engie-blue-soft)' : cityColor}
                    stroke="var(--background)"
                    strokeWidth={1.2 * z}
                    style={{
                      cursor: 'pointer',
                      filter: filtered ? `drop-shadow(0 0 ${4 + popWeight * 5}px ${cityColor})` : undefined,
                    }}
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
          const metric = deptModePaint(mapMode, d, deptInstalls[d.code], deptCitiesByCode[d.code])
          return (
            <Tooltip x={d.label[0]} y={d.label[1]} view={view}>
              <div className="t-label text-[var(--text-primary)]">{d.nom}</div>
              {metric && <div className="mt-1 t-num" style={{ fontSize: 16 }}>{metric.label}</div>}
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
          const metric = modePaint(mapMode, data, r, regionalRecords[r.id] ?? undefined)
          return (
            <Tooltip x={r.label[0]} y={r.label[1]} view={view}>
              <div className="t-label text-[var(--text-primary)]">{r.nom}</div>
              <div className="mt-1 t-num" style={{ fontSize: 16 }}>
                {metric?.label ?? `${conso.toLocaleString('fr-FR')} MW`}
              </div>
              <div className="t-label text-[var(--text-muted)]">consommés ce soir · clic pour explorer</div>
            </Tooltip>
          )
        })()}
      {mapMode !== 'mix' && (
        <MapModeLegend mode={mapMode} data={data} level={focusedRegion || focusedDept ? 'departement' : 'region'} />
      )}
    </div>
  )
}

function MapModeLegend({ mode, data, level }: { mode: MapMode; data: EcoMixRecord; level: 'region' | 'departement' }) {
  const nationalTension = tension(data)
  const meta = level === 'departement' ? DEPT_MODE_META[mode] : MODE_META[mode]
  return (
    <div className="control-panel pointer-events-none absolute bottom-[92px] left-4 z-20 w-[220px] border p-3 fade-up">
      <div className="flex items-center justify-between gap-3">
        <span className="t-label text-[var(--text-primary)]">{meta.label}</span>
        <span className="t-label text-[var(--text-muted)]">{meta.unit}</span>
      </div>
      <div
        className="mt-2 h-2 border border-[var(--line-strong)]"
        style={{
          background:
            mode === 'co2'
              ? 'linear-gradient(90deg, rgba(34,197,94,0.75), rgba(216,179,63,0.72), rgba(249,115,22,0.82))'
              : mode === 'tension'
                ? 'linear-gradient(90deg, rgba(249,115,22,0.82), rgba(6,24,43,0.9), rgba(34,197,94,0.78))'
                : mode === 'production'
                  ? 'linear-gradient(90deg, rgba(6,24,43,0.9), rgba(0,166,214,0.82))'
                  : 'linear-gradient(90deg, rgba(6,24,43,0.9), rgba(216,179,63,0.82))',
        }}
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="t-label text-[var(--text-muted)]">{meta.low}</span>
        <span className="t-label text-[var(--text-muted)]">{meta.high}</span>
      </div>
      {mode === 'tension' && nationalTension && (
        <div className="t-label mt-2 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.03em' }}>
          national: {nationalTension.state}
        </div>
      )}
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
