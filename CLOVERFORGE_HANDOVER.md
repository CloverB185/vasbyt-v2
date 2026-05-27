# CLOVERFORGE_HANDOVER.md
# Vasbyt V2 — CloverForge Governance Handover Pack
# Version: v1.1
# Date: 2026-05-27
# Purpose: Complete reference for any Claude Code session to correctly load,
#          verify, and operate under CloverForge governance for this project.
#          Accurate as of commit d30f79e (docs: Phase 23 TestX patch lessons)

---

## 1. What CloverForge Is

CloverForge is a local MCP server acting as the governance layer for all
Claude Code sessions on this project.

- **`risk_check`** — pre-flight gate before every file write, exec, or SQL mutation
- **`context`** — resolves the active profile and returns frozen paths + allowed commands
- **`memory_*`** — project-scoped memory that persists across sessions

Without CloverForge active, **no governed write may proceed**.
If CloverForge is not callable: HALT.

---

## 2. Registration

CloverForge is registered as an MCP server in `C:\Users\clove\.claude.json`.
Profile file: `C:\Users\clove\cloverforge\profiles\vasbyt-v2.json`

---

## 3. Active Profile — `vasbyt-v2`

| Field | Value |
|---|---|
| `profileName` | `vasbyt-v2` |
| `profileVersion` | `1.0.0` |
| `cwdRoot` | `C:/Users/clove/Documents/vasbyt-v2` |
| `guardBundleHash` | `19cfef8353f8eaaf` |
| `isGenericFallback` | `false` (must be false — see Lessons if you get taurex) |
| `execBlocked` | `false` |

### 3.1 Frozen Paths (BLOCK on write)
```
**/.env
**/.env.*
**/package-lock.json
```

### 3.2 Allowed Commands (exec whitelist)
```
git status/diff/log/add/commit/push/pull/fetch/checkout/branch/remote/rebase
gh *
npm run build / check / dev / preview / ci
npm install *
node --version
npx wrangler pages deploy *
npx playwright *
```

---

## 4. Session Start Protocol (mandatory — every session)

### Step 1 — Load CloverForge tool schemas
```
ToolSearch → select:mcp__cloverforge__context,mcp__cloverforge__risk_check,
mcp__cloverforge__db_query,mcp__cloverforge__db_schema,mcp__cloverforge__exec_run,
mcp__cloverforge__adapter_run,mcp__cloverforge__log_read,
mcp__cloverforge__monitor_status,mcp__cloverforge__heal_propose,
mcp__cloverforge__recipe_run,mcp__cloverforge__rollback_run,
mcp__cloverforge__memory_list,mcp__cloverforge__memory_read,
mcp__cloverforge__memory_write,mcp__cloverforge__memory_delete,
mcp__cloverforge__memory_reconcile,mcp__cloverforge__search_web
```

### Step 2 — Confirm active profile
```
mcp__cloverforge__context cwd="C:/Users/clove/Documents/vasbyt-v2"
Expected: profileName=vasbyt-v2, isGenericFallback=false
```

### Step 3 — Load lessons
```
Read VASBYT_V2_LESSONS.md in project root
Output: LESSONS LOADED: [N entries] | Ready.
```

### Step 4 — Read this file and CLAUDE.md
Orient before coding.

---

## 5. Known Issues and Fixes

### Issue 1 — CloverForge resolves as `taurex` instead of `vasbyt-v2`
**Root cause:** `taurex.json` had `CLAUDE.md` as markerFile. Fixed: removed from taurex, created vasbyt-v2.json with correct root. If it happens again, restart CloverForge MCP server.

### Issue 2 — ~~`npm run check` exits 1~~ FIXED (2026-05-27)
**Was:** `svelte-check` reported 1 ERROR in `src/routes/gym/+page.svelte:356` — `gifUrlFor(ex.id)` received `string | number` but expected `string`. **Fix:** Changed signature to `gifUrlFor(id: string | number)` with `String(id)` internally. `npm run check` now exits 0 — 0 errors, 17 pre-existing a11y/CSS warnings.

### Issue 3 — Bash tool fails on Windows paths
**Fix:** Always use PowerShell tool for `cd` + commands on Windows. Never mix Bash `cd C:\...` with git commands.

### Issue 4 — PowerShell git commit heredoc syntax
**Fix:** Use `@'...'@` single-quoted heredoc (not bash `$(cat <<'EOF'...)`).

---

## 6. Build Gate

SitecheckX config: `.sitecheckx.json` at project root.
- `npm run check` (svelte-check) — exits 1 due to pre-existing gym.svelte type error. Track but don't block on it.
- `npm run build` — the real gate. Must exit 0 before any commit. Always run this.

Deploy: `git push origin master` → Cloudflare Pages auto-deploys.
Live URL: `https://vasbyt-v2.pages.dev`

---

## 7. Stack

| Item | Value |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 runes |
| Language | TypeScript |
| Build | Vite (via SvelteKit) |
| Hosting | Cloudflare Pages |
| Data | `localStorage` only — no backend, no database |
| AI proxy | `https://vasbyt-ai-proxy.clover887.workers.dev` |
| AI model | `google/gemini-3-flash-preview` |
| Photos | IndexedDB (`vasbytPhotos`) via `src/lib/data/photos.ts` |
| Storage keys | All in `KEYS{}` in `src/lib/data/storage.ts` |

### Critical Svelte 5 rules
- No event modifiers (`:prevent`, `:stop`) — use inline handlers
- Always `onclick={() => handler()}`, never `onclick={handler}` for non-trivial calls
- `$derived` does NOT react to localStorage — use `$state` + explicit refresh
- `npm run build` (not `tsc --noEmit`) is the correct type gate

---

## 8. Current Project State (2026-05-27 · HEAD: d30f79e)

### 8.1 Completed Phases

| Phase | Feature | Status |
|---|---|---|
| 1–12 | Core port (Today, Gym, Stats, Body base, Cardio, Settings base) | ✅ Done |
| 13 | Routine builder (custom routines, preset picker) | ✅ Done |
| 14 | Gym GIFs (media map, lightbox) | ✅ Done |
| 15 | Stats tab (streak, freq chart, exercise history, AI insight) | ✅ Done |
| 16 | Body tab (weight chart from check-ins, measurements) | ✅ Done |
| 17 | Log tab (monthly calendar view, day detail) | ✅ Done |
| 18 | AI Coach Chat FAB (floating button, drawer, context-aware) | ✅ Done + TestX GO |
| 19 | Log nav link + Onboarding flow (4-step: name/goal/equip/done) | ✅ Done |
| 20 | Resume Workout (persist exIdx, restore on reopen, green button) | ✅ Done |
| 21 | AI Routine Builder + Program Import (two-step pipeline, review queue, manual picker) | ✅ Done + TestX GO |
| 22 | Profile completion (height/DOB/target wt) + standalone weight log | ✅ Done + TestX GO |
| 23 | Energy trend chart on Stats (dual-bar energy + sleep, --sleep-color token, empty-state CTA) | ✅ Done + TestX GO |

### 8.2 Pending Phases (priority order)

| Phase | Feature | Notes |
|---|---|---|
| 24 | Log week strip + day detail with check-in data | Log tab shows energy/sleep pills per day alongside workout summary |
| 25 | Per-exercise notes + Extra focus mini loop | Tap exercise in gym → add note; "Add a set" mini loop at end |
| 26 | GIF wrong/confirm feedback | Thumbs up/down on GIF in gym, feeds into media map corrections |

### 8.3 Known Carry Items / Technical Debt

| ID | Item | Impact |
|---|---|---|
| TD-02 | OR_KEY (OpenRouter API key) hardcoded in app-boot.js (V1 project, not V2) | Acknowledged pre-existing |
| TD-03 | Profile field "clear" (empty → save) silently keeps old value | Documented with hint in UI — not a bug, design choice |
| TD-04 | Graphify graph not built for vasbyt-v2 | Run `/graphify . --exclude node_modules` to build at start of architecture-heavy session |

---

## 9. Key File Map

| File | Purpose |
|---|---|
| `src/lib/data/storage.ts` | All localStorage keys (`KEYS{}`), `J()` read, `S()` write, `today()` |
| `src/lib/data/program.ts` | Exercise library, 12-week program, routine types, check-in helpers |
| `src/lib/data/photos.ts` | IndexedDB photo storage |
| `src/routes/+layout.svelte` | Nav tabs, gym/onboarding guards, AI Coach Chat FAB |
| `src/routes/+page.svelte` | Today tab (readiness, briefing, start/resume gym) |
| `src/routes/gym/+page.svelte` | Gym mode (set logging, GIFs, resume) |
| `src/routes/stats/+page.svelte` | Progress tab (streak, freq chart, exercise history, AI) |
| `src/routes/body/+page.svelte` | Body tab (check-in, weight log, AI insight, photos, measurements) |
| `src/routes/cardio/+page.svelte` | Cardio tab (session log, chart) |
| `src/routes/log/+page.svelte` | Log tab (calendar view, day detail) |
| `src/routes/settings/+page.svelte` | Settings (profile, equip, routines, AI builder, import, backup) |
| `src/routes/onboarding/+page.svelte` | 4-step onboarding (name/goal/equip/done) |
| `VASBYT_V2_LESSONS.md` | Per-session bug fixes and architecture lessons |
| `CLOVERFORGE_HANDOVER.md` | This file |

---

## 10. Sealed Modules (NEVER modify without explicit permission)

| Module | Why sealed |
|---|---|
| `KEYS{}` storage constants in `storage.ts` | Rename = data loss for installed PWA users |
| `_PID` / `pKey()` profile isolation in `storage.ts` | Bug here leaks one profile's data to another |

---

## 11. Dev Environment Quick Reference

| Item | Value |
|---|---|
| Dev server | `npm run dev` → `localhost:5173` |
| Build | `npm run build` (must pass before commit) |
| Type check | `npm run check` (svelte-check — exits 1 pre-existing) |
| Deploy | `git push origin master` → auto Cloudflare Pages |
| Live URL | `https://vasbyt-v2.pages.dev` |
| Repo | `https://github.com/CloverB185/vasbyt-v2` |

---

## 12. Governance Rules (binding)

1. **`risk_check` before every governed write.** BLOCK or DEFER = hard stop.
2. **`npm run build` must pass** before any commit.
3. **Sealed files = zero diff.** Never touch KEYS or pKey without explicit permission.
4. **Specific file staging.** `git add <files>` by name only.
5. **Co-Authored-By** on every commit: `Claude Sonnet 4.6 <noreply@anthropic.com>`
6. **Lessons file** updated after every non-trivial fix. Task is NOT DONE without it.

---

## 13. Recommended First Actions in a New Session

```
1. ToolSearch → load CloverForge schemas (§4 Step 1)
2. mcp__cloverforge__context → confirm profileName=vasbyt-v2
3. Read VASBYT_V2_LESSONS.md → output LESSONS LOADED line
4. Read CLOVERFORGE_HANDOVER.md (this file) → §8 for current state
5. State the phase you're working on and proceed
```

---

END OF CLOVERFORGE_HANDOVER.md v1.1
