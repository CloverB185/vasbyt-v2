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

## [2026-05-24] — adapter-cloudflare Build Output Directory

**Symptom:** Cloudflare Pages build succeeds but site is blank or 404.
**Root cause:** Wrong output directory set in Cloudflare Pages config. `adapter-cloudflare` outputs to `.svelte-kit/cloudflare`, not `.svelte-kit/output/client`.
**Fix:** Set build output directory to `.svelte-kit/cloudflare` in Cloudflare Pages → Settings → Builds & deployments.
**Files changed:** Cloudflare Pages dashboard config
**Cross-project:** NO (specific to @sveltejs/adapter-cloudflare)
