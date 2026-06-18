import type { EcoMixRecord, EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR, SOURCE_LABEL, pct } from '../lib/eco2mix'
import { balanceText, homesLabel, SIMPLE_SOURCE_ROLE } from '../lib/simpleMode'

const ORDER: EnergySource[] = ['nucleaire', 'eolien', 'hydraulique', 'solaire', 'gaz']

function Bar({ p, color }: { p: number; color: string }) {
  const filled = Math.round((Math.min(100, p) / 100) * 20)
  return (
    <span className="tabular-nums" style={{ color }}>
      {'█'.repeat(filled)}
      <span style={{ color: 'var(--surface-2)' }}>{'░'.repeat(20 - filled)}</span>
    </span>
  )
}

interface Props {
  data: EcoMixRecord
  simpleMode?: boolean
  onClose: () => void
}

export function SummaryScreen({ data, simpleMode = false, onClose }: Props) {
  const total = data.consommation || 1
  const balance = balanceText(data)

  return (
    <div
      className="control-room absolute inset-0 z-40 flex items-center justify-center bg-[var(--background)] fade-up"
      onClick={onClose}
    >
      <div className="control-panel w-full max-w-2xl border p-8" onClick={(e) => e.stopPropagation()}>
        <div className="t-label mb-8 text-[var(--engie-blue-soft)]">
          {simpleMode ? "ce qu'il faut retenir" : 'bilan réseau'}
        </div>

        {simpleMode && (
          <div className="mb-8 border border-[var(--line-strong)] p-4">
            <div className="t-label text-[var(--text-muted)]">lecture instantanee</div>
            <div className="mt-2 t-narration not-italic text-[var(--text-primary)]" style={{ fontSize: 14 }}>
              La France a besoin de {homesLabel(balance.need)}. Le reseau produit{' '}
              {balance.production.toLocaleString('fr-FR')} MW. {balance.label}.
            </div>
          </div>
        )}

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
                {simpleMode && (
                  <span className="t-label normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
                    {SIMPLE_SOURCE_ROLE[s]}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-10 border-t border-[var(--line-strong)] pt-6">
          <div className="t-label text-[var(--text-muted)]">empreinte carbone</div>
          <div className="mt-2 t-num" style={{ color: 'var(--wind)' }}>
            {data.taux_co2} gCO₂/kWh
          </div>
          <div className="t-label mt-3 text-[var(--text-muted)]">
            france : {data.taux_co2} &nbsp;·&nbsp; allemagne : 380 &nbsp;·&nbsp; pologne : 750
          </div>
        </div>

        <div className="mt-12 t-narration text-[var(--text-primary)]">
          {simpleMode ? (
            <>
              1. L'électricité doit être produite au moment où on la consomme.
              <br />
              2. Certaines sources sont stables, d'autres dépendent de la météo.
              <br />
              3. Le bon mix équilibre sécurité, CO₂ bas et disponibilité.
            </>
          ) : (
            <>
              tu savais déjà tout ça.
              <br />
              tu l'as vu battre pendant quelques minutes.
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="t-label mt-10 border border-[var(--line-strong)] px-4 py-2 text-[var(--text-muted)] transition-colors hover:border-[var(--nuclear)] hover:text-[var(--text-primary)]"
        >
          ← retour au réseau
        </button>
      </div>
    </div>
  )
}
