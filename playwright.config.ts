import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
	use: {
		baseURL: 'http://localhost:5173',
		...devices['iPhone 14 Pro'],
		// Disable animations for stable screenshots
		reducedMotion: 'reduce'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['iPhone 14 Pro'] }
		}
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 30_000
	}
});
