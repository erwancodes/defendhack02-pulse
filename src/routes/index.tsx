import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { fetchEcoMix, FALLBACK, type EcoMixRecord, type EnergySource } from '../lib/eco2mix'
import { genVoix } from '../lib/voix'
import { simulate, type ScenarioId } from '../lib/scenarios'
import { VOISINS, REGIONS, VIEWBOX, type RegionState, type BBox } from '../lib/regions'
import { REGION_INFO } from '../lib/regionInfo'

import { FranceMap } from '../components/FranceMap'
import { ParticleCanvas, type View } from '../components/ParticleCanvas'
import { EnergyGauges } from '../components/EnergyGauges'
import { VoixReseau } from '../components/VoixReseau'
import { IfSimulator } from '../components/IfSimulator'
import { BlackoutOverlay } from '../components/BlackoutOverlay'
import { RegionDetail } from '../components/RegionDetail'
import { SummaryScreen } from '../components/SummaryScreen'

export const Route = createFileRoute('/')({ component: Home })

const NATIONAL: View = { x: 0, y: 0, w: VIEWBOX.w, h: VIEWBOX.h }

// viewBox cible pour zoomer sur une région (ratio conservé → pas de distorsion)
function viewForBbox(bbox: BBox): View {
  const [[x0, y0], [x1, y1]] = bbox
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const A = VIEWBOX.w / VIEWBOX.h
  let bw = (x1 - x0) * 1.45
  let bh = (y1 - y0) * 1.45
  if (bw / bh > A) bh = bw / A
  else bw = bh * A
  const minW = 175
  if (bw < minW) {
    bh = bh * (minW / bw)
    bw = minW
  }
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh }
}

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

function formatHeure(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      .replace(':', 'h')
  } catch {
    return '--h--'
  }
}

// ── Hook données live ───────────────────────────────────────
function useEcoMix(): EcoMixRecord {
  const [data, setData] = useState<EcoMixRecord>(FALLBACK)
  useEffect(() => {
    let alive = true
    const load = () => fetchEcoMix().then((d) => alive && setData(d))
    load()
    const id = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return data
}

function Home() {
  const live = useEcoMix()

  const [sim, setSim] = useState<EcoMixRecord | null>(null)
  const [titre, setTitre] = useState<string | null>(null)
  const [regionStates, setRegionStates] = useState<Record<string, RegionState>>({})
  const [isolate, setIsolate] = useState<EnergySource | null>(null)
  const [voiceText, setVoiceText] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [focusedRegion, setFocusedRegion] = useState<string | null>(null)
  const [view, setView] = useState<View>(NATIONAL)

  const data = sim ?? live
  const timers = useRef<number[]>([])
  const lastInteract = useRef<number>(0)
  const viewRef = useRef<View>(NATIONAL)
  const viewRaf = useRef<number>(0)
  const viewTarget = useRef<View>(NATIONAL)
  const viewSnap = useRef<number>(0)

  // Anime le viewBox (tween rAF maison, sans lib).
  const animateView = useCallback((target: View) => {
    cancelAnimationFrame(viewRaf.current)
    clearTimeout(viewSnap.current)
    viewTarget.current = target
    const start = { ...viewRef.current }
    const t0 = performance.now()
    const dur = 720
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const e = easeInOut(p)
      const v: View = {
        x: start.x + (target.x - start.x) * e,
        y: start.y + (target.y - start.y) * e,
        w: start.w + (target.w - start.w) * e,
        h: start.h + (target.h - start.h) * e,
      }
      viewRef.current = v
      setView(v)
      if (p < 1) viewRaf.current = requestAnimationFrame(tick)
    }
    viewRaf.current = requestAnimationFrame(tick)
    // garantie de fin exacte même si le rAF est throttlé
    viewSnap.current = window.setTimeout(() => {
      if (viewTarget.current === target) {
        viewRef.current = target
        setView(target)
      }
    }, dur + 90)
  }, [])

  const focusRegion = useCallback(
    (id: string) => {
      const r = REGIONS.find((x) => x.id === id)
      if (!r) return
      lastInteract.current = Date.now()
      setFocusedRegion(id)
      setVoiceText(REGION_INFO[id]?.note ?? '')
      animateView(viewForBbox(r.bbox))
    },
    [animateView],
  )

  const unfocus = useCallback(() => {
    setFocusedRegion(null)
    animateView(NATIONAL)
  }, [animateView])

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  // Voix : calcule + pose le texte à streamer.
  const speak = useCallback(
    (action: string, src: EcoMixRecord) => {
      setVoiceText(genVoix({ data: src, action }))
    },
    [],
  )

  // Réactions du survol carte (voix uniquement).
  const onVoice = useCallback(
    (action: string) => {
      lastInteract.current = Date.now()
      if (action.startsWith('centrale:')) {
        speak(action, data)
      } else if (action.startsWith('region:') && !focusedRegion) {
        // region:Nom:conso  → commentaire réseau contextualisé
        speak('', data)
      }
    },
    [data, speak, focusedRegion],
  )

  // Commentaire réseau initial + idle toutes les 30s.
  useEffect(() => {
    if (!voiceText) setVoiceText(genVoix({ data: live }))
    const id = setInterval(() => {
      if (Date.now() - lastInteract.current > 28_000 && !sim) {
        setVoiceText(genVoix({ data: live }))
      }
    }, 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live])

  // ── Scénario "et si..." ───────────────────────────────────
  const runScenario = useCallback(
    (id: ScenarioId) => {
      clearTimers()
      lastInteract.current = Date.now()
      const result = simulate(id, live)
      setSim(result.data)
      // La voix décrit ce qui disparaît → on lui passe les données réelles.
      setVoiceText(genVoix({ data: live, action: `scenario:${id}` }))

      if (result.region) {
        // 1. stress immédiat
        setRegionStates({ [result.region]: 'stress' })

        if (result.blackout) {
          // 2. blackout + titre après 1.8s
          timers.current.push(
            window.setTimeout(() => {
              const next: Record<string, RegionState> = { [result.region!]: 'blackout' }
              setRegionStates(next)
              setTitre(result.titre)
              // 3. cascade voisins
              timers.current.push(
                window.setTimeout(() => {
                  const cascade = { ...next }
                  for (const v of VOISINS[result.region!] ?? []) cascade[v] = 'stress'
                  setRegionStates(cascade)
                }, 700),
              )
            }, 1800),
          )
        }
      }

      // 4. reset auto après 5s (rallumage)
      timers.current.push(
        window.setTimeout(() => resetSim(), 5000),
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live],
  )

  const resetSim = useCallback(() => {
    clearTimers()
    setSim(null)
    setTitre(null)
    setRegionStates({})
    setVoiceText(genVoix({ data: live }))
  }, [live])

  useEffect(() => () => clearTimers(), [])

  // Échap → sortie de la vue régionale
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedRegion) unfocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedRegion, unfocus])

  useEffect(
    () => () => {
      cancelAnimationFrame(viewRaf.current)
      clearTimeout(viewSnap.current)
    },
    [],
  )

  const simActive = sim !== null

  return (
    <div className="scanlines flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">
      {/* ── Header ── */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#0d1f3c] px-4">
        <div className="flex items-center gap-3">
          <span className="t-title" style={{ opacity: 1, color: 'var(--nuclear)', filter: 'drop-shadow(0 0 6px #3b82f6)' }}>
            pulse
          </span>
          <span className="t-label text-[var(--text-muted)]">réseau électrique français</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="t-label hidden text-[var(--text-muted)] sm:inline">
            données rte · {formatHeure(data.date_heure)}
          </span>
          <button
            onClick={() => setShowSummary(true)}
            className="t-label text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            résumé
          </button>
          <span className="t-label flex items-center gap-2 text-[var(--text-primary)]">
            {focusedRegion ? 'vue régionale' : sim ? 'simulation' : 'live'}
            <span
              className="live-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: focusedRegion
                  ? 'var(--nuclear)'
                  : sim
                    ? 'var(--alert-orange)'
                    : 'var(--alert-red)',
                boxShadow: `0 0 6px ${focusedRegion ? 'var(--nuclear)' : sim ? 'var(--alert-orange)' : 'var(--alert-red)'}`,
              }}
            />
          </span>
        </div>
      </header>

      {/* ── Corps ── */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Carte + particules */}
        <main
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          onDoubleClick={() => (focusedRegion ? unfocus() : resetSim())}
        >
          {/* boîte verrouillée au ratio de la carte → tooltips alignés au pixel */}
          <div
            className="relative h-full"
            style={{ aspectRatio: '600 / 700', maxWidth: '100%' }}
          >
            <FranceMap
              data={data}
              regionStates={regionStates}
              view={view}
              focusedRegion={focusedRegion}
              onFocus={focusRegion}
              onVoice={onVoice}
            />
            <ParticleCanvas data={data} isolate={isolate} view={view} />
            <BlackoutOverlay titre={titre} />
          </div>

          {/* Détail régional (vue zoomée) */}
          {focusedRegion &&
            (() => {
              const r = REGIONS.find((x) => x.id === focusedRegion)
              return r ? <RegionDetail region={r} onBack={unfocus} /> : null
            })()}

          {/* Simulateur en bas à gauche (masqué en vue régionale) */}
          {!focusedRegion && (
            <div className="absolute bottom-4 left-4 z-20">
              <IfSimulator onScenario={runScenario} onReset={resetSim} simActive={simActive} />
            </div>
          )}
        </main>

        {/* Panneau jauges */}
        <aside className="shrink-0 border-t border-[#0d1f3c] p-6 md:w-[360px] md:border-l md:border-t-0">
          <EnergyGauges data={data} isolate={isolate} onIsolate={setIsolate} />
        </aside>
      </div>

      {/* ── Voix du réseau ── */}
      <footer className="flex min-h-[60px] shrink-0 items-center border-t border-[#0d1f3c] px-4 py-3">
        <VoixReseau text={voiceText} />
      </footer>

      {showSummary && <SummaryScreen data={data} onClose={() => setShowSummary(false)} />}
    </div>
  )
}
