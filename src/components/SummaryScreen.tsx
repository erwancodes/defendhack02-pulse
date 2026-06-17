import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR, SOURCE_LABEL, pct } from '../lib/eco2mix'

const ORDER: EnergySource[] = ['nucleaire', 'eolien', 'hydraulique', 'solaire', 'gaz']

function Bar({ p, color }: { p: number; color: string }) {
  const filled = Math.round((Math.min(100, p) / 100) * 20)
  return (
    <span className="tabular-nums" style={{ color, filter: `drop-shadow(0 0 4px ${color})` }}>
      {'█'.repeat(filled)}
      <span style={{ color: '#0d1f3c', filter: 'none' }}>{'░'.repeat(20 - filled)}</span>
    </span>
  )
}

interface Props {
  data: EcoMixRecord
  onClose: () => void
}

export function SummaryScreen({ data, onClose }: Props) {
  const total = data.consommation || 1

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#00000a] fade-up"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl px-8" onClick={(e) => e.stopPropagation()}>
        <div className="t-label mb-8 text-[var(--text-muted)]">ce soir, la france a produit</div>

        <div className="flex flex-col gap-3" style={{ fontSize: 14 }}>
          {ORDER.map((s) => {
            const p = pct(data[s] ?? 0, total)
            const muted = s === 'solaire' && (data[s] ?? 0) < 200
            return (
              <div key={s} className="flex items-center gap-4">
                <Bar p={p} color={SOURCE_COLOR[s]} />
                <span className="tabular-nums" style={{ minWidth: 42 }}>
                  {p}%
                </span>
                <span className="t-label text-[var(--text-primary)]">
                  {SOURCE_LABEL[s]} {muted && <span className="text-[var(--text-muted)]">(nuit)</span>}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-10 border-t border-[#1e3a5f] pt-6">
          <div className="t-label text-[var(--text-muted)]">empreinte carbone</div>
          <div className="mt-2 t-num" style={{ color: 'var(--wind)', filter: 'drop-shadow(0 0 8px #22c55e)' }}>
            {data.taux_co2} gCO₂/kWh
          </div>
          <div className="t-label mt-3 text-[var(--text-muted)]">
            france : {data.taux_co2} &nbsp;·&nbsp; allemagne : 380 &nbsp;·&nbsp; pologne : 750
          </div>
        </div>

        <div className="mt-12 t-narration text-[var(--text-primary)]">
          tu savais déjà tout ça.
          <br />
          tu l'as vu battre pendant quelques minutes.
        </div>

        <button
          onClick={onClose}
          className="t-label mt-10 border border-[#1e3a5f] px-4 py-2 text-[var(--text-muted)] transition-colors hover:border-[var(--nuclear)] hover:text-[var(--text-primary)]"
        >
          ← retour au réseau
        </button>
      </div>
    </div>
  )
}
