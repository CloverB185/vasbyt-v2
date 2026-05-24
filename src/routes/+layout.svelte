<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { J, KEYS } from '$lib/data/storage';

	let { children } = $props();

	const tabs = [
		{ href: '/',      label: 'Today',  icon: '◈' },
		{ href: '/gym',   label: 'Gym',    icon: '⊕' },
		{ href: '/stats', label: 'Stats',  icon: '▲' },
		{ href: '/log',   label: 'Log',    icon: '≡' },
		{ href: '/body',  label: 'Body',   icon: '◎' }
	];

	onMount(() => {
		// Apply saved theme on every page load
		const t = J<string>(KEYS.theme(), '');
		document.documentElement.dataset.theme = t;
	});
</script>

<main>
	{@render children()}
</main>

<nav class="tab-bar">
	{#each tabs as tab}
		<a
			href={tab.href}
			class="tab-item"
			class:active={$page.url.pathname === tab.href}
			aria-label={tab.label}
		>
			<span class="tab-icon">{tab.icon}</span>
			<span class="tab-label">{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	main {
		max-width: 520px;
		margin: 0 auto;
		padding-bottom: 12px;
	}

	.tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: max(68px, calc(56px + env(safe-area-inset-bottom)));
		background: var(--tabs-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid var(--line);
		display: flex;
		align-items: stretch;
		z-index: 100;
	}

	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		text-decoration: none;
		color: var(--muted);
		font-weight: 700;
		font-size: 11px;
		min-height: 44px;
		padding-bottom: env(safe-area-inset-bottom);
		transition: color 0.15s;
	}

	.tab-item.active {
		color: var(--accent);
	}

	.tab-icon {
		font-size: 18px;
		line-height: 1;
	}

	.tab-label {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
</style>
