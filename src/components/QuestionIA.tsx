import { useEffect, useRef, useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'

interface Props {
  data: EcoMixRecord
  onClose: () => void
}

type CallState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}

interface SpeechRecognitionEventLike {
  readonly results: {
    readonly length: number
    readonly [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

export function QuestionIA({ data, onClose }: Props) {
  const [state, setState] = useState<CallState>('idle')
  const [lastQuestion, setLastQuestion] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  useEffect(() => () => {
    recognitionRef.current?.stop()
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])

  const askAndSpeak = async (question: string) => {
    setState('thinking')
    try {
      const askRes = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, question }),
      })
      if (!askRes.ok) throw new Error(`ask ${askRes.status}`)
      const askJson = await askRes.json()
      const answer = typeof askJson.answer === 'string' ? askJson.answer.trim() : ''
      if (!answer) throw new Error('empty answer')

      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer }),
      })
      if (!ttsRes.ok) throw new Error(`tts ${ttsRes.status}`)
      const blob = await ttsRes.blob()

      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audioUrlRef.current = url
      setState('speaking')
      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (audioUrlRef.current === url) audioUrlRef.current = null
        setState('idle')
      }
      audio.onerror = () => setState('error')
      await audio.play()
    } catch {
      setState('error')
    }
  }

  const startListening = () => {
    if (state === 'listening' || state === 'thinking') return
    const SpeechCtor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition
    if (!SpeechCtor) {
      setState('error')
      return
    }

    audioRef.current?.pause()
    const recognition = new SpeechCtor()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    setLastQuestion('')
    setState('listening')

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result?.isFinal) transcript += result[0].transcript
      }
      const question = transcript.trim()
      if (!question) {
        setState('idle')
        return
      }
      setLastQuestion(question)
      void askAndSpeak(question)
    }
    recognition.onerror = () => setState('error')
    recognition.onend = () => {
      setState((current) => (current === 'listening' ? 'idle' : current))
    }
    recognition.start()
  }

  const stop = () => {
    recognitionRef.current?.stop()
    audioRef.current?.pause()
    setState('idle')
  }

  return (
    <div className="control-panel absolute right-4 top-20 z-50 w-[360px] max-w-[calc(100vw-2rem)] border p-5 text-center fade-up">
      <div className="mb-4 flex items-center justify-between gap-3 text-left">
        <div>
          <div className="t-label text-[var(--engie-blue-soft)]">appel IA</div>
          <div className="t-label mt-1 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.03em' }}>
            conversation vocale sur le réseau
          </div>
        </div>
        <button onClick={onClose} className="t-label text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          fermer
        </button>
      </div>

      <button
        onClick={state === 'listening' || state === 'speaking' ? stop : startListening}
        className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border text-[var(--text-primary)] transition-colors"
        style={{
          borderColor: state === 'listening' ? 'var(--alert-red)' : state === 'speaking' ? 'var(--wind)' : 'var(--nuclear)',
          background:
            state === 'listening'
              ? 'rgba(239,68,68,0.16)'
              : state === 'speaking'
                ? 'rgba(34,197,94,0.14)'
                : 'rgba(0,166,214,0.12)',
        }}
      >
        <span className="t-label" style={{ fontSize: 12 }}>
          {buttonLabel(state)}
        </span>
      </button>

      <div className="t-label mt-5 text-[var(--text-muted)]" style={{ minHeight: 18 }}>
        {statusLabel(state)}
      </div>
      {lastQuestion && (
        <div className="t-label mt-3 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>
          question reçue
        </div>
      )}
    </div>
  )
}

function buttonLabel(state: CallState): string {
  if (state === 'listening') return 'stop'
  if (state === 'thinking') return '...'
  if (state === 'speaking') return 'stop'
  return 'parler'
}

function statusLabel(state: CallState): string {
  if (state === 'listening') return 'je t écoute'
  if (state === 'thinking') return 'analyse du réseau'
  if (state === 'speaking') return 'réponse audio'
  if (state === 'error') return 'micro ou IA indisponible'
  return 'appuie puis pose ta question'
}

