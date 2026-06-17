# PULSE

Le réseau électrique français, vivant et en temps réel.
Carte SVG animée + particules Canvas + données RTE eco2mix + voix du réseau.

## Lancer

```bash
cd pulse-app
npm install
npm run dev      # http://localhost:3000
```

## Build / Deploy

```bash
npm run build    # -> dist/
vercel --prod    # deploy (vercel.json déjà configuré)
```

## Données

API ODRE eco2mix temps réel (sans auth). On filtre la dernière ligne
**non nulle** (la plus récente est souvent une prévision vide). Si l'API
tombe, un fallback « nuit » prend le relais — la démo ne casse jamais.

## Voix du réseau

Générée **localement** à partir des vraies données (aucune clé requise,
fonctionne hors-ligne, ne casse jamais en démo). Le code est prêt à être
branché sur OpenRouter (`openai/gpt-4o-mini`) si besoin — voir `src/lib/voix.ts`.

## Démo en 90 s

1. La carte respire : particules colorées par source le long des lignes HT.
2. Survol d'une centrale → tooltip (MW, foyers alimentés) + voix.
3. Clic sur une source (jauges) → isole ses particules.
4. `[ et si... ]` → « on coupe le nucléaire ? » → **blackout animé** en
   Île-de-France (flicker, cascade voisins, son) puis rallumage auto (5 s).
5. `résumé` → bilan du mix + empreinte carbone comparée (FR/DE/PL).

## Stack

TanStack Router (SPA) · React 19 · Tailwind v4 · Canvas API · SVG · JetBrains Mono
