import { useState } from 'react'
import { SCENARIOS, type ScenarioId } from '../lib/scenarios'

interface Props {
  onScenario: (id: ScenarioId) => void
  onReset: () => void
  simActive: boolean
}

export function IfSimulator({ onScenario, onReset, simActive }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      {open && (
        <div className="control-panel absolute bottom-full left-0 mb-2 w-80 border p-3 fade-up">
          <div className="t-label mb-3 text-[var(--engie-blue-soft)]">simulation de crise</div>
          <div className="flex flex-col gap-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onScenario(s.id)
                  setOpen(false)
                }}
                className="group flex items-center gap-2 border border-transparent px-2 py-2 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[rgba(0,110,182,0.12)]"
              >
                <span className="text-[var(--nuclear)] opacity-60 group-hover:opacity-100">{'>'}</span>
                <span className="t-label normal-case text-[var(--text-primary)]" style={{ letterSpacing: '0.05em' }}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="nav-pill"
          style={{ borderColor: open ? 'var(--engie-blue)' : 'var(--line-strong)' }}
        >
          et si
        </button>
        {simActive && (
          <button
            onClick={onReset}
            className="t-label px-2 py-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            ↺ reset
          </button>
        )}
      </div>
    </div>
  )
}
