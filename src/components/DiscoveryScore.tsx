import { useEffect, useRef, useState } from 'react'

interface Props {
  count: number
  total: number
  last: string | null
}

export function DiscoveryScore({ count, total, last }: Props) {
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number>(0)

  useEffect(() => {
    if (!last) return
    setToast(last)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(timer.current)
  }, [last, count])

  const done = count >= total

  return (
    <div className="relative flex flex-col items-center">
      {toast && (
        <div
          key={count}
          className="control-panel absolute bottom-full mb-2 whitespace-nowrap border px-3 py-1.5 fade-up"
        >
          <span className="t-label" style={{ color: 'var(--engie-blue-soft)' }}>+1 · {toast}</span>
        </div>
      )}

      <div className="control-panel flex items-center gap-2 border px-3 py-1.5">
        <span className="t-label text-[var(--text-muted)]">{done ? 'réseau compris' : 'tu découvres'}</span>
        <div className="h-1 w-16 bg-[var(--surface-2)]">
          <div
            className="gauge-fill h-full"
            style={{ width: `${(count / total) * 100}%`, background: done ? 'var(--wind)' : 'var(--nuclear)' }}
          />
        </div>
        <span className="t-num tabular-nums" style={{ fontSize: 13, color: done ? 'var(--wind)' : 'var(--text-primary)' }}>
          {count}/{total}
        </span>
      </div>
    </div>
  )
}
