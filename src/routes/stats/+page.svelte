<script lang="ts">
	import { onMount } from 'svelte';
	import { J, KEYS, today } from '$lib/data/storage';
	import { getWeek, getDay, getWeekBounds } from '$lib/data/program';

	interface LogEntry { date: string; exerciseId: string; exerciseName: string; weight: string; reps: string; }
	interface Finish   { date: string; }
	interface PR       { name: string; weight: number; }

	// ── This Week state ───────────────────────────────────────
	let dateRange    = $state('');
	let dayDots      = $state<{ letter: string; done: boolean; isToday: boolean }[]>([]);
	let weekSess     = $state(0);
	let weekSets     = $state(0);
	let weekVol      = $state('—');
	let weekPRs      = $state<PR[]>([]);
	let motivText    = $state('');
	let daysLeft     = $state(0);

	// ── All-time state ────────────────────────────────────────
	let totalSets    = $state(0);
	let totalSess    = $state(0);
	let week         = $state(1);
	let day          = $state(1);
	let hasData      = $state(false);

	onMount(() => {
		week = getWeek();
		day  = getDay();

		const allLogs     = J<LogEntry[]>(KEYS.logs(), []);
		const allFinishes = J<Finish[]>(KEYS.finishes(), []);
		totalSets = allLogs.length;
		totalSess = allFinishes.length;
		hasData   = allLogs.length > 0;

		buildThisWeek(allLogs, allFinishes);
	});

	function buildThisWeek(allLogs: LogEntry[], allFinishes: Finish[]) {
		const { mon, sun } = getWeekBounds(0);
		const todayStr = today();

		// Date range label
		const monDate = new Date(mon + 'T00:00:00');
		const sunDate = new Date(sun + 'T00:00:00');
		const fmt = (d: Date) =>
			d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' });
		dateRange = fmt(monDate) + ' – ' + fmt(sunDate);

		// This-week logs
		const wkLogs = allLogs.filter(l => l.date >= mon && l.date <= sun);
		const wkDays = [...new Set(wkLogs.map(l => l.date))].sort();

		weekSets = wkLogs.length;
		weekSess = [...new Set(
			allFinishes.filter(f => f.date >= mon && f.date <= sun).map(f => f.date)
		)].length || wkDays.length;

		// Volume
		const vol = wkLogs.reduce((s, l) => s + (parseFloat(l.weight) || 0) * (parseInt(l.reps) || 0), 0);
		weekVol = vol > 0 ? (vol >= 1000 ? (vol / 1000).toFixed(1) + 't' : Math.round(vol) + ' kg') : '—';

		// PRs this week
		const before = allLogs.filter(l => l.date < mon && parseFloat(l.weight) > 0);
		const prevBest: Record<string, number> = {};
		before.forEach(l => {
			const w = parseFloat(l.weight) || 0;
			if (!prevBest[l.exerciseId] || w > prevBest[l.exerciseId]) prevBest[l.exerciseId] = w;
		});
		const wkBest: Record<string, { name: string; weight: number }> = {};
		wkLogs.forEach(l => {
			const w = parseFloat(l.weight) || 0;
			if (w > 0 && (!wkBest[l.exerciseId] || w > wkBest[l.exerciseId].weight))
				wkBest[l.exerciseId] = { name: l.exerciseName || l.exerciseId, weight: w };
		});
		weekPRs = Object.entries(wkBest)
			.filter(([id, b]) => !prevBest[id] || b.weight > prevBest[id])
			.map(([, b]) => b);

		// Day dots M–S
		const LETTERS = ['M','T','W','T','F','S','S'];
		dayDots = LETTERS.map((letter, i) => {
			const dt = new Date(monDate); dt.setDate(monDate.getDate() + i);
			const ds = dt.getFullYear() + '-' +
				String(dt.getMonth() + 1).padStart(2, '0') + '-' +
				String(dt.getDate()).padStart(2, '0');
			return { letter, done: wkDays.includes(ds), isToday: ds === todayStr };
		});

		// Motivational text
		if (weekPRs.length > 0)
			motivText = weekPRs.length + ' new personal best' + (weekPRs.length > 1 ? 's' : '') + ' this week — keep building on that!';
		else if (wkDays.length === 0)
			motivText = 'Fresh week ahead — let\'s make it count!';
		else if (wkDays.length === 1)
			motivText = 'Great start — one session in the bag!';
		else if (wkDays.length === 2)
			motivText = 'Two sessions done — you\'re building momentum!';
		else if (wkDays.length === 3)
			motivText = 'Three sessions — strong week in progress!';
		else
			motivText = 'Incredible week — consistency is your superpower!';

		// Days left
		const dow = new Date().getDay();
		daysLeft = dow === 0 ? 0 : 7 - dow;
	}
</script>

<svelte:head>
	<title>My Progress — Vasbyt</title>
</svelte:head>

<div class="page">

	<!-- ── This Week Card ──────────────────────────────────── -->
	<div class="card week-card">
		<div class="week-head">
			<h2>This Week</h2>
			<span class="small">{dateRange}</span>
		</div>

		<!-- Day dots -->
		<div class="dots-row">
			{#each dayDots as d}
				<div class="dot-col">
					<div
						class="dot"
						class:dot-done={d.done}
						class:dot-today={d.isToday && !d.done}
					>{d.done ? '✓' : d.letter}</div>
					<span class="dot-label">{d.letter}</span>
				</div>
			{/each}
		</div>

		<!-- Stats tiles -->
		<div class="tiles">
			<div class="tile">
				<span class="tile-val">{weekSess}</span>
				<span class="tile-lbl">sessions</span>
			</div>
			<div class="tile">
				<span class="tile-val">{weekSets}</span>
				<span class="tile-lbl">sets logged</span>
			</div>
			<div class="tile">
				<span class="tile-val tile-val-sm">{weekVol}</span>
				<span class="tile-lbl">volume</span>
			</div>
		</div>

		<!-- PRs -->
		{#if weekPRs.length > 0}
			<div class="pr-block">
				<div class="pr-title">PRs THIS WEEK</div>
				{#each weekPRs as pr}
					<div class="pr-row">{pr.name} — <b>{pr.weight} kg</b></div>
				{/each}
			</div>
		{/if}

		<!-- Motivational text -->
		<div class="motiv">{motivText}</div>

		<!-- Days left -->
		{#if daysLeft > 0}
			<div class="days-left">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left this week</div>
		{:else}
			<div class="days-left">Week wraps up today</div>
		{/if}
	</div>

	<!-- ── All-time stats ──────────────────────────────────── -->
	{#if hasData}
		<div class="section-label">All time</div>
		<div class="stat-row">
			<div class="stat-card">
				<span class="stat-val">{totalSess}</span>
				<span class="stat-lbl">sessions</span>
			</div>
			<div class="stat-card">
				<span class="stat-val">{totalSets}</span>
				<span class="stat-lbl">sets logged</span>
			</div>
		</div>
	{:else}
		<div class="empty">
			<p>No training data yet.<br />Complete a workout to see your stats.</p>
		</div>
	{/if}

</div>

<style>
.page { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }

/* ── Card base ── */
.card {
	background: var(--card);
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 16px;
}

/* ── This Week ── */
.week-card { display: flex; flex-direction: column; gap: 0; }

.week-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}
.week-head h2 { margin: 0; font-size: 16px; font-weight: 800; }

.small {
	background: rgba(255,255,255,.09);
	border: 1px solid var(--line);
	color: var(--muted);
	border-radius: 999px;
	padding: 5px 9px;
	font-size: 12px;
	font-weight: 800;
}

/* Day dots */
.dots-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin: 0 0 4px;
}
.dot-col { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.dot {
	width: 30px; height: 30px; border-radius: 50%;
	background: rgba(255,255,255,.07);
	border: 2px solid transparent;
	display: flex; align-items: center; justify-content: center;
	font-size: 13px; font-weight: 400;
	color: rgba(255,255,255,.45);
	transition: background 0.2s;
}
.dot.dot-done {
	background: var(--accent);
	color: var(--accent-text);
	font-weight: 700;
}
.dot.dot-today {
	border-color: var(--accent);
	background: rgba(255,255,255,.07);
}
.dot-label { font-size: 10px; color: rgba(255,255,255,.35); }

/* Stat tiles */
.tiles {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 8px;
	margin: 14px 0 0;
}
.tile {
	background: rgba(255,255,255,.05);
	border-radius: 10px;
	padding: 10px 8px;
	text-align: center;
	display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.tile-val { font-size: 22px; font-weight: 700; color: var(--accent); line-height: 1.2; }
.tile-val-sm { font-size: 16px; }
.tile-lbl { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 2px; }

/* PRs */
.pr-block {
	margin-top: 12px;
	padding: 10px 12px;
	background: rgba(247,201,72,.10);
	border-radius: 8px;
	border-left: 3px solid #f7c948;
}
.pr-title { font-size: 12px; font-weight: 700; color: #f7c948; margin-bottom: 6px; }
.pr-row { font-size: 13px; color: rgba(255,255,255,.85); }

/* Motivational */
.motiv {
	margin-top: 14px;
	font-size: 13px;
	color: rgba(255,255,255,.65);
	line-height: 1.5;
	padding: 10px 12px;
	background: rgba(255,255,255,.04);
	border-radius: 8px;
}

.days-left {
	margin-top: 8px;
	font-size: 12px;
	color: rgba(255,255,255,.35);
	text-align: right;
}

/* ── Section label ── */
.section-label {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted);
	margin-top: 4px;
}

/* ── All-time stat row ── */
.stat-row { display: flex; gap: 10px; }
.stat-card {
	flex: 1; display: flex; flex-direction: column; align-items: center;
	gap: 2px; background: var(--card); border: 1px solid var(--line);
	border-radius: 16px; padding: 18px 12px;
}
.stat-val { font-size: 38px; font-weight: 900; color: var(--accent); line-height: 1; }
.stat-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }

/* ── Empty ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; text-align: center; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }
</style>
