import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR, SOURCE_LABEL, pct, tension } from '../lib/eco2mix'
import { balanceText, homesLabel, SIMPLE_SOURCE_ROLE } from '../lib/simpleMode'

const TENSION_META = {
  tendu: { label: 'réseau sous tension', color: 'var(--alert-orange)' },
  detendu: { label: 'marge confortable', color: 'var(--wind)' },
  normal: { label: 'conforme à la prévision', color: 'var(--nuclear)' },
} as const

const ROWS: { source: EnergySource; symbol: string }[] = [
  { source: 'nucleaire', symbol: '◉' },
  { source: 'eolien', symbol: '◈' },
  { source: 'solaire', symbol: '○' },
  { source: 'hydraulique', symbol: '◇' },
  { source: 'gaz', symbol: '◐' },
]

interface Props {
  data: EcoMixRecord
  isolate: EnergySource | null
  onIsolate: (s: EnergySource | null) => void
  simpleMode?: boolean
}

export function EnergyGauges({ data, isolate, onIsolate, simpleMode = false }: Props) {
  const total = data.consommation || 1
  const co2 = data.taux_co2
  const tens = tension(data)
  const balance = balanceText(data)
  const balanceColor =
    balance.tone === 'export' ? 'var(--wind)' : balance.tone === 'import' ? 'var(--alert-orange)' : 'var(--nuclear)'

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="border-b border-[var(--line-strong)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="t-label text-[var(--engie-blue-soft)]">
              {simpleMode ? "d'où vient le courant maintenant" : 'mix national temps réel'}
            </div>
            <div className="t-label mt-1 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.03em' }}>
              {simpleMode ? "chaque ligne explique le rôle d'une source" : 'production par source · clic pour isoler'}
            </div>
          </div>
          <div className="text-right">
            <div className="t-label text-[var(--text-muted)]">{simpleMode ? 'besoin' : 'demande'}</div>
            <div className="t-num tabular-nums" style={{ fontSize: 18, color: 'var(--text-primary)' }}>
              {total.toLocaleString('fr-FR')}
            </div>
            <div className="t-label text-[var(--text-muted)]">MW</div>
          </div>
        </div>
      </div>

      {simpleMode && (
        <div className="border-b border-[var(--line-strong)] pb-4">
          <div className="flex items-baseline justify-between">
            <span className="t-label text-[var(--text-muted)]">besoin de la France</span>
            <span className="t-num tabular-nums" style={{ fontSize: 17, color: 'var(--text-primary)' }}>
              {homesLabel(balance.need)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="h-1.5 bg-[var(--surface-2)]">
              <div
                className="h-full bg-[var(--nuclear)]"
                style={{ width: `${Math.min(100, (balance.need / Math.max(balance.production, balance.need, 1)) * 100)}%` }}
              />
            </div>
            <span className="t-label text-[var(--text-muted)]">vs</span>
            <div className="h-1.5 bg-[var(--surface-2)]">
              <div
                className="h-full"
                style={{
                  width: `${Math.min(100, (balance.production / Math.max(balance.production, balance.need, 1)) * 100)}%`,
                  background: balanceColor,
                }}
              />
            </div>
          </div>
          <div className="t-label mt-2 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
            {balance.label}
          </div>
        </div>
      )}

      {ROWS.map(({ source, symbol }) => {
        const mw = data[source] ?? 0
        const p = pct(mw, total)
        const color = SOURCE_COLOR[source]
        const muted = source === 'solaire' && mw < 200
        const selected = isolate === source
        const dimmed = isolate !== null && !selected

        return (
          <button
            key={source}
            onClick={() => onIsolate(selected ? null : source)}
            className="group block w-full border-l-2 py-1 pl-3 text-left"
            style={{
              borderLeftColor: selected ? color : 'var(--line-strong)',
              opacity: dimmed ? 0.35 : 1,
              transition: 'opacity 0.3s ease, border-color 0.2s ease',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="t-label flex items-center gap-2"
                style={{ color: muted ? 'var(--text-muted)' : color }}
              >
                <span style={{ filter: muted ? 'none' : `drop-shadow(0 0 4px ${color})` }}>
                  {symbol}
                </span>
                {SOURCE_LABEL[source]}
                {muted && <span className="text-[var(--text-muted)]">(nuit)</span>}
              </span>
              <span className="t-label text-[var(--text-muted)]">{p}%</span>
            </div>

            <div className="mt-1.5 flex items-center gap-3">
              <div className="relative h-1.5 flex-1 bg-[var(--surface-2)]">
                <div
                  className="gauge-fill absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(100, p)}%`,
                    background: color,
                    boxShadow: 'none',
                  }}
                />
              </div>
              <span
                className="t-num shrink-0 text-right tabular-nums"
                style={{ fontSize: 15, minWidth: 78, color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {mw.toLocaleString('fr-FR')}
              </span>
              <span className="t-label w-6 shrink-0 text-[var(--text-muted)]">MW</span>
            </div>
            {simpleMode && (
              <div className="t-label mt-1 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
                {SIMPLE_SOURCE_ROLE[source]} · {homesLabel(mw)}
              </div>
            )}
          </button>
        )
      })}

      {/* CO2 */}
      <div className="mt-2 border-t border-[var(--line-strong)] pt-4">
        <div className="flex items-baseline justify-between">
          <span className="t-label text-[var(--text-muted)]">
            {simpleMode ? 'pollution du courant' : 'empreinte carbone'}
          </span>
          <span
            className="t-num tabular-nums"
            style={{
              fontSize: 22,
              color: co2 < 80 ? 'var(--wind)' : co2 < 200 ? 'var(--solar)' : 'var(--alert-orange)',
            }}
          >
            {co2}
          </span>
        </div>
        <div className="t-label mt-1 text-right text-[var(--text-muted)]">
          {simpleMode ? 'plus bas = meilleur pour le climat' : 'gCO₂/kWh'}
        </div>
      </div>

      {/* Tension réseau : réel vs prévision */}
      {tens && (() => {
        const meta = TENSION_META[tens.state]
        const fillW = Math.min(50, (Math.abs(tens.pct) / 5) * 50)
        const positive = tens.ecart >= 0
        return (
          <div className="border-t border-[var(--line-strong)] pt-4">
            <div className="flex items-baseline justify-between">
              <span
                className="t-label"
                style={{
                  color: meta.color,
                }}
              >
                {meta.label}
              </span>
              <span className="t-num tabular-nums" style={{ fontSize: 15, color: meta.color }}>
                {positive ? '+' : '−'}
                {Math.abs(tens.ecart).toLocaleString('fr-FR')}
              </span>
            </div>
            {/* barre d'écart centrée (réel vs prévu) */}
            <div className="relative mt-2 h-1 bg-[var(--surface-2)]">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[#475569]" />
              <div
                className="gauge-fill absolute inset-y-0"
                style={{
                  left: positive ? '50%' : `${50 - fillW}%`,
                  width: `${fillW}%`,
                  background: meta.color,
                }}
              />
            </div>
            <div className="t-label mt-1 text-right text-[var(--text-muted)]">MW vs prévision</div>
          </div>
        )
      })()}

      {/* Solde aux frontières */}
      {data.ech && Math.abs(data.ech.total) > 0 && (() => {
        const exporte = data.ech.total <= 0
        const mag = Math.abs(data.ech.total)
        const color = exporte ? 'var(--wind)' : 'var(--alert-orange)'
        return (
          <div className="border-t border-[var(--line-strong)] pt-4">
            <div className="flex items-baseline justify-between">
              <span className="t-label text-[var(--text-muted)]">
                {exporte ? 'la france exporte' : 'la france importe'}
              </span>
              <span
                className="t-num tabular-nums"
                style={{ fontSize: 18, color }}
              >
                {exporte ? '+' : '−'}
                {mag.toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="t-label mt-1 text-right text-[var(--text-muted)]">
              MW vers ses voisins
            </div>
          </div>
        )
      })()}
    </div>
  )
}
