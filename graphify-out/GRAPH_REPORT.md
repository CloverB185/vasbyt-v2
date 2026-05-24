# Graph Report - C:/Users/clove/Documents/vasbyt-v2  (2026-05-24)

## Corpus Check
- Corpus is ~10,949 words - fits in a single context window. You may not need a graph.

## Summary
- 133 nodes · 225 edges · 23 communities (15 shown, 8 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Architecture + Config|Architecture + Config]]
- [[_COMMUNITY_Body + AI Analysis Flow|Body + AI Analysis Flow]]
- [[_COMMUNITY_Gym Mode — Active Workout|Gym Mode — Active Workout]]
- [[_COMMUNITY_Core Data Types|Core Data Types]]
- [[_COMMUNITY_Routine + Phase Logic|Routine + Phase Logic]]
- [[_COMMUNITY_Photo Layer — IndexedDB|Photo Layer — IndexedDB]]
- [[_COMMUNITY_Coach Note + Auth Cache|Coach Note + Auth Cache]]
- [[_COMMUNITY_Workout Finish + Progress|Workout Finish + Progress]]
- [[_COMMUNITY_Set Logging + Prefill|Set Logging + Prefill]]
- [[_COMMUNITY_Log Queries|Log Queries]]
- [[_COMMUNITY_Profile Key System|Profile Key System]]
- [[_COMMUNITY_Photo Compression + IDB|Photo Compression + IDB]]
- [[_COMMUNITY_Build Config|Build Config]]
- [[_COMMUNITY_Stats + History Views|Stats + History Views]]
- [[_COMMUNITY_Exercise Type|Exercise Type]]
- [[_COMMUNITY_LogEntry Type|LogEntry Type]]
- [[_COMMUNITY_CheckIn Type|CheckIn Type]]
- [[_COMMUNITY_Phase Calculator|Phase Calculator]]
- [[_COMMUNITY_Body Tab Route|Body Tab Route]]
- [[_COMMUNITY_README|README]]

## God Nodes (most connected - your core abstractions)
1. `J()` - 14 edges
2. `load()` - 11 edges
3. `loadCoachNote()` - 11 edges
4. `getLogs()` - 10 edges
5. `today()` - 9 edges
6. `getDay()` - 8 edges
7. `S()` - 8 edges
8. `saveLog()` - 7 edges
9. `finishWorkout()` - 7 edges
10. `getWeek()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Cloudflare Pages â€” SvelteKit Hosting` --rationale_for--> `+layout.svelte â€” App Shell + Nav`  [INFERRED]
  CLAUDE.md → src/routes/+layout.svelte
- `Svelte 5 Runes Mode â€” $state/$derived/$effect` --rationale_for--> `gym/+page.svelte â€” Gym Mode`  [INFERRED]
  CLAUDE.md → src/routes/gym/+page.svelte
- `VASBYT_V2_LESSONS.md â€” Bug History` --references--> `AI Proxy â€” Gemini via Cloudflare Worker`  [EXTRACTED]
  VASBYT_V2_LESSONS.md → src/routes/+page.svelte
- `load()` --calls--> `getWeek()`  [INFERRED]
  src/routes/+page.svelte → src/lib/data/program.ts
- `loadCoachNote()` --calls--> `getWeek()`  [INFERRED]
  src/routes/+page.svelte → src/lib/data/program.ts

## Hyperedges (group relationships)
- **Data Layer â€” localStorage + IndexedDB + AI Cache** — storage_KEYS, photos_Photo, program_getCachedCoachNote [INFERRED 0.85]
- **Gym Workout Flow** — route_gym, program_saveLog, program_finishWorkout, program_getRoutineDay [EXTRACTED 0.95]
- **Profile Isolation Pattern** — storage_getPID, storage_pKey, storage_KEYS, concept_profileIsolation [INFERRED 0.95]

## Communities (23 total, 8 thin omitted)

### Community 0 - "Architecture + Config"
Cohesion: 0.13
Nodes (23): AI Proxy â€” Gemini via Cloudflare Worker, Cloudflare Pages â€” SvelteKit Hosting, Profile Isolation â€” pKey Namespace Pattern, Svelte 5 Runes Mode â€” $state/$derived/$effect, V1 Data Compatibility â€” Shared localStorage + IDB Keys, CLAUDE.md â€” Project Rules + Stack Spec, VASBYT_V2_LESSONS.md â€” Bug History, Photo Interface â€” IndexedDB Schema (+15 more)

### Community 1 - "Body + AI Analysis Flow"
Cohesion: 0.13
Nodes (13): checkins, d, payload, sevenDaysAgo, text, thirtyDaysAgo, ../app.css, $lib/data/photos (+5 more)

### Community 2 - "Gym Mode — Active Workout"
Cohesion: 0.16
Nodes (16): day, finishAll(), isLast, logSet(), muscles, nextEx(), pct, prevEx() (+8 more)

### Community 3 - "Core Data Types"
Cohesion: 0.27
Nodes (9): CheckIn, Exercise, getCheckins(), getRecentCheckins(), getTodayCheckin(), LogEntry, RoutineDay, saveCheckin() (+1 more)

### Community 4 - "Routine + Phase Logic"
Cohesion: 0.28
Nodes (9): getPhase(), getPhaseName(), getProfileName(), getRoutineDay(), getRoutineName(), getTotalSetsScheduled(), inRoutineMode(), load() (+1 more)

### Community 5 - "Photo Layer — IndexedDB"
Cohesion: 0.43
Nodes (7): compressImage(), loadPhotos(), localDate(), openDB(), Photo, removePhoto(), storePhoto()

### Community 6 - "Coach Note + Auth Cache"
Cohesion: 0.38
Nodes (7): CoachNote, getCachedCoachNote(), saveCoachNote(), undoLastSetToday(), _initProfiles(), S(), today()

### Community 7 - "Workout Finish + Progress"
Cohesion: 0.48
Nodes (7): finishWorkout(), getDay(), getFinishes(), getFinishesThisWeek(), getWeek(), saveLog(), J()

### Community 8 - "Set Logging + Prefill"
Cohesion: 0.33
Nodes (5): getLastRepsForExercise(), getLastWeightForExercise(), getTodaySetsForExercise(), prefill(), setsLoggedFor()

### Community 9 - "Log Queries"
Cohesion: 0.5
Nodes (4): getLogs(), getLogsThisWeek(), getTopExercises(), getTotalSetsToday()

### Community 10 - "Profile Key System"
Cohesion: 0.67
Nodes (3): getPID(), KEYS, pKey()

### Community 11 - "Photo Compression + IDB"
Cohesion: 0.5
Nodes (4): compressImage() â€” Canvas JPEG Resize, loadPhotos() â€” Read All Photos from IDB, openDB() â€” IndexedDB Connection, storePhoto() â€” Compress + Save to IDB

## Knowledge Gaps
- **37 isolated node(s):** `config`, `Photo`, `Exercise`, `RoutineDay`, `LogEntry` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `loadCoachNote()` connect `Routine + Phase Logic` to `Core Data Types`, `Coach Note + Auth Cache`, `Workout Finish + Progress`, `Set Logging + Prefill`, `Log Queries`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `load()` connect `Routine + Phase Logic` to `Set Logging + Prefill`, `Log Queries`, `Workout Finish + Progress`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `prefill()` connect `Set Logging + Prefill` to `Gym Mode — Active Workout`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `load()` (e.g. with `getProfileName()` and `getWeek()`) actually correct?**
  _`load()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `loadCoachNote()` (e.g. with `getCachedCoachNote()` and `getTotalSetsToday()`) actually correct?**
  _`loadCoachNote()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `Photo`, `Exercise` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture + Config` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._