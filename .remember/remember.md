# Handoff

## State
Phase 13 live (commit cd30316): readiness selector, check-in strip, momentum chip, week/day editor all on Today tab. SitecheckX 6/6 PASSED on V2. Graphify graph built: `graphify-out/GRAPH_REPORT.md` + `graph.html` + `graph.json` — read on session start for instant architecture context.

## Next
1. **Phase 14 — Gym GIFs** (START HERE): copy `C:\Users\clove\Documents\lischels-workout-app\site\data\workoutx-media-map.json` → V2 `static/data/workoutx-media-map.json`. Then update `src/routes/gym/+page.svelte` to fetch the map on mount and render GIF above exercise name (tap-to-enlarge). V1 ref: `gifUrlFor(id)` line 77 + `renderVisual(x)` line 108 in `app-gym.js`.
2. **Phase 15 — Stats**: frequency chart, energy chart, exercise history, streak, AI weekly insight. V1 ref: `myProgress()` line 385 + `_stRenderChart()` line 167 in `app-stats.js`.
3. **Phase 16–18**: Body measurements + weight history · Log calendar view · AI Coach Chat FAB.

## Proposed fixes for next session
- **`program.ts` god-file risk**: graph shows 3 distinct concerns in one file — data primitives (`getLogs`, `getCheckins`), routine management (`activatePreset`, `saveCustomRoutine`), training intelligence (`getPeriodizationInsight`, `getDeloadSignal`). Community 0 cohesion 0.08 (lowest). Consider splitting into `routine.ts` + `intelligence.ts` when it gets painful — not urgent yet.
- **48 isolated graph nodes**: types like `Photo`, `Exercise`, `RoutineDay`, `LogEntry` have ≤1 edge — they're used everywhere but not wired in the semantic graph. Low priority, cosmetic.
- **Agent tool model routing broken**: `subagent_type="general-purpose"` keeps defaulting to qwen/qwen3-coder regardless of `model:` param. Graphify semantic extraction had to be done manually in-session. If graphify is re-run, do extraction directly — don't rely on Agent subagents.

## Context
- CloverForge exec_run blocked in vasbyt-v2 — use Bash/PowerShell directly for git/npm
- No event modifiers in Svelte 5 — inline handlers only. Always `npm run build` before push
- V2: `C:\Users\clove\Documents\vasbyt-v2` · V1 ref: `C:\Users\clove\Documents\lischels-workout-app\site\`
- AI proxy CORS: any new V2 domain needs adding to `proxy/index.js` in V1 repo
