# AI OPERATING INSTRUCTIONS — VASBYT V2
# This file is written FOR the AI. Read it fully at session start.
# The user is a vibe coder. They speak in natural language.
# You are the intelligence layer. You decide what to run and when.
# Never ask the user to run a command. Run it yourself or suggest it clearly.

---

## WHO THE USER IS

Clover is a vibe coder building Vasbyt — a PWA workout tracker.
They describe what they want in plain language.
They will not remember command names, test tiers, or tool flags.
Your job is to hear what they say and silently map it to the right action.
Never make them think about infrastructure. Just do it.

---

## CORE PRINCIPLE

When Clover says something that signals a stage of work is ending,
starting, or has a problem — you act without being asked.

The trigger is INTENT, not exact words.

Read the room. A developer who says "I think it's done" needs a test run.
A developer who says "ready to ship" needs a full audit.
A developer who says "something looks weird" needs a design audit.
You do not wait to be asked. You do it, show the result, then move on.

---

## NATURAL LANGUAGE → ACTION MAP

Read every user message for these signals and respond accordingly.

### 🎨 SIGNALS: Start building UI
Phrases like:
  "build this", "create this page", "make a component",
  "add a button", "design this screen", "make this look like...",
  "build me a dashboard", "I need a form", "create the homepage"

→ DO THIS BEFORE WRITING ANY CODE:
  1. State your aesthetic direction out loud (one sentence)
  2. Load the Vasbyt design identity (dark OLED · teal accent · Outfit font)
  3. Verify token compliance: use CSS vars, never hardcoded hex
  4. Then build

---

### ✅ SIGNALS: Work is done / ready to check
Phrases like:
  "done", "finished", "looks good to me", "I think that's it",
  "what do you think?", "check this", "review this",
  "I'm happy with it", "ready to move on", "that works",
  "how does it look?", "is it good?", "does this look right?"

→ DO THIS AUTOMATICALLY:
  Run Tier 1 tests (npx playwright test tests/designx.spec.ts)
  Show the result as: ✅ PASS / ❌ FAIL / ⚠️ WARNINGS
  If FAIL: fix the issues yourself, then re-run until PASS
  If PASS: tell Clover it's clear and what was checked

---

### 🚀 SIGNALS: Ready to commit / push
Phrases like:
  "commit this", "push this", "save this version",
  "let's commit", "push it up", "push to GitHub",
  "I want to save this", "check everything before pushing"

→ DO THIS AUTOMATICALLY:
  1. Run Tier 1 (designx.spec.ts) — fast design gate
  2. Run Tier 2 (/testx via TestX skill) — a11y, boundary, visual regression
  3. Run npm run build — confirm exit 0
  4. Show a combined report
  5. Fix any FAIL findings yourself before confirming the push is clear
  6. Then: git add [specific files] && git commit -m "[message]" && git push

---

### 🌍 SIGNALS: Going live / deploying
Phrases like:
  "let's launch", "ship it", "go live", "deploy this",
  "push to production", "ready to launch", "publish this",
  "make it live", "this is ready", "release it",
  "going live today", "can we launch?", "is it ready to ship?"

⚠️ VASBYT DEPLOY WARNING — READ THIS CAREFULLY:
  Vasbyt deploys to Cloudflare Pages via git push to master.
  There is NO separate deploy step. The moment you push, it ships.
  "git push" IS the deploy. The gate must happen BEFORE git push, not after.

→ DO THIS AUTOMATICALLY — IN THIS ORDER — BEFORE ANY PUSH:
  1. npm run build — must exit 0
  2. Run Tier 1 (designx.spec.ts) — design gate
  3. Run SitecheckX: .\scripts\sitecheckx.ps1 from project root
  4. Show a full report with scores
  5. ONLY run git push if all checks pass
  6. If anything fails: fix it first, then re-run that check

---

### 🐛 SIGNALS: Something is broken
Phrases like:
  "this isn't working", "something broke", "it's broken",
  "there's a bug", "help me fix this", "something's wrong",
  "it was working before", "what happened?", "weird behaviour",
  "the tests are failing", "something changed"

→ DO THIS AUTOMATICALLY:
  1. Check VASBYT_V2_LESSONS.md — grep for keywords from the error
  2. Output: LESSONS MATCH: "[entry]" — applying first
     OR: LESSONS CHECK: No match — fresh diagnosis
  3. Follow 4-phase root cause process — do NOT apply quick fixes
  4. If 3+ fixes fail: stop, question the approach
  5. Run npm run build after fix to confirm resolution

---

### 👁️ SIGNALS: Something looks off visually
Phrases like:
  "it looks weird", "something feels off", "doesn't look right",
  "it looks boring", "make it better", "the design is bad",
  "it looks too generic", "improve the look", "spice it up",
  "the animation is weird", "it feels janky", "something's wrong with the UI"

→ DO THIS AUTOMATICALLY:
  1. Run /designx — full 3-layer audit (code + AI + runtime)
  2. Present specific findings with file:line references
  3. Apply the Critical findings first, Important where feasible
  4. Re-run DesignX until verdict is PASS or PASS WITH WARNINGS

---

### ♿ SIGNALS: Accessibility concern
Phrases like:
  "is it accessible?", "check a11y", "accessibility check",
  "can screen readers use this?", "is it WCAG compliant?",
  "check for accessibility issues", "make it accessible"

→ DO THIS AUTOMATICALLY:
  Run designx.spec.ts — checks contrast, touch targets, labels, emoji
  Run /testx if deeper audit needed — covers WCAG 2.1 AA
  Fix all violations before reporting back

---

### 📸 SIGNALS: Visual regression concern
Phrases like:
  "did anything change visually?", "check for visual regressions",
  "does it still look the same?", "anything look different?",
  "I changed something, check it", "visual check"

→ DO THIS AUTOMATICALLY:
  Run: npx playwright test tests/visual-regression.spec.ts
  If intentional UI changes: npx playwright test --update-snapshots first
  Show diff report — flag any unexpected pixel changes

---

### 🌐 SIGNALS: Offline / PWA concern
Phrases like:
  "does it work offline?", "test offline mode",
  "PWA check", "service worker test", "check the cache",
  "what happens when there's no internet?"

→ DO THIS AUTOMATICALLY:
  1. Check service-worker.js CACHE version matches ?v= in index.html
     (SW version rule: always bump both in the same commit)
  2. Run /testx — includes offline behaviour checks
  3. Flag any gap between SW cache and deployed assets

---

### 🔍 SIGNALS: Full site audit
Phrases like:
  "audit the site", "full check", "run everything",
  "check the whole site", "site health check",
  "how's the site doing?", "full audit before launch"

→ DO THIS AUTOMATICALLY:
  Run SitecheckX: .\scripts\sitecheckx.ps1
  Layers: TypeScript · lint · visual regression · full build
  Present findings by severity — Critical first

---

## PROACTIVE BEHAVIOUR — DO WITHOUT BEING ASKED

These apply in all sessions, regardless of what Clover says:

1. AFTER ANY UI WORK IN A SESSION:
   Run Tier 1 (designx.spec.ts) before ending the session.
   Show the result. Fix anything that fails.

2. BEFORE ANY NEW UI SECTION:
   State the aesthetic direction in one sentence.
   Verify token compliance (no hardcoded hex, use CSS vars).

3. AFTER ANY ANIMATION IS ADDED:
   Check it against the 4 Vasbyt motion rules:
   ≤300ms · ease-out only · no layout properties · no decorative loops

4. WHEN SESSION ENDS WITH UNCOMMITTED WORK:
   Remind Clover: "You have uncommitted changes. Run Tier 1
   before we push?"

5. WHEN A PUSH COMMAND IS DETECTED:
   ⚠️ Cloudflare auto-deploys on push. Never push without
   Tier 1 (designx.spec.ts) + npm run build having passed.
   If they haven't: run them first, then push.

---

## DESIGN STANDARDS — ENFORCED AUTOMATICALLY

Apply these to every UI task. No exceptions. No announcement needed.
Just follow them silently and produce better output.

ALWAYS APPLY:
  - text-wrap: balance on all headings (app.css global h1–h3)
  - font-variant-numeric: tabular-nums on all dynamic values
    (sets, reps, weight, streak counts, stats numbers)
  - -webkit-font-smoothing: antialiased on root (already in app.css)
  - button active state: transform: scale(0.97) on :active
  - Concentric border radius: outer container = inner child + padding
    (e.g. card at border-radius:16px + padding:16px → child at radius:10px ✓)

ANIMATIONS (Vasbyt rules):
  - ≤300ms. ease-out entrance, ease-in exit. No ease-in on entrances.
  - Only animate: opacity, transform. Never width/height/top/left.
  - Ask: does this add meaning or just movement?

NEVER:
  - Hardcoded hex values — use CSS custom properties only
  - Inline styles for anything in the design system
  - Placeholder text or half-built states in shipped UI
  - touch target below 44px (primary CTA: 56px)
  - emoji in navigation chrome

---

## APP TOKENS — VASBYT V2

```
Font:          Outfit (--font: 'Outfit', system-ui)
Background:    #111417 (--bg) · gradient top: #1c2229
               rgb values all < 40 — passes OLED dark check
Accent:        #10a8cb (--accent) — teal, data/CTA only
Accent light:  #0a7a9a (--accent-light)
Touch min:     44px (--touch) / 56px primary (--touch-lg)
Green:         #2fb36d (--green) — success, taken, progress
Amber:         #f5a623 (--amber) — warning, streak
Red:           #e95353 (--red) — danger, skip, delete
Gold:          #f7c948 (--gold) — PR records, streak badge
Sleep:         #8b7dea (--sleep-color) — chart only
Motion max:    300ms · ease-out entrance · no layout props
Theme:         Storm (default) · Bloom (pink variant, same rules)
Never:         Inter/system-ui as primary · box-shadow on cards
               · light mode · purple gradient
```

---

## TEST TIERS — VASBYT REFERENCE

Tier 1 — designx.spec.ts (~90s, 63 tests across 7 pages)
  Checks: font (Outfit), dark background, touch targets ≥44px,
          WCAG contrast, CLS <0.1, accessible labels, placeholders,
          no emoji in chrome, no app crash
  When:   After any UI edit. Before any commit. Auto-run on "done".
  Run:    npx playwright test tests/designx.spec.ts

Tier 2 — TestX skill (~manual)
  Checks: A11y WCAG 2.1 AA, input boundary/edge cases,
          offline behaviour, visual regression
  When:   Before push. Run /testx to trigger.

Visual regression — visual-regression.spec.ts
  Checks: 7-page pixel diff against baseline snapshots
  Run:    npx playwright test tests/visual-regression.spec.ts
  Update: npx playwright test --update-snapshots (after intentional UI changes)

SitecheckX — sitecheckx.ps1
  Layers: TypeScript · svelte typecheck · full build
  Run:    .\scripts\sitecheckx.ps1 from project root
  When:   Before any push to master (Cloudflare auto-deploys on push)

Build gate — npm run build
  Must exit 0 before any commit. No exceptions.
  This is the TypeScript gate — tsc --noEmit is NOT sufficient for Svelte 5.

---

## VASBYT-SPECIFIC RULES

### Deploy = Push (Cloudflare auto-deploy)
  git push origin master → Cloudflare Pages deploys in ~30–60s.
  There is no separate deploy command.
  Every push is a production deploy.
  Run all gates BEFORE pushing, not after.

### Sealed modules (never modify without explicit permission)
  KEYS{} in storage.ts — rename = permanent data loss for PWA users
  pKey() / _PID in storage.ts — bug here leaks profile data

### SW Version Rule
  Every push changing any app-*.js or styles.css must bump:
  const CACHE in service-worker.js + ?v= on all script tags in index.html
  Both in the same commit. Never one without the other.

### Svelte 5 rules
  No event modifiers — inline handlers only: onclick={() => fn()}
  $derived does NOT react to localStorage — use $state + explicit refresh
  npm run build is the type gate, not tsc --noEmit

### Data layer
  localStorage only — no backend, no database
  Photos: IndexedDB via src/lib/data/photos.ts
  Profile-namespaced via pKey() — never bare localStorage keys

---

## REPORTING FORMAT

After any test run, always report like this:

  ── TEST RESULTS: [Tier name] ──────────────
  ✅ Font: Outfit detected correctly
  ✅ Contrast: 7.2:1 (AA pass)
  ❌ Touch targets: 2 elements below 44px — fixing now
  ⚠️  CLS: 0.08 (within limit, close — flagged)

  Verdict: FIXING 1 CRITICAL ISSUE

Then fix the issues automatically. Then re-run. Then show PASS.
Never leave a FAIL result without resolving it in the same session.

---

## WHAT CLOVER NEVER NEEDS TO REMEMBER

These things happen automatically:
  - DesignX runs after any UI session ends
  - Design token rules apply before any code is written
  - Motion audit happens after any animation is added
  - Lessons file is checked before any fix attempt
  - Build gate runs before any commit

These things Claude handles when signalled:
  - Full pre-push audit (Tier 1 + build + SitecheckX)
  - Visual regression (when Clover asks if anything changed)
  - Accessibility (when Clover asks about screen readers or a11y)
  - Debugging (when Clover says something is broken — lessons first)

Clover never needs to say:
  - "npx playwright test tests/designx.spec.ts"
  - "npm run build"
  - ".\scripts\sitecheckx.ps1"
  - "check VASBYT_V2_LESSONS.md"
  - "check my WCAG compliance"

They just say what they mean. You do the rest.

---
END OF INSTRUCTIONS
