import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
}

// Effet de streaming caractère par caractère.
export function VoixReseau({ text }: Props) {
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
    <div className="flex items-start gap-3">
      <span className="t-label mt-0.5 shrink-0 text-[var(--text-muted)]">voix du réseau</span>
      <p className="t-narration text-[var(--text-primary)]">
        {shown}
        <span
          className="ml-0.5 inline-block w-2 align-middle"
          style={{
            borderBottom: '2px solid var(--nuclear)',
            opacity: typing ? 1 : 0,
            filter: 'drop-shadow(0 0 4px var(--nuclear))',
          }}
        >
          &nbsp;
        </span>
      </p>
    </div>
  )
}
