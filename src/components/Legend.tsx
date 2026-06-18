import type { EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR } from '../lib/eco2mix'

const ENTRIES: { source: EnergySource; label: string; phrase: string }[] = [
  { source: 'nucleaire', label: 'nucleaire', phrase: 'colonne vertebrale du reseau' },
  { source: 'eolien', label: 'eolien', phrase: 'production intermittente du vent' },
  { source: 'hydraulique', label: 'hydraulique', phrase: 'barrages et pilotage rapide' },
  { source: 'solaire', label: 'solaire', phrase: 'production visible en journee' },
  { source: 'gaz', label: 'gaz', phrase: 'renfort thermique quand la demande grimpe' },
]

interface Props {
  isolate: EnergySource | null
  onIsolate: (s: EnergySource | null) => void
  onOpen?: () => void
}

export function Legend({ isolate, onIsolate, onOpen }: Props) {
  return (
    <div className="legend-panel control-panel w-[318px] border p-3 fade-up">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="t-label text-[var(--engie-blue-soft)]">legende couleurs</div>
          <div className="t-label mt-0.5 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
            clic = toggle source
          </div>
        </div>
        {isolate && (
          <button
            type="button"
            onClick={() => onIsolate(null)}
            className="t-label border px-2 py-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            style={{ borderColor: 'var(--line-strong)' }}
          >
            tout
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {ENTRIES.map((e) => {
          const color = SOURCE_COLOR[e.source]
          const selected = isolate === e.source
          const dimmed = isolate !== null && !selected
          return (
            <button
              key={e.source}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                onOpen?.()
                onIsolate(selected ? null : e.source)
              }}
              className="legend-toggle min-w-0 border px-2 py-2 text-left"
              style={{
                borderColor: selected ? color : 'var(--line-strong)',
                background: selected ? `${color}22` : 'rgba(4,16,32,0.62)',
                opacity: dimmed ? 0.38 : 1,
              }}
              title={e.phrase}
            >
              <span className="flex min-w-0 items-center gap-2">
                <LegendMarker source={e.source} color={color} />
                <span className="t-label truncate" style={{ color }}>
                  {e.label}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LegendMarker({ source, color }: { source: EnergySource; color: string }) {
  if (source === 'nucleaire') {
    return (
      <span className="legend-marker legend-marker-hex" style={{ borderColor: 'rgba(232,244,255,0.78)' }}>
        <span className="legend-marker-ring" style={{ borderColor: color }} />
        <span className="legend-marker-dot" style={{ background: color }} />
      </span>
    )
  }

  if (source === 'eolien') {
    return (
      <span className="legend-marker legend-marker-triangle" style={{ borderBottomColor: 'rgba(232,244,255,0.78)' }}>
        <span style={{ background: color }} />
      </span>
    )
  }

  if (source === 'hydraulique') {
    return (
      <span className="legend-marker legend-marker-drop" style={{ borderColor: 'rgba(232,244,255,0.78)' }}>
        <span style={{ borderColor: color }} />
      </span>
    )
  }

  if (source === 'solaire') {
    return (
      <span className="legend-marker legend-marker-diamond" style={{ borderColor: 'rgba(232,244,255,0.78)' }}>
        <span style={{ background: color }} />
      </span>
    )
  }

  return (
    <span className="legend-marker legend-marker-square" style={{ borderColor: 'rgba(232,244,255,0.78)' }}>
      <span style={{ background: color }} />
    </span>
  )
}
