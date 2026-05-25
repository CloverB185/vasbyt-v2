# Vasbyt V2 — Project CLAUDE.md
# Applies to all sessions in this project.

---

## Project Snapshot

- **Stack:** SvelteKit + TypeScript + Svelte 5 (runes mode). No class components — `$state`, `$derived`, `$effect` only.
- **Adapter:** `@sveltejs/adapter-cloudflare` — build output goes to `.svelte-kit/cloudflare`.
- **PWA:** `vite-plugin-pwa` with `registerType: 'autoUpdate'`. No manual SW version bump needed.
- **Hosting:** Cloudflare Pages. Auto-deploy on push to `master`. GitHub repo: `CloverB185/vasbyt-v2`.
- **Live URL:** `vasbyt-v2.pages.dev`
- **Data layer:** `localStorage` only. Keys mirror V1 exactly (see `src/lib/data/storage.ts`).
- **Current version:** Phase 5 complete. All 5 tabs live: Today (+ AI coach note + ⚙ gear icon), Gym, Stats, Log, Body (check-in). Settings at /settings via gear icon. Phase 6 = photo comparison + AI body analysis.

---

## Architecture

```
src/
  lib/
    data/
      storage.ts   — J(), S(), pKey(), KEYS{}, today()
      program.ts   — all data reads/writes + gym actions
  routes/
    +layout.svelte — bottom tab nav
    +page.svelte   — Today tab
    gym/           — Gym mode (Phase 2)
    stats/         — Stats tab (Phase 3)
    log/           — Log tab (Phase 3)
    settings/      — Settings + Profile (accessible via ⚙ gear icon on Today)
    body/          — Body check-in tab (Phase 5)
```

---

## Key Rules

### localStorage reactivity
`$derived` does NOT react to localStorage. Always use `$state` for data arrays and update explicitly after writes. Example:
```js
let setsToday = $state<LogEntry[]>([]);
// after saveLog():
setsToday = getTodaySetsForExercise(ex.id);
```

### Cloudflare Pages deploys
- Build command: `npm run build`
- Output directory: `.svelte-kit/cloudflare`
- Auto-deploy fires on push to `master` — no manual step needed.
- If deploy stops triggering: check GitHub App access at `github.com/settings/installations`.

### Data layer
- All keys in `KEYS{}` match V1 localStorage keys exactly.
- Profile-aware via `pKey(legacyKey, slug)` — legacy profile `lischel` uses bare keys.
- Never rename or restructure KEYS entries — it's a permanent data loss for installed users.

---

## CloverForge

**Profile name:** `vasbyt-v2`
**Profile file:** `C:\Users\clove\cloverforge\profiles\vasbyt-v2.json`

On every session start, call `mcp__cloverforge__context` with `cwd = C:\Users\clove\Documents\vasbyt-v2` and verify:
- `profileName === "vasbyt-v2"` — if anything else (taurex, generic, onsitepro, etc.) → HALT, do not proceed

If context resolves wrong: check that `C:\Users\clove\cloverforge\profiles\vasbyt-v2.json` exists and that CloverForge MCP server has been restarted since the file was created.

Allowed commands (exec_run): all git, npm run build/check/dev/preview, npx wrangler pages deploy, npx playwright.
Forbidden: git add ., git add -A, rm -rf.

---

## Lessons File

**Location:** `VASBYT_V2_LESSONS.md` in this project root.
The hook auto-discovers it on session start and injects it into context.

**Pre-session checklist:**
1. Confirm `LESSONS LOADED` line appears before any work begins.
2. Before any fix — output `LESSONS MATCH: [entry]` or `LESSONS CHECK: No match`.
3. After any verified non-trivial fix — append entry to `VASBYT_V2_LESSONS.md`. Task is NOT DONE without this.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
