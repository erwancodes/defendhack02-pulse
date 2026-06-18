interface RequestLike {
  method?: string
  body?: unknown
}

interface ResponseLike {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
  send: (body: Buffer) => void
  setHeader: (name: string, value: string) => void
}

const ENDPOINT = 'https://api.openai.com/v1/audio/speech'
const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
const VOICE = process.env.OPENAI_TTS_VOICE || 'cedar'

function bodyText(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const text = (body as { text?: unknown }).text
  return typeof text === 'string' ? text.trim().slice(0, 900) : ''
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    res.status(503).json({ error: 'missing_openai_api_key' })
    return
  }

  const text = bodyText(req.body)
  if (!text) {
    res.status(400).json({ error: 'missing_text' })
    return
  }

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 10_000)

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        input: text,
        response_format: 'mp3',
        instructions:
          'Voix française naturelle, calme, posée, style briefing de contrôle. Articule clairement les chiffres et les unités.',
      }),
    })

    if (!upstream.ok) {
      res.status(502).json({ error: 'tts_upstream_error' })
      return
    }

    const audio = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.status(200).send(audio)
  } catch {
    res.status(504).json({ error: 'tts_timeout_or_network_error' })
  } finally {
    clearTimeout(timeout)
  }
}

