<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		inRoutineMode,
		getRoutineDay,
		getDay,
		getTodaySetsForExercise,
		saveLog,
		getLastWeightForExercise,
		getLastRepsForExercise,
		undoLastSetToday,
		finishWorkout,
		type Exercise,
		type LogEntry
	} from '$lib/data/program';

	// ── Data ─────────────────────────────────────────────────────
	let exercises    = $state<Exercise[]>([]);
	let routineTitle = $state('');
	let hasRoutine   = $state(false);

	// ── Gym state ─────────────────────────────────────────────────
	let started   = $state(false);
	let exIdx     = $state(0);
	let weight    = $state('');
	let reps      = $state('');
	let setsToday = $state<LogEntry[]>([]);
	let restSecs  = $state(0);
	let restOn    = $state(false);
	let woDone    = $state(false);
	let totalDone = $state(0);

	let _timer: ReturnType<typeof setInterval> | null = null;

	// ── Derived ───────────────────────────────────────────────────
	let ex        = $derived(exercises[exIdx] ?? null);
	let target    = $derived(ex ? (Number(ex.sets) || 3) : 3);
	let done      = $derived(setsToday.length);
	let allDone   = $derived(done >= target);
	let isLast    = $derived(exIdx >= exercises.length - 1);
	let totalSets = $derived(exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0));
	let pct       = $derived(totalSets > 0 ? Math.round((totalDone / totalSets) * 100) : 0);
	let restFmt   = $derived(`${Math.floor(restSecs / 60)}:${String(restSecs % 60).padStart(2, '0')}`);
	let muscles   = $derived((ex?.muscles ?? []).join(' · '));

	// ── Load ──────────────────────────────────────────────────────
	onMount(() => {
		hasRoutine = inRoutineMode();
		if (hasRoutine) {
			const day    = getDay();
			const rd     = getRoutineDay(day);
			exercises    = rd?.exercises ?? [];
			routineTitle = rd?.title ?? 'Today';
		}
		return () => { if (_timer) clearInterval(_timer); };
	});

	// ── Refresh sets when exercise changes or gym starts ──────────
	$effect(() => {
		if (started && ex) {
			refreshSets();
			prefill();
		}
	});

	function refreshSets() {
		setsToday = ex ? getTodaySetsForExercise(ex.id) : [];
		totalDone = exercises.reduce((s, e) => s + getTodaySetsForExercise(e.id).length, 0);
	}

	function prefill() {
		if (!ex) return;
		const prev = getTodaySetsForExercise(ex.id);
		if (prev.length > 0) {
			weight = prev.at(-1)!.weight;
			reps   = prev.at(-1)!.reps;
		} else {
			weight = getLastWeightForExercise(ex.id);
			reps   = getLastRepsForExercise(ex.id);
		}
	}

	// ── Timer ─────────────────────────────────────────────────────
	function startTimer(secs: number) {
		if (_timer) clearInterval(_timer);
		restSecs = secs;
		restOn   = true;
		_timer   = setInterval(() => {
			restSecs--;
			if (restSecs <= 0) stopTimer();
		}, 1000);
	}

	function stopTimer() {
		if (_timer) { clearInterval(_timer); _timer = null; }
		restOn   = false;
		restSecs = 0;
	}

	// ── Actions ───────────────────────────────────────────────────
	function startGym() { started = true; exIdx = 0; }

	function logSet() {
		if (!ex || !reps) return;
		saveLog(ex.id, ex.name, weight, reps);
		refreshSets();
		if (setsToday.length < target) startTimer(ex.rest || 60);
	}

	function undo() {
		if (!ex) return;
		undoLastSetToday(ex.id);
		refreshSets();
		stopTimer();
	}

	function nextEx() {
		stopTimer();
		if (!isLast) exIdx++;
		else finishAll();
	}

	function prevEx() {
		stopTimer();
		if (exIdx > 0) exIdx--;
	}

	function finishAll() {
		finishWorkout();
		refreshSets();
		woDone = true;
	}
</script>

<svelte:head>
	<title>Gym — Vasbyt</title>
</svelte:head>

<!-- ═══ NO ROUTINE ═══════════════════════════════════════════════ -->
{#if !hasRoutine}
	<div class="center-state">
		<div class="state-icon">⊕</div>
		<h2>No routine active</h2>
		<p>Set up a routine in the live Vasbyt app, then come back.</p>
		<button class="btn-ghost" onclick={() => goto('/')}>← Back to Today</button>
	</div>

<!-- ═══ DONE SCREEN ══════════════════════════════════════════════ -->
{:else if woDone}
	<div class="center-state">
		<div class="state-icon">◎</div>
		<h2 class="done-title">Workout done!</h2>
		<div class="done-stats">
			<div class="stat-block">
				<span class="stat-val">{exercises.length}</span>
				<span class="stat-lbl">exercises</span>
			</div>
			<div class="stat-block">
				<span class="stat-val">{totalDone}</span>
				<span class="stat-lbl">sets logged</span>
			</div>
		</div>
		<p class="done-note">Day advanced. See you next session.</p>
		<button class="btn-primary" onclick={() => goto('/')}>Back to Today</button>
	</div>

<!-- ═══ PRE-WORKOUT OVERVIEW ═════════════════════════════════════ -->
{:else if !started}
	<div class="pre-wrap">
		<div class="pre-head">
			<span class="label-sm">TODAY</span>
			<h1 class="pre-title">{routineTitle}</h1>
			<p class="pre-sub">{exercises.length} exercises · {totalSets} sets</p>
		</div>

		<div class="pre-list">
			{#each exercises as e, i}
				<div class="pre-row">
					<span class="pre-num">{i + 1}</span>
					<div class="pre-info">
						<span class="pre-name">{e.name}</span>
						<span class="pre-detail">{e.sets} × {e.reps}</span>
					</div>
				</div>
			{/each}
		</div>

		<button class="btn-primary" onclick={startGym}>Start Workout</button>
		<button class="btn-ghost" onclick={() => goto('/')}>← Back</button>
	</div>

<!-- ═══ ACTIVE GYM ════════════════════════════════════════════════ -->
{:else if ex}
	<!-- Progress bar -->
	<div class="gym-prog">
		<div class="gym-prog-fill" style="width:{pct}%"></div>
	</div>

	<!-- Exercise header -->
	<div class="gym-head">
		<button class="nav-btn" onclick={prevEx} disabled={exIdx === 0} aria-label="Previous">←</button>
		<div class="ex-meta">
			<span class="label-sm">{exIdx + 1} / {exercises.length}</span>
			<h2 class="ex-name">{ex.name}</h2>
			{#if muscles}<span class="ex-muscles">{muscles}</span>{/if}
		</div>
		<button class="nav-btn" onclick={nextEx} aria-label={isLast ? 'Finish' : 'Next'}>
			{isLast ? '✓' : '→'}
		</button>
	</div>

	<!-- Target + count -->
	<div class="gym-target">
		<span class="target-txt">{ex.sets} sets · {ex.reps}</span>
		<span class="set-count" class:green={allDone} class:amber={!allDone && done > 0}>
			{done} / {target}
		</span>
	</div>

	<!-- Logged sets chips -->
	{#if setsToday.length > 0}
		<div class="sets-row">
			{#each setsToday as s, i}
				<div class="set-chip">
					<span class="chip-n">{i + 1}</span>
					<span class="chip-val">{s.weight ? `${s.weight}kg` : 'BW'} × {s.reps}</span>
				</div>
			{/each}
			<button class="undo-btn" onclick={undo} title="Undo last set">↩</button>
		</div>
	{/if}

	<!-- Rest timer -->
	{#if restOn}
		<div class="rest-card">
			<span class="rest-lbl">REST</span>
			<span class="rest-time">{restFmt}</span>
			<button class="skip-btn" onclick={stopTimer}>Skip</button>
		</div>

	<!-- Log set inputs -->
	{:else if !allDone}
		<div class="log-card">
			<div class="inputs">
				{#if !ex.isBodyweight}
					<div class="input-grp">
						<label class="input-lbl">kg</label>
						<input
							class="set-input"
							type="number"
							inputmode="decimal"
							placeholder="0"
							bind:value={weight}
						/>
					</div>
				{:else}
					<div class="input-grp bw-grp">
						<span class="bw-lbl">Bodyweight</span>
					</div>
				{/if}
				<div class="input-grp">
					<label class="input-lbl">reps</label>
					<input
						class="set-input"
						type="number"
						inputmode="numeric"
						placeholder="0"
						bind:value={reps}
					/>
				</div>
			</div>
			<button class="btn-primary" onclick={logSet} disabled={!reps}>
				Log Set {done + 1}
			</button>
		</div>
	{/if}

	<!-- Next / Finish CTA -->
	{#if allDone}
		<button class="btn-primary btn-next" onclick={nextEx}>
			{isLast ? 'Finish Workout ◎' : 'Next Exercise →'}
		</button>
	{/if}
{/if}

<style>
/* ── Center states (empty / done) ────────────────────────────── */
.center-state {
	display: flex; flex-direction: column; align-items: center;
	justify-content: center; min-height: 60vh;
	gap: 12px; text-align: center; padding: 24px;
}
.state-icon { font-size: 48px; opacity: .35; }
.center-state h2 { font-size: 22px; font-weight: 900; }
.center-state p  { font-size: 14px; color: var(--muted); max-width: 240px; line-height: 1.5; }

.done-title { font-size: 28px !important; }
.done-stats { display: flex; gap: 36px; margin: 8px 0; }
.stat-block { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-val   { font-size: 36px; font-weight: 900; color: var(--accent); line-height: 1; }
.stat-lbl   { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.done-note  { font-size: 13px; color: var(--muted); }

/* ── Pre-workout ─────────────────────────────────────────────── */
.pre-wrap  { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
.pre-head  { padding-bottom: 4px; }
.pre-title { font-size: 26px; font-weight: 900; margin: 4px 0 2px; }
.pre-sub   { font-size: 13px; color: var(--muted); font-weight: 700; }

.pre-list {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 16px; overflow: hidden;
}
.pre-row {
	display: flex; align-items: center; gap: 12px;
	padding: 12px 14px; border-bottom: 1px solid var(--line);
}
.pre-row:last-child { border-bottom: none; }
.pre-num    { font-size: 11px; font-weight: 900; color: var(--muted); min-width: 18px; }
.pre-info   { display: flex; flex-direction: column; gap: 1px; }
.pre-name   { font-weight: 700; font-size: 14px; }
.pre-detail { font-size: 12px; color: var(--muted); }

/* ── Progress bar ────────────────────────────────────────────── */
.gym-prog { height: 3px; background: rgba(255,255,255,.07); border-radius: 99px; overflow: hidden; margin-bottom: 16px; }
.gym-prog-fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width .3s ease; }

/* ── Exercise header ─────────────────────────────────────────── */
.gym-head   { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ex-meta    { flex: 1; text-align: center; }
.ex-name    { font-size: 22px; font-weight: 900; margin: 2px 0; line-height: 1.2; }
.ex-muscles { font-size: 12px; color: var(--muted); font-weight: 600; }

/* ── Target row ──────────────────────────────────────────────── */
.gym-target {
	display: flex; justify-content: space-between; align-items: center;
	padding: 10px 0; border-bottom: 1px solid var(--line); margin-bottom: 6px;
}
.target-txt { font-size: 13px; color: var(--muted); font-weight: 700; }
.set-count  { font-size: 16px; font-weight: 900; color: var(--muted); }
.set-count.amber { color: var(--amber); }
.set-count.green { color: var(--green); }

/* ── Set chips ───────────────────────────────────────────────── */
.sets-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 10px 0; }
.set-chip  { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,.05); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; }
.chip-n    { font-size: 10px; font-weight: 900; color: var(--muted); }
.chip-val  { font-size: 13px; font-weight: 800; }
.undo-btn  { font-size: 15px; color: var(--muted); padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); min-height: var(--touch); }

/* ── Rest card ───────────────────────────────────────────────── */
.rest-card {
	display: flex; flex-direction: column; align-items: center; gap: 6px;
	background: var(--card); border: 1px solid var(--line);
	border-radius: 20px; padding: 28px 16px; margin: 8px 0; text-align: center;
}
.rest-lbl  { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.rest-time { font-size: 56px; font-weight: 900; line-height: 1; color: var(--accent); font-variant-numeric: tabular-nums; }
.skip-btn  { margin-top: 8px; font-size: 13px; font-weight: 700; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 7px 22px; min-height: var(--touch); }

/* ── Log card ────────────────────────────────────────────────── */
.log-card  { background: var(--card); border: 1px solid var(--line); border-radius: 20px; padding: 16px; margin: 8px 0; display: flex; flex-direction: column; gap: 14px; }
.inputs    { display: flex; gap: 12px; }
.input-grp { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.input-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.set-input { width: 100%; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 10px; font-size: 28px; font-weight: 900; text-align: center; color: var(--text); min-height: var(--touch-lg); }
.set-input:focus { outline: none; border-color: var(--accent); }
.bw-grp    { justify-content: center; align-items: center; }
.bw-lbl    { font-size: 14px; font-weight: 700; color: var(--muted); }

/* ── Nav buttons ─────────────────────────────────────────────── */
.nav-btn { min-width: var(--touch); min-height: var(--touch); background: var(--card); border: 1px solid var(--line); border-radius: 12px; font-size: 18px; font-weight: 700; color: var(--text); flex-shrink: 0; }
.nav-btn:disabled { opacity: .3; }

/* ── Shared buttons ──────────────────────────────────────────── */
.btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent-light)); color: var(--accent-text); font-weight: 900; width: 100%; min-height: var(--touch-lg); border-radius: 16px; font-size: 16px; }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }
.btn-next { margin-top: 8px; }
.btn-ghost { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 12px; font-weight: 700; font-size: 14px; color: var(--muted); min-height: var(--touch); }

/* ── Label ───────────────────────────────────────────────────── */
.label-sm { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
</style>
