# Handoff

## State
V1→V2 parity gaps G1/G3/G4/G5/G6/G7/G8 all shipped, verified, and pushed — commit 9666b8e on master. VASBYT_V2_LESSONS.md updated with all fixes. Only G2 (supplement tracker) remains from the full parity audit.

## Next
1. **G2 — Supplement tracker** (Settings tab): log daily supplements, mark taken/skipped, streak. Full standalone feature — plan as its own session. No V2 code exists yet.
2. **SitecheckX**: run `.\scripts\sitecheckx.ps1` — visual regression snapshots in `tests/snapshots/` need updating after UI changes to body/stats/log/gym pages (`npx playwright test --update-snapshots`).
3. **Graphify rebuild**: `graphify-out/` is stale — body/stats/log/gym all changed. Run `/graphify . --exclude vault --exclude node_modules --exclude .next` at session start.

## Context
- `getExerciseMuscles(id)` added to `src/lib/data/program.ts` — needed by stats muscle chips (G6).
- Cloudflare auto-deploys on push to master — no manual deploy needed.
- CloverForge exec_run blocked — use Bash/PowerShell directly for git/npm.
- No event modifiers in Svelte 5 — inline handlers only. Always `npm run build` before push.
