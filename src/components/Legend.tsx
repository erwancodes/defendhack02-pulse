import { useState } from 'react'
import type { EnergySource } from '../lib/eco2mix'
import { SOURCE_COLOR } from '../lib/eco2mix'

const ENTRIES: { source: EnergySource; symbol: string; label: string; phrase: string }[] = [
  { source: 'nucleaire', symbol: '◉', label: 'nucléaire', phrase: 'la colonne vertébrale — 24h/24, sans carbone' },
  { source: 'eolien', symbol: '◈', label: 'éolien', phrase: 'quand le vent souffle — propre mais intermittent' },
  { source: 'hydraulique', symbol: '◇', label: 'hydraulique', phrase: "l'eau des barrages — souple, à la demande" },
  { source: 'solaire', symbol: '○', label: 'solaire', phrase: 'le jour seulement — absent la nuit' },
  { source: 'gaz', symbol: '◐', label: 'gaz', phrase: 'le renfort fossile — quand la demande grimpe' },
]

interface Props {
  isolate: EnergySource | null
  onIsolate: (s: EnergySource | null) => void
  onOpen?: () => void
}

export function Legend({ isolate, onIsolate, onOpen }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={() => setOpen((o) => { if (!o) onOpen?.(); return !o })}
        className="control-panel flex h-8 w-8 items-center justify-center border text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        style={{
          borderColor: open ? 'var(--nuclear)' : '#1e3a5f',
          color: open ? 'var(--nuclear)' : undefined,
        }}
        aria-label="comment lire la carte"
      >
        ?
      </button>

      {open && (
        <div
          className="control-panel w-[306px] border p-4 fade-up"
        >
          <div className="t-label mb-3 text-[var(--engie-blue-soft)]">lecture de la carte</div>

          <div className="flex flex-col gap-2.5">
            {ENTRIES.map((e) => {
              const color = SOURCE_COLOR[e.source]
              const selected = isolate === e.source
              const dimmed = isolate !== null && !selected
              return (
                <button
                  key={e.source}
                  onClick={() => onIsolate(selected ? null : e.source)}
                  className="block w-full text-left transition-opacity"
                  style={{ opacity: dimmed ? 0.4 : 1 }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color, filter: `drop-shadow(0 0 4px ${color})` }}>{e.symbol}</span>
                    <span className="t-label" style={{ color }}>
                      {e.label}
                    </span>
                    {selected && <span className="t-label text-[var(--text-muted)]">· isolé</span>}
                  </div>
                  <div className="t-label mt-0.5 pl-6 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
                    {e.phrase}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-3 border-t border-[var(--line-strong)] pt-3">
            <div className="t-label normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em', lineHeight: 1.5 }}>
              les points qui filent = l'énergie qui circule sur le réseau · les flèches aux
              bords = les échanges avec l'Europe · clique une source pour l'isoler
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
