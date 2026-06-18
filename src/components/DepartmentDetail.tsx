import { useEffect, useState } from 'react'
import { fetchDeptInstall, filiereColor, pct, type DeptInstall } from '../lib/eco2mix'
import type { Departement } from '../lib/departements'

function fmtMw(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`
  return `${Math.round(mw).toLocaleString('fr-FR')} MW`
}

interface Props {
  dept: Departement
  regionNom: string
  onBack: () => void
}

export function DepartmentDetail({ dept, regionNom, onBack }: Props) {
  const [data, setData] = useState<DeptInstall | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setData(null)
    fetchDeptInstall(dept.code).then((d) => {
      if (!alive) return
      setData(d)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [dept.code])

  const top = data?.filieres ?? []
  const maxMw = top.length > 0 ? top[0].mw : 1

  return (
    <div
      className="control-panel absolute left-4 top-4 z-30 w-[320px] border p-5 fade-up"
    >
      <button
        onClick={onBack}
        className="t-label mb-4 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        ← {regionNom.toLowerCase()}
      </button>

      <div className="t-label text-[var(--engie-blue-soft)]">
        {dept.nom}
      </div>
      <div className="t-label mt-1 text-[var(--text-muted)]">département {dept.code} · {regionNom}</div>

      {loading && <div className="t-label mt-5 text-[var(--text-muted)]">chargement du registre…</div>}

      {!loading && data && data.filieres.length === 0 && (
        <div className="t-label mt-5 text-[var(--text-muted)]">aucune installation référencée</div>
      )}

      {!loading && !data && (
        <div className="t-label mt-5 text-[var(--text-muted)]">registre indisponible</div>
      )}

      {data && data.filieres.length > 0 && (
        <>
          <div className="mt-5 border-y border-[var(--line-strong)] py-3">
            <div className="t-label text-[var(--text-muted)]">puissance installée</div>
            <div
              className="t-num mt-1 tabular-nums"
              style={{ color: 'var(--nuclear)' }}
            >
              {fmtMw(data.totalMw)}
            </div>
            <div className="t-label mt-1 text-[var(--text-muted)]">
              {data.totalNb.toLocaleString('fr-FR')} installations raccordées
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {top.map((f) => {
              const color = filiereColor(f.filiere)
              return (
                <div key={f.filiere}>
                  <div className="flex items-center justify-between">
                    <span className="t-label" style={{ color }}>
                      {f.filiere}
                    </span>
                    <span className="t-label tabular-nums text-[var(--text-muted)]">
                      {fmtMw(f.mw)} · {pct(f.mw, data.totalMw)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-[var(--surface-2)]">
                    <div
                      className="gauge-fill h-full"
                      style={{
                        width: `${Math.max(3, (f.mw / maxMw) * 100)}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <p className="t-narration mt-4 text-[var(--text-muted)]">
            Puissance installée (parc de production raccordé), et non la production
            en temps réel. Source : registre national des installations.
          </p>
        </>
      )}
    </div>
  )
}
