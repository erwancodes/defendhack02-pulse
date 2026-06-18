// ── Voix IA réelle ─────────────────────────────────────────
// Le navigateur appelle /api/voix. La clé OpenRouter reste côté serveur.
// Si l'endpoint manque, timeout ou répond en erreur, l'appelant retombe sur
// la voix locale (genVoix). La démo ne casse jamais.
import type { EcoMixRecord } from './eco2mix'

export const AI_ENABLED = true

export async function genVoixAI(
  data: EcoMixRecord,
  action?: string,
): Promise<string | null> {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch('/api/voix', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        action,
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const text = json?.text?.trim()
    return typeof text === 'string' && text.length > 0 ? text : null
  } catch {
    return null
  } finally {
    clearTimeout(to)
  }
}
