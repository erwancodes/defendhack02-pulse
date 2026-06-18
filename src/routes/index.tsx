import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import {
  fetchEcoMix,
  fetchHistory,
  fetchRegional,
  FALLBACK,
  type EcoMixRecord,
  type EnergySource,
  type RegionalRecord,
} from '../lib/eco2mix'
import { genVoix } from '../lib/voix'
import { genVoixAI, AI_ENABLED } from '../lib/voixAI'
import { simulate, type ScenarioId } from '../lib/scenarios'
import { VOISINS, REGIONS, VIEWBOX, type RegionState, type BBox, type Centrale } from '../lib/regions'
import { DEPARTEMENTS } from '../lib/departements'
import { FRANCE_CENTROID } from '../lib/europe'
import { electronDestination, type Dest } from '../lib/electron'
import { REGION_INFO } from '../lib/regionInfo'
import { fetchMajorCities, type MajorCity } from '../lib/cities'

import { FranceMap, type MapMode } from '../components/FranceMap'
import { ParticleCanvas, type View } from '../components/ParticleCanvas'
import { EnergyGauges } from '../components/EnergyGauges'
import { VoixReseau } from '../components/VoixReseau'
import { IfSimulator } from '../components/IfSimulator'
import { TimeMachine } from '../components/TimeMachine'
import { BlackoutOverlay } from '../components/BlackoutOverlay'
import { BorderFlows } from '../components/BorderFlows'
import { RegionDetail } from '../components/RegionDetail'
import { DepartmentDetail } from '../components/DepartmentDetail'
import { Legend } from '../components/Legend'
import { DidYouKnow } from '../components/DidYouKnow'
import { BalanceGame } from '../components/BalanceGame'
import { QuizGame } from '../components/QuizGame'
import { ElectronJourney } from '../components/ElectronJourney'
import { PersoImpact } from '../components/PersoImpact'
import { TourGuide } from '../components/TourGuide'
import { DiscoveryScore } from '../components/DiscoveryScore'
import { SummaryScreen } from '../components/SummaryScreen'
import { LiveHomesCounter } from '../components/LiveHomesCounter'
import { DemoControls } from '../components/DemoControls'
import { QuestionIA } from '../components/QuestionIA'

const FACETS: Record<string, string> = {
  centrale: 'une centrale survolée',
  region: 'une région explorée',
  dept: 'un département ouvert',
  scenario: 'un scénario « et si »',
  timemachine: 'le rejeu des 24 h',
  isolate: 'une source isolée',
  legend: 'la clé de lecture',
  electron: 'un électron suivi',
  balance: "le jeu d'équilibre",
  quiz: 'le quiz du mix',
  perso: 'ton impact perso',
  summary: 'le bilan du soir',
}
const TOTAL_FACETS = Object.keys(FACETS).length
const MAP_MODES: { id: MapMode; label: string }[] = [
  { id: 'mix', label: 'Mix' },
  { id: 'consommation', label: 'Conso' },
  { id: 'co2', label: 'CO2' },
  { id: 'production', label: 'Prod' },
  { id: 'tension', label: 'Solde' },
]

export const Route = createFileRoute('/')({ component: Home })

// Vue nationale centrée sur la France, au ratio EXACT du conteneur (aspect)
// → la carte remplit toute la zone, aucun letterbox / espace vide.
function nationalView(aspect: number): View {
  const h = VIEWBOX.h
  const w = Math.max(VIEWBOX.h * 0.6, h * aspect)
  return { x: FRANCE_CENTROID[0] - w / 2, y: FRANCE_CENTROID[1] - h / 2, w, h }
}

// viewBox cible pour zoomer sur une région, au ratio du conteneur (pas de distorsion)
function viewForBbox(bbox: BBox, aspect: number): View {
  const [[x0, y0], [x1, y1]] = bbox
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  let bw = (x1 - x0) * 1.45
  let bh = (y1 - y0) * 1.45
  if (bw / bh > aspect) bh = bw / aspect
  else bw = bh * aspect
  const minH = 200
  if (bh < minH) {
    bw = bw * (minH / bh)
    bh = minH
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
  const rootRef = useRef<HTMLDivElement>(null)

  const [sim, setSim] = useState<EcoMixRecord | null>(null)
  const [titre, setTitre] = useState<string | null>(null)
  const [regionStates, setRegionStates] = useState<Record<string, RegionState>>({})
  const [isolate, setIsolate] = useState<EnergySource | null>(null)
  const [voiceText, setVoiceText] = useState('')
  const [voiceIA, setVoiceIA] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showQuestionIA, setShowQuestionIA] = useState(false)
  const [simpleMode, setSimpleMode] = useState(false)
  const [mapMode, setMapMode] = useState<MapMode>('mix')
  const [regionalRecords, setRegionalRecords] = useState<Record<string, RegionalRecord | null>>({})
  const [game, setGame] = useState<'balance' | 'quiz' | null>(null)
  const [gameMenu, setGameMenu] = useState(false)
  const [electron, setElectron] = useState<{ centrale: Centrale; dest: Dest } | null>(null)
  const electronTimer = useRef<number>(0)
  const [tour, setTour] = useState<number | null>(null)
  const tourTimer = useRef<number>(0)
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [lastDiscovery, setLastDiscovery] = useState<string | null>(null)
  const discoveredRef = useRef<Set<string>>(new Set())
  const [cursorHidden, setCursorHidden] = useState(false)
  const idleCursorTimer = useRef<number>(0)

  const discover = useCallback((key: string) => {
    if (discoveredRef.current.has(key)) return
    discoveredRef.current.add(key)
    setDiscovered(new Set(discoveredRef.current))
    setLastDiscovery(FACETS[key] ?? key)
  }, [])

  const wakeCursor = useCallback(() => {
    setCursorHidden(false)
    clearTimeout(idleCursorTimer.current)
    idleCursorTimer.current = window.setTimeout(() => setCursorHidden(true), 3000)
  }, [])

  const handleIsolate = useCallback(
    (s: EnergySource | null) => {
      setIsolate(s)
      if (s) discover('isolate')
    },
    [discover],
  )
  const [focusedRegion, setFocusedRegion] = useState<string | null>(null)
  const [focusedDept, setFocusedDept] = useState<string | null>(null)
  const [deptCities, setDeptCities] = useState<MajorCity[]>([])
  const [selectedCity, setSelectedCity] = useState<MajorCity | null>(null)
  // ratio réel de la zone carte (mesuré) → le viewBox l'épouse, zéro letterbox
  const [boxAspect, setBoxAspect] = useState(VIEWBOX.w / VIEWBOX.h)
  const mapBoxRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>(() => nationalView(VIEWBOX.w / VIEWBOX.h))

  const [timeMachine, setTimeMachine] = useState(false)
  const [history, setHistory] = useState<EcoMixRecord[]>([])
  const [histIndex, setHistIndex] = useState(0)
  const [histLoading, setHistLoading] = useState(false)
  const [playing, setPlaying] = useState(false)

  // frame historique > simulation > live
  const frame =
    timeMachine && history.length > 0 ? history[Math.min(histIndex, history.length - 1)] : null
  const data = frame ?? sim ?? live

  const timers = useRef<number[]>([])
  const lastInteract = useRef<number>(0)
  const voiceReq = useRef<number>(0)
  const viewRef = useRef<View>(nationalView(VIEWBOX.w / VIEWBOX.h))
  const viewRaf = useRef<number>(0)
  const viewTarget = useRef<View>(nationalView(VIEWBOX.w / VIEWBOX.h))
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

  // Pose un texte direct (invalide toute requête IA en cours).
  const setVoice = useCallback((text: string) => {
    voiceReq.current++
    setVoiceIA(false)
    setVoiceText(text)
  }, [])

  const focusRegion = useCallback(
    (id: string) => {
      const r = REGIONS.find((x) => x.id === id)
      if (!r) return
      lastInteract.current = Date.now()
      setFocusedRegion(id)
      setFocusedDept(null)
      setDeptCities([])
      setSelectedCity(null)
      setVoice(REGION_INFO[id]?.note ?? '')
      animateView(viewForBbox(r.bbox, boxAspect))
      discover('region')
    },
    [animateView, setVoice, boxAspect, discover],
  )

  const focusDept = useCallback(
    (code: string) => {
      const d = DEPARTEMENTS.find((x) => x.code === code)
      if (!d) return
      lastInteract.current = Date.now()
      setFocusedRegion(d.region)
      setFocusedDept(code)
      setSelectedCity(null)
      animateView(viewForBbox(d.bbox, boxAspect))
      discover('dept')
    },
    [animateView, boxAspect, discover],
  )

  // Retour contextuel : département → région → national.
  const goBack = useCallback(() => {
    if (focusedDept) {
      const d = DEPARTEMENTS.find((x) => x.code === focusedDept)
      setFocusedDept(null)
      setDeptCities([])
      setSelectedCity(null)
      const r = d && REGIONS.find((x) => x.id === d.region)
      if (r) {
        setVoice(REGION_INFO[r.id]?.note ?? '')
        animateView(viewForBbox(r.bbox, boxAspect))
      }
    } else if (focusedRegion) {
      setFocusedRegion(null)
      animateView(nationalView(boxAspect))
    }
  }, [focusedDept, focusedRegion, animateView, setVoice, boxAspect])

  const backToRegion = useCallback(() => goBack(), [goBack])

  const unfocus = useCallback(() => {
    setFocusedDept(null)
    setFocusedRegion(null)
    setDeptCities([])
    setSelectedCity(null)
    animateView(nationalView(boxAspect))
  }, [animateView, boxAspect])

  // « Suis un électron » : zoome sur le trajet centrale → ville.
  const startElectron = useCallback(
    (c: Centrale) => {
      if (focusedRegion || focusedDept) return
      clearTimeout(electronTimer.current)
      const dest = electronDestination(c)
      setElectron({ centrale: c, dest })
      lastInteract.current = Date.now()
      discover('electron')
      const bbox: BBox = [
        [Math.min(c.x, dest.x), Math.min(c.y, dest.y)],
        [Math.max(c.x, dest.x), Math.max(c.y, dest.y)],
      ]
      animateView(viewForBbox(bbox, boxAspect))
      electronTimer.current = window.setTimeout(() => {
        setElectron(null)
        animateView(nationalView(boxAspect))
      }, 6500)
    },
    [animateView, boxAspect, focusedRegion, focusedDept, discover],
  )

  // ── Time machine (rejeu des dernières 24 h) ───────────────
  const openTimeMachine = useCallback(() => {
    // sort de tout mode en cours
    clearTimers()
    setSim(null)
    setTitre(null)
    setRegionStates({})
    setFocusedRegion(null)
    setFocusedDept(null)
    setDeptCities([])
    setSelectedCity(null)
    animateView(nationalView(boxAspect))
    setTimeMachine(true)
    discover('timemachine')
    setVoice(
      'Vous remontez les dernières 24 heures du réseau. Regardez le solaire se lever, culminer à midi, puis s’éteindre.',
    )
    if (history.length === 0) {
      setHistLoading(true)
      fetchHistory().then((h) => {
        setHistory(h)
        setHistIndex(h.length - 1)
        setHistLoading(false)
        setPlaying(h.length > 1)
      })
    } else {
      setPlaying(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateView, history.length, boxAspect])

  const closeTimeMachine = useCallback(() => {
    setTimeMachine(false)
    setPlaying(false)
  }, [])

  // avance automatique
  useEffect(() => {
    if (!timeMachine || !playing || history.length < 2) return
    const id = setInterval(() => {
      setHistIndex((i) => (i >= history.length - 1 ? 0 : i + 1))
    }, 110)
    return () => clearInterval(id)
  }, [timeMachine, playing, history.length])

  useEffect(() => {
    if (!focusedDept) return
    const dept = DEPARTEMENTS.find((x) => x.code === focusedDept)
    if (!dept) return
    let alive = true
    setDeptCities([])
    setSelectedCity(null)
    fetchMajorCities(dept).then((cities) => {
      if (!alive) return
      setDeptCities(cities)
      setSelectedCity(cities[0] ?? null)
    })
    return () => {
      alive = false
    }
  }, [focusedDept])

  useEffect(() => {
    let alive = true
    Promise.all(
      REGIONS.map((region) =>
        fetchRegional(region.code).then((record) => [region.id, record] as const),
      ),
    ).then((entries) => {
      if (!alive) return
      setRegionalRecords(Object.fromEntries(entries))
    })
    return () => {
      alive = false
    }
  }, [live.date_heure])

  // Mesure le ratio réel de la zone carte (→ viewBox sans letterbox).
  useEffect(() => {
    const el = mapBoxRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setBoxAspect(r.width / r.height)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Quand le ratio change (resize), recale la vue courante sans animation.
  useEffect(() => {
    let v: View
    if (focusedDept) {
      const d = DEPARTEMENTS.find((x) => x.code === focusedDept)
      v = d ? viewForBbox(d.bbox, boxAspect) : nationalView(boxAspect)
    } else if (focusedRegion) {
      const r = REGIONS.find((x) => x.id === focusedRegion)
      v = r ? viewForBbox(r.bbox, boxAspect) : nationalView(boxAspect)
    } else {
      v = nationalView(boxAspect)
    }
    cancelAnimationFrame(viewRaf.current)
    viewRef.current = v
    viewTarget.current = v
    setView(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxAspect])

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }

  // Voix locale instantanée (survols) — invalide l'IA en cours.
  const speak = useCallback(
    (action: string, src: EcoMixRecord) => {
      setVoice(genVoix({ data: src, action }))
    },
    [setVoice],
  )

  // Voix « intelligente » : local immédiat, puis upgrade IA si dispo.
  const speakSmart = useCallback(
    (action: string | undefined, src: EcoMixRecord) => {
      const id = ++voiceReq.current
      setVoiceIA(false)
      setVoiceText(genVoix({ data: src, action }))
      if (!AI_ENABLED) return
      genVoixAI(src, action).then((ai) => {
        // n'applique que si aucune autre voix n'a pris le relais entretemps
        if (ai && voiceReq.current === id) {
          setVoiceText(ai)
          setVoiceIA(true)
        }
      })
    },
    [],
  )

  // Réactions du survol carte (voix uniquement).
  const onVoice = useCallback(
    (action: string) => {
      lastInteract.current = Date.now()
      if (action.startsWith('centrale:')) {
        speak(action, data)
        discover('centrale')
      } else if (action.startsWith('region:') && !focusedRegion && !focusedDept) {
        // region:Nom:conso  → commentaire réseau contextualisé
        speak('', data)
      }
    },
    [data, speak, focusedRegion, focusedDept, discover],
  )

  // Commentaire réseau initial + idle toutes les 30s (voix IA si dispo).
  useEffect(() => {
    if (!voiceText) speakSmart(undefined, live)
    const id = setInterval(() => {
      if (Date.now() - lastInteract.current > 28_000 && !sim && !timeMachine && !focusedRegion) {
        speakSmart(undefined, live)
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
      discover('scenario')
      // La voix décrit ce qui disparaît (IA si dispo, sinon local).
      speakSmart(`scenario:${id}`, live)

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
    setVoice(genVoix({ data: live }))
  }, [live, setVoice])

  // ── Visite guidée (90 s) — enchaîne caméra + scénario ─────
  const TOUR: { dur: number; text: string; run: () => void }[] = [
    {
      dur: 8500,
      text: `La France utilise ${data.consommation.toLocaleString('fr-FR')} MW maintenant. L'électricité ne se stocke presque pas: il faut produire au même moment que l'on consomme.`,
      run: () => { setIsolate(null); unfocus() },
    },
    {
      dur: 9000,
      text: 'Le bleu, c est le socle stable: il tourne jour et nuit. Les autres couleurs complètent selon la météo, l heure et le besoin du pays.',
      run: () => handleIsolate('nucleaire'),
    },
    {
      dur: 9000,
      text: "Regarde les flèches aux frontières: quand la France produit plus que son besoin, elle aide ses voisins. Quand il manque du courant, elle en reçoit.",
      run: () => setIsolate(null),
    },
    {
      dur: 10000,
      text: "Chaque région a son rôle. Certaines produisent beaucoup, d'autres consomment surtout. Clique une région pour voir si elle donne ou reçoit de l'électricité.",
      run: () => focusRegion('ara'),
    },
    {
      dur: 11000,
      text: 'Maintenant, on enlève une grosse source. Le réseau doit rester équilibré immédiatement: sinon certaines zones passent en stress puis en blackout.',
      run: () => { unfocus(); window.setTimeout(() => runScenario('no-nuclear'), 700) },
    },
    {
      dur: 8000,
      text: "Dernier déclic: ton impact dépend du moment. Recharger, chauffer ou lancer une machine ne pèse pas pareil selon le mix en direct.",
      run: () => { unfocus(); resetSim() },
    },
  ]

  const endTour = useCallback(() => {
    clearTimeout(tourTimer.current)
    setTour(null)
    setIsolate(null)
    unfocus()
    resetSim()
  }, [unfocus, resetSim])

  const startTour = useCallback(() => {
    closeTimeMachine()
    setGame(null)
    setGameMenu(false)
    setElectron(null)
    resetSim()
    unfocus()
    setIsolate(null)
    setTour(0)
  }, [closeTimeMachine, resetSim, unfocus])

  // exécute l'étape courante + programme la suivante
  useEffect(() => {
    if (tour === null) return
    TOUR[tour].run()
    const last = tour >= TOUR.length - 1
    tourTimer.current = window.setTimeout(() => {
      if (last) endTour()
      else setTour((t) => (t === null ? null : t + 1))
    }, TOUR[tour].dur)
    return () => clearTimeout(tourTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour])

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    wakeCursor()
    return () => clearTimeout(idleCursorTimer.current)
  }, [wakeCursor])

  // Échap → recule d'un niveau (département → région → national)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (focusedRegion || focusedDept)) goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedRegion, focusedDept, goBack])

  useEffect(
    () => () => {
      cancelAnimationFrame(viewRaf.current)
      clearTimeout(viewSnap.current)
      clearTimeout(electronTimer.current)
      clearTimeout(tourTimer.current)
    },
    [],
  )

  const simActive = sim !== null

  return (
    <div
      ref={rootRef}
      className={`control-room scanlines flex h-[100dvh] w-screen flex-col overflow-hidden bg-[var(--background)] ${cursorHidden ? 'cursor-idle' : ''}`}
      onPointerMove={wakeCursor}
      onPointerDown={wakeCursor}
      onKeyDown={wakeCursor}
    >
      {/* ── Header ── */}
      <header className="control-header relative z-50 flex h-14 shrink-0 items-center justify-between overflow-visible border-b px-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="t-title" style={{ opacity: 1, fontSize: 15, color: 'var(--engie-blue-soft)' }}>
            pulse
          </span>
          <div className="hidden h-7 w-px bg-[var(--line-strong)] md:block" />
          <div className="hidden min-w-0 md:block">
            <div className="t-label text-[var(--text-primary)]">tour de contrôle énergie</div>
            <div className="t-label mt-0.5 normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.04em' }}>
              réseau électrique français
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-visible">
          <span className="t-label mr-1 hidden text-[var(--text-muted)] lg:inline">
            données rte · {formatHeure(data.date_heure)}
          </span>

          <Link to="/stats" className="nav-pill">
            stats live
          </Link>

          {/* jouer — CTA accentué (jaune) */}
          <div className="map-filter-header mobile-hide">
            {MAP_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setMapMode(mode.id)}
                className="map-filter-button"
                data-active={mapMode === mode.id}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <DemoControls data={data} audioOn={audioOn} onAudioChange={setAudioOn} />

          <button
            onClick={() => setSimpleMode((v) => !v)}
            className="nav-pill"
            style={{
              borderColor: simpleMode ? 'var(--solar)' : '#1e3a5f',
              color: simpleMode ? 'var(--solar)' : 'var(--text-primary)',
              background: simpleMode ? 'rgba(216,179,63,0.14)' : undefined,
            }}
          >
            mode simple
          </button>

          <button
            onClick={() => setShowQuestionIA((v) => !v)}
            className="nav-pill mobile-hide"
            style={{
              borderColor: showQuestionIA ? 'var(--nuclear)' : '#1e3a5f',
              color: showQuestionIA ? 'var(--engie-blue-soft)' : 'var(--text-primary)',
              background: showQuestionIA ? 'rgba(0,110,182,0.2)' : undefined,
            }}
          >
            appel IA
          </button>

          <div className="relative">
            <button
              onClick={() => setGameMenu((o) => !o)}
              className="nav-pill flex items-center gap-1.5"
              style={{
                borderColor: gameMenu || game ? 'var(--engie-blue)' : 'var(--line-strong)',
                color: gameMenu || game ? 'var(--engie-blue-soft)' : 'var(--text-primary)',
                background: gameMenu || game ? 'rgba(0,110,182,0.2)' : undefined,
              }}
            >
              jouer
            </button>
            {gameMenu && (
              <div className="control-panel absolute right-0 top-full z-50 mt-2 w-[258px] border p-2 fade-up">
                <button
                  onClick={() => { setGame('balance'); discover('balance'); setGameMenu(false) }}
                  className="block w-full border border-transparent px-2 py-2 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[rgba(0,110,182,0.12)]"
                >
                  <span className="t-label text-[var(--text-primary)]">équilibre le réseau</span>
                  <span className="t-label mt-0.5 block normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>équilibre offre & demande</span>
                </button>
                <button
                  onClick={() => { setGame('quiz'); discover('quiz'); setGameMenu(false) }}
                  className="mt-1 block w-full border border-transparent px-2 py-2 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[rgba(0,110,182,0.12)]"
                >
                  <span className="t-label text-[var(--text-primary)]">devine le mix</span>
                  <span className="t-label mt-0.5 block normal-case text-[var(--text-muted)]" style={{ letterSpacing: '0.02em' }}>quiz éclair sur le direct</span>
                </button>
              </div>
            )}
          </div>

          {/* découvrir — CTA accentué (bleu) */}
          <button
            onClick={() => (tour !== null ? endTour() : startTour())}
            className="nav-pill mobile-hide flex items-center gap-1.5"
            style={{
              borderColor: tour !== null ? 'var(--nuclear)' : 'rgba(59,130,246,0.5)',
              color: tour !== null ? 'var(--engie-blue-soft)' : 'var(--text-primary)',
              background: tour !== null ? 'rgba(0,110,182,0.2)' : undefined,
            }}
          >
            visite guidée
          </button>

          {/* 24h */}
          <button
            onClick={() => (timeMachine ? closeTimeMachine() : openTimeMachine())}
            className="nav-pill mobile-hide"
            style={{
              borderColor: timeMachine ? 'var(--nuclear)' : '#1e3a5f',
              color: timeMachine ? 'var(--engie-blue-soft)' : 'var(--text-primary)',
              background: timeMachine ? 'rgba(0,110,182,0.2)' : undefined,
            }}
          >
            voir la journée
          </button>

          {/* résumé */}
          <button
            onClick={() => { setShowSummary(true); discover('summary') }}
            className="nav-pill mobile-hide"
            style={{ borderColor: '#1e3a5f', color: 'var(--text-primary)' }}
          >
            ce qu'il faut retenir
          </button>

          {/* statut live */}
          <span
            className="mobile-hide t-label flex items-center gap-2 border px-2.5 py-2 text-[var(--text-primary)]"
            style={{ borderColor: 'var(--line-strong)', background: 'rgba(0,110,182,0.08)' }}
          >
            {timeMachine
              ? 'rejeu 24h'
              : focusedDept
                ? 'vue dép.'
                : focusedRegion
                  ? 'vue rég.'
                  : sim
                    ? 'simulation'
                    : 'live'}
            <span
              className="live-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background:
                  timeMachine || focusedRegion || focusedDept
                    ? 'var(--nuclear)'
                    : sim
                      ? 'var(--alert-orange)'
                      : 'var(--alert-red)',
                boxShadow: 'none',
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
          onDoubleClick={() => (focusedRegion || focusedDept ? goBack() : resetSim())}
        >
          {/* la carte remplit toute la zone ; le viewBox épouse le ratio mesuré */}
          <div ref={mapBoxRef} className="network-wake relative h-full w-full">
            <div className="wake-sweep" />
            <FranceMap
              data={data}
              regionStates={regionStates}
              view={view}
              focusedRegion={focusedRegion}
              focusedDept={focusedDept}
              cityMarkers={deptCities}
              selectedCity={selectedCity}
              mapMode={mapMode}
              regionalRecords={regionalRecords}
              onFocus={focusRegion}
              onFocusDept={focusDept}
              onSelectCity={setSelectedCity}
              onElectron={startElectron}
              onVoice={onVoice}
            />
            <ParticleCanvas data={data} isolate={isolate} view={view} />
            <BorderFlows
              data={live}
              view={view}
              visible={!focusedRegion && !focusedDept && !timeMachine && !electron}
            />
            {electron && <ElectronJourney centrale={electron.centrale} dest={electron.dest} view={view} />}
            <BlackoutOverlay titre={titre} />

            {/* Aides pédagogiques — ancrées sur la carte, au national uniquement */}
            {!focusedRegion && !focusedDept && !timeMachine && !electron && tour === null && (
              <>
                <div className="absolute left-3 top-3 z-20">
                  <Legend isolate={isolate} onIsolate={handleIsolate} onOpen={() => discover('legend')} />
                </div>
                <div className="mobile-hide absolute right-3 top-3 z-20">
                  <DidYouKnow data={live} />
                </div>
                <div className="mobile-hide absolute left-1/2 top-3 z-20 -translate-x-1/2">
                  <DiscoveryScore count={discovered.size} total={TOTAL_FACETS} last={lastDiscovery} />
                </div>
              </>
            )}

            {/* Visite guidée */}
            {tour !== null && (
              <TourGuide step={tour} total={TOUR.length} text={TOUR[tour].text} onSkip={endTour} />
            )}

            {!electron && (
              <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
              <LiveHomesCounter data={data} simpleMode={simpleMode} />
              </div>
            )}
          </div>

          {/* Détail département (niveau le plus profond) */}
          {focusedDept &&
            (() => {
              const d = DEPARTEMENTS.find((x) => x.code === focusedDept)
              const r = d && REGIONS.find((x) => x.id === d.region)
              return d && r ? (
                <DepartmentDetail
                  dept={d}
                  regionNom={r.nom}
                  cities={deptCities}
                  selectedCity={selectedCity}
                  onSelectCity={setSelectedCity}
                  onBack={backToRegion}
                />
              ) : null
            })()}

          {/* Détail régional */}
          {focusedRegion && !focusedDept &&
            (() => {
              const r = REGIONS.find((x) => x.id === focusedRegion)
              return r ? <RegionDetail region={r} onBack={unfocus} /> : null
            })()}

          {/* Simulateur (bas-gauche) + impact perso (bas-droite) — au national */}
          {!focusedRegion && !focusedDept && !timeMachine && !electron && tour === null && (
            <>
              <div className="absolute bottom-4 left-4 z-20">
                <IfSimulator onScenario={runScenario} onReset={resetSim} simActive={simActive} />
              </div>
              <div className="absolute bottom-4 right-4 z-20">
                <PersoImpact data={live} onUse={() => discover('perso')} />
              </div>
            </>
          )}
        </main>

        {/* Panneau jauges */}
        <aside className="control-sidebar shrink-0 border-t p-5 md:w-[390px] md:border-l md:border-t-0">
          <EnergyGauges data={data} isolate={isolate} onIsolate={handleIsolate} simpleMode={simpleMode} />
        </aside>
      </div>

      {/* ── Time machine ── */}
      {timeMachine && (
        <TimeMachine
          history={history}
          index={histIndex}
          playing={playing}
          loading={histLoading}
          onIndex={(i) => {
            setPlaying(false)
            setHistIndex(i)
          }}
          onTogglePlay={() => setPlaying((p) => !p)}
          onExit={closeTimeMachine}
        />
      )}

      {/* ── Voix du réseau ── */}
      <footer className="control-footer flex min-h-[66px] shrink-0 items-center border-t px-4 py-3">
        <VoixReseau text={voiceText} ia={voiceIA} audioOn={audioOn} />
      </footer>

      {showSummary && <SummaryScreen data={data} simpleMode={simpleMode} onClose={() => setShowSummary(false)} />}
      {showQuestionIA && <QuestionIA data={data} onClose={() => setShowQuestionIA(false)} />}
      {game === 'balance' && <BalanceGame data={live} onClose={() => setGame(null)} />}
      {game === 'quiz' && <QuizGame data={live} onClose={() => setGame(null)} />}
    </div>
  )
}
