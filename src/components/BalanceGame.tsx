import { useEffect, useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'

type SourceKey = 'nucleaire' | 'eolien' | 'solaire' | 'hydraulique' | 'gaz'

interface GameState {
  t: number
  level: number
  baseDemand: number
  demand: number
  sources: Record<SourceKey, number>
  score: number
  alert: string
}

const SOURCE_META: Record<SourceKey, { label: string; color: string; max: number; co2: number; hint: string }> = {
  nucleaire: {
    label: 'nucléaire',
    color: '#00a6d6',
    max: 52000,
    co2: 6,
    hint: 'base massive, lente à remplacer',
  },
  eolien: {
    label: 'éolien',
    color: '#22c55e',
    max: 18000,
    co2: 12,
    hint: 'propre, variable, utile si tu gardes une marge',
  },
  solaire: {
    label: 'solaire',
    color: '#d8b33f',
    max: 16000,
    co2: 45,
    hint: 'pic de jour, quasi nul la nuit',
  },
  hydraulique: {
    label: 'hydraulique',
    color: '#06b6d4',
    max: 14000,
    co2: 6,
    hint: 'réserve rapide pour passer les pointes',
  },
  gaz: {
    label: 'gaz',
    color: '#f97316',
    max: 18000,
    co2: 490,
    hint: 'secours immédiat, score carbone pénalisé',
  },
}

const SOURCE_ORDER: SourceKey[] = ['nucleaire', 'eolien', 'solaire', 'hydraulique', 'gaz']
const TARGET_RESERVE = 1800
const BAD_SURPLUS = 7000

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function clean(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0
}

function initialSources(data?: EcoMixRecord): Record<SourceKey, number> {
  const demand = clean(data?.consommation) || 50000
  const sources: Record<SourceKey, number> = {
    nucleaire: clamp(clean(data?.nucleaire) || 34000, 0, SOURCE_META.nucleaire.max),
    eolien: clamp(clean(data?.eolien) || 6000, 0, SOURCE_META.eolien.max),
    solaire: clamp(clean(data?.solaire) || 4000, 0, SOURCE_META.solaire.max),
    hydraulique: clamp(clean(data?.hydraulique) || 5500, 0, SOURCE_META.hydraulique.max),
    gaz: clamp(clean(data?.gaz) || 2500, 0, SOURCE_META.gaz.max),
  }

  let missing = demand + TARGET_RESERVE - totalProduction(sources)
  for (const key of ['gaz', 'hydraulique', 'nucleaire'] as const) {
    if (missing <= 0) break
    const room = SOURCE_META[key].max - sources[key]
    const add = Math.min(room, missing)
    sources[key] += add
    missing -= add
  }

  return sources
}

function start(data?: EcoMixRecord): GameState {
  const demand = clean(data?.consommation) || 50000
  return {
    t: 0,
    level: 1,
    baseDemand: demand,
    demand,
    sources: initialSources(data),
    score: 0,
    alert: 'mission: garde l’offre au-dessus de la demande, avec le moins de surplus possible.',
  }
}

function totalProduction(sources: Record<SourceKey, number>): number {
  return SOURCE_ORDER.reduce((sum, key) => sum + sources[key], 0)
}

function co2Of(sources: Record<SourceKey, number>): number {
  const prod = totalProduction(sources) || 1
  const weighted = SOURCE_ORDER.reduce((sum, key) => sum + sources[key] * SOURCE_META[key].co2, 0)
  return Math.round(weighted / prod)
}

function step(g: GameState): GameState {
  const t = g.t + 1
  const level = 1 + Math.floor(t / 90)
  const wave = Math.sin(t * 0.055) * (1400 + level * 850)
  const slowWave = Math.sin(t * 0.019) * (900 + level * 420)
  const incident = t % 130 > 102 ? 1900 + level * 500 : 0
  const demand = Math.round(g.baseDemand + wave + slowWave + incident)
  const production = totalProduction(g.sources)
  const reserve = production - demand
  const balanced = reserve >= 0 && reserve <= TARGET_RESERVE
  const acceptable = reserve >= 0 && reserve <= BAD_SURPLUS
  const co2 = co2Of(g.sources)
  const carbonBonus = clamp(1.25 - co2 / 420, 0.25, 1.15)
  const score = g.score + (balanced ? Math.round((16 + level * 4) * carbonBonus) : acceptable ? 3 : 0)

  let alert = 'zone parfaite: offre juste au-dessus de la demande.'
  if (reserve < 0) alert = 'déficit: l’offre est sous la demande.'
  else if (reserve > BAD_SURPLUS) alert = 'surplus élevé: tu évites le blackout, mais tu gaspilles la production.'
  else if (reserve > TARGET_RESERVE) alert = 'marge correcte: rapproche l’offre de la demande pour marquer plus.'
  else if (g.sources.gaz > 9000) alert = 'réseau sauvé au gaz: efficace, mais le score carbone chute.'

  return { ...g, t, level, demand, score, alert }
}

interface Props {
  data?: EcoMixRecord
  onClose: () => void
}

export function BalanceGame({ data, onClose }: Props) {
  const [g, setG] = useState<GameState>(() => start(data))
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (over) return
    const id = setInterval(() => {
      setG((prev) => {
        const next = step(prev)
        if (totalProduction(next.sources) < next.demand) {
          setOver(true)
        }
        return next
      })
    }, 220)
    return () => clearInterval(id)
  }, [over])

  const setSource = (key: SourceKey, value: number) => {
    setG((prev) => {
      const next = {
        ...prev,
        sources: {
          ...prev.sources,
          [key]: value,
        },
      }
      if (totalProduction(next.sources) < next.demand) {
        setOver(true)
        return { ...next, alert: 'blackout: l’offre est passée sous la demande.' }
      }
      return next
    })
  }

  const retry = () => {
    setG(start(data))
    setOver(false)
  }

  const production = Math.round(totalProduction(g.sources))
  const demand = Math.round(g.demand)
  const reserve = production - demand
  const reservePct = clamp((reserve / Math.max(demand, 1)) * 100, -20, 20)
  const stable = reserve >= 0 && reserve <= TARGET_RESERVE
  const tense = reserve >= 0 && reserve <= BAD_SURPLUS
  const co2 = co2Of(g.sources)
  const timeHeld = Math.round(g.t / 4.55)
  const offerWidth = clamp((production / Math.max(demand * 1.25, 1)) * 100, 0, 100)
  const demandWidth = clamp((demand / Math.max(production, demand * 1.25, 1)) * 100, 0, 100)

  return (
    <div className="control-room scanlines absolute inset-0 z-40 flex flex-col bg-[var(--background)]/96" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="control-header flex items-center justify-between border-b px-6 py-3">
        <div>
          <div className="t-label text-[var(--text-primary)]">scénario joueur · équilibre le réseau</div>
          <div className="t-label mt-1 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.04em' }}>
            blackout immédiat si offre &lt; demande
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="niveau" value={g.level.toString()} color="var(--solar)" />
          <Stat label="score" value={g.score.toLocaleString('fr-FR')} color="var(--nuclear)" />
          <button onClick={onClose} className="t-label text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            quitter x
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-auto p-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-5">
          <div className="control-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="t-label text-[var(--text-muted)]">offre disponible</div>
                <div className="t-num mt-1 tabular-nums" style={{ fontSize: 34, color: reserve < 0 ? 'var(--alert-red)' : stable ? 'var(--wind)' : 'var(--solar)' }}>
                  {production.toLocaleString('fr-FR')} <span style={{ fontSize: 13 }}>MW</span>
                </div>
              </div>
              <div className="text-right">
                <div className="t-label text-[var(--text-muted)]">demande réseau</div>
                <div className="t-num mt-1 tabular-nums text-[var(--text-primary)]" style={{ fontSize: 34 }}>
                  {demand.toLocaleString('fr-FR')} <span style={{ fontSize: 13 }}>MW</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <BalanceBar label="offre" width={offerWidth} color={reserve < 0 ? '#ef4444' : stable ? '#22c55e' : '#d8b33f'} />
              <BalanceBar label="demande" width={demandWidth} color="var(--text-muted)" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric
                label="marge"
                value={`${reserve >= 0 ? '+' : '-'}${Math.abs(reserve).toLocaleString('fr-FR')} MW`}
                color={reserve < 0 ? 'var(--alert-red)' : stable ? 'var(--wind)' : 'var(--solar)'}
              />
              <Metric label="co2" value={`${co2} g/kWh`} color={co2 < 80 ? 'var(--wind)' : co2 < 260 ? 'var(--solar)' : 'var(--alert-orange)'} />
              <Metric label="tenue" value={`${timeHeld} s`} color="var(--nuclear)" />
            </div>
          </div>

          <div className="control-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="t-label text-[var(--text-muted)]">zone d’équilibre</span>
              <span className="t-label tabular-nums" style={{ color: reserve < 0 ? 'var(--alert-red)' : tense ? 'var(--text-primary)' : 'var(--alert-orange)' }}>
                {reservePct.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-4 bg-[var(--surface-2)]">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--text-muted)]" />
              <div className="absolute inset-y-0" style={{ left: '50%', width: '8%', background: 'rgba(34,197,94,0.22)' }} />
              <div
                className="absolute top-[-4px] h-6 w-1"
                style={{
                  left: `${clamp(50 + reservePct * 2.1, 0, 100)}%`,
                  background: reserve < 0 ? 'var(--alert-red)' : stable ? 'var(--wind)' : 'var(--solar)',
                }}
              />
            </div>
            <div className="mt-2 flex justify-between t-label text-[var(--text-muted)]">
              <span>blackout</span>
              <span>équilibre</span>
              <span>surplus</span>
            </div>
          </div>

          <div className="control-card flex min-h-[64px] items-center p-4" style={{ borderColor: reserve < 0 ? 'var(--alert-red)' : stable ? 'var(--wind)' : 'var(--line-strong)' }}>
            <span className="t-narration not-italic" style={{ fontSize: 13, color: reserve < 0 ? 'var(--alert-red)' : stable ? 'var(--wind)' : 'var(--text-muted)' }}>
              {g.alert}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="control-card p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="t-label text-[var(--text-muted)]">sliders par source</span>
              <span className="t-label text-[var(--text-muted)]">objectif +0 à +{TARGET_RESERVE.toLocaleString('fr-FR')} MW</span>
            </div>
            {SOURCE_ORDER.map((key) => (
              <SourceSlider
                key={key}
                sourceKey={key}
                value={g.sources[key]}
                onChange={(v) => setSource(key, v)}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setG((prev) => {
                  const nextSources = { ...prev.sources, gaz: SOURCE_META.gaz.max, hydraulique: SOURCE_META.hydraulique.max }
                  return { ...prev, sources: nextSources, alert: 'réserve activée: gaz + hydraulique au maximum.' }
                })
              }}
              className="t-label border border-[var(--line-strong)] px-3 py-3 text-[var(--text-primary)] transition-colors hover:border-[var(--hydro)] hover:text-[var(--hydro)]"
            >
              réserve rapide
            </button>
            <button
              onClick={retry}
              className="t-label border border-[var(--line-strong)] px-3 py-3 text-[var(--text-primary)] transition-colors hover:border-[var(--nuclear)] hover:text-[var(--nuclear)]"
            >
              reset mission
            </button>
          </div>
        </div>
      </div>

      {over && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[rgba(2,8,22,0.94)]">
          <div className="t-title" style={{ fontSize: 13, color: 'var(--alert-red)', filter: 'drop-shadow(0 0 8px #ef4444)' }}>blackout national</div>
          <div className="t-narration not-italic text-center text-[var(--text-primary)]" style={{ maxWidth: 520, lineHeight: 1.65 }}>
            L’offre est passée sous la demande: {production.toLocaleString('fr-FR')} MW produits pour {demand.toLocaleString('fr-FR')} MW demandés.
            <br />Tu as tenu <span className="t-num" style={{ color: 'var(--nuclear)', fontSize: 18 }}>{timeHeld} s</span> · score {g.score.toLocaleString('fr-FR')}.
          </div>
          <div className="flex gap-3">
            <button onClick={retry} className="t-label border border-[var(--nuclear)] px-4 py-2 text-[var(--nuclear)] transition-colors hover:bg-[var(--nuclear)] hover:text-[var(--background)]">rejouer</button>
            <button onClick={onClose} className="t-label border border-[var(--line-strong)] px-4 py-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">quitter</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-right">
      <div className="t-label text-[var(--text-muted)]">{label}</div>
      <div className="t-num tabular-nums" style={{ fontSize: 16, color }}>{value}</div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-[var(--line-strong)] bg-[rgba(4,16,32,0.45)] p-3">
      <div className="t-label text-[var(--text-muted)]">{label}</div>
      <div className="t-num mt-1 tabular-nums" style={{ fontSize: 16, color }}>{value}</div>
    </div>
  )
}

function BalanceBar({ label, width, color }: { label: string; width: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between t-label text-[var(--text-muted)]">
        <span>{label}</span>
        <span>{Math.round(width)}%</span>
      </div>
      <div className="h-2 bg-[var(--surface-2)]">
        <div className="gauge-fill h-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}

function SourceSlider({ sourceKey, value, onChange }: { sourceKey: SourceKey; value: number; onChange: (v: number) => void }) {
  const meta = SOURCE_META[sourceKey]
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-label" style={{ color: meta.color }}>{meta.label}</span>
        <span className="t-num tabular-nums text-[var(--text-primary)]" style={{ fontSize: 14 }}>{Math.round(value).toLocaleString('fr-FR')} MW</span>
      </div>
      <input
        type="range"
        min={0}
        max={meta.max}
        step={200}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="game-slider mt-2 w-full"
        style={{ accentColor: meta.color, color: meta.color }}
      />
      <div className="mt-1 flex justify-between t-label text-[var(--text-muted)]">
        <span className="normal-case" style={{ letterSpacing: '0.02em' }}>{meta.hint}</span>
        <span>{meta.max.toLocaleString('fr-FR')} MW</span>
      </div>
    </div>
  )
}
