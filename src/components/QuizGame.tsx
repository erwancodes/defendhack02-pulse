import { useMemo, useState } from 'react'
import type { EcoMixRecord } from '../lib/eco2mix'
import { pct } from '../lib/eco2mix'

interface Option {
  label: string
  correct: boolean
}
interface Question {
  q: string
  options: Option[]
  explain: string
}

function buildQuiz(d: EcoMixRecord): Question[] {
  const total = d.consommation || 1
  const sources: [string, number][] = [
    ['le nucléaire', d.nucleaire],
    ["l'éolien", d.eolien],
    ['le solaire', d.solaire],
    ["l'hydraulique", d.hydraulique],
    ['le gaz', d.gaz],
  ]
  const dominant = [...sources].sort((a, b) => b[1] - a[1])[0]
  const exporte = (d.ech?.total ?? -1) <= 0
  const jour = d.solaire > 500
  const propre = d.taux_co2 > 0 && d.taux_co2 < 380

  return [
    {
      q: 'Quelle source domine le mix français en ce moment ?',
      options: [
        { label: 'le nucléaire', correct: dominant[0] === 'le nucléaire' },
        { label: "l'éolien", correct: dominant[0] === "l'éolien" },
        { label: 'le gaz', correct: dominant[0] === 'le gaz' },
      ],
      explain: `${dominant[0]} fournit ${pct(dominant[1], total)}% du courant — de loin la première source.`,
    },
    {
      q: 'La France, là, maintenant : elle exporte ou elle importe de l’électricité ?',
      options: [
        { label: 'elle exporte', correct: exporte },
        { label: 'elle importe', correct: !exporte },
      ],
      explain: exporte
        ? `Elle exporte ${Math.abs(d.ech?.total ?? 0).toLocaleString('fr-FR')} MW : championne européenne de l'export.`
        : `Elle importe ${Math.abs(d.ech?.total ?? 0).toLocaleString('fr-FR')} MW de ses voisins en ce moment.`,
    },
    {
      q: 'Le solaire produit-il de l’électricité en ce moment ?',
      options: [
        { label: 'oui', correct: jour },
        { label: 'non, il fait nuit', correct: !jour },
      ],
      explain: jour
        ? `Oui : ${d.solaire.toLocaleString('fr-FR')} MW. Le solaire ne marche qu'en journée.`
        : `Non : le solaire est à zéro. La nuit, le nucléaire porte le pays.`,
    },
    {
      q: 'Le mix français est-il plus propre que l’allemand (~380 gCO₂/kWh) ?',
      options: [
        { label: 'oui, bien plus', correct: propre },
        { label: 'non', correct: !propre },
      ],
      explain: propre
        ? `Oui : ${d.taux_co2} gCO₂/kWh, ~${Math.round(380 / Math.max(1, d.taux_co2))}× plus propre, grâce au nucléaire et à l'hydraulique.`
        : `Le mix est à ${d.taux_co2} gCO₂/kWh en ce moment.`,
    },
  ]
}

interface Props {
  data: EcoMixRecord
  onClose: () => void
}

export function QuizGame({ data, onClose }: Props) {
  const questions = useMemo(() => buildQuiz(data), [data])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[i]

  const choose = (idx: number) => {
    if (picked !== null) return
    setPicked(idx)
    if (q.options[idx].correct) setScore((s) => s + 1)
  }
  const next = () => {
    if (i + 1 >= questions.length) setDone(true)
    else {
      setI(i + 1)
      setPicked(null)
    }
  }
  const restart = () => {
    setI(0)
    setPicked(null)
    setScore(0)
    setDone(false)
  }

  return (
    <div className="control-room scanlines absolute inset-0 z-40 flex flex-col items-center justify-center bg-[var(--background)]/96 p-6" style={{ backdropFilter: 'blur(3px)' }}>
      <button onClick={onClose} className="absolute right-6 top-5 t-label text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">quitter ✕</button>

      {!done ? (
        <div className="control-panel w-full max-w-[560px] border p-6">
          <div className="t-label mb-2 text-[var(--engie-blue-soft)]">devine le mix · question {i + 1}/{questions.length}</div>
          <div className="t-narration not-italic mb-6 text-[var(--text-primary)]" style={{ fontSize: 17, lineHeight: 1.5 }}>{q.q}</div>

          <div className="flex flex-col gap-3">
            {q.options.map((o, idx) => {
              const revealed = picked !== null
              const isPicked = picked === idx
              const color = !revealed
                ? '#1e3a5f'
                : o.correct
                  ? 'var(--wind)'
                  : isPicked
                    ? 'var(--alert-red)'
                    : '#1e3a5f'
              return (
                <button
                  key={idx}
                  onClick={() => choose(idx)}
                  disabled={revealed}
                  className="border px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: color,
                    color: revealed && (o.correct || isPicked) ? color : 'var(--text-primary)',
                    opacity: revealed && !o.correct && !isPicked ? 0.5 : 1,
                  }}
                >
                  <span className="t-label normal-case" style={{ fontSize: 14, letterSpacing: '0.03em' }}>{o.label}</span>
                </button>
              )
            })}
          </div>

          {picked !== null && (
            <div className="mt-5 fade-up">
              <p className="t-narration text-[var(--text-primary)]" style={{ fontSize: 13, lineHeight: 1.5 }}>{q.explain}</p>
              <button onClick={next} className="mt-4 t-label border border-[var(--nuclear)] px-4 py-2 text-[var(--nuclear)] transition-colors hover:bg-[var(--nuclear)] hover:text-[var(--background)]">
                {i + 1 >= questions.length ? 'voir le score' : 'suivant →'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="control-panel flex flex-col items-center gap-4 border p-8 text-center">
          <div className="t-label text-[var(--engie-blue-soft)]">devine le mix</div>
          <div className="t-num" style={{ fontSize: 44, color: 'var(--nuclear)' }}>
            {score}/{questions.length}
          </div>
          <div className="t-narration not-italic text-[var(--text-primary)]" style={{ maxWidth: 380, lineHeight: 1.6 }}>
            {score === questions.length
              ? 'Sans faute — tu lis le réseau comme un pro.'
              : score >= questions.length / 2
                ? 'Pas mal ! Tu commences à comprendre le réseau français.'
                : 'Le réseau français a ses secrets — réessaie en regardant la carte.'}
          </div>
          <div className="flex gap-3">
            <button onClick={restart} className="t-label border border-[var(--nuclear)] px-4 py-2 text-[var(--nuclear)] transition-colors hover:bg-[var(--nuclear)] hover:text-[var(--background)]">rejouer</button>
            <button onClick={onClose} className="t-label border border-[var(--line-strong)] px-4 py-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">quitter</button>
          </div>
        </div>
      )}
    </div>
  )
}
