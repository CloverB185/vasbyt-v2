# Graph Report - C:\Users\clove\Documents\vasbyt-v2  (2026-05-25)

## Corpus Check
- Corpus is ~22,320 words - fits in a single context window. You may not need a graph.

## Summary
- 186 nodes · 356 edges · 19 communities (12 shown, 7 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Routine & Program Builder|Routine & Program Builder]]
- [[_COMMUNITY_AI Coach & Project Rules|AI Coach & Project Rules]]
- [[_COMMUNITY_Workout Set Tracking|Workout Set Tracking]]
- [[_COMMUNITY_Check-in & Data Iteration|Check-in & Data Iteration]]
- [[_COMMUNITY_Session Completion & Coaching|Session Completion & Coaching]]
- [[_COMMUNITY_Program Intelligence|Program Intelligence]]
- [[_COMMUNITY_Exercise History Lookup|Exercise History Lookup]]
- [[_COMMUNITY_Photo & Media|Photo & Media]]
- [[_COMMUNITY_Build Config|Build Config]]
- [[_COMMUNITY_Assets & QA|Assets & QA]]
- [[_COMMUNITY_Date Utility|Date Utility]]
- [[_COMMUNITY_Cardio Tab|Cardio Tab]]
- [[_COMMUNITY_Cloudflare Pages Lesson|Cloudflare Pages Lesson]]
- [[_COMMUNITY_SW Version Rule|SW Version Rule]]
- [[_COMMUNITY_Robots Config|Robots Config]]

## God Nodes (most connected - your core abstractions)
1. `J()` - 19 edges
2. `S()` - 16 edges
3. `getLogs()` - 15 edges
4. `load()` - 14 edges
5. `today()` - 12 edges
6. `loadCoachNote()` - 11 edges
7. `+page.svelte â€” Today Tab` - 11 edges
8. `getDay()` - 10 edges
9. `getRoutineDay()` - 8 edges
10. `getWeek()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `SitecheckX Quality Gate Script` --conceptually_related_to--> `Vasbyt Favicon â€” Brand Icon`  [INFERRED]
  scripts/sitecheckx.ps1 → src/lib/assets/favicon.svg
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

## Communities (19 total, 7 thin omitted)

### Community 0 - "Routine & Program Builder"
Cohesion: 0.08
Nodes (33): activateCustomRoutine(), activatePreset(), CheckIn, deleteCustomRoutine(), EX_META, Exercise, getCheckins(), getDeloadSignal() (+25 more)

### Community 1 - "AI Coach & Project Rules"
Cohesion: 0.09
Nodes (29): AI Proxy â€” Coach Note Endpoint, Sealed Modules Rule (CLAUDE.md), Lesson: AI Proxy CORS Must Be Updated Per Domain, Lesson: $derived Won't React to localStorage, Lesson: No Event Modifiers in Svelte 5, savePhoto() â€” IndexedDB Photo Store, getTodayCheckin() / getCheckins(), getDeloadSignal() (+21 more)

### Community 2 - "Workout Set Tracking"
Cohesion: 0.14
Nodes (24): getTodaySetsForExercise(), saveLog(), undoLastSetToday(), finishAll(), isLast, logSet(), muscles, nextEx() (+16 more)

### Community 3 - "Check-in & Data Iteration"
Cohesion: 0.12
Nodes (15): checkins, d, payload, sevenDaysAgo, text, thirtyDaysAgo, ../app.css, $lib/data/photos (+7 more)

### Community 4 - "Session Completion & Coaching"
Cohesion: 0.2
Nodes (21): CoachNote, finishWorkout(), getCachedCoachNote(), getDay(), getFinishes(), getFinishesThisWeek(), getLogsThisWeek(), getPhase() (+13 more)

### Community 5 - "Program Intelligence"
Cohesion: 0.21
Nodes (14): getPhaseName(), getSessionBriefing(), getTotalSetsScheduled(), getTotalSetsToday(), setDay(), setWeek(), today(), _deloadWeekKey() (+6 more)

### Community 6 - "Exercise History Lookup"
Cohesion: 0.24
Nodes (11): getLastRepsForExercise(), getLastWeightForExercise(), getLogs(), getPeriodizationInsight(), getStalledExercises(), getTonnageForWeek(), getTopExercises(), getWeekBounds() (+3 more)

### Community 7 - "Photo & Media"
Cohesion: 0.43
Nodes (7): compressImage(), loadPhotos(), localDate(), openDB(), Photo, removePhoto(), storePhoto()

## Knowledge Gaps
- **48 isolated node(s):** `config`, `Photo`, `Exercise`, `RoutineDay`, `LogEntry` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `load()` connect `Session Completion & Coaching` to `Routine & Program Builder`, `Program Intelligence`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `finishWorkout()` connect `Session Completion & Coaching` to `Routine & Program Builder`, `Workout Set Tracking`, `Program Intelligence`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `loadCoachNote()` connect `Session Completion & Coaching` to `Routine & Program Builder`, `Program Intelligence`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `load()` (e.g. with `getProfileName()` and `getWeek()`) actually correct?**
  _`load()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `today()` (e.g. with `loadPeriodization()` and `dismissPeriCard()`) actually correct?**
  _`today()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `Photo`, `Exercise` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Routine & Program Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._