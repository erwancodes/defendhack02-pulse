import { useEffect, useState } from 'react'
import {
  fetchRegional,
  regionalProduction,
  pct,
  SOURCE_COLOR,
  type RegionalRecord,
} from '../lib/eco2mix'
import { CENTRALES, type Region } from '../lib/regions'
import { REGION_INFO } from '../lib/regionInfo'

// couleurs des sources régionales
const COLORS: Record<string, string> = {
  nucleaire: '#00a6d6',
  hydraulique: '#06b6d4',
  eolien: '#22c55e',
  solaire: '#d8b33f',
  thermique: '#f97316',
  bioenergies: '#84cc16',
}
const LABELS: Record<string, string> = {
  nucleaire: 'nucléaire',
  hydraulique: 'hydraulique',
  eolien: 'éolien',
  solaire: 'solaire',
  thermique: 'thermique',
  bioenergies: 'bioénergies',
}
const ORDER = ['nucleaire', 'hydraulique', 'eolien', 'solaire', 'thermique', 'bioenergies'] as const

interface Props {
  region: Region
  onBack: () => void
}

export function RegionDetail({ region, onBack }: Props) {
  const [rec, setRec] = useState<RegionalRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setRec(null)
    fetchRegional(region.code).then((r) => {
      if (!alive) return
      setRec(r)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [region.code])

  const info = REGION_INFO[region.id]
  const centrales = CENTRALES.filter((c) => c.region === region.id)

  const prod = rec ? regionalProduction(rec) : 0
  const solde = rec ? prod - rec.consommation : 0
  const exporte = solde >= 0

  return (
    <div
      className="control-panel absolute left-4 top-4 z-30 w-[320px] border p-5 fade-up"
    >
      <button
        onClick={onBack}
        className="t-label mb-4 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        ← vue nationale
      </button>

      <div className="t-label text-[var(--engie-blue-soft)]">
        {region.nom}
      </div>
      {info && <div className="t-label mt-1 text-[var(--text-muted)]">— {info.tag}</div>}

      {loading && <div className="t-label mt-5 text-[var(--text-muted)]">chargement des données rte…</div>}

      {!loading && !rec && (
        <div className="t-label mt-5 text-[var(--text-muted)]">données régionales indisponibles</div>
      )}

      {rec && (
        <>
          {/* solde import / export — le point clé */}
          <div className="mt-5 border-y border-[var(--line-strong)] py-3">
            <div className="t-label text-[var(--text-muted)]">
              {exporte ? 'la région exporte' : 'la région importe'}
            </div>
            <div
              className="t-num mt-1 tabular-nums"
              style={{
                color: exporte ? 'var(--wind)' : 'var(--alert-orange)',
              }}
            >
              {exporte ? '+' : '−'}
              {Math.abs(solde).toLocaleString('fr-FR')} MW
            </div>
            <div className="t-label mt-1 text-[var(--text-muted)]">
              produit {prod.toLocaleString('fr-FR')} · consomme {rec.consommation.toLocaleString('fr-FR')}
            </div>
          </div>

          {/* mix de production locale */}
          <div className="mt-4 flex flex-col gap-2.5">
            {ORDER.map((s) => {
              const mw = rec[s]
              const p = pct(mw, prod)
              const muted = mw < 1
              return (
                <div key={s}>
                  <div className="flex items-center justify-between">
                    <span className="t-label" style={{ color: muted ? 'var(--text-muted)' : COLORS[s] }}>
                      {LABELS[s]}
                    </span>
                    <span className="t-label tabular-nums text-[var(--text-muted)]">
                      {mw.toLocaleString('fr-FR')} MW
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-[var(--surface-2)]">
                    <div
                      className="gauge-fill h-full"
                      style={{
                        width: `${Math.min(100, p)}%`,
                        background: COLORS[s],
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* centrales de la région */}
          {centrales.length > 0 && (
            <div className="mt-4">
              <div className="t-label text-[var(--text-muted)]">centrales ici</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {centrales.map((c) => (
                  <div key={c.nom} className="flex items-center gap-2">
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0"
                      style={{ background: SOURCE_COLOR[c.type] }}
                    />
                    <span className="t-label normal-case text-[var(--text-primary)]" style={{ letterSpacing: '0.04em' }}>
                      {c.nom}
                    </span>
                    <span className="t-label ml-auto tabular-nums text-[var(--text-muted)]">{c.mw} MW</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {info && <p className="t-narration mt-4 text-[var(--text-primary)]">{info.note}</p>}
        </>
      )}
    </div>
  )
}
