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

### Plus tard — niveau département
Même logique, un cran plus bas. GeoJSON des départements dispo
(`gregoiredavid/france-geojson`). RTE **n'a pas** de temps réel par département,
mais on peut :
- afficher les **centrales précises** du département + puissance installée,
- répartir la conso régionale au prorata population (estimation assumée),
- ouvrir au clic depuis la vue régionale (double drill-down région → département).

**Effort 🔴 · Wow ⭐⭐⭐** — bonus « waouh il va jusqu'au département », à garder si le
temps le permet après que le niveau région soit solide.

---

## 🔥 Autres features à fort impact

### Time machine — rejouer les dernières 24 h
Un slider en bas qui rejoue la journée en accéléré. L'API eco2mix renvoie
l'historique (`limit=288` = 24 h en pas de 5 min). On **voit le solaire se lever
et se coucher**, la conso bondir à 19 h, le nucléaire constant.
**Effort 🟡 · Wow ⭐⭐⭐⭐** — narratif imparable : « regarde le soleil se lever sur le réseau ».

### Comparateur de pays en direct
Le PRD compare déjà FR/DE/PL en CO₂. Le rendre **live** via l'API ElectricityMaps
ou ENTSO-E : carte Europe miniature, chaque pays coloré par son intensité carbone.
La France brille en bleu (propre), ses voisins en rouge.
**Effort 🔴 · Wow ⭐⭐⭐⭐** — message politique fort, très « énergie ».

### Voix IA réelle (OpenRouter) avec vraie analyse
La voix est locale (robuste). Brancher `openai/gpt-4o-mini` pour des commentaires
qui **réagissent aux vraies variations** (« la conso vient de bondir de 3 GW,
probablement le pic du soir »). Jury OpenAI → montrer un usage *fin* du LLM, pas un
wrapper. Garder le fallback local.
**Effort 🟢 · Wow ⭐⭐⭐**

### Mode « pic de conso » détecté en direct
Comparer conso actuelle vs prévision (`prevision_j1` est dans l'API !). Si
dépassement → alerte visuelle douce + voix. Montre que le réseau est **tendu en ce
moment précis**.
**Effort 🟢 · Wow ⭐⭐⭐**

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
- **Interconnexions** : flux d'import/export aux frontières (l'API a
  `ech_comm_angleterre`, `ech_comm_espagne`…) → flèches entrantes/sortantes animées.

---

## Ordre conseillé

1. **Drill-down régional** (la feature demandée — données réelles, gros wow)
2. **Time machine 24 h** (narratif, effort moyen)
3. **Voix IA réelle** (rapide, marque des points jury OpenAI)
4. Polish au choix selon le temps restant
5. Département / comparateur Europe si tout le reste est solide
