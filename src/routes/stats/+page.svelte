<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getWeek,
		getDay,
		getLogs,
		getFinishes,
		getLogsThisWeek,
		getFinishesThisWeek,
		getTopExercises
	} from '$lib/data/program';

	let week        = $state(1);
	let day         = $state(1);
	let totalSets   = $state(0);
	let totalSess   = $state(0);
	let weekSets    = $state(0);
	let weekSess    = $state(0);
	let topEx       = $state<{ name: string; sets: number }[]>([]);
	let hasData     = $state(false);

	onMount(() => {
		week      = getWeek();
		day       = getDay();
		const all = getLogs();
		totalSets = all.length;
		totalSess = getFinishes().length;
		weekSets  = getLogsThisWeek().length;
		weekSess  = getFinishesThisWeek().length;
		topEx     = getTopExercises(6);
		hasData   = all.length > 0;
	});
</script>

<svelte:head>
	<title>Stats — Vasbyt</title>
</svelte:head>

<div class="stats-wrap">

	<!-- Header -->
	<div class="stats-head">
		<span class="label-sm">STATS</span>
		<h1 class="stats-title">Week {week} · Day {day}</h1>
	</div>

	{#if !hasData}
		<!-- Empty state -->
		<div class="empty">
			<span class="empty-icon">▲</span>
			<p>No training data yet.<br />Complete a workout to see your stats.</p>
		</div>
	{:else}
		<!-- This week -->
		<div class="section-label">This week</div>
		<div class="stat-row">
			<div class="stat-card">
				<span class="stat-val">{weekSess}</span>
				<span class="stat-lbl">sessions</span>
			</div>
			<div class="stat-card">
				<span class="stat-val">{weekSets}</span>
				<span class="stat-lbl">sets</span>
			</div>
		</div>

		<!-- All time -->
		<div class="section-label">All time</div>
		<div class="stat-row">
			<div class="stat-card">
				<span class="stat-val">{totalSess}</span>
				<span class="stat-lbl">sessions</span>
			</div>
			<div class="stat-card">
				<span class="stat-val">{totalSets}</span>
				<span class="stat-lbl">sets</span>
			</div>
		</div>

		<!-- Top exercises -->
		{#if topEx.length > 0}
			<div class="section-label">Top exercises</div>
			<div class="card">
				{#each topEx as ex, i}
					<div class="ex-row">
						<span class="ex-rank">{i + 1}</span>
						<span class="ex-name">{ex.name}</span>
						<span class="ex-sets">{ex.sets} sets</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

</div>

<style>
.stats-wrap { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }

.stats-head  { padding-bottom: 2px; }
.stats-title { font-size: 24px; font-weight: 900; margin-top: 4px; }

.label-sm {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--accent);
}

/* Empty */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 0; text-align: center; }
.empty-icon { font-size: 40px; opacity: .3; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }

/* Section label */
.section-label {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted);
	margin-top: 4px;
}

/* Stat row */
.stat-row { display: flex; gap: 10px; }
.stat-card {
	flex: 1; display: flex; flex-direction: column; align-items: center;
	gap: 2px; background: var(--card); border: 1px solid var(--line);
	border-radius: 16px; padding: 18px 12px;
}
.stat-val { font-size: 38px; font-weight: 900; color: var(--accent); line-height: 1; }
.stat-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }

/* Top exercises */
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.ex-row {
	display: flex; align-items: center; gap: 10px;
	padding: 12px 14px; border-bottom: 1px solid var(--line);
}
.ex-row:last-child { border-bottom: none; }
.ex-rank { font-size: 11px; font-weight: 900; color: var(--muted); min-width: 16px; }
.ex-name { flex: 1; font-weight: 700; font-size: 14px; }
.ex-sets { font-size: 12px; font-weight: 800; color: var(--accent); }
</style>
