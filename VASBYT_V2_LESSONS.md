# VASBYT_V2_LESSONS.md
# Vasbyt V2 (SvelteKit) — Per-project bug fixes, architecture insights, and gotchas.
# Format mirrors APP_BUILD_PLAYBOOK.md §8.

---

## [2026-05-24] — Cloudflare Pages GitHub App Must Be Granted Per-Repo Access

**Symptom:** Push to GitHub does not trigger a Cloudflare Pages deploy. Dashboard shows "This project is disconnected from your Git account."
**Root cause:** The Cloudflare GitHub App installation only had access to the original repo (`CloverB185/vasbyt`). New repo (`vasbyt-v2`) was never granted.
**Fix:** Go to `github.com/settings/installations/<id>` → Repository access → Select repositories → add the new repo → Save. Then push a new commit to trigger the webhook.
**Files changed:** none (GitHub App config)
**Cross-project:** YES — any new Cloudflare Pages project needs explicit repo access granted in the GitHub App settings, even if the App is already installed.

---

## [2026-05-24] — Svelte 5 $derived Does Not React to localStorage Reads

**Symptom:** `$derived` values reading from `getTodaySetsForExercise()` do not update after a log is saved. UI shows stale set counts.
**Root cause:** `$derived` only tracks Svelte reactive state (`$state`). localStorage is not reactive — reads from it inside `$derived` are computed once and never re-run.
**Fix:** Use `$state` for the data array (e.g. `setsToday = $state([])`), update it explicitly after every write (`setsToday = getTodaySetsForExercise(ex.id)`). Never put localStorage reads inside `$derived` expecting reactivity.
**Files changed:** `src/routes/gym/+page.svelte`
**Cross-project:** YES — applies to any SvelteKit/Svelte 5 project reading from localStorage or other non-reactive sources.

---

## [2026-05-24] — Cloudflare Dashboard SPA Does Not Render in Background MCP Tab

**Symptom:** `document.body.innerText` returns only the sidebar nav. Form fields and deploy status never appear. All find/click attempts on dashboard content fail.
**Root cause:** The Cloudflare dashboard is a React SPA that does not render its main content in background/unfocused tabs. The MCP Chrome tab is never brought to the foreground.
**Fix:** Use JavaScript injection (`document.querySelector`, form.submit(), direct API calls) for Cloudflare dashboard interactions. For simple settings, navigate the user manually — it is faster than fighting the SPA.
**Files changed:** none
**Cross-project:** YES — any complex React SPA (Vercel, Netlify, Cloudflare) will have this issue in background MCP tabs.

---

## [2026-05-24] — AI Proxy CORS Must Be Updated for Each New Vasbyt Domain

**Symptom:** AI features (coach note, routine suggest) silently fail on V2. Network tab shows 403 Forbidden from `vasbyt-ai-proxy.clover887.workers.dev`.
**Root cause:** The Cloudflare Worker proxy has a strict CORS allowlist. `vasbyt-v2.pages.dev` was not in it. Requests from any unlisted origin are rejected with 403.
**Fix:** Add `'https://vasbyt-v2.pages.dev'` to `ALLOWED_ORIGINS` in `proxy/index.js`. Also add a preview-deployment regex for `*.vasbyt-v2.pages.dev`. Deploy with `npx wrangler deploy` from the `proxy/` directory.
**Files changed:** `proxy/index.js` (in V1 repo `lischels-workout-app`)
**Cross-project:** YES — any new Vasbyt domain (V3, staging, etc.) needs to be added to the proxy allowlist before AI features will work.

---

## [2026-05-24] — Svelte 5 Event Modifier Syntax Is Invalid (Use Inline Handler)

**Symptom:** `npm run build` fails with `RolldownError: 'onclick|stopPropagation' is not a valid attribute name`. The error only appears at build time — `tsc --noEmit` passes cleanly, giving a false sense of safety.
**Root cause:** Svelte 4 event modifiers (`onclick|stopPropagation`, `onclick|preventDefault`) are not valid in Svelte 5 runes mode. Cloudflare Pages build silently fails (no new deploy), serving the previous version — so the app appears to work but is actually stale.
**Fix:** Replace `onclick|stopPropagation={handler}` with `onclick={(e) => { e.stopPropagation(); handler(); }}`. Always run `npm run build` locally before pushing — never rely on `tsc --noEmit` alone to catch Svelte template errors.
**Files changed:** `src/routes/body/+page.svelte`
**Cross-project:** YES — any Svelte 5 runes-mode project. Affects all modifier forms: `|stopPropagation`, `|preventDefault`, `|once`, `|capture`, etc.

---

## [2026-05-24] — Stale SW Cache After Wrangler Direct Deploy

**Symptom:** After deploying via `npx wrangler pages deploy`, one console error: `Failed to fetch dynamically imported module: .../<old-hash>.js`. Page still renders correctly.
**Root cause:** The PWA service worker caches JS chunk filenames by hash. A direct wrangler deploy changes chunk hashes but the old SW still serves the old names for prefetch requests. The SW auto-updates on the next page load cycle but the first navigation may attempt to fetch a now-gone chunk.
**Fix:** Inject SW clear via browser console or MCP JS tool: `navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister()))).then(() => caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => location.reload(true)))`. This is cosmetic — it does not block functionality.
**Files changed:** none
**Cross-project:** YES — any Vite PWA project deployed with direct CLI (bypassing the normal CI that would evict the old SW).

---

## [2026-05-24] — adapter-cloudflare Build Output Directory

**Symptom:** Cloudflare Pages build succeeds but site is blank or 404.
**Root cause:** Wrong output directory set in Cloudflare Pages config. `adapter-cloudflare` outputs to `.svelte-kit/cloudflare`, not `.svelte-kit/output/client`.
**Fix:** Set build output directory to `.svelte-kit/cloudflare` in Cloudflare Pages → Settings → Builds & deployments.
**Files changed:** Cloudflare Pages dashboard config
**Cross-project:** NO (specific to @sveltejs/adapter-cloudflare)

---

## [2026-05-24] — 12-week Program as Default (Phase 7 Section 1)

**Symptom:** Today tab showed "12-week program exercise list coming in the next build" placeholder. Gym tab showed "No routine active" and was inaccessible without a custom routine.
**Root cause:** `getRoutineDay()` returned `null` when no custom routine was active. Today tab CTA was gated on `routineMode && routineDay`. Gym tab checked `inRoutineMode()` to decide whether to load exercises.
**Fix:** Added `PROGRAM` constant (3 phases × 5 days, 25 exercises with `EX_META` metadata map) to `program.ts`. Modified `getRoutineDay()` to fall back to `getProgramDay(getPhase(getWeek()), day)` when no routine is active — it now always returns a `RoutineDay` (never null). Updated Today tab: removed null guard on `routineDay`, changed CTA from `routineMode && routineDay.exercises.length > 0` to `routineDay.exercises.length > 0`, day title shows program day title. Updated Gym tab: replaced `inRoutineMode()` check with `getRoutineDay(getDay()).exercises.length > 0`.
**Files changed:** `src/lib/data/program.ts`, `src/routes/+page.svelte`, `src/routes/gym/+page.svelte`
**Cross-project:** NO (Vasbyt-specific program data)

---

## [2026-05-24] — Preset Routines in Settings (Phase 7 Section 2)

**Symptom:** Settings tab showed "No custom routine active. Set one up in the live app to sync it here." — users had no way to select a routine in V2.
**Root cause:** No preset routine data existed in V2. The active routine section only handled clearing, not selecting.
**Fix:** Added `PRESET_ROUTINES` constant (4 presets, full `StoredRoutine`-shaped days Records) and 6 compound exercise entries to `EX_META` (`squat`, `bench-press`, `deadlift`, `romanian-deadlift`, `lat-pulldown`, `shoulder-press`). Exported `getPresetRoutines()` and `activatePreset(id)` which writes directly to `KEYS.activeRoutine()`. Settings UI: replaced placeholder with a list of preset cards (name + description + Use button); clicking Use calls `activatePreset()`, flips `hasRoutine` / `routineName` reactively, and shows green ✓ confirmation for 2 seconds. Today tab immediately reflects the preset on next navigation.
**Files changed:** `src/lib/data/program.ts`, `src/routes/settings/+page.svelte`
**Cross-project:** NO (Vasbyt-specific preset data)

---

## [2026-05-24] — Periodization Engine Port (Phase 8)

**Symptom:** V2 had no training intelligence — no volume trend, no stalled exercise detection, no phase transition warnings, no deload signal, no session weight suggestions.
**Root cause:** V1 periodization logic was split across `app-periodization.js` and `app-today.js` using imperative DOM rendering. V2 needed the same logic ported to typed TypeScript functions with Svelte 5 reactive state.
**Fix:** Added `phaseSeen` key to `KEYS` in `storage.ts`. Added 8 new exported functions to `program.ts`: `getWeekBounds()`, `getTonnageForWeek()`, `getStalledExercises()`, `isOverreaching()`, `getPeriodizationInsight()`, `getPhaseTransitionInfo()` / `markPhaseTransitionSeen()`, `getDeloadSignal()`, `getSessionBriefing()`. Updated `+page.svelte` to render 4 cards: phase transition (week 2/6, one-time per profile via `KEYS.phaseSeen`), deload banner (avg energy < 2.5 over 5 check-ins, per-week sessionStorage dismiss), training load card (tonnage trend, stalled exercises, overreaching, per-day sessionStorage dismiss), inline weight suggestions per exercise row. All cards are data-gated — none show on a fresh profile (< 8 weighted sets, no check-ins, not week 2/6).
**Files changed:** `src/lib/data/storage.ts`, `src/lib/data/program.ts`, `src/routes/+page.svelte`
**Cross-project:** NO (Vasbyt-specific logic)

---

## [2026-05-24] — Voice Gym Mode Port (Phase 9)

**Symptom:** V2 gym had no hands-free set logging. V1 `app-voice.js` used DOM selectors (`.set-w-input`, `.set-r-input`, `.set-row-card.pending`) and global `window.__commitRow` / `window.move` bridges that don't exist in a Svelte component.
**Root cause:** V1 voice was tightly coupled to DOM. V2 Svelte uses `$state` bindings — no DOM manipulation needed.
**Fix:** Ported `_voiceProcess()` command parser directly into gym `+page.svelte`. Replaced all DOM manipulation with direct `$state` writes: `weight = wVal`, `reps = rVal`, call `logSet()`, `nextEx()`, `prevEx()`, `stopTimer()`, `finishAll()` directly. Voice button added to the gym-target row (between sets label and set-count). Toast feedback via `voiceToast = $state('')` with 1800ms auto-clear. Cleanup in `onMount` return fn calls `stopVoice()`. `SpeechRecognition` typed as `any` to avoid lib conflicts. Lang: `en-ZA`.
**Files changed:** `src/routes/gym/+page.svelte`
**Cross-project:** YES — same pattern works for any Svelte 5 app needing Web Speech API. Key insight: in Svelte 5, voice commands just set `$state` directly — no DOM bridges needed.

---

## [2026-05-24] — V1 → V2 Shell Visual Alignment (Phase 10)

**Symptom:** V2 launched with a redesigned bottom nav and no branding header. V1 has horizontal pill tabs at top, "Vasbyt · You Can!" header with greeting + W·D·sets counter. User expected exact visual parity.
**Root cause:** V2 shell was written as a fresh SvelteKit design (bottom nav is a common SPA pattern) rather than matching V1's exact layout.
**Fix:** Rewrote `+layout.svelte`: replaced bottom `.tab-bar` nav with V1-style sticky top `.tabs` grid (4 tabs: Today / My Progress / My Body / Log). Added `<header class="hero">` containing the "Vasbyt · You Can!" h1 (with accent glow text-shadow via `--accent-glow` CSS var), time-based greeting, settings gear `<a>`, and W·D·sets pill. Header + tabs hidden on `/gym` route via `isGym = $derived($page.url.pathname === '/gym')` to match V1's full-screen gym shell. Updated `app.css`: added `--accent-glow` var, reduced `padding-bottom` from `max(90px,...)` to `max(20px,...)`, changed side padding 12px → 10px. W·D·sets pill computed in `onMount` via `getWeek()`, `getDay()`, log count for today, and `getRoutineDay(day).exercises.reduce(...)` for total sets.
**Files changed:** `src/routes/+layout.svelte`, `src/app.css`
**Cross-project:** NO (Vasbyt-specific shell structure)

---

## [2026-05-24] — Body Check-In Form Updated to 1-10 Scale (Phase 10B)

**Symptom:** V2 body check-in used energy 1-5 button grid and sleep in hours. V1 uses energy 1-10, sleep quality 1-10, and soreness 0-10 — all text inputs.
**Root cause:** V2 body page was built with a simplified form that didn't match V1's fields or scale.
**Fix:** Updated `CheckIn` interface in `program.ts` to add `soreness?: number`. Changed deload threshold in `getDeloadSignal()` from `< 2.5` to `< 5` (now on 1-10 scale). Updated `body/+page.svelte`: changed `let energy = $state(3)` → `$state('')`, added `let soreness = $state('')`, replaced energy button grid with three number inputs (Energy 1-10 / Sleep quality 1-10 / Soreness 0-10), added `.field-hint` text under each, updated `energyColor()` thresholds to `>= 8` / `>= 5`, updated `energyLabel()` for 1-10 scale, updated logged-today display to show `/10`, updated history pills to show `/10`, updated `submitCheckin()` to pass `soreness`.
**Files changed:** `src/lib/data/program.ts`, `src/routes/body/+page.svelte`
**Cross-project:** NO (Vasbyt-specific check-in schema)

---

## [2026-05-25] — Equipment Filter + Custom Routine Builder (Phase 11)

**Symptom:** V2 Settings had 4 preset routines but no way to build a custom routine or select equipment. Without equipment filter, the exercise picker would show equipment the user doesn't have.
**Root cause:** V1's routine builder (`app-routines.js`) is ~1,600 lines of vanilla JS with DOM manipulation and global window bridges. V2 needed a clean Svelte 5 port.
**Fix:** Added `KEYS.equip()` to storage.ts (mirrors V1 `vasbytEquipment.v1`). V2 stores equipment as a simple chip string (not V1's array of items). Added `RbDay`, `SavedRoutine` types and `getSavedRoutines`, `saveCustomRoutine`, `deleteCustomRoutine`, `activateCustomRoutine` functions to `program.ts`. Settings page: added Equipment chip selector section (8 chips: All/Bodyweight/Dumbbell/Cable/Barbell/Machine/Kettlebell/Band); added My routines section (list + Use/Edit/Delete); added inline routine builder (D1-D7 tabs, Workout/Rest toggle, day title, exercise list with sets/reps/rest inputs, exercise picker). Exercise picker: lazy-loads `static/data/full-library.json` (1,324 exercises, 1.1 MB) only when picker opens; equipment chip filter + search; groups by muscle group; max 200 results shown. `equipMatch()` ported directly from V1's `_rbEquipMatch()`. V1 AI suggest and routine import features not ported (deferred).
**Files changed:** `src/lib/data/storage.ts`, `src/lib/data/program.ts`, `src/routes/settings/+page.svelte`, `static/data/full-library.json`
**Cross-project:** NO (Vasbyt-specific feature)

---

## [2026-05-25] — Today Tab Quick Wins (Phase 13)

**Symptom:** Today tab lacked readiness selector, check-in summary, week momentum chip, and week/day position editor — all present in V1.
**Root cause:** These were never ported from V1's `app-today.js` when V2 was built.
**Fix:** Added 5 exports to `program.ts`: `setWeek()`, `setDay()`, `getReady()`, `setReady()`, `getWeekMomentum()`. Updated `+page.svelte`: (1) Readiness selector — 3 buttons (Good/OK/Tired), saves to `KEYS.ready()`, color-coded active state (green/amber/red); (2) Check-in summary strip — shows today's energy/sleep/soreness fields or "No check-in today → Log it" link; (3) Momentum chip — "N/5 workouts this week" (green, data-gated, hidden at 0); (4) Change button on day header → expands week stepper (‹ Week N ›) + D1–D7 day picker. State restored on `load()`. `handleSetWeek` / `handleSetDay` handlers also refresh `routineDay`, `setsDone`, `setsTotal`, `briefingMap` in one call. `.day-header` flex layout (title flex:1 + Change button) required removing old `margin-bottom: 2px` rule and adding `.day-meta { flex: 1 }`.
**Files changed:** `src/lib/data/program.ts`, `src/routes/+page.svelte`
**Cross-project:** NO (Vasbyt-specific)
