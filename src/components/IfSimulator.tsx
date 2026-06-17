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
        <div className="absolute bottom-full left-0 mb-2 w-72 border border-[#1e3a5f] bg-[#00000a]/95 p-3 fade-up"
          style={{ boxShadow: '0 0 24px rgba(59,130,246,0.18)' }}>
          <div className="t-label mb-3 text-[var(--text-muted)]">que se passe-t-il si...</div>
          <div className="flex flex-col gap-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onScenario(s.id)
                  setOpen(false)
                }}
                className="group flex items-center gap-2 px-1 py-1.5 text-left transition-colors hover:bg-[#0d1f3c]"
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
          className="t-label border border-[#1e3a5f] px-3 py-2 text-[var(--text-primary)] transition-all hover:border-[var(--nuclear)]"
          style={{ boxShadow: open ? '0 0 16px rgba(59,130,246,0.25)' : 'none' }}
        >
          [ et si... ]
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
