import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  ia?: boolean
}

// Effet de streaming caractère par caractère.
export function VoixReseau({ text, ia }: Props) {
  const [shown, setShown] = useState('')
  const timer = useRef<number>(0)

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
