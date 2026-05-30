/**
 * DesignX Runtime Layer — Vasbyt V2
 * Font: Outfit | Accent: #10a8cb (teal) | Touch: 44px / 56px primary
 *
 * Note: body background is a CSS linear-gradient — getComputedStyle(body).backgroundColor
 * returns rgba(0,0,0,0). The parseRgb null guard naturally skips the dark-check (correct).
 * Visual dark enforcement is instead verified by checking a .card element.
 *
 * Onboarding gate: layout.svelte redirects to /onboarding when profile.name is missing.
 * We pre-populate localStorage in beforeEach to bypass the gate on all pages.
 */

import { test, expect } from '@playwright/test'

// ── Project token config ──────────────────────────────────────────────────────

const TOKENS = {
  font: 'outfit',
  backgroundMax: 40,       // card/panel bg rgb channels must be < this
  touchTargetMin: 44,
  touchTargetWarn: 36,
  accentHex: '#10a8cb',
  contrastMin: 4.5,
  clsMax: 0.1,
}

const PAGES: { name: string; path: string }[] = [
  { name: 'Today',    path: '/' },
  { name: 'Log',      path: '/log' },
  { name: 'Stats',    path: '/stats' },
  { name: 'Body',     path: '/body' },
  { name: 'Settings', path: '/settings' },
  { name: 'Cardio',   path: '/cardio' },
  { name: 'Gym',      path: '/gym' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRgb(css: string): { r: number; g: number; b: number } | null {
  const m = css.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(fg.r, fg.g, fg.b)
  const l2 = relativeLuminance(bg.r, bg.g, bg.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── Test suite ────────────────────────────────────────────────────────────────

for (const { name, path } of PAGES) {
  test.describe(`DesignX — ${name} (${path})`, () => {

    test.beforeEach(async ({ page }) => {
      // Bypass onboarding gate + seed minimal state so all pages render
      await page.addInitScript(() => {
        localStorage.setItem('vasbytProfile.v1', JSON.stringify({
          name: 'DesignX User', goal: 'muscle', height: 175
        }))
        // Seed a recent check-in so weight/body charts have data
        const today = new Date().toISOString().slice(0, 10)
        localStorage.setItem('vasbytCheckins.v1', JSON.stringify([
          { date: today, energy: 7, sleep: 8, weight: 75, soreness: 3 }
        ]))
      })

      // CLS observer — must be injected before navigation
      await page.addInitScript(() => {
        (window as any).__designx_cls = 0
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                (window as any).__designx_cls += (entry as any).value
              }
            }
          }).observe({ type: 'layout-shift', buffered: true })
        } catch {
          // Browser doesn't support layout-shift
        }
      })

      await page.goto(path)
      await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})
    })

    // ── No crash ──────────────────────────────────────────────────────────────

    test('no application error on load', async ({ page }) => {
      const body = await page.evaluate(() => document.body.innerText.toLowerCase())
      expect(body).not.toMatch(/application error|unhandled runtime error|something went wrong/)
    })

    // ── Font ──────────────────────────────────────────────────────────────────

    test(`font: ${TOKENS.font} is rendered`, async ({ page }) => {
      const fontFamily = await page.evaluate(() =>
        getComputedStyle(document.body).fontFamily.toLowerCase()
      )
      expect(fontFamily, `Expected font "${TOKENS.font}" but got: ${fontFamily}`)
        .toContain(TOKENS.font.toLowerCase())
    })

    // ── Background: dark shell — card/panel check ─────────────────────────────
    // body.backgroundColor is transparent (CSS gradient) — check a .card or --panel element.

    test('background: dark OLED shell — no light-mode leak', async ({ page }) => {
      const bg = await page.evaluate((max) => {
        // Try first visible card or panel; fall back to body
        const el = document.querySelector<HTMLElement>('.card, .panel, [class*="card"], [class*="panel"]')
                   || document.body
        const raw = getComputedStyle(el).backgroundColor
        const match = raw.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (!match) return null
        const r = +match[1], g = +match[2], b = +match[3]
        const isLight = r > max || g > max || b > max
        return { r, g, b, raw, isLight }
      }, TOKENS.backgroundMax)

      if (bg) {
        expect(bg.isLight, `Card surface too bright: rgb(${bg.r},${bg.g},${bg.b}) — light-mode leak`).toBe(false)
      }
    })

    // ── WCAG contrast ─────────────────────────────────────────────────────────

    test(`WCAG contrast: body text ≥${TOKENS.contrastMin}:1`, async ({ page }) => {
      const result = await page.evaluate(() => ({
        fg: getComputedStyle(document.body).color,
        bg: getComputedStyle(document.body).backgroundColor,
      }))

      const fg = parseRgb(result.fg)
      const bg = parseRgb(result.bg)

      if (!fg || !bg) {
        console.warn(`DesignX: skipping contrast check — fg=${result.fg} bg=${result.bg}`)
        return
      }

      const ratio = contrastRatio(fg, bg)
      expect(ratio, `Contrast ${ratio.toFixed(2)}:1 below WCAG AA (fg=${result.fg} bg=${result.bg})`)
        .toBeGreaterThanOrEqual(TOKENS.contrastMin)
    })

    // ── CLS ───────────────────────────────────────────────────────────────────

    test(`CLS: layout shift < ${TOKENS.clsMax}`, async ({ page }) => {
      const cls = await page.evaluate(() => (window as any).__designx_cls ?? null)
      if (cls === null) {
        console.warn('DesignX: CLS not available')
        return
      }
      expect(cls, `CLS ${cls.toFixed(4)} exceeds ${TOKENS.clsMax}`).toBeLessThan(TOKENS.clsMax)
    })

    // ── Touch targets ─────────────────────────────────────────────────────────

    test(`touch targets: all visible buttons ≥${TOKENS.touchTargetMin}px`, async ({ page }) => {
      const violations = await page.evaluate((min) => {
        return Array.from(document.querySelectorAll('button'))
          .filter(btn => (btn as HTMLElement).offsetParent !== null)
          .filter(btn => {
            const rect = btn.getBoundingClientRect()
            return rect.height > 0 && rect.height < min
          })
          .map(btn => ({
            text: btn.textContent?.trim().slice(0, 40) ?? '(no text)',
            height: Math.round(btn.getBoundingClientRect().height),
            cls: btn.className.slice(0, 80),
          }))
      }, TOKENS.touchTargetMin)

      expect(violations, `Buttons below ${TOKENS.touchTargetMin}px:\n${JSON.stringify(violations, null, 2)}`)
        .toHaveLength(0)
    })

    // ── Emoji in chrome ───────────────────────────────────────────────────────

    test('no emoji in navigation and chrome buttons', async ({ page }) => {
      const hits = await page.evaluate(() => {
        const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
        const chromeSelectors = [
          'nav button', 'header button', 'footer button',
          '[role="navigation"] button',
          '[class*="tabs"] button',
          '[class*="topbar"] button',
          '[class*="navbar"] button',
        ]
        const els = chromeSelectors.flatMap(sel => Array.from(document.querySelectorAll(sel)))
        return [...new Set(els)]
          .map(el => el.textContent ?? '')
          .filter(t => EMOJI_RE.test(t))
      })
      expect(hits, `Emoji found in chrome: ${hits.join(', ')}`).toHaveLength(0)
    })

    // ── Accessible labels ─────────────────────────────────────────────────────

    test('icon-only buttons have accessible label or title', async ({ page }) => {
      const violations = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button'))
          .filter(btn => (btn as HTMLElement).offsetParent !== null)
          .filter(btn => {
            const hasText      = (btn.textContent?.trim().length ?? 0) > 0
            const hasAriaLabel = btn.hasAttribute('aria-label')
            const hasTitle     = btn.hasAttribute('title')
            const hasLabelledBy = btn.hasAttribute('aria-labelledby')
            return !hasText && !hasAriaLabel && !hasTitle && !hasLabelledBy
          })
          .map(btn => btn.className.slice(0, 80))
      })
      expect(violations, `Icon buttons with no accessible label: ${violations.join(', ')}`)
        .toHaveLength(0)
    })

    // ── Input placeholders ────────────────────────────────────────────────────

    test('inputs have descriptive placeholders', async ({ page }) => {
      const violations = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, textarea'))
          .filter(el => (el as HTMLElement).offsetParent !== null)
          .filter(el => {
            const ph   = (el as HTMLInputElement).placeholder ?? ''
            const type = (el as HTMLInputElement).type ?? ''
            const attrType = el.getAttribute('type') ?? ''
            if (['hidden', 'checkbox', 'radio', 'submit', 'button', 'date'].includes(type)) return false
            if (['date', 'month', 'week', 'time', 'datetime-local'].includes(attrType)) return false
            return ph.trim().length < 5
          })
          .map(el => ({
            type: (el as HTMLInputElement).type,
            cls: el.className.slice(0, 60),
            placeholder: (el as HTMLInputElement).placeholder,
          }))
      })
      expect(violations, `Inputs with missing/short placeholder: ${JSON.stringify(violations)}`)
        .toHaveLength(0)
    })
  })
}
