// ── Pédagogie : traduire les MW en concret + faits "le savais-tu" ──
import type { EcoMixRecord } from './eco2mix'
import { pct, foyers } from './eco2mix'

const TGV_MW = 9.5 // un TGV à pleine vitesse ≈ 9-10 MW
const PERSONNES_PAR_MW = 1350 // conso France / population (~50 GW / 68 M)

function fmtBig(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M`
  if (n >= 1_000) return `${Math.round(n / 1000)} 000`
  return `${Math.round(n)}`
}

// Traductions tangibles d'une puissance (MW) → choses du quotidien.
export function equivalences(mw: number): string[] {
  if (mw <= 0) return []
  const out: string[] = []
  out.push(`${fmtBig(foyers(mw))} foyers alimentés`)
  const tgv = Math.round(mw / TGV_MW)
  if (tgv >= 1) out.push(`${tgv.toLocaleString('fr-FR')} TGV lancés à 300 km/h`)
  out.push(`une ville de ${fmtBig(mw * PERSONNES_PAR_MW)} habitants`)
  return out
}

// Faits surprenants calculés sur la donnée réelle du moment.
export function funFacts(data: EcoMixRecord): string[] {
  const total = data.consommation || 1
  const nuc = pct(data.nucleaire, total)
  const facts: string[] = []

  facts.push(
    `Le nucléaire fournit ${nuc}% du courant français en ce moment. Aucun grand pays n'en dépend autant.`,
  )

  if (data.ech && data.ech.total < -4000) {
    facts.push(
      `La France exporte ${Math.abs(data.ech.total).toLocaleString('fr-FR')} MW là, maintenant — de quoi alimenter un pays voisin entier.`,
    )
  }

  if (data.solaire > 200 && data.gaz > 0) {
    const r = Math.round(data.solaire / Math.max(1, data.gaz))
    if (r >= 3) facts.push(`Le soleil produit ${r}× plus d'électricité que le gaz en ce moment.`)
  } else if (data.solaire < 200) {
    facts.push(`Il fait nuit : le solaire est à zéro, le nucléaire porte le pays presque seul.`)
  }

  if (data.taux_co2 > 0) {
    const r = Math.round(380 / data.taux_co2)
    if (r >= 2)
      facts.push(
        `À ${data.taux_co2} gCO₂/kWh, l'électricité française est ~${r}× plus propre que l'allemande (~380).`,
      )
  }

  if (data.eolien > 1800) {
    const reacteurs = Math.round(data.eolien / 900)
    facts.push(`Le vent fournit autant que ~${reacteurs} réacteurs nucléaires en ce moment.`)
  }

  if (data.hydraulique > 4000) {
    facts.push(
      `L'hydraulique tient ${pct(data.hydraulique, total)}% du réseau — l'eau des barrages devient courant en quelques secondes.`,
    )
  }

  facts.push(
    `En cet instant, la France alimente l'équivalent de ${fmtBig(foyers(total))} foyers, sans interruption.`,
  )

  return facts
}
