import { useRef } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'

function hhmm(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      .replace(':', 'h')
  } catch {
    return '--h--'
  }
}

function jour(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

const W = 1000
const H = 90

interface Props {
  history: EcoMixRecord[]
  index: number
  playing: boolean
  loading: boolean
  onIndex: (i: number) => void
  onTogglePlay: () => void
  onExit: () => void
}

export function TimeMachine({ history, index, playing, loading, onIndex, onTogglePlay, onExit }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const n = history.length

  const setFromX = (clientX: number) => {
    const el = trackRef.current
    if (!el || n < 2) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    onIndex(Math.round(ratio * (n - 1)))
  }

  // courbes solaire + consommation
  const maxSol = Math.max(1, ...history.map((r) => r.solaire))
  const maxConso = Math.max(1, ...history.map((r) => r.consommation))
  const line = (sel: (r: EcoMixRecord) => number, max: number) =>
    history
      .map((r, i) => `${(i / (n - 1)) * W},${H - (sel(r) / max) * (H - 12) - 4}`)
      .join(' ')

  const playheadX = n > 1 ? (index / (n - 1)) * W : 0
  const cur = history[index]

  return (
    <div className="control-footer flex items-center gap-4 border-t px-4 py-3">
      {/* play / pause */}
      <button
        onClick={onTogglePlay}
        disabled={loading || n < 2}
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--line-strong)] text-[var(--text-primary)] transition-colors hover:border-[var(--nuclear)] disabled:opacity-40"
        aria-label={playing ? 'pause' : 'play'}
      >
        {playing ? (
          <span style={{ letterSpacing: '-2px' }}>❚❚</span>
        ) : (
          <span style={{ marginLeft: 2 }}>▶</span>
        )}
      </button>

      {/* horodatage courant */}
      <div className="w-[120px] shrink-0">
        <div className="t-label text-[var(--text-muted)]">{cur ? jour(cur.date_heure) : '—'}</div>
        <div
          className="t-num tabular-nums"
          style={{ fontSize: 20, color: 'var(--nuclear)' }}
        >
          {cur ? hhmm(cur.date_heure) : '--h--'}
        </div>
      </div>

      {/* courbe + scrubber */}
      <div
        ref={trackRef}
        className="relative h-[52px] flex-1 cursor-pointer"
        onPointerDown={(e) => {
          dragging.current = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          setFromX(e.clientX)
        }}
        onPointerMove={(e) => dragging.current && setFromX(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
      >
        {loading ? (
          <div className="t-label flex h-full items-center text-[var(--text-muted)]">
            chargement des dernières 24 h…
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
            {/* consommation */}
            <polyline points={line((r) => r.consommation, maxConso)} fill="none" stroke="#475569" strokeWidth={2} />
            {/* solaire (le héros : il se lève et se couche) */}
            <polyline
              points={line((r) => r.solaire, maxSol)}
              fill="none"
              stroke="var(--solar)"
              strokeWidth={2.5}
            />
            {/* playhead */}
            <line x1={playheadX} y1={0} x2={playheadX} y2={H} stroke="var(--nuclear)" strokeWidth={2} />
            <circle cx={playheadX} cy={H - (cur ? (cur.solaire / maxSol) * (H - 12) + 4 : 4)} r={4} fill="var(--solar)" />
          </svg>
        )}
        {/* légende */}
        {!loading && (
          <div className="pointer-events-none absolute right-0 top-0 flex gap-3">
            <span className="t-label" style={{ color: 'var(--solar)' }}>● solaire</span>
            <span className="t-label text-[var(--text-muted)]">● conso</span>
          </div>
        )}
      </div>

      {/* sortie */}
      <button
        onClick={onExit}
        className="t-label shrink-0 border border-[var(--line-strong)] px-3 py-2 text-[var(--text-muted)] transition-colors hover:border-[var(--alert-red)] hover:text-[var(--text-primary)]"
      >
        ← retour live
      </button>
    </div>
  )
}
