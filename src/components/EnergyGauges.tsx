import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR, SOURCE_LABEL, pct } from '../lib/eco2mix'

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
}

export function EnergyGauges({ data, isolate, onIsolate }: Props) {
  const total = data.consommation || 1
  const co2 = data.taux_co2

  return (
    <div className="flex flex-col gap-5">
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
            className="group block w-full text-left"
            style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.3s ease' }}
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
              <div className="relative h-1.5 flex-1 bg-[#0d1f3c]">
                <div
                  className="gauge-fill absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(100, p)}%`,
                    background: color,
                    boxShadow: muted ? 'none' : `0 0 8px ${color}`,
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
          </button>
        )
      })}

      {/* CO2 */}
      <div className="mt-2 border-t border-[#1e3a5f] pt-4">
        <div className="flex items-baseline justify-between">
          <span className="t-label text-[var(--text-muted)]">empreinte carbone</span>
          <span
            className="t-num tabular-nums"
            style={{
              fontSize: 22,
              color: co2 < 80 ? 'var(--wind)' : co2 < 200 ? 'var(--solar)' : 'var(--alert-orange)',
              filter: `drop-shadow(0 0 6px ${co2 < 80 ? '#22c55e' : '#f97316'})`,
            }}
          >
            {co2}
          </span>
        </div>
        <div className="t-label mt-1 text-right text-[var(--text-muted)]">gCO₂/kWh</div>
      </div>
    </div>
  )
}
