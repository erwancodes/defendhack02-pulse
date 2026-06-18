# PULSE — FEATURE.md

> Backlog de features. Trié par impact démo / effort.
> Légende effort : 🟢 < 1h · 🟡 1-3h · 🔴 > 3h — Wow : ⭐ à ⭐⭐⭐⭐⭐

---

## ✅ Feature prioritaire — Drill-down régional (zoom + échelle locale) — LIVRÉE

> Implémentée. Clic sur une région → zoom animé (viewBox tween rAF), panneau
> `RegionDetail` avec les **vraies données RTE régionales** (`eco2mix-regional-tr`),
> solde **import/export**, mix réel, centrales locales, note didactique. Sortie :
> bouton `← vue nationale`, `Échap`, ou double-clic. Particules synchronisées au zoom.
> Vérifié : ARA exporte +6 287 MW · Bretagne importe −1 211 MW (0 nucléaire).

**L'idée (la tienne).** Au survol une région réagit déjà (glow bleu). Au **clic**,
la carte **zoome** sur cette région, le reste s'estompe, et un panneau affiche
**l'énergie à l'échelle locale** — pour comprendre que chaque territoire a son
propre profil énergétique.

### 💎 La découverte qui change tout
RTE expose un dataset **régional temps réel** (pas que national) :

```
GET https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/eco2mix-regional-tr/records
    ?limit=1&order_by=date_heure desc
    &where=consommation IS NOT NULL AND libelle_region="Bretagne"
```

Champs : `libelle_region`, `code_insee_region` (= le `code` de notre GeoJSON : 53,
75, 84…), `consommation`, `nucleaire`, `eolien`, `solaire`, `hydraulique`,
`thermique`, `bioenergies`, `taux_co2`.

→ Le zoom n'affiche pas des estimations : **les vraies données de la région, en
direct.** C'est ça qui rend la feature didactique et crédible devant le jury.

### Le récit que ça raconte (exemples réels testés)
- **Bretagne** : 0 MW nucléaire, conso 2 155 MW → la région **importe presque tout
  son courant**. Leçon : une région peut consommer sans produire.
- **Auvergne-Rhône-Alpes** : nucléaire (vallée du Rhône) + hydraulique alpin → la
  région **exportatrice** par excellence.
- **Île-de-France** : énorme consommation, quasi zéro production → **dépend
  entièrement** des régions voisines.

> Le solde **production − consommation** par région = le concept clé à montrer :
> « cette région **exporte** / **importe** X MW ». Personne ne sait ça.

### Comportement attendu
1. Clic région → animation **zoom** (~700 ms, ease-in-out) qui recadre sur la région.
2. Les autres régions s'estompent (opacity ↓), la région sélectionnée reste nette.
3. Les **particules suivent le zoom** (flux local visible) — ou fade si trop lourd.
4. Panneau **vue régionale** :
   - Mix réel de la région (barres, mêmes couleurs que le national)
   - **Solde : importe / exporte X MW** (le moment « ah, je savais pas »)
   - Liste des **centrales de la région** (déjà en data : filtrables par position)
   - Une **note didactique** courte par région (1 phrase de contexte)
   - `taux_co2` régional si dispo
5. Sortie : bouton `← vue nationale`, touche `Échap`, ou double-clic.

### Approche technique (sans lib d'animation, conforme PRD)
- **Zoom** : animer le `viewBox` du SVG via une boucle `requestAnimationFrame`
  (tween maison). On garde toujours le ratio 600/700 → pas de distorsion, et le
  Canvas des particules lit le même `viewBox` pour rester aligné.
- **Bbox par région** : `geoPath().bounds(feature)` dans `scripts/gen-map.mjs`
  (déjà la bonne projection) → stocker `bbox` dans `regions.ts`.
- **Centrale → région** : `geoContains(feature, [lng,lat])` dans le script de
  génération → ajouter `region` à chaque centrale.
- **Données** : `fetchRegional(codeInsee)` dans `lib/eco2mix.ts` + cache par région.
- **État** : remonter `focusedRegion` + `view` dans `index.tsx`, passer `view` à
  `FranceMap` et `ParticleCanvas`.
- Nouveau composant `RegionDetail.tsx`.

**Effort 🔴 ~3h · Wow ⭐⭐⭐⭐⭐** — c'est LA feature qui transforme la démo d'« belle
visu » en « outil qui apprend vraiment quelque chose ».

### ✅ Niveau département — LIVRÉ
Double drill-down : en vue régionale, les **départements** s'affichent (couche
cliquable). Clic → zoom + panneau `DepartmentDetail` avec le **parc de production
installé réel** par filière (dataset ODRE `registre-national-installation-...-agrege`,
`puismaxinstallee` agrégée par filière, kW→MW). Navigation à 3 niveaux avec retour
contextuel (département → région → national) via bouton, `Échap` ou double-clic.
Vérifié : Ain = 4,7 GW installés, 77 % nucléaire (Bugey), 486 installations.

> Distinction didactique nette : **région = production temps réel** (eco2mix-regional),
> **département = parc installé** (registre des installations). Deux échelles, deux datasets.
>
> Note perf : `departements.ts` ajoute ~140 KB gzip. Si besoin, le rendre en
> `import()` dynamique au premier clic région (chargé seulement en drill-down).

---

## 🎮 Features ludiques & pédagogiques — « comprendre l'énergie sans rien y connaître »

> **Le constat (retour utilisateur)** : c'est beau, mais un novice ne sait pas
> *lire* ce qu'il voit (bleu = quoi ?), ni *quoi faire*. L'app paraît un peu vide.
> Il manque des couches d'**interaction ludique** et de **traduction pédagogique**
> pour que n'importe qui comprenne, en jouant. Voici de quoi remplir l'expérience.

### A. Comprendre en un coup d'œil (les bases) — ✅ LIVRÉE

#### ✅ Clé de lecture vivante (légende interactive)
Toggle `?` (haut-gauche, national) → panneau « comment lire la carte » : les 5
sources avec forme + couleur + phrase, **clic = isole la source** (état `isolate`
partagé avec les jauges et le canvas). Footer qui explique particules + flèches.
→ [components/Legend.tsx](src/components/Legend.tsx). Vérifié : clic « éolien » →
canvas + jauges isolés.

#### ✅ Équivalences tangibles
Au survol d'une centrale, le tooltip traduit les MW en concret : **foyers**, **TGV
à 300 km/h**, **ville de X habitants**. → `equivalences()` dans
[lib/pedago.ts](src/lib/pedago.ts). Vérifié : Gravelines 5 440 MW → « 3,5 M foyers ·
573 TGV · une ville de 7,3 M habitants ».

#### ✅ Bulles « le savais-tu ? »
Carte (haut-droite) qui **cycle toutes les 18 s** (ou au clic) des faits **calculés
sur la donnée réelle** : nucléaire %, export « = un pays voisin », solaire vs gaz,
CO₂ vs Allemagne, vent = N réacteurs… → `funFacts()` dans
[lib/pedago.ts](src/lib/pedago.ts) + [components/DidYouKnow.tsx](src/components/DidYouKnow.tsx).
Masquées hors national / time machine.

### B. Apprendre en jouant (gamification) — ✅ LIVRÉE

> Menu **« jouer »** dans le header → équilibriste & devine le mix.
> **« Suis un électron »** se déclenche au clic sur une centrale.

#### ✅ 🎯 Jeu d'équilibriste — « garde la France allumée »
Overlay plein écran. Le **vent & le soleil sont subis** (intermittents, marche
aléatoire) ; tu pilotes **nucléaire / hydraulique / gaz** (sliders) pour coller à
une **demande qui oscille** (amplitude ↑ par niveau). Jauge de **fréquence (50 Hz)**
avec zone verte, barre de **stabilité** (vie) qui se vide hors équilibre → **réseau
effondré** + score « tu as tenu X s ». **CO₂** monte avec le gaz. Alertes
pédagogiques (« le gaz sauve le réseau mais pollue »). → [BalanceGame.tsx](src/components/BalanceGame.tsx).
Vérifié : sliders pilotent la fréquence, déséquilibre → game over.

#### ✅ Suis un électron — le voyage d'une particule
Clic sur une centrale → **zoom** sur le trajet centrale → ville la plus proche
(via les lignes THT), un **électron** file le long avec traînée, et une narration :
« Né à Gravelines, il file vers Lille à travers 60 km de très haute tension, arrive
en ~X ms. » Distance/temps calculés depuis la projection. → [ElectronJourney.tsx](src/components/ElectronJourney.tsx)
+ [lib/electron.ts](src/lib/electron.ts). Vérifié : zoom + narration + destinations exactes.

#### ✅ « Devine le mix » — quiz éclair visuel
Overlay : 4 questions **tirées du direct** (source dominante, import/export,
jour/nuit du solaire, plus propre que l'Allemagne ?). Révélation colorée +
explication chiffrée, score /4. → [QuizGame.tsx](src/components/QuizGame.tsx).
Vérifié : réponse → « le nucléaire fournit 88% — de loin la première source ».

### C. Se sentir concerné (l'angle perso) — ✅ LIVRÉE

#### ✅ « Et toi, là, maintenant ? »
Bouton `[ et toi ? ]` (bas-droite) → gestes du quotidien (machine, voiture, clim,
douche). Calcule le **CO₂ réel** du geste au mix courant + l'équivalent **km en
thermique**, et compare à un soir d'hiver (~420 g/kWh). → [PersoImpact.tsx](src/components/PersoImpact.tsx)
+ [lib/perso.ts](src/lib/perso.ts). Vérifié : recharge voiture = 440 g maintenant
(11 g/kWh) vs 16,8 kg l'hiver, « 38× pire ». Le déclic : *quand* tu consommes compte.

#### ✅ Visite guidée (≈ 90 s)
Bouton `découvrir` → 6 étapes narrées qui pilotent **caméra + isolation + scénario** :
réseau → nucléaire → flux Europe → région ARA → black-out nucléaire → « à toi ».
Carte de narration + progression + `passer`. → [TourGuide.tsx](src/components/TourGuide.tsx)
(orchestration dans index). Vérifié : 6 étapes, narration, skip, UI de coin masquée.

#### ✅ Score de découverte
Barre **X/12** (haut-centre) + toast « ✦ +1 · {facette} ». 12 facettes débloquées en
explorant (centrale, région, département, scénario, 24h, isolation, clé de lecture,
électron, équilibriste, quiz, impact perso, bilan). → [DiscoveryScore.tsx](src/components/DiscoveryScore.tsx).
Vérifié : monte en jouant (3/12 après la visite guidée).

### Reco pour remplir l'app vite et bien
1. **Clé de lecture** (sans elle, rien n'est compréhensible — 🟢)
2. **Équivalences tangibles** (le déclic novice, 🟢, gros wow)
3. **Jeu d'équilibriste** (la pièce maîtresse ludique, 🔴 mais ⭐⭐⭐⭐⭐)
4. **Suis un électron** ou **« et toi maintenant »** selon le temps

---

## 🔥 Autres features à fort impact

### ✅ Carte de l'Europe (immersion) — LIVRÉE
La France n'est plus seule : elle est **centrée dans une Europe** de pays voisins
(33 pays en silhouettes sombres, projetés avec la même Lambert conique). La
projection fitte désormais la France dans un rectangle central (`FR_RECT`) →
marge tout autour. Géométrie décimée (1 pt/3) + coords entières → fond léger
(`europe.ts` ~105 KB). Les **flèches de flux pointent vers les vrais pays**
(ancres = centroïdes projetés de UK/DE·BE/CH/IT/ES). France brillante au centre,
Europe en retrait → profondeur. Le drill-down zoome toujours (viewBox/bbox inchangés).
**Effort 🟡 · Wow ⭐⭐⭐⭐** — « France dans l'Europe », les échanges deviennent lisibles.

### ✅ Interconnexions — flux aux frontières — LIVRÉE
Flèches animées (pointillés qui défilent) aux 5 frontières montrant les **échanges
commerciaux temps réel** : UK, DE·BE, CH, IT, ES. **Cyan = export** (la France
fournit), **orange = import**. Headline dans le panneau : « la France exporte
+X MW vers ses voisins ». Données : champs `ech_comm_*` / `ech_physiques` du dataset
eco2mix **déjà fetché** (zéro API externe). Masqué en vue régionale / time machine.
Vérifié : exporte ~11,4 GW net (UK 3528, DE·BE 3620, CH 2400, IT 2639 ; ES importe 916).
**Effort 🟢 · Wow ⭐⭐⭐⭐** — récit fort : « la France, batterie de l'Europe ».


### ✅ Time machine — rejouer les dernières 24 h — LIVRÉE
Bouton `24h` → barre de rejeu en bas : **play/pause**, horodatage de la frame,
et un **scrubber avec la courbe solaire en cloche** (jaune) + conso (gris) sur
24 h, playhead animé. L'auto-play parcourt la journée (~110 ms/frame, boucle),
on peut **scrubber** à la main. Tout se met à jour par frame : jauges, particules,
carte. Données : `fetchHistory()` (eco2mix, 96 points de 15 min, ordre chrono).
Vérifié : 17h30 solaire 13 GW en déclin · 01h45 solaire 0 (nuit), 100 % nucléaire,
plus aucune particule jaune. Sortie via `← retour live`.
**Le moment fort : voir le soleil se lever et se coucher sur le réseau.**

### Comparateur de pays en direct
Le PRD compare déjà FR/DE/PL en CO₂. Le rendre **live** via l'API ElectricityMaps
ou ENTSO-E : carte Europe miniature, chaque pays coloré par son intensité carbone.
La France brille en bleu (propre), ses voisins en rouge.
**Effort 🔴 · Wow ⭐⭐⭐⭐** — message politique fort, très « énergie ».

### ✅ Voix IA réelle (OpenRouter) — LIVRÉE
`openai/gpt-4o-mini` via OpenRouter, branché sur les **vrais chiffres** du mix
courant (prompt serveur : sobre, factuel, ≤40 mots). Utilisée pour le
**commentaire réseau périodique** (idle 30s) et les **scénarios « et si »** ;
les survols restent en local (instantané). Pattern : local immédiat → **upgrade
IA** quand elle répond (garde anti-périmé via compteur), tag **« · ia »** affiché.
**Fallback total** : sans `OPENROUTER_KEY`, ou si l'appel échoue/timeout (7 s),
retour transparent à la voix locale `genVoix`. Clé côté serveur via `/api/voix`,
voir `.env.example`.
Vérifié : build OK ; clé absente → fallback local propre.
**Effort 🟢 · Wow ⭐⭐⭐** — montre un usage *fin* du LLM (données réelles), pas un wrapper.

### ✅ Détection de tension réseau (réel vs prévision) — LIVRÉE
Compare la consommation réelle à la **prévision RTE** (`prevision_j`/`prevision_j1`,
déjà dans le dataset). Bloc dans le panneau : état **« réseau sous tension »**
(orange) / **« conforme à la prévision »** (bleu) / **« marge confortable »** (vert),
écart en MW, et une **barre d'écart centrée** (fill à droite si réel > prévu, à
gauche sinon). La **voix** (locale + IA) commente la tension quand elle est notable.
Seuil : ±1,5 %. Masqué hors temps réel (frames historiques sans prévision).
Vérifié : +202 MW → « conforme à la prévision ».
**Effort 🟢 · Wow ⭐⭐⭐** — montre que le réseau est tendu (ou détendu) *à cet instant*.

---

## ✨ Polish & micro-features (rapides)

| Feature | Effort | Wow | Note |
|---|---|---|---|
| Son ambiant réactif (drone qui monte avec la conso) | 🟢 | ⭐⭐⭐ | Web Audio déjà utilisé pour le blackout |
| Légende couleurs (clic = toggle) au lieu d'implicite | 🟢 | ⭐ | accessibilité démo |
| Compteur live « X foyers alimentés en ce moment » | 🟢 | ⭐⭐ | gros chiffre qui défile |
| Particules : épaisseur trail = puissance de la ligne | 🟢 | ⭐⭐ | déjà la moitié du code |
| Plein écran auto + masquage curseur après 3 s | 🟢 | ⭐ | mode kiosque pour la démo |
| Transition d'entrée (la carte « s'allume » au load) | 🟢 | ⭐⭐ | renforce « le réseau s'éveille » |
| Partage : screenshot de l'état actuel avec timestamp | 🟡 | ⭐⭐ | viralité post-hackathon |

---

## 🧠 Idées plus ambitieuses (post-hackathon)

- **Scénarios joueurs** : « équilibre le réseau toi-même » — slider par source, le
  blackout se déclenche si l'offre < demande. Gamification de l'équilibre offre/demande.
- **Prévision météo → renouvelable** : croiser météo (vent/ensoleillement) et
  prévoir la prod renouvelable des prochaines heures.
- **Empreinte perso** : « à cette heure, recharger ta voiture = X gCO₂ ». Rend
  l'intensité carbone tangible et actionnable.
- ~~**Interconnexions** : flux d'import/export aux frontières~~ → **✅ LIVRÉ** (voir ci-dessous).

---

## Ordre conseillé

1. **Drill-down régional** (la feature demandée — données réelles, gros wow)
2. **Time machine 24 h** (narratif, effort moyen)
3. **Voix IA réelle** (rapide, marque des points jury OpenAI)
4. Polish au choix selon le temps restant
5. Département / comparateur Europe si tout le reste est solide
