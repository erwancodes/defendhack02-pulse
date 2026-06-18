import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Factory,
  Gauge,
  Leaf,
  RadioTower,
  ShieldAlert,
  Zap,
} from 'lucide-react'

import {
  FALLBACK,
  SOURCE_COLOR,
  SOURCE_LABEL,
  fetchEcoMix,
  fetchHistory,
  pct,
  tension,
  type EcoMixRecord,
  type EnergySource,
} from '../lib/eco2mix'

export const Route = createFileRoute('/stats')({ component: StatsPage })

const SOURCES: EnergySource[] = ['nucleaire', 'hydraulique', 'eolien', 'solaire', 'gaz', 'fioul', 'charbon']

function formatMw(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} MW`
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return 'temps reel'
  }
}

function totalProduction(data: EcoMixRecord): number {
  return SOURCES.reduce((sum, source) => sum + data[source], 0)
}

function alertLevel(data: EcoMixRecord) {
  const imports = Math.max(0, data.ech?.total ?? 0)
  const production = totalProduction(data)
  const renewable = data.eolien + data.solaire + data.hydraulique
  const renewPct = pct(renewable, production)
  const margin = production - data.consommation

  const score =
    (imports > 2500 ? 24 : imports > 0 ? 10 : 0) +
    (margin < 0 ? 22 : margin < 2500 ? 10 : 0) +
    (data.taux_co2 > 80 ? 18 : data.taux_co2 > 50 ? 8 : 0) +
    (renewPct < 18 ? 14 : renewPct < 28 ? 6 : 0)

  if (score >= 42) {
    return {
      level: 'tension',
      score,
      label: 'Risque reseau eleve',
      reason: 'importations ou marge nationale sous pression',
      color: 'var(--alert-red)',
    }
  }
  if (score >= 20) {
    return {
      level: 'surveillance',
      score,
      label: 'Surveillance active',
      reason: 'signaux faibles a surveiller sur le mix',
      color: 'var(--alert-orange)',
    }
  }
  return {
    level: 'faible',
    score,
    label: 'Risque reseau faible',
    reason: 'production et consommation restent equilibrees',
    color: 'var(--wind)',
  }
}

function sparklinePath(history: EcoMixRecord[], width = 620, height = 118): string {
  if (history.length < 2) return ''
  const values = history.map((r) => r.consommation)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = height - ((value - min) / span) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function StatsPage() {
  const [data, setData] = useState<EcoMixRecord>(FALLBACK)
  const [history, setHistory] = useState<EcoMixRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [live, hist] = await Promise.all([fetchEcoMix(), fetchHistory(96)])
      if (!alive) return
      setData(live)
      setHistory(hist)
      setLoading(false)
    }
    load()
    const id = window.setInterval(load, 60_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const production = totalProduction(data)
  const renewable = data.eolien + data.solaire + data.hydraulique
  const imported = data.ech?.total ?? 0
  const alert = alertLevel(data)
  const networkTension = tension(data)
  const path = useMemo(() => sparklinePath(history), [history])

  return (
    <div className="control-room scanlines min-h-[100dvh] overflow-y-auto bg-[var(--background)] text-[var(--text-primary)]">
      <header className="control-header sticky top-0 z-40 flex min-h-14 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" className="t-title text-[var(--engie-blue-soft)]">
            pulse
          </Link>
          <div className="hidden h-7 w-px bg-[var(--line-strong)] md:block" />
          <div className="min-w-0">
            <div className="t-label text-[var(--text-primary)]">energie france live</div>
            <div className="t-label mt-0.5 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.04em' }}>
              donnees officielles rte / odre
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mobile-hide t-label flex items-center gap-2 border px-2.5 py-2" style={{ borderColor: 'var(--line-strong)' }}>
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--alert-red)]" />
            {loading ? 'chargement' : `maj ${formatDateTime(data.date_heure)}`}
          </span>
          <Link to="/" className="nav-pill">
            retour carte
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="control-card overflow-hidden p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="t-label text-[var(--text-muted)]">surveillance nationale</p>
                <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
                  Le reseau electrique francais en temps quasi reel.
                </h1>
              </div>
              <div className="status-chip flex items-center gap-2 px-3 py-2">
                <RadioTower size={16} className="text-[var(--engie-blue-soft)]" />
                <span className="t-label text-[var(--text-primary)]">refresh 15 min</span>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={<Zap size={18} />} label="consommation" value={formatMw(data.consommation)} hint="demande nationale" />
              <MetricCard icon={<Factory size={18} />} label="production" value={formatMw(production)} hint="mix instantane" />
              <MetricCard icon={<Leaf size={18} />} label="co2" value={`${Math.round(data.taux_co2)} g/kWh`} hint="intensite carbone" />
              <MetricCard
                icon={imported > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                label={imported > 0 ? 'import net' : 'export net'}
                value={formatMw(Math.abs(imported))}
                hint="echanges physiques"
              />
            </div>
          </div>

          <div className="control-card p-5 md:p-6" style={{ borderColor: alert.color }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-label text-[var(--text-muted)]">signal demo defense</p>
                <h2 className="mt-3 text-2xl font-black leading-tight">{alert.label}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{alert.reason}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border" style={{ borderColor: alert.color, color: alert.color }}>
                <ShieldAlert size={24} />
              </div>
            </div>
            <div className="mt-7">
              <div className="mb-2 flex justify-between">
                <span className="t-label text-[var(--text-muted)]">score de tension</span>
                <span className="t-label" style={{ color: alert.color }}>
                  {Math.min(100, alert.score)}/100
                </span>
              </div>
              <div className="h-3 border border-[var(--line-strong)] bg-[rgba(4,16,32,0.9)]">
                <div className="h-full transition-all" style={{ width: `${Math.min(100, alert.score)}%`, background: alert.color }} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniSignal label="renouvelable" value={`${pct(renewable, production)}%`} />
              <MiniSignal label="marge prod." value={formatMw(production - data.consommation)} />
              <MiniSignal label="prevision" value={networkTension ? `${networkTension.pct.toFixed(1)}%` : 'n/a'} />
              <MiniSignal label="niveau" value={alert.level} />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="control-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="t-label text-[var(--text-muted)]">mix de production</p>
                <h2 className="mt-2 text-xl font-black">Repartition actuelle par filiere</h2>
              </div>
              <Gauge className="text-[var(--engie-blue-soft)]" size={22} />
            </div>
            <div className="mt-6 flex h-5 overflow-hidden border border-[var(--line-strong)] bg-[rgba(4,16,32,0.9)]">
              {SOURCES.map((source) => {
                const value = data[source]
                return (
                  <div
                    key={source}
                    title={`${SOURCE_LABEL[source]} ${pct(value, production)}%`}
                    style={{
                      width: `${pct(value, production)}%`,
                      background: SOURCE_COLOR[source],
                    }}
                  />
                )
              })}
            </div>
            <div className="mt-5 space-y-3">
              {SOURCES.map((source) => {
                const value = data[source]
                return (
                  <div key={source}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5" style={{ background: SOURCE_COLOR[source] }} />
                        {SOURCE_LABEL[source]}
                      </span>
                      <span className="t-label text-[var(--text-muted)]">
                        {formatMw(value)} · {pct(value, production)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[rgba(23,68,104,0.45)]">
                      <div className="h-full" style={{ width: `${pct(value, production)}%`, background: SOURCE_COLOR[source] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="control-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="t-label text-[var(--text-muted)]">derniere journee</p>
                <h2 className="mt-2 text-xl font-black">Consommation sur 24 h</h2>
              </div>
              <Clock3 className="text-[var(--engie-blue-soft)]" size={22} />
            </div>
            <div className="mt-6 h-[190px] border border-[var(--line-strong)] bg-[rgba(4,16,32,0.48)] p-4">
              <svg viewBox="0 0 620 138" className="h-full w-full" role="img" aria-label="courbe de consommation 24 heures">
                <line x1="0" x2="620" y1="118" y2="118" stroke="rgba(101,217,255,0.16)" />
                <line x1="0" x2="620" y1="59" y2="59" stroke="rgba(101,217,255,0.10)" />
                {path && <path d={path} transform="translate(0 10)" fill="none" stroke="var(--engie-blue-soft)" strokeWidth="3" />}
                {path && <path d={`${path} L 620 128 L 0 128 Z`} transform="translate(0 10)" fill="rgba(0,166,214,0.12)" />}
              </svg>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniSignal label="points" value={history.length ? `${history.length}` : 'fallback'} />
              <MiniSignal label="pic 24h" value={history.length ? formatMw(Math.max(...history.map((r) => r.consommation))) : 'n/a'} />
              <MiniSignal label="creux 24h" value={history.length ? formatMw(Math.min(...history.map((r) => r.consommation))) : 'n/a'} />
            </div>
          </div>
        </section>

        <section className="control-card grid gap-4 p-5 md:grid-cols-3 md:p-6">
          <Explainer icon={<Activity size={18} />} title="Source officielle" text="RTE publie eco2mix via la plateforme ODRÉ, avec des donnees nationales rafraichies au pas quart d'heure." />
          <Explainer icon={<ShieldAlert size={18} />} title="Usage demo" text="La page transforme les donnees brutes en signal operationnel: faible, surveillance ou tension." />
          <Explainer icon={<RadioTower size={18} />} title="Fallback demo" text="Si l'API est indisponible, l'app conserve des valeurs representatives pour ne pas casser la presentation." />
        </section>
      </main>
    </div>
  )
}

function MetricCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="border border-[var(--line-strong)] bg-[rgba(4,16,32,0.58)] p-4">
      <div className="flex items-center justify-between text-[var(--engie-blue-soft)]">
        {icon}
        <span className="t-label text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="mt-4 text-2xl font-black">{value}</div>
      <div className="t-label mt-2 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.03em' }}>
        {hint}
      </div>
    </div>
  )
}

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line-strong)] bg-[rgba(4,16,32,0.5)] px-3 py-2">
      <div className="t-label text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-bold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function Explainer({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--line-strong)] text-[var(--engie-blue-soft)]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p>
      </div>
    </div>
  )
}
