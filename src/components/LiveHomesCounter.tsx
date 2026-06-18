import { useEffect, useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'
import { foyers } from '../lib/eco2mix'

interface Props {
  data: EcoMixRecord
  simpleMode?: boolean
}

export function LiveHomesCounter({ data, simpleMode = false }: Props) {
  const target = foyers(data.consommation)
  const [value, setValue] = useState(target)

  useEffect(() => {
    const start = value
    const diff = target - start
    if (Math.abs(diff) < 10) return

    let raf = 0
    const t0 = performance.now()
    const duration = 950
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(start + diff * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // value is intentionally captured as animation start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return (
    <div className="live-homes control-panel min-w-[250px] border px-4 py-3 text-center fade-up">
      <div className="t-label text-[var(--engie-blue-soft)]">
        {simpleMode ? "ce que ça représente" : 'foyers alimentes maintenant'}
      </div>
      <div className="live-homes-num tabular-nums">
        {value.toLocaleString('fr-FR')}
      </div>
      <div className="t-label text-[var(--text-muted)]">
        {simpleMode
          ? `la France utilise ${data.consommation.toLocaleString('fr-FR')} MW en ce moment`
          : `estimation live depuis ${data.consommation.toLocaleString('fr-FR')} MW`}
      </div>
    </div>
  )
}
