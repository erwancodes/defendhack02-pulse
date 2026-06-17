// ── Voix du réseau : commentaire contextuel ─────────────────
// Génération locale déterministe-mais-variée : aucune clé requise,
// fonctionne hors-ligne, ne casse jamais en démo. Branchable sur
// OpenRouter via VITE_OPENROUTER_KEY si présent.
import type { EcoMixRecord } from './eco2mix'
import { pct, foyers } from './eco2mix'

export interface VoixContext {
  data: EcoMixRecord
  action?: string // ex: "hover:Flamanville", "scenario:no-nuclear"
}

const CO2_PAYS = 'france : 42  ·  allemagne : 380  ·  pologne : 750'

function heure(iso: string): number {
  const d = new Date(iso)
  const h = d.getHours()
  return Number.isFinite(h) ? h : new Date().getHours()
}

function nuit(data: EcoMixRecord): boolean {
  return data.solaire < 200
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed)) % arr.length]
}

// Commentaire principal sur l'état du réseau.
function commentaireReseau(data: EcoMixRecord): string {
  const total = data.consommation || 1
  const nuc = pct(data.nucleaire, total)
  const wind = pct(data.eolien, total)
  const hydro = pct(data.hydraulique, total)
  const co2 = data.taux_co2
  const h = heure(data.date_heure)
  const seed = h + nuc + wind

  const lignes: string[] = []

  if (nuit(data)) {
    lignes.push(
      `À cette heure, ${nuc}% de l'électricité française vient du nucléaire. Le solaire est absent. La nuit appartient aux atomes.`,
    )
  } else {
    lignes.push(
      `Le soleil contribue au mix : ${pct(data.solaire, total)}% de solaire en ce moment. Le nucléaire reste la colonne vertébrale à ${nuc}%.`,
    )
  }

  if (co2 > 0 && co2 < 80) {
    lignes.push(
      `Le mix est propre ce soir : ${co2} gCO₂/kWh. À titre de comparaison, l'Allemagne tourne autour de 380 gCO₂/kWh en ce moment.`,
    )
  } else if (co2 >= 80) {
    lignes.push(
      `L'empreinte grimpe à ${co2} gCO₂/kWh : le gaz prend le relais quand la demande monte. Le réseau respire plus fort.`,
    )
  }

  if (wind > 12) {
    lignes.push(
      `Le vent souffle : l'éolien fournit ${wind}% du courant, soit de quoi alimenter ${(foyers(data.eolien) / 1_000_000).toFixed(1)} million de foyers.`,
    )
  }
  if (hydro > 10) {
    lignes.push(
      `L'hydraulique tient ${hydro}% du réseau. L'eau des barrages se transforme en lumière, instantanément, à la demande.`,
    )
  }

  return pick(lignes, seed)
}

// Commentaire au survol d'une centrale.
function commentaireCentrale(nom: string, type: string, mw: number): string {
  const f = foyers(mw)
  const fM = (f / 1_000_000).toFixed(1)
  if (type === 'nucleaire') {
    return `Vous venez de survoler ${nom}. Cette centrale alimente à elle seule ${fM} million de foyers ce soir, sans presque aucun carbone.`
  }
  if (type === 'eolien') {
    return `${nom} : ${mw} MW de vent transformés en courant. Intermittent, mais gratuit et propre quand il souffle.`
  }
  return `${nom} : ${mw} MW d'hydraulique. La plus flexible des énergies — elle s'allume en quelques secondes pour absorber les pics.`
}

// Commentaire d'un scénario "et si...".
function commentaireScenario(action: string, data: EcoMixRecord): string {
  const total = data.consommation || 1
  switch (action) {
    case 'no-nuclear': {
      const manque = data.nucleaire
      return `Sans le nucléaire, ${manque.toLocaleString('fr-FR')} MW disparaissent d'un coup. Le réseau ne tient pas : l'Île-de-France plonge dans le noir.`
    }
    case 'all-renewable':
      return `Tout en renouvelable : magnifique sur le papier. Mais sans vent ni soleil cette nuit, la production s'effondre. Le réseau vacille.`
    case 'cold-wave':
      return `Vague de froid, -10°C. La consommation bondit : chaque degré perdu, c'est 2 400 MW de plus à produire. Les marges fondent.`
    case 'disconnect-idf': {
      const conso = Math.round(total * 0.19)
      return `L'Île-de-France déconnectée : ${conso.toLocaleString('fr-FR')} MW de demande coupés net. Douze millions de personnes dans l'obscurité.`
    }
    default:
      return commentaireReseau(data)
  }
}

export function genVoix(ctx: VoixContext): string {
  const { data, action } = ctx
  if (!action) return commentaireReseau(data)
  if (action.startsWith('scenario:')) return commentaireScenario(action.slice(9), data)
  if (action.startsWith('centrale:')) {
    const [, nom, type, mw] = action.split(':')
    return commentaireCentrale(nom, type, Number(mw))
  }
  return commentaireReseau(data)
}

export { CO2_PAYS }
