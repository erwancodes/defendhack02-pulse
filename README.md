# PULSE

Tour de contrôle interactive du réseau électrique français.

Projet réalisé pour **DefendHack #02**, hackathon cybersécurité / défense autour du thème de l'énergie.

## Problème

Le réseau électrique est critique, mais il reste abstrait pour la plupart des citoyens : production, demande, imports, exports, tension réseau, impact carbone. Les chiffres existent, mais ils sont difficiles à lire vite.

**PULSE** transforme ces données en une expérience visuelle démo-able en moins de 2 minutes : on voit le réseau vivre, on teste des scénarios de crise, et on comprend immédiatement pourquoi l'équilibre offre / demande est vital.

## Solution

Une application React qui affiche le réseau électrique français en temps réel, avec :

- carte SVG de la France et de l'Europe voisine ;
- particules Canvas qui représentent les flux d'énergie ;
- données RTE eco2mix en direct via ODRE ;
- scénarios "et si..." avec blackout animé ;
- mini-jeu "équilibre le réseau" avec sliders par source ;
- drill-down région puis département ;
- replay des dernières 24 h ;
- briefing réseau local, avec option IA via OpenRouter.

## Démo rapide

1. Observer la carte : les sources d'énergie circulent en temps réel.
2. Isoler une source depuis le panneau de droite.
3. Lancer `et si` puis couper une source critique pour déclencher une tension réseau.
4. Ouvrir `jouer` -> `équilibre le réseau` et maintenir l'offre au-dessus de la demande.
5. Cliquer une région pour montrer import / export et mix local.
6. Ouvrir `résumé` pour conclure sur le mix et l'empreinte carbone.

## Fonctionnalités clés

- **Tour de contrôle énergie** : interface dense, lisible, orientée supervision.
- **Données réelles** : API ODRE / RTE eco2mix, fallback local si l'API tombe.
- **Blackout visuel** : stress région, extinction, cascade, reset automatique.
- **Gamification** : le joueur ajuste nucléaire, éolien, solaire, hydraulique et gaz.
- **Pédagogie instantanée** : équivalences concrètes, quiz, impact personnel.
- **Démo robuste** : pas de compte, pas de base de données, pas de serveur obligatoire.

## Stack

- React 19
- TanStack Router
- Vite
- Tailwind CSS v4
- Canvas API
- SVG
- ODRE / RTE eco2mix
- OpenRouter optionnel pour la voix IA
- Vercel pour le déploiement

## Installation

```bash
npm install
npm run dev
```

Application locale : [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
npm run preview
```

## Variables d'environnement

PULSE fonctionne sans clé API. La voix réseau locale est utilisée par défaut.

Pour activer la voix IA optionnelle :

```bash
cp .env.example .env.local
```

Puis renseigner :

```bash
VITE_OPENROUTER_KEY=
```

Les fichiers `.env`, `.env.local` et `.env.*.local` sont ignorés par Git.

## Déploiement

```bash
vercel --prod
```

Le projet contient déjà `vercel.json`.

## Données

Sources principales :

- eco2mix national temps réel ;
- eco2mix régional temps réel ;
- registre national des installations de production et stockage ;
- géométries locales pour carte France / Europe.

## Objectif hackathon

Montrer un vrai problème énergétique de manière visible :

**un réseau électrique ne se comprend pas seulement avec des chiffres, il se comprend quand on le voit tenir, décrocher, puis revenir.**
