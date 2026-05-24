<script lang="ts">
	import { onMount } from 'svelte';
	import { getLogs, type LogEntry } from '$lib/data/program';

	interface DayGroup {
		date: string;
		label: string;
		exercises: { name: string; sets: LogEntry[] }[];
	}

	let days    = $state<DayGroup[]>([]);
	let hasData = $state(false);

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	onMount(() => {
		const logs = getLogs();
		hasData = logs.length > 0;
		if (!hasData) return;

		// Group by date (desc), then by exerciseName
		const byDate = new Map<string, Map<string, LogEntry[]>>();
		for (const l of [...logs].sort((a, b) => b.date.localeCompare(a.date))) {
			if (!byDate.has(l.date)) byDate.set(l.date, new Map());
			const exMap = byDate.get(l.date)!;
			if (!exMap.has(l.exerciseName)) exMap.set(l.exerciseName, []);
			exMap.get(l.exerciseName)!.push(l);
		}

		days = Array.from(byDate.entries()).map(([date, exMap]) => ({
			date,
			label: formatDate(date),
			exercises: Array.from(exMap.entries()).map(([name, sets]) => ({ name, sets }))
		}));
	});
</script>

<svelte:head>
	<title>Log — Vasbyt</title>
</svelte:head>

<div class="log-wrap">

	<div class="log-head">
		<span class="label-sm">LOG</span>
		<h1 class="log-title">Training history</h1>
	</div>

	{#if !hasData}
		<div class="empty">
			<span class="empty-icon">≡</span>
			<p>No sets logged yet.<br />Complete a workout to see your history.</p>
		</div>
	{:else}
		{#each days as day}
			<div class="day-block">
				<div class="day-label">{day.label}</div>
				<div class="day-card">
					{#each day.exercises as ex}
						<div class="ex-row">
							<div class="ex-name">{ex.name}</div>
							<div class="set-chips">
								{#each ex.sets as s, i}
									<span class="chip">
										{i + 1}. {s.weight ? `${s.weight}kg` : 'BW'} × {s.reps}
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}

</div>

<style>
.log-wrap { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; }

.log-head  { padding-bottom: 2px; }
.log-title { font-size: 24px; font-weight: 900; margin-top: 4px; }

.label-sm {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--accent);
}

/* Empty */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 0; text-align: center; }
.empty-icon { font-size: 40px; opacity: .3; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }

/* Day blocks */
.day-block { display: flex; flex-direction: column; gap: 6px; }
.day-label {
	font-size: 12px; font-weight: 800; color: var(--muted);
	text-transform: uppercase; letter-spacing: .04em;
}
.day-card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 16px; overflow: hidden;
}

.ex-row {
	display: flex; flex-direction: column; gap: 6px;
	padding: 12px 14px; border-bottom: 1px solid var(--line);
}
.ex-row:last-child { border-bottom: none; }

.ex-name { font-weight: 800; font-size: 14px; }

.set-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
	font-size: 12px; font-weight: 700; color: var(--muted);
	background: rgba(255,255,255,.05); border: 1px solid var(--line);
	border-radius: 999px; padding: 3px 10px;
}
</style>
