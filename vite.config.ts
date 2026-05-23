import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Vasbyt',
				short_name: 'Vasbyt',
				description: 'Your personal training companion',
				theme_color: '#111417',
				background_color: '#111417',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				icons: []
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
			}
		})
	]
});
