import { test, expect } from '@playwright/test';

/**
 * Visual regression suite — 7 main app screens.
 * Baseline snapshots live in tests/snapshots/.
 * To update baselines: npx playwright test --update-snapshots
 */

const TABS = [
	{ name: 'today', path: '/' },
	{ name: 'gym', path: '/gym' },
	{ name: 'log', path: '/log' },
	{ name: 'stats', path: '/stats' },
	{ name: 'body', path: '/body' },
	{ name: 'cardio', path: '/cardio' },
	{ name: 'settings', path: '/settings' }
];

// Wait for fonts + layout to settle before screenshotting
async function waitForReady(page: import('@playwright/test').Page) {
	await page.waitForLoadState('networkidle');
	// Extra tick for Svelte reactive updates
	await page.waitForTimeout(300);
}

for (const { name, path } of TABS) {
	test(`visual: ${name}`, async ({ page }) => {
		await page.goto(path);
		await waitForReady(page);
		await expect(page).toHaveScreenshot(`${name}.png`, {
			fullPage: true,
			maxDiffPixelRatio: 0.03 // 3% tolerance — handles font rendering variance
		});
	});
}
