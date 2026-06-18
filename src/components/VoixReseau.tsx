import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  ia?: boolean
  audioOn?: boolean
}

// Effet de streaming caractère par caractère.
export function VoixReseau({ text, ia, audioOn = false }: Props) {
  const [shown, setShown] = useState('')
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'unavailable'>('idle')
  const timer = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => {
    setShown('')
    let i = 0
    const tick = () => {
      i++
      setShown(text.slice(0, i))
      if (i < text.length) {
        timer.current = window.setTimeout(tick, 18)
      }
    }
    timer.current = window.setTimeout(tick, 120)
    return () => window.clearTimeout(timer.current)
  }, [text])

  useEffect(() => () => {
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])

  const playAudio = async () => {
    const speechText = text.trim()
    if (!speechText || audioStatus === 'loading') return
    setAudioStatus('loading')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()

      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
      audioRef.current = null
      audioUrlRef.current = null

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioUrlRef.current = url
      audioRef.current = audio
      setAudioStatus('playing')
      audio.onended = () => {
        if (audioUrlRef.current === url) {
          URL.revokeObjectURL(url)
          audioUrlRef.current = null
          audioRef.current = null
        }
        setAudioStatus('idle')
      }
      audio.onerror = () => setAudioStatus('unavailable')
      await audio.play()
    } catch {
      setAudioStatus('unavailable')
    }
  }

  const typing = shown.length < text.length

  return (
    <div className="flex w-full items-start gap-4">
      <span className="t-label mt-0.5 shrink-0 text-[var(--engie-blue-soft)]">
        briefing réseau
        {ia && (
          <span
            className="ml-2"
            style={{ color: 'var(--text-muted)' }}
          >
            · ia
          </span>
        )}
        {audioOn && (
          <button
            type="button"
            onClick={playAudio}
            disabled={!text.trim() || audioStatus === 'loading'}
            className="t-label ml-3 border border-[var(--line-strong)] px-2 py-1 text-[var(--text-primary)] transition-colors hover:border-[var(--nuclear)] disabled:opacity-40"
          >
            {audioLabel(audioStatus)}
          </button>
        )}
      </span>
      <p className="t-narration max-w-[92ch] text-[var(--text-primary)]">
        {shown}
        <span
          className="ml-0.5 inline-block w-2 align-middle"
          style={{
            borderBottom: '2px solid var(--nuclear)',
            opacity: typing ? 1 : 0,
          }}
        >
          &nbsp;
        </span>
      </p>
    </div>
  )
}

function audioLabel(status: 'idle' | 'loading' | 'playing' | 'unavailable'): string {
  if (status === 'loading') return 'audio prépare'
  if (status === 'playing') return 'audio'
  if (status === 'unavailable') return 'audio indispo'
  return 'audio prêt'
}
