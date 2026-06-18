import { useEffect, useMemo, useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'
import { funFacts } from '../lib/pedago'

interface Props {
  data: EcoMixRecord
}

export function DidYouKnow({ data }: Props) {
  const facts = useMemo(() => funFacts(data), [data])
  const [i, setI] = useState(0)

  // rotation automatique
  useEffect(() => {
    if (facts.length < 2) return
    const id = setInterval(() => setI((p) => p + 1), 18_000)
    return () => clearInterval(id)
  }, [facts.length])

  if (facts.length === 0) return null
  const fact = facts[i % facts.length]

  return (
    <button
      onClick={() => setI((p) => p + 1)}
      className="control-panel block w-[280px] border p-3 text-left transition-colors hover:border-[var(--engie-blue)]"
      title="cliquer pour le fait suivant"
    >
      <div className="t-label mb-1.5 flex items-center gap-2" style={{ color: 'var(--engie-blue-soft)' }}>
        <span className="h-1.5 w-1.5 bg-[var(--engie-blue)]" />
        signal utile
      </div>
      <p
        key={i % facts.length}
        className="t-narration not-italic fade-up text-[var(--text-primary)]"
        style={{ fontSize: 12, lineHeight: 1.5 }}
      >
        {fact}
      </p>
    </button>
  )
}
