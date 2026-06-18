interface Props {
  step: number
  total: number
  text: string
  onSkip: () => void
}

export function TourGuide({ step, total, text, onSkip }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center">
      <div
        className="control-panel pointer-events-auto w-[480px] max-w-[90%] border p-5 fade-up"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="t-label text-[var(--engie-blue-soft)]">
            visite guidée · {step + 1}/{total}
          </span>
          <button onClick={onSkip} className="t-label text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            passer ✕
          </button>
        </div>

        <p key={step} className="t-narration not-italic fade-up text-[var(--text-primary)]" style={{ fontSize: 14, lineHeight: 1.55 }}>
          {text}
        </p>

        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="h-0.5 flex-1"
              style={{
                background: i <= step ? 'var(--nuclear)' : '#1e3a5f',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
