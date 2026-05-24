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
