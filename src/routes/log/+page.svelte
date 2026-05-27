<script lang="ts">
	import { onMount } from 'svelte';
	import { getLogs, getCheckins, type LogEntry, type CheckIn } from '$lib/data/program';

	interface DayGroup {
		date: string;
		label: string;
		exercises: { name: string; sets: LogEntry[] }[];
	}

	// ── List state ────────────────────────────────────────────
	let days        = $state<DayGroup[]>([]);
	let hasData     = $state(false);
	let checkinMap  = $state<Map<string, CheckIn>>(new Map());

	// ── Calendar state ────────────────────────────────────────
	const now      = new Date();
	let calYear    = $state(now.getFullYear());
	let calMonth   = $state(now.getMonth()); // 0-indexed
	let selDate    = $state<string | null>(null);
	let trained    = $state<Set<string>>(new Set());

	// Calendar grid cells: null = padding, number = day of month
	let calCells   = $derived(buildCells(calYear, calMonth));
	let calTitle   = $derived(
		new Date(calYear, calMonth, 1).toLocaleString('en', { month: 'long', year: 'numeric' })
	);
	let selDay     = $derived(
		selDate ? days.find(d => d.date === selDate) ?? null : null
	);
	let todayStr   = $derived(
		now.getFullYear() + '-' +
		String(now.getMonth() + 1).padStart(2, '0') + '-' +
		String(now.getDate()).padStart(2, '0')
	);

	function buildCells(y: number, m: number): (number | null)[] {
		const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
		const daysInMonth = new Date(y, m + 1, 0).getDate();
		const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon-first
		const cells: (number | null)[] = Array(offset).fill(null);
		for (let d = 1; d <= daysInMonth; d++) cells.push(d);
		while (cells.length % 7 !== 0) cells.push(null);
		return cells;
	}

	function ds(day: number): string {
		return calYear + '-' +
			String(calMonth + 1).padStart(2, '0') + '-' +
			String(day).padStart(2, '0');
	}

	function prevMonth() {
		if (calMonth === 0) { calYear--; calMonth = 11; }
		else calMonth--;
		selDate = null;
	}

	function nextMonth() {
		if (calMonth === 11) { calYear++; calMonth = 0; }
		else calMonth++;
		selDate = null;
	}

	function canGoNext(): boolean {
		return calYear < now.getFullYear() || calMonth < now.getMonth();
	}

	function tapDay(day: number) {
		const d = ds(day);
		if (!trained.has(d)) return;
		selDate = selDate === d ? null : d;
	}

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	function formatShort(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
	}

	onMount(() => {
		const logs = getLogs();
		hasData = logs.length > 0;

		const checkins = getCheckins();
		checkinMap = new Map(checkins.map(c => [c.date, c]));

		if (!hasData) return;

		trained = new Set(logs.map(l => l.date));

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

		<!-- ── Calendar ─────────────────────────────────────── -->
		<div class="cal-card">

			<!-- Month nav -->
			<div class="cal-nav">
				<button type="button" class="cal-arrow" onclick={prevMonth}>‹</button>
				<span class="cal-title">{calTitle}</span>
				<button type="button" class="cal-arrow" class:cal-arrow-dim={!canGoNext()} onclick={nextMonth} disabled={!canGoNext()}>›</button>
			</div>

			<!-- Day-of-week header -->
			<div class="cal-dow">
				{#each ['M','T','W','T','F','S','S'] as d}
					<span>{d}</span>
				{/each}
			</div>

			<!-- Day grid -->
			<div class="cal-grid">
				{#each calCells as cell}
					{#if cell === null}
						<div class="cal-cell cal-empty"></div>
					{:else}
						{@const dateStr = ds(cell)}
						{@const isTrained = trained.has(dateStr)}
						{@const isToday   = dateStr === todayStr}
						{@const isSel     = dateStr === selDate}
						<button
							type="button"
							class="cal-cell"
							class:cal-trained={isTrained}
							class:cal-today={isToday && !isTrained}
							class:cal-sel={isSel}
							onclick={() => tapDay(cell)}
						>
							{cell}
						</button>
					{/if}
				{/each}
			</div>
		</div>

		<!-- ── Selected day detail ───────────────────────────── -->
		{#if selDay}
			{@const dci = checkinMap.get(selDay.date)}
			<div class="detail-card">
				<div class="detail-head">
					<div class="detail-head-left">
						<span class="detail-date">{formatShort(selDay.date)}</span>
						{#if dci?.energy != null || dci?.sleep != null}
							<div class="ci-pills">
								{#if dci?.energy != null}<span class="ci-pill ci-energy">E {dci.energy}/10</span>{/if}
								{#if dci?.sleep != null}<span class="ci-pill ci-sleep">Z {dci.sleep}/10</span>{/if}
							</div>
						{/if}
					</div>
					<button type="button" class="detail-close" onclick={() => (selDate = null)}>×</button>
				</div>
				{#each selDay.exercises as ex}
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
		{/if}

		<!-- ── Full list ─────────────────────────────────────── -->
		<div class="list-label">All sessions</div>
		{#each days as day}
			{@const lci = checkinMap.get(day.date)}
			<div class="day-block">
				<div class="day-label-row">
					<span class="day-label">{day.label}</span>
					{#if lci?.energy != null || lci?.sleep != null}
						<div class="ci-pills">
							{#if lci?.energy != null}<span class="ci-pill ci-energy">E {lci.energy}/10</span>{/if}
							{#if lci?.sleep != null}<span class="ci-pill ci-sleep">Z {lci.sleep}/10</span>{/if}
						</div>
					{/if}
				</div>
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
.log-wrap { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }

.log-head  { padding-bottom: 2px; }
.log-title { font-size: 24px; font-weight: 900; margin-top: 4px; }

.label-sm {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--accent);
}

/* ── Empty ── */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 0; text-align: center; }
.empty-icon { font-size: 40px; opacity: .3; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }

/* ── Calendar card ── */
.cal-card {
	background: var(--card);
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 14px;
}

.cal-nav {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 12px;
}
.cal-title { font-size: 15px; font-weight: 800; }
.cal-arrow {
	background: none; border: none; cursor: pointer;
	font-size: 22px; color: rgba(255,255,255,.6);
	padding: 0 6px; line-height: 1;
}
.cal-arrow:active { color: var(--accent); }
.cal-arrow-dim { color: rgba(255,255,255,.2) !important; cursor: default; }

.cal-dow {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	margin-bottom: 4px;
}
.cal-dow span {
	text-align: center;
	font-size: 11px; font-weight: 700;
	color: rgba(255,255,255,.3);
	padding: 4px 0;
}

.cal-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 3px;
}

.cal-cell {
	aspect-ratio: 1;
	display: flex; align-items: center; justify-content: center;
	font-size: 13px; font-weight: 500;
	border-radius: 50%;
	background: none; border: none; cursor: default;
	color: rgba(255,255,255,.35);
	position: relative;
}

.cal-cell.cal-empty { pointer-events: none; }

.cal-cell.cal-trained {
	background: rgba(0, 188, 212, 0.18);
	color: var(--accent);
	font-weight: 700;
	cursor: pointer;
}
.cal-cell.cal-trained:active { background: rgba(0, 188, 212, 0.35); }

.cal-cell.cal-today {
	border: 2px solid rgba(255,255,255,.25);
	color: rgba(255,255,255,.7);
}

.cal-cell.cal-sel {
	background: var(--accent) !important;
	color: var(--accent-text) !important;
	font-weight: 900;
}

/* ── Detail card ── */
.detail-card {
	background: var(--card);
	border: 1px solid var(--accent);
	border-radius: 16px;
	overflow: hidden;
}
.detail-head {
	display: flex; align-items: center; justify-content: space-between;
	padding: 10px 14px;
	border-bottom: 1px solid var(--line);
}
.detail-head-left { display: flex; flex-direction: column; gap: 5px; }
.detail-date { font-size: 13px; font-weight: 700; color: var(--accent); }
.detail-close {
	background: none; border: none; cursor: pointer;
	font-size: 20px; color: rgba(255,255,255,.4);
	line-height: 1; padding: 0 2px;
}

/* ── Check-in pills ── */
.ci-pills { display: flex; gap: 5px; }
.ci-pill {
	font-size: 11px; font-weight: 700;
	border-radius: 999px; padding: 2px 8px;
}
.ci-energy { background: rgba(0,188,212,.15); color: var(--accent); border: 1px solid rgba(0,188,212,.3); }
.ci-sleep  { background: rgba(139,125,234,.15); color: var(--sleep-color); border: 1px solid rgba(139,125,234,.3); }

/* ── List ── */
.list-label {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted);
	margin-top: 4px;
}

.day-block { display: flex; flex-direction: column; gap: 6px; }
.day-label-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
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
