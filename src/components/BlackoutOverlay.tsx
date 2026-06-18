import { useEffect } from 'react'

interface Props {
  titre: string | null
}

export function BlackoutOverlay({ titre }: Props) {
  useEffect(() => {
    if (!titre) return
    // Oscillateur Web Audio : fréquence qui descend (coupure).
    let ctx: AudioContext | null = null
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.8)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 2)
    } catch {
      // pas de son si le contexte audio est bloqué — non critique
    }
    return () => {
      try {
        ctx?.close()
      } catch {
        /* noop */
      }
    }
  }, [titre])

  if (!titre) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center fade-up"
      style={{ background: 'radial-gradient(circle at center, rgba(239,68,68,0.08), rgba(2,8,22,0.72))' }}
    >
      <div className="text-center">
        <div
          className="t-label mb-3"
          style={{ color: 'var(--alert-red)', letterSpacing: '0.4em', animation: 'flicker 0.7s steps(2) infinite' }}
        >
          alerte réseau
        </div>
        <div
          className="font-bold"
          style={{
            fontSize: 'clamp(20px, 3.2vw, 40px)',
            color: 'var(--alert-red)',
            letterSpacing: '0.15em',
            textShadow: '0 0 24px rgba(239,68,68,0.55)',
          }}
        >
          {titre}
        </div>
      </div>
    </div>
  )
}
