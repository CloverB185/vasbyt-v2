<script lang="ts">
	import { onMount } from 'svelte';
	import { J, KEYS, today } from '$lib/data/storage';
	import { getWeek, getDay, getWeekBounds, getRecentCheckins, type CheckIn } from '$lib/data/program';

	interface LogEntry { date: string; exerciseId: string; exerciseName: string; weight: string; reps: string; }
	interface Finish   { date: string; }
	interface PR       { name: string; weight: number; }
	interface FreqBar  { day: string; month: string; count: number; height: number; }
	interface ExHist {
		id: string; name: string;
		bestWeight: number; bestReps: string; totalVol: number; sessions: number;
		trend: { direction: 'up' | 'flat' | 'down'; delta: number } | null;
		recentSets: LogEntry[];
		miniBar: number[];
		open: boolean;
	}

	// ── This Week state ───────────────────────────────────────
	let dateRange    = $state('');
	let dayDots      = $state<{ letter: string; done: boolean; isToday: boolean }[]>([]);
	let weekSess     = $state(0);
	let weekSets     = $state(0);
	let weekVol      = $state('—');
	let weekPRs      = $state<PR[]>([]);
	let motivText    = $state('');
	let daysLeft     = $state(0);

	// ── Energy / Sleep chart ──────────────────────────────────
	interface EnergyBar { day: string; month: string; energy: number | null; sleep: number | null; eH: number; sH: number; }
	let energyBars    = $state<EnergyBar[]>([]);
	let hasEnergyData = $state(false);

	// ── Extended state ────────────────────────────────────────
	let totalSets    = $state(0);
	let totalSess    = $state(0);
	let week         = $state(1);
	let day          = $state(1);
	let hasData      = $state(false);
	let streak       = $state(0);
	let freqBars     = $state<FreqBar[]>([]);
	let exHistory    = $state<ExHist[]>([]);
	let aiThisWeek   = $state('');
	let aiLastWeek   = $state('');

	onMount(() => {
		week = getWeek();
		day  = getDay();

		const allLogs     = J<LogEntry[]>(KEYS.logs(), []);
		const allFinishes = J<Finish[]>(KEYS.finishes(), []);
		totalSets = allLogs.length;
		totalSess = allFinishes.length;
		hasData   = allLogs.length > 0;

		buildThisWeek(allLogs, allFinishes);
		buildStreak(allFinishes);
		buildFreqChart(allFinishes);
		buildExHistory(allLogs);
		buildEnergyChart();

		aiThisWeek = extractInsight(J<unknown>(KEYS.currWeekInsight(), null));
		aiLastWeek = extractInsight(J<unknown>(KEYS.weekSummary(), null));
	});

	function extractInsight(raw: unknown): string {
		if (!raw) return '';
		if (typeof raw === 'string') return raw;
		if (typeof raw === 'object' && raw !== null && 'text' in raw)
			return String((raw as { text: unknown }).text);
		return '';
	}

	function buildThisWeek(allLogs: LogEntry[], allFinishes: Finish[]) {
		const { mon, sun } = getWeekBounds(0);
		const todayStr = today();

		const monDate = new Date(mon + 'T00:00:00');
		const sunDate = new Date(sun + 'T00:00:00');
		const fmt = (d: Date) => d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' });
		dateRange = fmt(monDate) + ' – ' + fmt(sunDate);

		const wkLogs = allLogs.filter(l => l.date >= mon && l.date <= sun);
		const wkDays = [...new Set(wkLogs.map(l => l.date))].sort();

		weekSets = wkLogs.length;
		weekSess = [...new Set(
			allFinishes.filter(f => f.date >= mon && f.date <= sun).map(f => f.date)
		)].length || wkDays.length;

		const vol = wkLogs.reduce((s, l) => s + (parseFloat(l.weight) || 0) * (parseInt(l.reps) || 0), 0);
		weekVol = vol > 0 ? (vol >= 1000 ? (vol / 1000).toFixed(1) + 't' : Math.round(vol) + ' kg') : '—';

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

		const LETTERS = ['M','T','W','T','F','S','S'];
		dayDots = LETTERS.map((letter, i) => {
			const dt = new Date(monDate); dt.setDate(monDate.getDate() + i);
			const ds = dt.getFullYear() + '-' +
				String(dt.getMonth() + 1).padStart(2, '0') + '-' +
				String(dt.getDate()).padStart(2, '0');
			return { letter, done: wkDays.includes(ds), isToday: ds === todayStr };
		});

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

		const dow = new Date().getDay();
		daysLeft = dow === 0 ? 0 : 7 - dow;
	}

	function buildStreak(allFinishes: Finish[]) {
		let s = 0, w = 0;
		while (w < 52) {
			const { mon, sun } = getWeekBounds(w);
			if (allFinishes.some(f => f.date >= mon && f.date <= sun)) { s++; w++; }
			else break;
		}
		streak = s;
	}

	function buildFreqChart(allFinishes: Finish[]) {
		const raw: { day: string; month: string; count: number }[] = [];
		for (let w = 7; w >= 0; w--) {
			const { mon, sun } = getWeekBounds(w);
			const monDate = new Date(mon + 'T00:00:00');
			const count = [...new Set(
				allFinishes.filter(f => f.date >= mon && f.date <= sun).map(f => f.date)
			)].length;
			raw.push({
				day:   String(monDate.getDate()),
				month: monDate.toLocaleString('en', { month: 'short' }),
				count
			});
		}
		const maxCount = Math.max(...raw.map(b => b.count), 1);
		freqBars = raw.map(b => ({
			...b,
			height: b.count === 0 ? 4 : Math.max(8, Math.round((b.count / maxCount) * 56))
		}));
	}

	function calcTrend(eid: string, allLogs: LogEntry[]): { direction: 'up' | 'flat' | 'down'; delta: number } | null {
		const rows = allLogs.filter(l => l.exerciseId === eid && parseFloat(l.weight) > 0);
		if (!rows.length) return null;
		const byDate: Record<string, number> = {};
		rows.forEach(r => {
			const w = parseFloat(r.weight) || 0;
			if (!byDate[r.date] || w > byDate[r.date]) byDate[r.date] = w;
		});
		const dates = Object.keys(byDate).sort();
		if (dates.length < 3) return null;
		const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
		const firstAvg = avg(dates.slice(0, 3).map(d => byDate[d]));
		const lastAvg  = avg(dates.slice(-3).map(d => byDate[d]));
		const delta = lastAvg - firstAvg;
		const pct   = firstAvg > 0 ? (delta / firstAvg) * 100 : 0;
		return {
			direction: pct > 3 ? 'up' : pct < -3 ? 'down' : 'flat',
			delta: Math.abs(Math.round(delta * 10) / 10)
		};
	}

	function buildExHistory(allLogs: LogEntry[]) {
		const byEx: Record<string, LogEntry[]> = {};
		allLogs.forEach(l => {
			if (!byEx[l.exerciseId]) byEx[l.exerciseId] = [];
			byEx[l.exerciseId].push(l);
		});
		exHistory = Object.entries(byEx)
			.filter(([, rows]) => rows.length >= 2)
			.map(([id, rows]) => {
				const name = rows[rows.length - 1].exerciseName || id;
				let bestWeight = 0, bestReps = '0', totalVol = 0;
				rows.forEach(r => {
					const w = parseFloat(r.weight) || 0;
					const rp = parseInt(r.reps) || 0;
					totalVol += w * rp;
					if (w > bestWeight) { bestWeight = w; bestReps = r.reps; }
				});
				const byDate: Record<string, number> = {};
				rows.forEach(r => {
					const w = parseFloat(r.weight) || 0;
					if (!byDate[r.date] || w > byDate[r.date]) byDate[r.date] = w;
				});
				const dates = Object.keys(byDate).sort();
				const last8 = dates.slice(-8);
				const maxW = Math.max(...last8.map(d => byDate[d]), 1);
				const miniBar = last8.map(d => Math.max(3, Math.round((byDate[d] / maxW) * 28)));
				return {
					id, name, bestWeight, bestReps,
					totalVol: Math.round(totalVol),
					sessions: dates.length,
					trend: calcTrend(id, allLogs),
					recentSets: rows.slice(-3).reverse(),
					miniBar,
					open: false
				};
			})
			.sort((a, b) => b.sessions - a.sessions);
	}

	function buildEnergyChart() {
		// newest-first from getRecentCheckins, then reverse for left-to-right display
		const all = getRecentCheckins(90)
			.filter((c: CheckIn) => c.energy != null || c.sleep != null)
			.reverse(); // oldest → newest

		if (all.length < 2) { hasEnergyData = false; return; }
		hasEnergyData = true;

		const last14 = all.slice(-14);
		const BAR_MAX = 48;
		energyBars = last14.map((c: CheckIn) => {
			const d = new Date(c.date + 'T00:00:00');
			const e = c.energy ?? null;
			const s = c.sleep  ?? null;
			return {
				day:    String(d.getDate()),
				month:  d.toLocaleString('en', { month: 'short' }),
				energy: e,
				sleep:  s,
				eH: e != null ? Math.max(4, Math.round((e / 10) * BAR_MAX)) : 0,
				sH: s != null ? Math.max(4, Math.round((s / 10) * BAR_MAX)) : 0
			};
		});
	}

	function toggleEx(id: string) {
		exHistory = exHistory.map(e => e.id === id ? { ...e, open: !e.open } : e);
	}

	function fmtVol(v: number): string {
		if (v >= 1000000) return (v / 1000000).toFixed(1) + 't';
		if (v >= 1000) return (v / 1000).toFixed(1) + 'k kg';
		return v + ' kg';
	}

	function fmtDate(s: string): string {
		const d = new Date(s + 'T00:00:00');
		return d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' });
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

		{#if daysLeft > 0}
			<div class="days-left">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left this week</div>
		{:else}
			<div class="days-left">Week wraps up today</div>
		{/if}
	</div>

	<!-- ── AI This-Week Insight ────────────────────────────── -->
	{#if aiThisWeek}
		<div class="card ai-card">
			<div class="ai-label">AI · THIS WEEK</div>
			<p class="ai-text">{aiThisWeek}</p>
		</div>
	{/if}

	<!-- ── All-time + Streak ───────────────────────────────── -->
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
			{#if streak > 0}
				<div class="stat-card streak-card">
					<span class="stat-val streak-val">{streak}</span>
					<span class="stat-lbl">wk streak 🔥</span>
				</div>
			{/if}
		</div>
	{:else}
		<div class="empty">
			<p>No training data yet.<br />Complete a workout to see your stats.</p>
		</div>
	{/if}

	<!-- ── Training Frequency ─────────────────────────────── -->
	{#if hasData}
		<div class="section-label">8 weeks</div>
		<div class="card freq-card">
			<div class="freq-head">
				<span class="freq-title">Training Frequency</span>
				<span class="small">sessions/week</span>
			</div>
			<div class="freq-bars">
				{#each freqBars as bar}
					<div class="freq-col">
						<div
							class="freq-bar"
							class:freq-empty={bar.count === 0}
							style="height: {bar.height}px"
						>
							{#if bar.count > 0}
								<span class="freq-count">{bar.count}</span>
							{/if}
						</div>
						<span class="freq-day">{bar.day}</span>
						<span class="freq-month">{bar.month}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Energy & Sleep Trend ──────────────────────────── -->
	{#if hasEnergyData}
		<div class="section-label">Energy &amp; sleep</div>
		<div class="card energy-card">
			<div class="energy-head">
				<span class="energy-title">Energy &amp; Sleep Trend</span>
				<div class="energy-legend">
					<span class="legend-dot legend-e"></span><span class="legend-lbl">Energy</span>
					<span class="legend-dot legend-s"></span><span class="legend-lbl">Sleep</span>
				</div>
			</div>
			<div class="energy-bars">
				{#each energyBars as bar}
					<div class="energy-col">
						<div class="energy-pair">
							{#if bar.energy != null}
								<div class="e-bar e-bar-energy" style="height: {bar.eH}px"></div>
							{:else}
								<div class="e-bar e-bar-empty"></div>
							{/if}
							{#if bar.sleep != null}
								<div class="e-bar e-bar-sleep" style="height: {bar.sH}px"></div>
							{:else}
								<div class="e-bar e-bar-empty"></div>
							{/if}
						</div>
						<span class="e-day">{bar.day}</span>
						<span class="e-month">{bar.month}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Exercise History ───────────────────────────────── -->
	{#if exHistory.length > 0}
		<div class="section-label">Exercise history</div>
		{#each exHistory as ex}
			<div class="card ex-card">
				<button type="button" class="ex-header" onclick={() => toggleEx(ex.id)}>
					<span class="ex-name">{ex.name}</span>
					<div class="ex-meta">
						{#if ex.trend}
							<span
								class="trend-badge"
								class:trend-up={ex.trend.direction === 'up'}
								class:trend-down={ex.trend.direction === 'down'}
							>{ex.trend.direction === 'up' ? '↑' : ex.trend.direction === 'down' ? '↓' : '→'}</span>
						{/if}
						<span class="ex-sessions">{ex.sessions}×</span>
						<span class="ex-chevron">{ex.open ? '▲' : '▼'}</span>
					</div>
				</button>

				{#if ex.open}
					<div class="ex-body">
						<!-- Best stats -->
						<div class="ex-best-row">
							<div class="ex-best">
								<span class="ex-best-val">{ex.bestWeight} kg</span>
								<span class="ex-best-lbl">best</span>
							</div>
							<div class="ex-best">
								<span class="ex-best-val">{ex.bestReps}</span>
								<span class="ex-best-lbl">reps at best</span>
							</div>
							<div class="ex-best">
								<span class="ex-best-val">{fmtVol(ex.totalVol)}</span>
								<span class="ex-best-lbl">total vol</span>
							</div>
						</div>

						<!-- Mini bar chart -->
						{#if ex.miniBar.length > 1}
							<div class="mini-chart">
								{#each ex.miniBar as h}
									<div class="mini-bar" style="height: {h}px"></div>
								{/each}
							</div>
							<div class="mini-chart-lbl">Weight trend — last {ex.miniBar.length} sessions</div>
						{/if}

						<!-- Trend label -->
						{#if ex.trend}
							<div
								class="trend-note"
								class:trend-note-up={ex.trend.direction === 'up'}
								class:trend-note-down={ex.trend.direction === 'down'}
							>
								{#if ex.trend.direction === 'up'}
									↑ +{ex.trend.delta} kg avg gain vs early sessions
								{:else if ex.trend.direction === 'down'}
									↓ −{ex.trend.delta} kg avg drop vs early sessions
								{:else}
									→ Steady — consistent weight across sessions
								{/if}
							</div>
						{/if}

						<!-- Recent sets -->
						{#if ex.recentSets.length > 0}
							<div class="recent-label">Recent</div>
							{#each ex.recentSets as s}
								<div class="recent-row">
									<span class="recent-date">{fmtDate(s.date)}</span>
									<span class="recent-val">{s.weight} kg × {s.reps}</span>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	{/if}

	<!-- ── AI Last-Week Recap ──────────────────────────────── -->
	{#if aiLastWeek}
		<div class="card ai-card">
			<div class="ai-label">AI · LAST WEEK</div>
			<p class="ai-text">{aiLastWeek}</p>
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
.dot.dot-done { background: var(--accent); color: var(--accent-text); font-weight: 700; }
.dot.dot-today { border-color: var(--accent); background: rgba(255,255,255,.07); }
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

/* ── AI Cards ── */
.ai-card { }
.ai-label {
	font-size: 10px; font-weight: 800; letter-spacing: .08em;
	color: var(--accent); margin-bottom: 8px;
}
.ai-text {
	margin: 0;
	font-size: 13px;
	color: rgba(255,255,255,.75);
	line-height: 1.6;
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
.streak-card { border-color: rgba(247,201,72,.35); background: rgba(247,201,72,.06); }
.streak-val { color: #f7c948; }

/* ── Frequency chart ── */
.freq-card { }
.freq-head {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 14px;
}
.freq-title { font-size: 14px; font-weight: 700; }
.freq-bars {
	display: flex;
	align-items: flex-end;
	gap: 4px;
	height: 72px;
}
.freq-col {
	flex: 1;
	display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
	height: 100%;
}
.freq-bar {
	width: 100%;
	border-radius: 3px 3px 0 0;
	background: var(--accent);
	opacity: .85;
	position: relative;
	display: flex; align-items: flex-start; justify-content: center;
	min-height: 4px;
}
.freq-bar.freq-empty { background: rgba(255,255,255,.08); opacity: 1; }
.freq-count {
	font-size: 9px; font-weight: 700; color: var(--accent-text);
	position: absolute; top: 2px;
}
.freq-day { font-size: 9px; color: rgba(255,255,255,.45); margin-top: 4px; line-height: 1.2; }
.freq-month { font-size: 8px; color: rgba(255,255,255,.25); line-height: 1.2; }

/* ── Energy & Sleep Chart ── */
.energy-card { }
.energy-head {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 14px;
}
.energy-title { font-size: 14px; font-weight: 700; }
.energy-legend { display: flex; align-items: center; gap: 6px; }
.legend-dot {
	width: 8px; height: 8px; border-radius: 50%;
	display: inline-block; flex-shrink: 0;
}
.legend-e { background: var(--accent); }
.legend-s { background: #8b7dea; }
.legend-lbl { font-size: 11px; color: var(--muted); margin-right: 4px; }
.energy-bars {
	display: flex;
	align-items: flex-end;
	gap: 3px;
	height: 68px;
}
.energy-col {
	flex: 1;
	display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
	height: 100%;
}
.energy-pair {
	display: flex; gap: 1px; align-items: flex-end;
}
.e-bar {
	width: 7px;
	border-radius: 2px 2px 0 0;
	min-height: 4px;
}
.e-bar-energy { background: var(--accent); opacity: .85; }
.e-bar-sleep  { background: #8b7dea; opacity: .85; }
.e-bar-empty  { background: rgba(255,255,255,.08); height: 4px; }
.e-day   { font-size: 9px; color: rgba(255,255,255,.45); margin-top: 4px; line-height: 1.2; }
.e-month { font-size: 8px; color: rgba(255,255,255,.25); line-height: 1.2; }

/* ── Exercise History ── */
.ex-card { padding: 0; overflow: hidden; }
.ex-header {
	width: 100%;
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 16px;
	background: none; border: none; cursor: pointer;
	text-align: left; color: inherit; font: inherit;
}
.ex-header:active { background: rgba(255,255,255,.04); }
.ex-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.9); flex: 1; }
.ex-meta { display: flex; align-items: center; gap: 8px; }
.ex-sessions { font-size: 12px; color: var(--muted); }
.ex-chevron { font-size: 10px; color: rgba(255,255,255,.3); }

.trend-badge {
	font-size: 12px; font-weight: 700;
	color: rgba(255,255,255,.4);
	width: 18px; text-align: center;
}
.trend-badge.trend-up { color: #4caf7d; }
.trend-badge.trend-down { color: #e57373; }

.ex-body {
	padding: 0 16px 14px;
	border-top: 1px solid var(--line);
	margin-top: 0;
}

.ex-best-row {
	display: flex; gap: 8px; margin-top: 12px;
}
.ex-best {
	flex: 1; display: flex; flex-direction: column; align-items: center;
	background: rgba(255,255,255,.04); border-radius: 8px; padding: 8px 4px;
}
.ex-best-val { font-size: 15px; font-weight: 700; color: var(--accent); }
.ex-best-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; text-align: center; }

/* Mini bar chart */
.mini-chart {
	display: flex; align-items: flex-end; gap: 3px;
	height: 36px; margin-top: 14px;
}
.mini-bar {
	flex: 1;
	background: var(--accent);
	border-radius: 2px 2px 0 0;
	opacity: .7;
	min-height: 3px;
}
.mini-chart-lbl {
	font-size: 10px; color: rgba(255,255,255,.3);
	margin-top: 4px;
}

/* Trend note */
.trend-note {
	margin-top: 8px;
	font-size: 12px; color: rgba(255,255,255,.45);
	padding: 6px 10px;
	background: rgba(255,255,255,.04);
	border-radius: 6px;
}
.trend-note.trend-note-up { color: #4caf7d; background: rgba(76,175,61,.08); }
.trend-note.trend-note-down { color: #e57373; background: rgba(229,115,115,.08); }

/* Recent sets */
.recent-label {
	font-size: 10px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted);
	margin-top: 12px; margin-bottom: 6px;
}
.recent-row {
	display: flex; justify-content: space-between; align-items: center;
	padding: 5px 0;
	border-bottom: 1px solid rgba(255,255,255,.06);
}
.recent-row:last-child { border-bottom: none; }
.recent-date { font-size: 12px; color: rgba(255,255,255,.4); }
.recent-val  { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.85); }

/* ── Empty ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; text-align: center; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }
</style>
