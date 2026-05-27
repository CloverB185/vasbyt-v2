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

---

## [2026-05-25] — CloverForge Resolves Wrong Profile (taurex) for vasbyt-v2

**Symptom:** `mcp__cloverforge__context` called with `cwd = C:\Users\clove\Documents\vasbyt-v2` returns `profileName: taurex` instead of `vasbyt-v2`. Governance runs under the wrong profile — wrong frozen paths, wrong allowedCommands.
**Root cause:** (1) No `vasbyt-v2.json` profile existed. (2) `taurex.json` used `CLAUDE.md` as its `markerFiles` entry. Since `vasbyt-v2` has a `CLAUDE.md` and taurex loads before vasbyt-v2 alphabetically, taurex matched first. The startup protocol only halts on `isGenericFallback: true` — a wrong non-generic profile silently passes.
**Fix:** Created `C:\Users\clove\cloverforge\profiles\vasbyt-v2.json` with root pointing at vasbyt-v2. Removed `CLAUDE.md` from taurex `markerFiles` (taurex now relies on root path match only). Added vasbyt-v2 project memory and CloverForge section to `CLAUDE.md`. Requires CloverForge MCP server restart to pick up new profile (profiles are cached in memory at startup).
**Files changed:** `C:\Users\clove\cloverforge\profiles\vasbyt-v2.json` (created), `C:\Users\clove\cloverforge\profiles\taurex.json` (markerFiles cleared), `CLAUDE.md` (CloverForge section added), `VASBYT_V2_LESSONS.md`
**Cross-project:** YES — any CloverForge project. markerFiles must be project-specific (e.g. `svelte.config.js`, `wrangler.toml`) — never generic files like `CLAUDE.md` or `package.json` that exist in every project. The startup protocol must verify `profileName` matches expected, not just that it's non-generic.

---

## [2026-05-25] — Gym GIFs (Phase 14): Media Map Structure + GIF Hosting

**Symptom:** GIF block rendered as empty comment (`<!---->`). No GIF visible in gym mode after fetching media map.
**Root cause:** Three layered issues: (1) `workoutx-media-map.json` has a nested structure — exercise IDs are under `m.approved`, not at the root. `gifUrlFor` was reading `mediaMap[id]` instead of `mediaMap.approved[id]`. (2) GIFs are 366MB — cannot be copied into V2 repo. (3) `onerror` collapses the GIF block if the image 404s, making it appear as though `gifUrlFor` returned null.
**Fix:** Store only the approved sub-map on fetch: `mediaMap = m.approved ?? {}`. Point GIF URLs to V1's deployed Cloudflare Pages site (`GIF_BASE = 'https://vasbyt.pages.dev/assets/gifs/'`) — `<img>` tags load cross-domain without CORS. `gifFailed = $state(false)` + `$effect(() => { if (ex) gifFailed = false; })` resets per exercise. Lightbox overlay uses Svelte `$state` (no DOM manipulation) — `onclick` is inline handler per Svelte 5 rules.
**Files changed:** `src/routes/gym/+page.svelte`, `static/data/workoutx-media-map.json`
**Cross-project:** YES — when a JSON data file has nested structure, always inspect the actual shape before writing the lookup function. For large static assets (images, fonts) shared between a V1 and V2 app, reference from the deployed V1 URL rather than duplicating in the repo.

---

## [2026-05-25] — getWeekBounds offset sign: positive = past, not negative

**Symptom:** Frequency chart on Stats tab showed future dates (e.g. "13 Jul") instead of past 8 weeks. Streak was 0 even with historical data.
**Root cause:** `getWeekBounds(n)` in `program.ts` subtracts `n * 7` days from the current Monday. So positive n = weeks in the past, negative n = weeks in the future. Code used `w = -7 to 0` (future), needed `w = 7 downto 0` (past).
**Fix:** Changed `buildFreqChart` loop from `for (let w = -7; w <= 0; w++)` to `for (let w = 7; w >= 0; w--)`. Changed `buildStreak` from `w--` (going more negative) to `w++` (going further back). Confirmed by checking `getWeekBounds` signature at program.ts:728: `mon.setDate(thisMon.getDate() - weeksBack * 7)`.
**Files changed:** `src/routes/stats/+page.svelte`
**Cross-project:** YES — always check the offset convention of date-range helpers before writing loops. Positive/negative conventions vary between libs and codebases.

---

## [2026-05-25] — Phase 15 Stats tab: streak, freq chart, exercise history, AI cards

**Symptom:** Stats tab only had "This Week" and all-time counts — no streak, no history, no trend.
**Root cause:** Phase 15 not yet implemented.
**Fix:** Added `weekSummary` + `currWeekInsight` to `KEYS` in `storage.ts`. Rewrote `stats/+page.svelte` to add: (1) streak counter (consecutive weeks from current going back), (2) 8-week frequency chart using CSS bars (no Chart.js), (3) exercise history section — collapsible per exercise with best weight/reps/vol, mini bar chart of last 8 sessions, trend direction, and 3 recent sets, (4) AI insight cards reading from `KEYS.currWeekInsight()` and `KEYS.weekSummary()`. `calcTrend` ports V1's logic: compare avg of first-3 vs last-3 training dates; >3% = up, <-3% = down.
**Files changed:** `src/lib/data/storage.ts`, `src/routes/stats/+page.svelte`
**Cross-project:** NO

---

## [2026-05-25] — Phase 16 Body tab: weight chart + measurements

**Symptom:** Body tab had no weight history visualisation and no measurements logging.
**Root cause:** Phase 16 not yet implemented.
**Fix:** Added `measurements` key to KEYS in storage.ts. In body/+page.svelte: (1) `buildWeightChart()` reads all check-ins from `KEYS.checkins()` directly via `J()`, filters those with weight, takes last 10, normalises bar heights to min/max range; (2) `loadMeasurements()` / `saveMeasurement()` read/write `Measurement[]` to new key; form shows when no data or `showMForm=true`, history table shows last 5 entries newest-first.
**Files changed:** `src/lib/data/storage.ts`, `src/routes/body/+page.svelte`
**Cross-project:** NO

---

## [2026-05-26] — Phase 17 Log tab: monthly calendar view

**Symptom:** Log tab had no calendar view — just a flat chronological list.
**Root cause:** Phase 17 not yet implemented.
**Fix:** Rewrote log/+page.svelte. Calendar state: `calYear`/`calMonth` ($state), `trained` (Set<string> of all logged dates), `selDate` (selected date). `buildCells(y,m)` computes Mon-first grid with null padding. `$derived` used for `calCells`, `calTitle`, `selDay`, `todayStr`. Tapping a trained day sets `selDate`; tapping same day again clears it. Detail card shows that session's exercises with an accent border. Next-month arrow disabled when at current month. Existing chronological list kept below as "All sessions".
**Files changed:** `src/routes/log/+page.svelte`
**Cross-project:** NO

---

## [2026-05-26] — Phase 18 AI Coach Chat FAB

**Symptom:** No way to talk to an AI coach from within the app.
**Root cause:** Phase 18 not yet implemented.
**Fix:** Added floating action button (FAB) to `+layout.svelte` — present on all non-gym tabs via `{#if !isGym}`. FAB opens a slide-up chat drawer. Script section: `chatOpen`, `chatMsgs`, `chatInput`, `chatLoading`, `chatEl` state vars; `buildChatContext()` injects athlete name, week/day, today's exercises, sets done, last check-in, today's logs into the system prompt; `openChat()` sends a silent "Hey coach!" on first open to get a greeting; `sendMsg()` maintains last-10-message history window; `chatKey()` handles Enter-to-send. Template: `.fab` button, `.chat-backdrop` (tap to dismiss), `.chat-drawer` (65vh, slide-up animation), `.chat-msgs` with coach/user bubble styles, `.chat-input-row`. Key pattern: backdrop is a `<div>` with `onclick` — Svelte a11y warns but build succeeds; this is the same pattern already used in gym page's overlay.
**Files changed:** `src/routes/+layout.svelte`
**Cross-project:** YES — the FAB + drawer pattern (fixed button → backdrop + slide-up panel) works in any Svelte 5 layout. Chat context builder pattern reusable for any app with user state.

---

## [2026-05-26] — Phase 19: Log nav link + Onboarding flow

**Symptom:** (1) Log page at `/log` was built in Phase 17 but not linked from nav — unreachable without typing the URL. (2) New users hit a blank Today screen with no direction.
**Root cause:** Phase 17 added the Log page but never added a tab. Onboarding was never ported from V1.
**Fix:** (1) Added `{ href: '/log', label: 'Log' }` as 5th tab. Updated `.tabs` grid from `repeat(4, 1fr)` to `repeat(5, 1fr)`. Reduced tab font-size 14px → 12px and padding to fit. (2) New `/onboarding/+page.svelte` — 4-step flow: Name → Goal → Equipment → Done. Saves `profile.name + goal` to `KEYS.profile()` and equip to `KEYS.equip()`. Layout `onMount` redirects users with no `profile.name` to `/onboarding` (skips if already on `/onboarding`). Onboarding excluded from app chrome via `isOnboarding = $derived(...)` added to existing `{#if !isGym && !isOnboarding}` guard.
**Files changed:** `src/routes/+layout.svelte`, `src/routes/onboarding/+page.svelte`
**Cross-project:** YES — the redirect-on-empty-name pattern (check in onMount, goto if missing) is the standard SvelteKit onboarding gate. isOnboarding derived from $page.url.pathname is the right way to hide app chrome on special routes.

---

## [2026-05-26] — Phase 20: Resume Workout

**Symptom:** Closing the gym tab mid-session lost all exercise position progress. Sets were saved to KEYS.logs() but the user had to start from exercise 1 on return.
**Root cause:** Gym page had no persistence of exIdx or session state between navigations.
**Fix:** Added `KEYS.resume()` (`vasbytResume.v1`) to storage.ts. Gym page: `saveResume()` writes `{ date: today(), exIdx }` after every `logSet()`, `nextEx()`, `prevEx()`. `clearResume()` called in `finishAll()`. On mount, checks for today's resume state and restores `exIdx` + sets `started = true` if found. Today page: reads resume state in `load()`, sets `hasResume` — swaps Start button to green "Resume Workout →" when active. Sets are already persisted in KEYS.logs() so only position needs saving.
**Files changed:** `src/lib/data/storage.ts`, `src/routes/gym/+page.svelte`, `src/routes/+page.svelte`
**Cross-project:** YES — this pattern (save position key on action, restore on mount, clear on completion) works for any multi-step flow that needs to survive navigation.

---

## [2026-05-26] — Phase 21: AI Routine Builder + Program Import

**Symptom:** No way to generate a custom routine via AI or import an existing program from pasted text.
**Root cause:** Phase 21 not yet implemented.
**Fix:**
- **AI Builder:** Single AI call with profile goal + equipment + user-selected experience/days/length/focus/avoid → JSON program → local fuzzy match (`localMatch()`) + equipment validation (`checkEquipMismatch()`) → review queue for unmatched/mismatched items → `activateBuilderProgram()` converts to SavedRoutine and sets active.
- **Program Import:** Two-step AI pipeline. Step 1 (4k tokens): extract structure from raw pasted text → `{ name, days[] }`. Step 2 (3k tokens): match extracted exercise names to library IDs. Hallucination guard filters any returned ID not in `validIds = new Set(fullLib.map(x => x.id))`. Confidence ≥ 0.7 threshold. Equipment check after matching. Review queue shows unmatched items with "Pick manually" inline search picker. `activateImportProgram()` applies confirmed IDs and activates.
- **My routines section** updated to three-button row: + New routine / ✨ AI Builder / ↑ Import.
- **Bug fix:** `today` was used in settings page backup functions but missing from `storage.ts` import — added.
- Template uses `{@const}` for profile goal + equipLabel (localStorage reads, can't be in `$derived`).
**Files changed:** `src/routes/settings/+page.svelte`
**Cross-project:** YES — two-step AI pipeline pattern (extract structure → match to known IDs → hallucination guard) is the right approach for any AI-powered import with a validated entity library.

**TestX patches (same session):**
- H: `.btn-pick` inline text button (padding:0, min-height:unset) → block button (min-height:44px, width:100%, dashed accent border). Rule: any "trigger" button in a review/picker flow must be a full tap target, not an inline link.
- G: `{#if libState === 'failed'}` warning banner added to both builder form and import input views. Rule: always show a visible error indicator when a silent background load fails — `libState` state variable is the right hook.

---

## [2026-05-26] — Phase 22: Profile completion + standalone weight log

**Symptom:** Profile only stored name + goal. No height, DOB, or target weight. No quick way to log weight without filling in a full check-in.
**Root cause:** Phase 22 not yet implemented.
**Fix:**
- **Settings Profile section expanded**: Height (cm), target weight (kg), DOB added. `saveProfileDetails()` saves all 4 fields to `KEYS.profile()` (same object, additional keys). 2-column layout for height + target weight. No new storage key needed.
- **Body quick weight log**: `logWeight()` reads today's check-in, merges new weight via `saveCheckin({ ...existing, weight: kg })`, refreshes both check-in display and weight chart. Pre-fills from state var. `Enter` key triggers log. Target weight displayed as reference note if set in profile. Weight chart shows target label.
- **Key pattern**: quick weight log merges into today's check-in rather than a separate storage key — no duplicate data, chart reads same source.
**Files changed:** `src/routes/settings/+page.svelte`, `src/routes/body/+page.svelte`
**Cross-project:** NO

**TestX patches (same session):**
- G+H: "Log weight" button gets `disabled={!quickWeight || weightSaved}` + `.btn-log-wt:disabled { opacity:.4 }`. Rule: any log/submit button must be disabled when its required input is empty — silent no-op on click is a G fail.
- D: Profile form "clear" gap resolved with a hint line ("leave blank to keep existing value") rather than a code change. Rule: when "blank = no-op" is the right behaviour, document it inline rather than adding complex clear logic.

---

## [2026-05-26] — Phase 23: Energy & Sleep trend chart on Stats tab

**Symptom:** Stats tab had no visibility into energy or sleep quality trends over time — check-in data was collected on the Body tab but never visualised on Stats.
**Root cause:** Phase 23 not yet implemented.
**Fix:** Added dual-bar chart to `stats/+page.svelte`. `buildEnergyChart()` calls `getRecentCheckins(90)` (imported from program.ts), filters for entries with `energy != null || sleep != null`, reverses to oldest-first, takes last 14 data points. Two bars per date column: energy (teal/accent) and sleep (purple #8b7dea). Bar heights scale linearly: `Math.max(4, Math.round((value / 10) * 48))` (min 4px, max 48px). Empty bar stub (4px, dim) when one field is absent but the other is present. Data-gated: `hasEnergyData = false` if < 2 check-ins with energy/sleep. Placed after the 8-week training frequency chart, before exercise history. Legend uses color dot + label chips.
**Files changed:** `src/routes/stats/+page.svelte`
**Cross-project:** YES — dual-bar chart pattern (two bars per date, paired in a flex row, heights scaled to known range) works for any data that has two parallel 1-N metrics over time.

**TestX patches (same session):**
- G: Section label always visible; `{:else}` branch renders message card + `<a href="/body">` CTA (min-height 44px, chip-bg/chip-border tokens). Rule: data-gated chart sections must show a feature-discovery message + CTA when empty — silent hide is a G fail.
- H: Sleep bar colour `#8b7dea` extracted to `--sleep-color` CSS token in `app.css` (both `:root` and `[data-theme="bloom"]`). Rule: any new semantic chart colour needs a CSS variable, not inline hex — even if the project uses hex for some existing chart colours (gold, trend green/red).

---

## [2026-05-27] — Phase 26: GIF feedback strip in gym

**Symptom:** No way to flag a GIF as wrong or confirm it's correct during a workout.
**Root cause:** Phase 26 not yet implemented.
**Fix:** Added `KEYS.gifFeedback()` (`vasbytGifFeedback.v1`) to `storage.ts` — value is `Record<string, 'ok'|'wrong'>` keyed by exerciseId. In gym: `gifFeedbackVal = $state<'ok'|'wrong'|null>(null)`. `loadGifFeedback()` and `saveGifFeedback(flag)` added; loaded inside the existing `$effect` that fires on exercise change. Feedback strip rendered below the GIF block, gated on `ex && !gifFailed && gifUrlFor(ex.id)` — so it only shows when a GIF is actually visible. `saveGifFeedback` reuses `_voiceFeedback()` for the confirmation toast (no second toast mechanism needed). Buttons use accent / #f47 active states with subtle background fill.
**Files changed:** `src/lib/data/storage.ts`, `src/routes/gym/+page.svelte`
**Cross-project:** YES — reuse `_voiceFeedback()` (or any existing toast) for quick non-blocking feedback on tap interactions rather than adding a second toast system. Gate feedback UI on the same condition as the element it refers to, not a separate boolean.

---

## [2026-05-27] — Phase 25: Per-exercise notes + extra set in gym

**Symptom:** No way to jot form cues or coaching notes during a workout, and no way to add a bonus set after hitting the target.
**Root cause:** Phase 25 not yet implemented.
**Fix:** Added `KEYS.gymNotes()` to `storage.ts` (value: `Record<string,string>` keyed by `{exerciseId}_{date}`). In gym: `targetOverride = $state<number|null>(null)` — `target` derived from override or `ex.sets`. `targetOverride` reset to null inside the `$effect` that fires on exercise change (no separate effect needed — it already tracks `ex`). Note: `noteVal` loaded via `loadNote()` inside the same effect. Note toggle button added to `.target-actions` wrapper in gym-target row (alongside voice). `.btn-next` orphaned selector removed when replacing single CTA with `.next-row` flex layout (`+Set` ghost + full-width primary).
**Files changed:** `src/lib/data/storage.ts`, `src/routes/gym/+page.svelte`
**Cross-project:** YES — `targetOverride` pattern (null = use data default, number = override) is the right way to add user-controlled overrides to a `$derived` value without lifting state. Reset it inside the effect that fires on the same trigger as the derived value.

---

## [2026-05-27] — Phase 24: Check-in pills on Log tab

**Symptom:** Log tab showed workout sets per day but no visibility into how the user felt on training days. Check-in energy/sleep data existed in localStorage but was only visible on the Body tab.
**Root cause:** Phase 24 not yet implemented.
**Fix:** Imported `getCheckins` + `CheckIn` type into `log/+page.svelte`. Built `checkinMap: Map<string, CheckIn>` in `onMount` alongside the log grouping. Added `{@const dci = checkinMap.get(selDay.date)}` in the detail card block and `{@const lci = checkinMap.get(day.date)}` in each list day block. Pills render only when `energy != null || sleep != null` — absent days show nothing. `detail-head` restructured to `detail-head-left` column (date + pills) + close button. List day label wrapped in `day-label-row` flex row. Same `.ci-pill` / `.ci-energy` / `.ci-sleep` token styles used on Stats tab.
**Files changed:** `src/routes/log/+page.svelte`
**Cross-project:** YES — pattern for joining a secondary data source (check-ins) to a primary list (logs) by date key: build a Map in onMount, look up inline with `{@const}` inside each block. Clean, zero extra state vars.

---

## [2026-05-27] — Input boundary: negative reps/weight and decimal reps loggable

**Symptom:** Axe-core input boundary test revealed `reps=-5` enabled the Log Set button and wrote `{reps:-5,weight:9999}` to localStorage. Similarly `weight=-50` and `reps=5.5` passed through without any guard.
**Root cause:** Guard was `disabled={!reps}` and `if (!reps) return`. In JS, `!(-5) === false` — any non-zero number (including negative) is truthy and passes the guard. No `min`/`max`/`step` HTML attributes existed on either number input.
**Fix:** (1) Added `min="1" max="999" step="1"` to reps input; `min="0" max="500" step="0.5"` to weight input. (2) Rewrote `logSet()` guard: `const r = Math.round(Number(reps)); if (!ex || r < 1) return; if (!ex.isBodyweight && Number(weight) < 0) return;` — covers negative, zero, decimal, and empty. (3) Button disabled: `disabled={Math.round(Number(reps)) < 1}`. (4) Added `for`/`id` association on labels to fix a11y label warning.
**Files changed:** `src/routes/gym/+page.svelte`
**Cross-project:** YES — `!value` guard on a number-bound input passes for any truthy number including negatives. Always use `Number(val) < minimum` for numeric guards, not `!val`. Always add `min`/`max`/`step` HTML attributes for browser-level hinting and keyboard behaviour.

---

## [2026-05-27] — WCAG 2.1 AA color contrast: systemic muted/accent token failures

**Symptom:** axe-core audit (WCAG 2.1 AA) flagged 61 nodes across 5 of 6 pages with `color-contrast: serious`. Calendar untrained days 3.17:1, tile labels 4.09:1, accent teal on card bg 4.17:1 — all below the 4.5:1 threshold.
**Root cause:** `--muted: #8a9bb0` and `--accent: #0e9ab8` were too close to the 4.5:1 threshold and dipped below it on slightly lighter card surfaces (`#292d32`). Cal cells used hardcoded `rgba(255,255,255,.35)` which computed to 3.17:1.
**Fix:** `--muted: #9cafc4` (+lightness), `--accent: #10a8cb` (+lightness), bloom `--muted: #e0bcd8`, `.cal-cell` untrained opacity `.35` → `.50`. All pass ≥4.5:1 post-fix. Added `.sr-only` utility class to `app.css`. Added `<h1 class="sr-only">` to active gym section to resolve `page-has-heading-one` violation.
**Files changed:** `src/app.css`, `src/routes/log/+page.svelte`, `src/routes/gym/+page.svelte`
**Cross-project:** YES — always run axe-core on every page before shipping. On dark UIs, `--muted` and even brand accent colors frequently fail WCAG AA on card surfaces. The fix is small (token tweak) but the detection requires an automated tool — visual inspection will miss near-misses like 4.09:1.

---

## [2026-05-27] — VitePWA plugin already installed but icons array was empty

**Symptom:** Production test showed `serviceWorkerRegistered: false` and `iconCount: 0` in manifest. App appeared to have no SW or icons.
**Root cause:** `vite-plugin-pwa` was already installed and generating `sw.js` via workbox generateSW mode. The SW was being generated but `icons: []` in `vite.config.ts` meant the manifest had no icons, preventing install prompts on Chrome/Android. The Playwright SW check used `getRegistrations()` immediately after navigation — timing issue, not a real absence.
**Fix:** Created `static/icon.svg` (dark bg + teal V lettermark, maskable-safe). Updated `vite.config.ts` icons array with SVG entry (`purpose: 'any maskable'`). Added `rel=icon` and `rel=apple-touch-icon` links to `app.html`. PWA precache grew from 30 → 32 entries.
**Files changed:** `static/icon.svg` (new), `vite.config.ts`, `src/app.html`
**Cross-project:** NO — but note: always check `vite.config.ts` before concluding a PWA plugin isn't installed. The build output "PWA v1.3.0 mode generateSW" is the signal. SVG icons work for Chrome/Android modern browsers; for iOS full support, add 192px and 512px PNG icons as well.

---

## [2026-05-27] — PWA iOS icons: SVG apple-touch-icon ignored by Safari

**Symptom:** App installs correctly on Chrome/Android but iOS Safari "Add to Home Screen" shows a generic blank icon.
**Root cause:** Safari ignores `rel=apple-touch-icon` when pointing at an SVG. iOS requires rasterized PNG at specific sizes (192×192 minimum, 512×512 for Retina). The PWA manifest also only had the SVG entry, so Chrome install prompt worked but iOS did not.
**Fix:** Installed `sharp` as devDep. Wrote `scripts/gen-icons.mjs` to rasterize `static/icon.svg` at 192 and 512px via `sharp(svgBuffer).resize(size).png().toFile(outPath)`. Updated `vite.config.ts` icons array: added PNG 192 (`purpose: 'any'`), PNG 512 (`purpose: 'maskable'`), kept SVG (`purpose: 'any'`). Updated `app.html`: `rel=apple-touch-icon` now points to `/icon-192.png` (not SVG). PWA precache grew to 36 entries.
**Files changed:** `static/icon-192.png` (new), `static/icon-512.png` (new), `scripts/gen-icons.mjs` (new), `vite.config.ts`, `src/app.html`
**Cross-project:** YES — sharp rasterizes SVG reliably on Windows (prebuilt binaries, no native compile needed). Pattern: gen-icons script + static PNG output is the right approach for any SvelteKit PWA targeting iOS.

---

## [2026-05-27] — Visual regression CI: Playwright toHaveScreenshot wiring

**Symptom:** No automated screenshot comparison — UI regressions were only caught visually by eye.
**Root cause:** `@playwright/test` not installed, no playwright.config.ts, no tests/ directory.
**Fix:** Installed `@playwright/test` as devDep. Created `playwright.config.ts` with `snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}'`, `devices['iPhone 14 Pro']` viewport (390×844), `webServer.reuseExistingServer: true`. Created `tests/visual-regression.spec.ts` — 7 tab tests, each navigates → `waitForLoadState('networkidle')` → `page.waitForTimeout(300)` (Svelte tick) → `toHaveScreenshot(name, { fullPage: true, maxDiffPixelRatio: 0.03 })`. Ran `--update-snapshots` with dev server live to capture 7 PNG baselines in `tests/snapshots/`. Updated `.sitecheckx.json` playwright layer with one entry (project: chromium, testDir: tests/). Update baselines after any intentional UI change: `npx playwright test --update-snapshots`.
**Files changed:** `playwright.config.ts` (new), `tests/visual-regression.spec.ts` (new), `tests/snapshots/*.png` (7 new baselines), `.sitecheckx.json`, `package.json`
**Cross-project:** YES — `snapshotPathTemplate` override is needed to keep snapshot paths flat and readable. `reuseExistingServer: true` avoids double-starting dev server during development. The `waitForTimeout(300)` after networkidle catches Svelte reactive renders that settle after the load event.

---

## [2026-05-27] — Session briefing: plateau detection + readiness synthesis

**Symptom:** V2's session briefing hints only had two states (ready/not ready). No plateau detection, no energy/sleep synthesis from check-ins — ported from V1 comparison audit.
**Root cause:** `getSessionBriefing()` in `program.ts` was simplified during Phase 8 port. It checked last-session reps vs target but skipped plateau logic and readiness synthesis.
**Fix:** Added plateau detection (3+ distinct sessions spanning 14+ days with flat/declining weight → `isPlateaued: true`). Added readiness synthesis from last 3 check-ins (energy avg < 2.5 or sleep avg < 5 → `takeItEasy: true`). Four-state suggestion logic: plateau (amber) → takeItEasy (muted, same weight) → ready (green, +2.5kg) → default (muted). Added `hint-plateau` CSS class. Added amber recovery banner below exercise list when `takeItEasy` is true. `SessionBriefingEntry` interface extended with `isPlateaued` and `takeItEasy` fields.
**Files changed:** `src/lib/data/program.ts`, `src/routes/+page.svelte`
**Cross-project:** YES — plateau detection pattern (per-date max weight map, sorted dates, span check) works for any exercise progression tracker. Readiness synthesis from last N check-ins (energy + sleep thresholds) is reusable for any wellbeing-aware training app.

---

## [2026-05-27] — Stepper ±buttons for weight and reps inputs in gym

**Symptom:** No ± buttons on weight/reps inputs in gym — users had to type values directly. V1 had stepper buttons that allowed quick up/down adjustment without opening the keyboard.
**Root cause:** Stepper buttons were deferred during the V2 gym port.
**Fix:** Added `adjWeight(delta)` and `adjReps(delta)` functions. `adjWeight` uses `Math.round(v * 2) / 2` to keep values at 0.5kg precision when stepping by ±2.5kg. `adjReps` uses `Math.max(1, ...)` as floor. Wrapped each input in a `.stepper-row` flex container with `−` / `+` buttons on either side. Input changed from `width: 100%` to `flex: 1; min-width: 0` to fill remaining space without overflowing. Step buttons: 44px wide, `var(--touch-lg)` min-height to match input height.
**Files changed:** `src/routes/gym/+page.svelte`
**Cross-project:** YES — pattern for stepper ±buttons around a number input: wrap in flex row, `flex: 1; min-width: 0` on input, rounding trick for float precision (`Math.round(v * 2) / 2` for 0.5 step). Weight decrement floored at 0, reps floored at 1.
