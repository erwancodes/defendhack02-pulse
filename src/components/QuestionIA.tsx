import { useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'

interface Props {
  data: EcoMixRecord
  onClose: () => void
}

const EXAMPLES = [
  'Pourquoi le nucléaire est important maintenant ?',
  'Est-ce que le réseau est sous tension ?',
  'Pourquoi le solaire baisse le soir ?',
]

export function QuestionIA({ data, onClose }: Props) {
  const [question, setQuestion] = useState(EXAMPLES[0])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')

  const ask = async () => {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, question: q }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setAnswer(typeof json.answer === 'string' ? json.answer : '')
    } catch {
      setAnswer("Je n'arrive pas à joindre l'IA. Les données live restent visibles sur la carte.")
    } finally {
      setLoading(false)
    }
  }

  const playAnswer = async () => {
    if (!answer.trim() || audioStatus === 'loading') return
    setAudioStatus('loading')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: answer }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setAudioStatus('playing')
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setAudioStatus('idle')
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setAudioStatus('error')
      }
      await audio.play()
    } catch {
      setAudioStatus('error')
    }
  }

  return (
    <div className="control-panel absolute right-4 top-20 z-50 w-[430px] max-w-[calc(100vw-2rem)] border p-4 fade-up">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="t-label text-[var(--engie-blue-soft)]">question IA</div>
          <div className="t-label mt-1 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.03em' }}>
            pose une question sur le réseau français
          </div>
        </div>
        <button onClick={onClose} className="t-label text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          fermer
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuestion(ex)}
            className="t-label border border-[var(--line-strong)] px-2 py-1 normal-case text-[var(--text-muted)] hover:border-[var(--nuclear)] hover:text-[var(--text-primary)]"
            style={{ letterSpacing: '0.02em' }}
          >
            {ex}
          </button>
        ))}
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="min-h-24 w-full resize-none border border-[var(--line-strong)] bg-[rgba(2,8,22,0.92)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--nuclear)]"
        placeholder="Ex: Pourquoi la France exporte de l'électricité ?"
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="nav-pill"
          style={{
            borderColor: loading ? 'var(--line-strong)' : 'var(--nuclear)',
            color: 'var(--text-primary)',
          }}
        >
          {loading ? 'analyse...' : 'demander'}
        </button>
        {answer && (
          <button
            onClick={playAnswer}
            disabled={audioStatus === 'loading'}
            className="t-label border border-[var(--line-strong)] px-3 py-2 text-[var(--text-primary)] hover:border-[var(--nuclear)] disabled:opacity-50"
          >
            {audioStatus === 'loading' ? 'audio...' : audioStatus === 'playing' ? 'lecture' : 'écouter'}
          </button>
        )}
      </div>

      {answer && (
        <div className="mt-4 border-t border-[var(--line-strong)] pt-4">
          <div className="t-label mb-2 text-[var(--text-muted)]">réponse</div>
          <p className="t-narration not-italic text-[var(--text-primary)]" style={{ fontSize: 14, lineHeight: 1.6 }}>
            {answer}
          </p>
        </div>
      )}
    </div>
  )
}

