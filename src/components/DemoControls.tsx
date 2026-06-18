import { useEffect, useRef, useState } from 'react'
import { Camera, Github, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react'
import type { EcoMixRecord } from '../lib/eco2mix'

interface Props {
  data: EcoMixRecord
}

type MaybeWebkitAudio = typeof window & { webkitAudioContext?: typeof AudioContext }

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export function DemoControls({ data }: Props) {
  const [audioOn, setAudioOn] = useState(false)
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement))
  const [capturing, setCapturing] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const subRef = useRef<OscillatorNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    const onFull = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])

  useEffect(() => {
    if (!audioOn) {
      try {
        ctxRef.current?.close()
      } catch {
        /* noop */
      }
      ctxRef.current = null
      oscRef.current = null
      subRef.current = null
      filterRef.current = null
      gainRef.current = null
      return
    }

    try {
      const AudioCtx = window.AudioContext || (window as MaybeWebkitAudio).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const sub = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      sub.type = 'sine'
      filter.type = 'lowpass'
      filter.frequency.value = 180
      gain.gain.value = 0.0001

      osc.connect(filter)
      sub.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      sub.start()

      ctxRef.current = ctx
      oscRef.current = osc
      subRef.current = sub
      filterRef.current = filter
      gainRef.current = gain
    } catch {
      setAudioOn(false)
    }

    return () => {
      try {
        ctxRef.current?.close()
      } catch {
        /* noop */
      }
    }
  }, [audioOn])

  useEffect(() => {
    const ctx = ctxRef.current
    const osc = oscRef.current
    const sub = subRef.current
    const filter = filterRef.current
    const gain = gainRef.current
    if (!ctx || !osc || !sub || !filter || !gain) return

    const forecast = Math.max(data.prevision ?? 0, 42_000)
    const load = Math.min(1.35, data.consommation / forecast)
    const freq = 42 + load * 48
    const cutoff = 120 + load * 260
    const volume = 0.014 + load * 0.018
    const now = ctx.currentTime

    osc.frequency.setTargetAtTime(freq, now, 0.35)
    sub.frequency.setTargetAtTime(freq / 2, now, 0.35)
    filter.frequency.setTargetAtTime(cutoff, now, 0.45)
    gain.gain.setTargetAtTime(volume, now, 0.3)
  }, [data])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      /* fullscreen can be blocked outside a user gesture */
    }
  }

  const capture = async () => {
    const target = document.querySelector('.control-room') as HTMLElement | null
    if (!target || capturing) return
    setCapturing(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(target, {
        backgroundColor: '#020816',
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        ignoreElements: (el) => el.classList?.contains('screenshot-skip') ?? false,
      })
      const link = document.createElement('a')
      link.download = `pulse-${timestamp()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      window.setTimeout(() => setCapturing(false), 450)
    }
  }

  return (
    <div className="screenshot-skip flex items-center gap-1">
      <button
        type="button"
        className="nav-icon"
        title={audioOn ? 'Couper le son ambiant' : 'Activer le son ambiant'}
        aria-label={audioOn ? 'Couper le son ambiant' : 'Activer le son ambiant'}
        data-active={audioOn}
        onClick={() => setAudioOn((v) => !v)}
      >
        {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </button>
      <button
        type="button"
        className="nav-icon"
        title={fullscreen ? 'Quitter le plein ecran' : 'Mode plein ecran'}
        aria-label={fullscreen ? 'Quitter le plein ecran' : 'Mode plein ecran'}
        data-active={fullscreen}
        onClick={toggleFullscreen}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <button
        type="button"
        className="nav-icon"
        title="Capturer l'etat actuel"
        aria-label="Capturer l'etat actuel"
        data-active={capturing}
        onClick={capture}
      >
        <Camera size={14} />
      </button>
      <a
        className="nav-icon"
        href="https://github.com/erwancodes/defendhack02-pulse"
        target="_blank"
        rel="noreferrer"
        title="Code source GitHub"
        aria-label="Code source GitHub"
      >
        <Github size={14} />
      </a>
    </div>
  )
}
