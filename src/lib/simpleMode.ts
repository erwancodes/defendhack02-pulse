import type { EcoMixRecord, EnergySource } from './eco2mix'
import { foyers } from './eco2mix'

export const SIMPLE_SOURCE_ROLE: Record<EnergySource, string> = {
  nucleaire: 'le socle stable, jour et nuit',
  eolien: 'utile quand le vent souffle',
  solaire: 'utile quand le soleil est la',
  hydraulique: 'la reserve rapide du reseau',
  gaz: 'le secours rapide, mais plus polluant',
  fioul: 'le secours rare et polluant',
  charbon: 'le secours tres polluant',
}

export function productionTotal(data: EcoMixRecord): number {
  return data.nucleaire + data.eolien + data.solaire + data.hydraulique + data.gaz + data.fioul + data.charbon
}

export function homesLabel(mw: number): string {
  return `${foyers(mw).toLocaleString('fr-FR')} foyers`
}

export function balanceText(data: EcoMixRecord): {
  need: number
  production: number
  diff: number
  label: string
  tone: 'export' | 'import' | 'balanced'
} {
  const need = data.consommation
  const production = productionTotal(data)
  const diff = production - need
  const abs = Math.abs(diff)
  if (abs < 500) {
    return { need, production, diff, label: 'production et besoin presque egaux', tone: 'balanced' }
  }
  if (diff > 0) {
    return { need, production, diff, label: `surplus: la France peut aider ses voisins`, tone: 'export' }
  }
  return { need, production, diff, label: `manque: la France doit recevoir du courant`, tone: 'import' }
}

