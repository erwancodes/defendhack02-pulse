import { useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'
import { ACTIONS, persoImpact, fmtCO2, fmtKm, type PersoAction } from '../lib/perso'

interface Props {
  data: EcoMixRecord
  onUse?: () => void
}

export function PersoImpact({ data, onUse }: Props) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<PersoAction | null>(null)

  const co2 = data.taux_co2
  const res = action ? persoImpact(action.kWh, co2) : null
  const propre = co2 < 60

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div
          className="control-panel w-[320px] border p-4 fade-up"
        >
          <div className="t-label mb-3 text-[var(--engie-blue-soft)]">impact immédiat</div>

          <div className="flex flex-col gap-1.5">
            {ACTIONS.map((a) => {
              const sel = action?.id === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setAction(a)
                    onUse?.()
                  }}
                  className="border px-3 py-2 text-left transition-colors"
                  style={{ borderColor: sel ? 'var(--nuclear)' : 'var(--line-strong)', color: sel ? 'var(--nuclear)' : 'var(--text-primary)', background: sel ? 'rgba(0,110,182,0.12)' : 'transparent' }}
                >
                  <span className="t-label normal-case" style={{ fontSize: 13, letterSpacing: '0.02em' }}>{a.label}</span>
                </button>
              )
            })}
          </div>

          {res && action && (
            <div className="mt-4 border-t border-[var(--line-strong)] pt-3 fade-up">
              <div className="t-label text-[var(--text-muted)]">ça coûte, en CO₂</div>
              <div
                className="t-num mt-1 tabular-nums"
                style={{ fontSize: 26, color: propre ? 'var(--wind)' : co2 < 200 ? 'var(--solar)' : 'var(--alert-orange)' }}
              >
                {fmtCO2(res.nowG)}
              </div>
              <div className="t-label mt-1 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
                soit ~{fmtKm(res.km)} en voiture thermique
              </div>

              <p className="t-narration mt-3 text-[var(--text-primary)]" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                {propre ? (
                  <>C'est le bon moment : le réseau est propre ({co2} gCO₂/kWh). Le même geste un soir d'hiver coûterait <span style={{ color: 'var(--alert-orange)' }}>{fmtCO2(res.worstG)}</span> — <span style={{ color: 'var(--alert-orange)' }}>{res.ratio}× pire</span>.</>
                ) : (
                  <>Le mix est à {co2} gCO₂/kWh. Au creux de la nuit (nucléaire seul), ce serait bien plus propre. <span className="text-[var(--wind)]">Quand</span> tu consommes change tout.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="nav-pill"
        style={{ borderColor: open ? 'var(--nuclear)' : '#1e3a5f', color: open ? 'var(--nuclear)' : 'var(--text-muted)' }}
      >
        impact perso
      </button>
    </div>
  )
}
