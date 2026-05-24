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
- **Current version:** Phase 4 complete (Today, Gym, Stats, Log, Settings tabs live). Phase 5 = Body/AI features (Body tab re-added).

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
    settings/      — Settings + Profile tab (Phase 4)
    body/          — stub (Phase 5 — will replace Settings in nav)
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

## Lessons File

**Location:** `VASBYT_V2_LESSONS.md` in this project root.
The hook auto-discovers it on session start and injects it into context.

**Pre-session checklist:**
1. Confirm `LESSONS LOADED` line appears before any work begins.
2. Before any fix — output `LESSONS MATCH: [entry]` or `LESSONS CHECK: No match`.
3. After any verified non-trivial fix — append entry to `VASBYT_V2_LESSONS.md`. Task is NOT DONE without this.
