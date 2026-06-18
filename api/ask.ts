type JsonRecord = Record<string, unknown>

interface RequestLike {
  method?: string
  body?: unknown
}

interface ResponseLike {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const ENDPOINT = 'https://api.openai.com/v1/responses'
const MODEL = process.env.OPENAI_ASK_MODEL || 'gpt-4.1-mini'

function numberField(body: JsonRecord, key: string): number {
  const n = Number(body[key])
  return Number.isFinite(n) ? n : 0
}

function textField(body: JsonRecord, key: string): string {
  const v = body[key]
  return typeof v === 'string' ? v.trim().slice(0, 700) : ''
}

function networkContext(body: JsonRecord): string {
  return `Données live RTE disponibles:
- Consommation: ${numberField(body, 'consommation')} MW
- Nucléaire: ${numberField(body, 'nucleaire')} MW
- Éolien: ${numberField(body, 'eolien')} MW
- Solaire: ${numberField(body, 'solaire')} MW
- Hydraulique: ${numberField(body, 'hydraulique')} MW
- Gaz: ${numberField(body, 'gaz')} MW
- Fioul: ${numberField(body, 'fioul')} MW
- Charbon: ${numberField(body, 'charbon')} MW
- CO2: ${numberField(body, 'taux_co2')} gCO2/kWh
- Prévision consommation: ${numberField(body, 'prevision') || 'non disponible'} MW`
}

function outputText(json: JsonRecord): string {
  if (typeof json.output_text === 'string') return json.output_text.trim()
  const output = Array.isArray(json.output) ? json.output : []
  for (const item of output) {
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      const text = (part as { text?: unknown }).text
      if (typeof text === 'string' && text.trim()) return text.trim()
    }
  }
  return ''
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

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as JsonRecord
  const question = textField(body, 'question')
  if (!question) {
    res.status(400).json({ error: 'missing_question' })
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
        max_output_tokens: 260,
        temperature: 0.45,
        instructions:
          "Tu réponds en français sur le réseau électrique français. Réponse courte, claire, pédagogique, pour non-spécialiste. Si la question sort du sujet énergie/réseau, ramène poliment vers le réseau électrique. N'invente pas de données temps réel autres que celles fournies.",
        input: `${networkContext(body)}

Question utilisateur:
${question}`,
      }),
    })

    if (!upstream.ok) {
      res.status(502).json({ error: 'ask_upstream_error' })
      return
    }

    const json = await upstream.json()
    const answer = outputText(json)
    if (!answer) {
      res.status(502).json({ error: 'empty_answer' })
      return
    }

    res.status(200).json({ answer })
  } catch {
    res.status(504).json({ error: 'ask_timeout_or_network_error' })
  } finally {
    clearTimeout(timeout)
  }
}

