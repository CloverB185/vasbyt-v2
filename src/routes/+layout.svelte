<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { J, KEYS, today } from '$lib/data/storage';
	import { getWeek, getDay, getRoutineDay } from '$lib/data/program';

	let { children } = $props();

	let greeting    = $state('');
	let profileName = $state('');
	let week        = $state(1);
	let day         = $state(1);
	let doneSets    = $state(0);
	let totalSets   = $state(0);

	const tabs = [
		{ href: '/',      label: 'Today'       },
		{ href: '/stats', label: 'My Progress' },
		{ href: '/body',  label: 'My Body'     },
		{ href: '/log',   label: 'Log'         },
	];

	const isGym = $derived($page.url.pathname === '/gym');

	onMount(() => {
		const t = J<string>(KEYS.theme(), '');
		document.documentElement.dataset.theme = t;

		const h = new Date().getHours();
		greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
		const profile = J<{ name?: string }>(KEYS.profile(), {});
		profileName = profile.name || '';

		week = getWeek();
		day  = getDay();

		const allLogs = J<{ date: string }[]>(KEYS.logs(), []);
		doneSets  = allLogs.filter(l => l.date === today()).length;
		totalSets = getRoutineDay(day).exercises.reduce((s, ex) => s + ex.sets, 0);
	});
</script>

{#if !isGym}
	<header class="hero">
		<div class="hero-left">
			<h1>Vasbyt<span class="you-can">· You Can!</span></h1>
			{#if profileName}
				<div class="hero-greeting">{greeting}, {profileName}</div>
			{/if}
		</div>
		<div class="hero-right">
			<a href="/settings" class="ghost-btn" aria-label="Settings">⚙</a>
			<div class="pill">W{week} · D{day} · {doneSets}/{totalSets}</div>
		</div>
	</header>

	<nav class="tabs">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="tab"
				class:active={$page.url.pathname === tab.href}
			>{tab.label}</a>
		{/each}
	</nav>
{/if}

<main class:gym-shell={isGym}>
	{@render children()}
</main>

<style>
	.hero {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: flex-start;
		padding: 12px 4px 10px;
		max-width: 760px;
		margin: 0 auto;
	}

	.hero-left h1 {
		margin: 0;
		font-size: clamp(26px, 7vw, 40px);
		line-height: 1;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.you-can {
		font-size: 0.6em;
		font-weight: 800;
		color: var(--accent);
		letter-spacing: 0.03em;
		text-shadow: 0 0 14px var(--accent), 0 0 28px var(--accent-glow);
	}

	.hero-greeting {
		font-size: 13px;
		color: var(--muted);
		margin-top: 1px;
	}

	.hero-right {
		display: grid;
		gap: 7px;
		justify-items: end;
		flex-shrink: 0;
	}

	.ghost-btn {
		background: none;
		border: none;
		color: var(--muted);
		font-size: 22px;
		min-height: 44px;
		width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		text-decoration: none;
		border-radius: 10px;
		transition: color 0.15s;
	}
	.ghost-btn:hover { color: var(--accent); }

	.pill {
		white-space: nowrap;
		background: rgba(255, 255, 255, .09);
		border: 1px solid var(--line);
		color: var(--muted);
		border-radius: 999px;
		padding: 7px 9px;
		font-size: 12px;
		font-weight: 800;
	}

	.tabs {
		position: sticky;
		top: 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 7px;
		padding: 8px 0;
		backdrop-filter: blur(14px);
		background: var(--tabs-bg);
		max-width: 760px;
		margin: 0 auto;
	}

	.tab {
		border: 1px solid var(--line);
		color: var(--text);
		background: rgba(255, 255, 255, .08);
		border-radius: 13px;
		padding: 10px 8px;
		min-height: 44px;
		font-weight: 900;
		font-size: 14px;
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		transition: background 0.15s, border-color 0.15s;
	}

	.tab.active {
		background: linear-gradient(135deg, var(--accent), var(--accent-light));
		color: var(--accent-text);
		border-color: transparent;
	}

	.tab:hover:not(.active) {
		border-color: var(--border-strong);
		background: rgba(255, 255, 255, .12);
	}

	main {
		max-width: 760px;
		margin: 0 auto;
		padding-bottom: 12px;
	}

	main.gym-shell {
		max-width: 100%;
		padding-bottom: 0;
	}
</style>
