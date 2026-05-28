# Graph Report - .  (2026-05-28)

## Corpus Check
- 37 files · ~48,272 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 231 nodes · 375 edges · 35 communities (16 shown, 19 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9666b8e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_+page.svelte|+page.svelte]]
- [[_COMMUNITY_PROGRAM|PROGRAM]]
- [[_COMMUNITY_J()|J()]]
- [[_COMMUNITY_getLogs()|getLogs()]]
- [[_COMMUNITY_getWeekMomentum()|getWeekMomentum()]]
- [[_COMMUNITY_+layout.svelte Root Layout|+layout.svelte Root Layout]]
- [[_COMMUNITY_photos.ts|photos.ts]]
- [[_COMMUNITY_Vasbyt v2 Project Instructions|Vasbyt v2 Project Instructions]]
- [[_COMMUNITY_gen-icons.mjs|gen-icons.mjs]]
- [[_COMMUNITY_+layout.svelte|+layout.svelte]]
- [[_COMMUNITY_Onboarding Screen - Name Input|Onboarding Screen - Name Input]]
- [[_COMMUNITY_visual-regression.spec.ts|visual-regression.spec.ts]]
- [[_COMMUNITY_svelte.config.js|svelte.config.js]]
- [[_COMMUNITY_for()|for()]]
- [[_COMMUNITY_today() â€” YYYY-MM-DD Date|today() â€” YYYY-MM-DD Date]]
- [[_COMMUNITY_cardio+page.svelte â€” Cardio Log|cardio/+page.svelte â€” Cardio Log]]
- [[_COMMUNITY_Lesson Cloudflare Pages GitHub App Per-Repo|Lesson: Cloudflare Pages GitHub App Per-Repo]]
- [[_COMMUNITY_SW Version Parity Rule|SW Version Parity Rule]]
- [[_COMMUNITY_Project README|Project README]]
- [[_COMMUNITY_Robots.txt Configuration|Robots.txt Configuration]]
- [[_COMMUNITY_Svelte Logo Favicon|Svelte Logo Favicon]]
- [[_COMMUNITY_PWA Icon 192px|PWA Icon 192px]]
- [[_COMMUNITY_PWA Icon 512px|PWA Icon 512px]]
- [[_COMMUNITY_App Icon SVG|App Icon SVG]]
- [[_COMMUNITY_Body Page Screenshot|Body Page Screenshot]]
- [[_COMMUNITY_Gym Page Screenshot|Gym Page Screenshot]]
- [[_COMMUNITY_Log Page Screenshot|Log Page Screenshot]]
- [[_COMMUNITY_Settings Page Screenshot|Settings Page Screenshot]]
- [[_COMMUNITY_Stats Page Screenshot|Stats Page Screenshot]]
- [[_COMMUNITY_Today Page Screenshot|Today Page Screenshot]]

## God Nodes (most connected - your core abstractions)
1. `PROGRAM` - 71 edges
2. `J()` - 18 edges
3. `getLogs()` - 16 edges
4. `S()` - 16 edges
5. `+page.svelte Today Tab` - 15 edges
6. `today()` - 14 edges
7. `load()` - 14 edges
8. `loadCoachNote()` - 11 edges
9. `getDay()` - 10 edges
10. `getRoutineDay()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Vasbyt v2 Lessons File` --semantically_similar_to--> `Vasbyt v2 Project Instructions`  [INFERRED] [semantically similar]
  VASBYT_V2_LESSONS.md → CLAUDE.md
- `Sealed Modules Rule (CLAUDE.md)` --rationale_for--> `KEYS â€” localStorage Key Map`  [EXTRACTED]
  CLAUDE.md → src/lib/data/storage.ts
- `Lesson: $derived Won't React to localStorage` --rationale_for--> `gym/+page.svelte â€” Gym Mode`  [EXTRACTED]
  VASBYT_V2_LESSONS.md → src/routes/gym/+page.svelte
- `Lesson: No Event Modifiers in Svelte 5` --rationale_for--> `body/+page.svelte â€” My Body`  [EXTRACTED]
  VASBYT_V2_LESSONS.md → src/routes/body/+page.svelte
- `Lesson: AI Proxy CORS Must Be Updated Per Domain` --rationale_for--> `AI Proxy â€” Coach Note Endpoint`  [EXTRACTED]
  VASBYT_V2_LESSONS.md → src/routes/+page.svelte

## Hyperedges (group relationships)
- **localStorage Data Pipeline** — storage_keys, storage_j, storage_s, storage_pkey [EXTRACTED 1.00]
- **Program Position Tracking** — program_getweek, program_setweek, program_getroutineday, route_layout, route_today [INFERRED 0.95]
- **AI Coach Intelligence Layer** — program_getcoachnote, program_getperiodization, program_getdeload, aiproxy_coach, route_today [INFERRED 0.85]
- **Main Application Tabs** — page_today, page_gym, page_log, page_stats, page_body, page_cardio, page_settings [EXTRACTED 1.00]
- **Visual Regression Test Coverage** — visual_regression_spec, page_today, page_gym, page_log, page_stats, page_body, page_cardio, page_settings [EXTRACTED 1.00]
- **Project Governance & Documentation** — vasbyt_v2_claude_md, vasbyt_v2_cloverforge_handover, vasbyt_v2_lessons [INFERRED 0.85]
- **Critical Project Rules (Sealed, Regression, SW Version)** — vasbyt_v2_sealed_modules, vasbyt_v2_integration_regression_table, vasbyt_v2_sw_version_rule [EXTRACTED 1.00]

## Communities (35 total, 19 thin omitted)

### Community 0 - "+page.svelte"
Cohesion: 0.04
Nodes (43): existing, idx, kg, maxV, maxW, Measurement, minV, minW (+35 more)

### Community 1 - "PROGRAM"
Cohesion: 0.08
Nodes (33): activateCustomRoutine(), activatePreset(), deleteCustomRoutine(), EX_META, Exercise, getCheckins(), getRecentCheckins(), getSavedRoutines() (+25 more)

### Community 2 - "J()"
Cohesion: 0.17
Nodes (25): CoachNote, finishWorkout(), getCachedCoachNote(), getDay(), getLogsThisWeek(), getPhase(), getPhaseName(), getPhaseTransitionInfo() (+17 more)

### Community 3 - "getLogs()"
Cohesion: 0.12
Nodes (23): AI Proxy â€” Coach Note Endpoint, getLastRepsForExercise(), getLastWeightForExercise(), getLogs(), getStalledExercises(), getTodaySetsForExercise(), getTonnageForWeek(), getTopExercises() (+15 more)

### Community 4 - "getWeekMomentum()"
Cohesion: 0.12
Nodes (20): getFinishes(), getFinishesThisWeek(), Lesson: $derived Won't React to localStorage, Lesson: No Event Modifiers in Svelte 5, savePhoto() â€” IndexedDB Photo Store, getFinishes() / getFinishesThisWeek(), getLogs() â€” All Workout Logs, getWeekMomentum() (+12 more)

### Community 5 - "+layout.svelte Root Layout"
Cohesion: 0.22
Nodes (16): Sealed Modules Rule (CLAUDE.md), Data Persistence Layer, +layout.svelte Root Layout, body/+page.svelte Body Tab, cardio/+page.svelte Cardio Tab, gym/+page.svelte Gym Tab, log/+page.svelte Log Tab, onboarding/+page.svelte Onboarding Flow (+8 more)

### Community 6 - "photos.ts"
Cohesion: 0.43
Nodes (7): compressImage(), loadPhotos(), localDate(), openDB(), Photo, removePhoto(), storePhoto()

### Community 7 - "Vasbyt v2 Project Instructions"
Cohesion: 0.25
Nodes (8): App Entry Point, Vasbyt v2 Project Instructions, CloverForge Handover Context, Integration Regression Check Matrix, Vasbyt v2 Lessons File, Sealed Modules Concept, SvelteKit Framework, Service Worker Version Sync Rule

### Community 8 - "gen-icons.mjs"
Cohesion: 0.29
Nodes (6): __dirname, outPath, root, sizes, svgBuffer, svgPath

### Community 9 - "+layout.svelte"
Cohesion: 0.29
Nodes (5): ../app.css, $lib/data/program, $lib/data/storage, $app/navigation, $app/stores

### Community 10 - "Onboarding Screen - Name Input"
Cohesion: 0.4
Nodes (5): Name Input Field, Next Navigation Button, Onboarding Screen - Name Input, Tab Progress Bar, Cardio Page Screenshot

## Knowledge Gaps
- **93 isolated node(s):** `config`, `__dirname`, `root`, `svgPath`, `svgBuffer` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PROGRAM` connect `PROGRAM` to `+page.svelte`, `J()`, `getLogs()`, `getWeekMomentum()`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Why does `+page.svelte Today Tab` connect `getLogs()` to `getWeekMomentum()`, `+layout.svelte Root Layout`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `getWeekMomentum()` connect `getWeekMomentum()` to `PROGRAM`, `J()`, `getLogs()`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `+page.svelte Today Tab` (e.g. with `Tab Navigation Pattern` and `Data Persistence Layer`) actually correct?**
  _`+page.svelte Today Tab` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `__dirname`, `root` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._