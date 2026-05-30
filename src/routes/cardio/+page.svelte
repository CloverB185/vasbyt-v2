<script lang="ts">
	import { onMount } from 'svelte';
	import { J, S, KEYS, today } from '$lib/data/storage';
	import { getWeek } from '$lib/data/program';

	interface CardioEntry {
		id: string; date: string; type: string;
		duration: number; distance: number | null;
		calories: number | null; rpe: number | null;
		notes: string;
	}

	const TYPES      = ['Walk', 'Run', 'Cycle', 'Row', 'Elliptical', 'Class', 'HIIT', 'Other'];
	const DIST_TYPES = new Set(['Walk', 'Run', 'Cycle', 'Other']);

	const GOALS: Record<number, string> = {};
	(function() {
		for (let i = 1; i <= 12; i++)
			GOALS[i] = i <= 2
				? '20 min: 0-5 easy, 5-15 moderate, 15-20 easy/moderate walk.'
				: i <= 6
				? '20 min: 0-5 easy, 5-17 moderate incline walk, 17-20 easy walk.'
				: '25 min: 0-5 warm-up, 5-20 moderate-to-hard, 20-25 easy walk.';
	})();

	let entries       = $state<CardioEntry[]>([]);
	let selType       = $state('Walk');
	let duration      = $state('');
	let distance      = $state('');
	let calories      = $state('');
	let rpe           = $state('');
	let notes         = $state('');
	let saved         = $state(false);

	let week          = $state(1);
	let thisWeekSess  = $state(0);
	let thisWeekMins  = $state(0);
	let weekBars      = $state<number[]>([]);

	const showDist    = $derived(DIST_TYPES.has(selType));

	onMount(() => {
		week    = getWeek();
		entries = J<CardioEntry[]>(KEYS.cardio(), []).slice().reverse();
		computeWeekStats();
		buildWeekBars();
	});

	function monStr(weeksBack: number): string {
		const now  = new Date();
		const dow  = now.getDay();
		const diff = (dow === 0 ? -6 : 1 - dow) - weeksBack * 7;
		const mon  = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
		return mon.getFullYear() + '-' +
			String(mon.getMonth() + 1).padStart(2, '0') + '-' +
			String(mon.getDate()).padStart(2, '0');
	}

	function computeWeekStats() {
		const mon   = monStr(0);
		const all   = J<CardioEntry[]>(KEYS.cardio(), []);
		const wk    = all.filter(e => e.date >= mon);
		thisWeekSess = wk.length;
		thisWeekMins = wk.reduce((s, e) => s + (e.duration || 0), 0);
	}

	function buildWeekBars() {
		const all = J<CardioEntry[]>(KEYS.cardio(), []);
		weekBars = Array.from({ length: 8 }, (_, i) => {
			const mon = monStr(7 - i);
			const sun = monStr(7 - i - 1 < 0 ? 0 : 6 - i);
			return all
				.filter(e => e.date >= mon)
				.slice(0, 99)
				.reduce((s, e) => s + (e.duration || 0), 0);
		});
	}

	function saveCardio() {
		if (!duration) return;
		const all = J<CardioEntry[]>(KEYS.cardio(), []);
		all.push({
			id:       String(Date.now()),
			date:     today(),
			type:     selType,
			duration: parseInt(duration) || 0,
			distance: distance ? parseFloat(distance) : null,
			calories: calories ? parseInt(calories)   : null,
			rpe:      rpe      ? parseInt(rpe)        : null,
			notes:    notes.trim()
		});
		S(KEYS.cardio(), all);
		duration = ''; distance = ''; calories = ''; rpe = ''; notes = '';
		entries = all.slice().reverse();
		computeWeekStats();
		buildWeekBars();
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function deleteEntry(id: string) {
		const all = J<CardioEntry[]>(KEYS.cardio(), []).filter(e => e.id !== id);
		S(KEYS.cardio(), all);
		entries = all.slice().reverse();
		computeWeekStats();
		buildWeekBars();
	}

	function fmtDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
	}

	const maxBar = $derived(Math.max(...weekBars, 1));
</script>

<svelte:head><title>Cardio — Vasbyt</title></svelte:head>

<div class="page">
<div class="card">

	<!-- Header -->
	<div class="head">
		<h2>Cardio</h2>
		<span class="small">{thisWeekSess} session{thisWeekSess !== 1 ? 's' : ''} this week</span>
	</div>

	<!-- Program goal -->
	<div class="goal-block">
		<div class="goal-label">Week {week} · program goal</div>
		<div class="goal-text">{GOALS[week] ?? GOALS[1]}</div>
	</div>

	<!-- This-week strip -->
	{#if thisWeekMins > 0}
		<div class="week-strip">
			<b>{thisWeekMins} min</b> cardio logged this week{thisWeekSess > 1 ? ` · ${thisWeekSess} sessions` : ''}
		</div>
	{/if}

	<!-- Log form -->
	<div class="section-head"><h3>Log cardio</h3></div>

	<div class="field-group">
		<div class="field-label">Activity</div>
		<div class="chips">
			{#each TYPES as t}
				<button
					class="chip"
					class:chip-active={selType === t}
					onclick={() => (selType = t)}
				>{t}</button>
			{/each}
		</div>
	</div>

	<div class="inputs">
		<label>
			Duration (min)
			<input type="number" min="1" max="360" placeholder="e.g. 30" bind:value={duration} />
		</label>
		{#if showDist}
			<label>
				Distance (km)
				<input type="number" min="0" max="200" step="0.01" placeholder="e.g. 3.5" bind:value={distance} />
			</label>
		{/if}
		<label>
			Calories (optional)
			<input type="number" min="0" max="5000" placeholder="e.g. 250" bind:value={calories} />
		</label>
		<label>
			RPE 1–10 (optional)
			<input type="number" min="1" max="10" placeholder="e.g. 6" bind:value={rpe} />
		</label>
		<label class="full">
			Notes (optional)
			<input type="text" placeholder="e.g. morning walk, felt good" bind:value={notes} />
		</label>
	</div>

	<button class="btn-primary" onclick={saveCardio} disabled={!duration}>
		{saved ? 'Saved ✓' : 'Save cardio session'}
	</button>

	<!-- Weekly minutes bar chart -->
	<div class="section-head"><h3>Weekly minutes</h3></div>
	<div class="bar-chart">
		{#each weekBars as m}
			<div
				class="bar"
				style="height: {Math.round((m / maxBar) * 50) + (m > 0 ? 10 : 2)}px; background: {m > 0 ? 'var(--accent)' : 'rgba(255,255,255,.1)'}"
				title="{m} min"
			></div>
		{/each}
	</div>
	<div class="bar-labels">
		<span>8 wks ago</span><span>this week</span>
	</div>

	<!-- Recent sessions -->
	{#if entries.length > 0}
		<div class="section-head"><h3>Recent sessions</h3></div>
		{#each entries.slice(0, 15) as e}
			<div class="entry">
				<div class="entry-left">
					<span class="entry-type">{e.type}</span>
					<span class="entry-date">{fmtDate(e.date)}</span>
				</div>
				<div class="entry-meta">
					{[
						e.duration ? e.duration + ' min' : null,
						e.distance ? e.distance + ' km'  : null,
						e.calories ? e.calories + ' kcal': null,
						e.rpe      ? 'RPE ' + e.rpe      : null
					].filter(Boolean).join(' · ') || '—'}
				</div>
				{#if e.notes}<div class="entry-notes">{e.notes}</div>{/if}
				<button class="del-btn" onclick={() => deleteEntry(e.id)}>✕</button>
			</div>
		{/each}
	{:else}
		<p class="empty-note">No cardio logged yet.<br>Add your first session above.</p>
	{/if}

</div>
</div>

<style>
.page { padding-top: 8px; }

.card {
	background: var(--card);
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 16px;
}

/* Header */
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.head h2 { margin: 0; font-size: 20px; font-weight: 900; }
.small {
	background: rgba(255,255,255,.09); border: 1px solid var(--line);
	color: var(--muted); border-radius: 999px; padding: 5px 9px;
	font-size: 12px; font-weight: 800;
}

/* Program goal */
.goal-block {
	background: rgba(255,255,255,.04); border-radius: 10px;
	padding: 10px 12px; margin-bottom: 14px;
}
.goal-label { font-size: 11px; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
.goal-text  { font-size: 13px; color: var(--muted); line-height: 1.5; }

/* Week strip */
.week-strip {
	background: rgba(14,154,184,.10); border-radius: 8px;
	padding: 10px 12px; font-size: 13px; color: var(--text); margin-bottom: 14px;
}

/* Section head */
.section-head { margin: 20px 0 10px; }
.section-head h3 { margin: 0; font-size: 15px; font-weight: 800; }

/* Activity chips */
.field-group { margin-bottom: 14px; }
.field-label { font-size: 12px; color: var(--muted); font-weight: 700; margin-bottom: 7px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
	padding: 6px 14px; border-radius: 999px;
	border: 1px solid var(--line);
	background: rgba(255,255,255,.06);
	color: var(--text); font-size: 13px; font-weight: 700;
	min-height: var(--touch); white-space: nowrap;
	transition: background .15s, border-color .15s;
}
.chip-active {
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); border-color: transparent;
}

/* Inputs */
.inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.inputs label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 700; color: var(--muted); }
.inputs input { margin: 0; }
.full { grid-column: 1 / -1; }

/* Save button */
.btn-primary {
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); font-weight: 800;
	width: 100%; min-height: 52px; border-radius: 14px; font-size: 16px;
}
.btn-primary:disabled { opacity: .4; cursor: not-allowed; }

/* Bar chart */
.bar-chart {
	display: flex; align-items: flex-end; gap: 4px; height: 62px; margin-bottom: 4px;
}
.bar { flex: 1; border-radius: 3px 3px 0 0; }
.bar-labels {
	display: flex; justify-content: space-between;
	font-size: 11px; color: var(--muted);
}

/* Recent sessions */
.entry {
	display: grid;
	grid-template-columns: 1fr auto auto;
	grid-template-rows: auto auto;
	gap: 2px 8px;
	padding: 12px 0;
	border-bottom: 1px solid var(--line);
	align-items: start;
}
.entry:last-of-type { border-bottom: none; }
.entry-left { display: flex; align-items: center; gap: 8px; }
.entry-type { font-weight: 800; font-size: 14px; }
.entry-date { font-size: 12px; color: var(--muted); }
.entry-meta { font-size: 13px; color: var(--muted); grid-column: 1; }
.entry-notes { font-size: 12px; color: rgba(255,255,255,.4); grid-column: 1 / -1; font-style: italic; }
.del-btn {
	grid-row: 1; grid-column: 3;
	background: none; color: var(--muted); font-size: 14px;
	min-height: unset; padding: 4px 6px; border-radius: 6px;
}
.del-btn:hover { color: var(--red); }

.empty-note { text-align: center; color: var(--muted); font-size: 14px; line-height: 1.6; margin-top: 24px; padding: 0 0 8px; }
</style>
