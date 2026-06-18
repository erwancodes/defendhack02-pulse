// ── Voix IA réelle (OpenRouter / gpt-4o-mini) ───────────────
// Optionnelle : si VITE_OPENROUTER_KEY est absente, renvoie null et
// l'appelant retombe sur la voix locale (genVoix). Ne casse jamais la démo.
import type { EcoMixRecord } from './eco2mix'
import { pct } from './eco2mix'

const KEY = import.meta.env.VITE_OPENROUTER_KEY as string | undefined
const MODEL = 'openai/gpt-4o-mini'
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export const AI_ENABLED = Boolean(KEY)

const SYSTEM = `Tu es la voix sobre et factuelle du réseau électrique français.
Tu commentes en 2-3 phrases maximum ce qui se passe sur le réseau en ce moment.
Ton style : informatif, calme, précis. Pas dramatique. Pas pédant.
Jamais plus de 40 mots. Jamais de questions. Jamais d'emojis.
Tu parles au présent, à la deuxième personne ("vous regardez", "le réseau").
Tu t'appuies UNIQUEMENT sur les chiffres fournis. Tu ne salues pas.`

function heure(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

const SCENARIO_LABEL: Record<string, string> = {
  'no-nuclear': "L'utilisateur coupe tout le nucléaire. Commente la conséquence.",
  'all-renewable': "L'utilisateur passe le réseau en 100% renouvelable. Commente la conséquence.",
  'cold-wave': "L'utilisateur simule une vague de froid (-10°C). Commente la conséquence.",
  'heat-wave': "L'utilisateur simule une canicule à 19h. Commente la conséquence.",
  'no-wind': "L'utilisateur simule une chute brutale de l'éolien. Commente la conséquence.",
  'no-solar-evening': "L'utilisateur simule la disparition du solaire pendant le pic du soir. Commente la conséquence.",
  'border-closed': "L'utilisateur simule une perte des interconnexions européennes. Commente la conséquence.",
  'cyber-brittany': "L'utilisateur simule un incident cyber qui isole la Bretagne. Commente la conséquence.",
  'disconnect-idf': "L'utilisateur déconnecte l'Île-de-France. Commente la conséquence.",
}

function userPrompt(data: EcoMixRecord, action?: string): string {
  const total = data.consommation || 1
  let ctx = "L'utilisateur observe l'état du réseau national en ce moment."
  if (action?.startsWith('scenario:')) ctx = SCENARIO_LABEL[action.slice(9)] ?? ctx
  return `DONNÉES ACTUELLES (MW) :
- Nucléaire : ${data.nucleaire} (${pct(data.nucleaire, total)}%)
- Éolien : ${data.eolien} (${pct(data.eolien, total)}%)
- Solaire : ${data.solaire}${data.solaire < 200 ? ' (nuit)' : ''}
- Hydraulique : ${data.hydraulique} (${pct(data.hydraulique, total)}%)
- Gaz : ${data.gaz} · Fioul : ${data.fioul} · Charbon : ${data.charbon}
- Consommation totale : ${data.consommation}${
    data.prevision ? ` (prévue : ${data.prevision}, écart ${data.consommation - data.prevision} MW)` : ''
  }
- CO2 : ${data.taux_co2} gCO₂/kWh
- Heure : ${heure(data.date_heure)}

CONTEXTE : ${ctx}`
}

export async function genVoixAI(
  data: EcoMixRecord,
  action?: string,
): Promise<string | null> {
  if (!KEY) return null
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
        'HTTP-Referer': 'https://pulse.local',
        'X-Title': 'PULSE',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 90,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt(data, action) },
        ],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content?.trim()
    return typeof text === 'string' && text.length > 0 ? text : null
  } catch {
    return null
  } finally {
    clearTimeout(to)
  }
}
