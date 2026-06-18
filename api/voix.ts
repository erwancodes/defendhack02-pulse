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

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM = `Tu es la voix sobre et factuelle du réseau électrique français.
Tu commentes en 2 phrases maximum ce qui se passe sur le réseau.
Ton style est clair pour un public non spécialiste, précis, calme, sans dramatiser.
Jamais plus de 40 mots. Jamais de questions. Jamais d'emojis.
Tu t'appuies uniquement sur les chiffres fournis.`

const SCENARIO_LABEL: Record<string, string> = {
  'no-nuclear': "L'utilisateur coupe tout le nucléaire.",
  'all-renewable': "L'utilisateur passe le réseau en 100% renouvelable.",
  'cold-wave': "L'utilisateur simule une vague de froid.",
  'heat-wave': "L'utilisateur simule une canicule à 19h.",
  'no-wind': "L'utilisateur simule une chute brutale de l'éolien.",
  'no-solar-evening': "L'utilisateur simule la disparition du solaire pendant le pic du soir.",
  'border-closed': "L'utilisateur simule une perte des interconnexions européennes.",
  'cyber-brittany': "L'utilisateur simule un incident cyber qui isole la Bretagne.",
  'disconnect-idf': "L'utilisateur déconnecte l'Île-de-France.",
}

function numberField(body: JsonRecord, key: string): number {
  const n = Number(body[key])
  return Number.isFinite(n) ? n : 0
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function actionContext(action: unknown): string {
  if (typeof action !== 'string' || !action.startsWith('scenario:')) {
    return "L'utilisateur observe l'état du réseau national en direct."
  }
  return SCENARIO_LABEL[action.slice(9)] ?? "L'utilisateur observe un scénario de crise."
}

function buildPrompt(body: JsonRecord): string {
  const consommation = numberField(body, 'consommation') || 1
  const nucleaire = numberField(body, 'nucleaire')
  const eolien = numberField(body, 'eolien')
  const solaire = numberField(body, 'solaire')
  const hydraulique = numberField(body, 'hydraulique')
  const gaz = numberField(body, 'gaz')
  const fioul = numberField(body, 'fioul')
  const charbon = numberField(body, 'charbon')
  const tauxCo2 = numberField(body, 'taux_co2')
  const prevision = numberField(body, 'prevision')
  const action = body.action

  return `DONNÉES RÉSEAU (MW)
- Nucléaire: ${nucleaire} (${pct(nucleaire, consommation)}%)
- Éolien: ${eolien} (${pct(eolien, consommation)}%)
- Solaire: ${solaire}${solaire < 200 ? ' (nuit ou faible)' : ''}
- Hydraulique: ${hydraulique} (${pct(hydraulique, consommation)}%)
- Gaz: ${gaz}
- Fioul: ${fioul}
- Charbon: ${charbon}
- Consommation: ${consommation}
${prevision > 0 ? `- Prévision: ${prevision} (écart: ${consommation - prevision} MW)` : ''}
- CO2: ${tauxCo2} gCO2/kWh

CONTEXTE
${actionContext(action)}

Réponds en français, pour une personne qui ne connaît pas l'énergie.`
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const key = process.env.OPENROUTER_KEY
  if (!key) {
    res.status(503).json({ error: 'missing_openrouter_key' })
    return
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as JsonRecord
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 7000)

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://pulse.local',
        'X-Title': 'PULSE',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 90,
        temperature: 0.55,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(body) },
        ],
      }),
    })

    if (!upstream.ok) {
      res.status(502).json({ error: 'ai_upstream_error' })
      return
    }

    const json = await upstream.json()
    const text = json?.choices?.[0]?.message?.content?.trim()
    if (typeof text !== 'string' || text.length === 0) {
      res.status(502).json({ error: 'empty_ai_response' })
      return
    }

    res.status(200).json({ text })
  } catch {
    res.status(504).json({ error: 'ai_timeout_or_network_error' })
  } finally {
    clearTimeout(timeout)
  }
}

