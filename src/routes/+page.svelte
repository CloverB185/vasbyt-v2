<script lang="ts">
	import { onMount } from 'svelte';
	import {
		inRoutineMode,
		getRoutineDay,
		getRoutineName,
		getWeek,
		getDay,
		setWeek,
		setDay,
		getPhase,
		getPhaseName,
		getTotalSetsToday,
		getTotalSetsScheduled,
		getProfileName,
		getTodaySetsForExercise,
		getLogsThisWeek,
		getCachedCoachNote,
		saveCoachNote,
		getTodayCheckin,
		getReady,
		setReady,
		getWeekMomentum,
		getPeriodizationInsight,
		getPhaseTransitionInfo,
		markPhaseTransitionSeen,
		getDeloadSignal,
		getSessionBriefing,
		type Exercise,
		type RoutineDay,
		type PeriodizationInsight,
		type PhaseTransitionInfo,
		type SessionBriefingEntry,
		type CheckIn
	} from '$lib/data/program';
	import { J, KEYS, today } from '$lib/data/storage';

	// ── State ──────────────────────────────────────────────────
	let profileName  = $state('Me');
	let week         = $state(1);
	let day          = $state(1);
	let phase        = $state<1 | 2 | 3>(1);
	let phaseName    = $state('');
	let routineMode  = $state(false);
	let routineName  = $state('');
	let routineDay   = $state<RoutineDay>({ title: '', exercises: [] });
	let setsDone     = $state(0);
	let setsTotal    = $state(0);

	// ── Phase 13 additions ────────────────────────────────────
	let ready        = $state('');          // 'green' | 'amber' | 'red' | ''
	let editing      = $state(false);       // week/day Change panel
	let momentum     = $state(0);           // workouts this week
	let todayCheckin = $state<CheckIn | null>(null);
	let hasResume    = $state(false);       // in-progress gym session

	// ── Periodization ─────────────────────────────────────────
	let phaseTransition  = $state<PhaseTransitionInfo | null>(null);
	let deloadSignal     = $state(false);
	let deloadDismissed  = $state(false);
	let periInsight      = $state<PeriodizationInsight | null>(null);
	let periDismissed    = $state(false);
	let briefingMap      = $state<Record<string, SessionBriefingEntry>>({});

	// ── Coach note ─────────────────────────────────────────────
	let coachNote    = $state('');
	let noteLoading  = $state(false);

	const AI_PROXY = 'https://vasbyt-ai-proxy.clover887.workers.dev';

	// ── Derived ────────────────────────────────────────────────
	let pct = $derived(setsTotal > 0 ? Math.round((setsDone / setsTotal) * 100) : 0);

	// ── Load from localStorage ─────────────────────────────────
	function load() {
		profileName  = getProfileName();
		week         = getWeek();
		day          = getDay();
		phase        = getPhase(week);
		phaseName    = getPhaseName(phase);
		routineMode  = inRoutineMode();
		routineName  = getRoutineName();
		routineDay   = getRoutineDay(day);
		setsDone     = getTotalSetsToday();
		setsTotal    = getTotalSetsScheduled(routineDay.exercises);
		ready        = getReady();
		momentum     = getWeekMomentum();
		todayCheckin = getTodayCheckin();
		const resume = J<{ date: string } | null>(KEYS.resume(), null);
		hasResume    = !!(resume && resume.date === today());
	}

	// ── Week / day change handlers ────────────────────────────
	function handleSetWeek(n: number) {
		setWeek(n);
		week      = Math.max(1, Math.min(12, n));
		phase     = getPhase(week);
		phaseName = getPhaseName(phase);
		routineDay = getRoutineDay(day);
		setsDone  = getTotalSetsToday();
		setsTotal = getTotalSetsScheduled(routineDay.exercises);
		briefingMap = Object.fromEntries(
			getSessionBriefing(routineDay.exercises).map((b) => [String(b.exerciseId), b])
		);
	}

	function handleSetDay(n: number) {
		setDay(n);
		day       = n;
		routineDay = getRoutineDay(day);
		setsDone  = getTotalSetsToday();
		setsTotal = getTotalSetsScheduled(routineDay.exercises);
		briefingMap = Object.fromEntries(
			getSessionBriefing(routineDay.exercises).map((b) => [String(b.exerciseId), b])
		);
	}

	// ── Readiness handler ─────────────────────────────────────
	function handleSetReady(v: string) {
		ready = v;
		setReady(v);
	}

	onMount(() => {
		load();
		loadCoachNote();
		loadPeriodization();
	});

	async function loadCoachNote() {
		const cached = getCachedCoachNote();
		if (cached) { coachNote = cached.text; return; }
		// Only fetch if there's some training data to base it on
		if (getTotalSetsToday() === 0 && getLogsThisWeek().length === 0) return;
		noteLoading = true;
		try {
			const w = getWeek(), d = getDay();
			const ph = getPhaseName(getPhase(w));
			const weekSets = getLogsThisWeek().length;
			const rn = getRoutineName() || 'Default program';
			const ci = getTodayCheckin();
			const energyStr = ci?.energy ? `, energy ${ci.energy}/10` : '';
			const prompt = `You are a terse, direct fitness coach. Context: Week ${w}, Day ${d}, ${ph}. Routine: ${rn}. This week: ${weekSets} sets logged${energyStr}. Write ONE punchy sentence — a motivational insight or practical tip for today's training. No filler, no greeting.`;
			const resp = await fetch(AI_PROXY, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: 'google/gemini-3-flash-preview',
					max_tokens: 80,
					messages: [{ role: 'user', content: prompt }]
				})
			});
			if (!resp.ok) return;
			const data = await resp.json();
			const text = data?.choices?.[0]?.message?.content?.trim();
			if (text) { coachNote = text; saveCoachNote(text); }
		} catch { /* silent fail */ } finally {
			noteLoading = false;
		}
	}

	function loadPeriodization() {
		phaseTransition = getPhaseTransitionInfo();
		deloadSignal    = getDeloadSignal();
		periInsight     = getPeriodizationInsight();
		const briefing  = getSessionBriefing(routineDay.exercises);
		briefingMap     = Object.fromEntries(briefing.map((b) => [String(b.exerciseId), b]));
		const periKey   = 'perio-' + today();
		const deloadKey = _deloadWeekKey();
		if (sessionStorage.getItem(periKey))   periDismissed  = true;
		if (sessionStorage.getItem(deloadKey)) deloadDismissed = true;
	}

	function _deloadWeekKey(): string {
		const now = new Date();
		const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
		const mon = new Date(now);
		mon.setDate(now.getDate() - dow);
		return 'deload-' + mon.toISOString().slice(0, 10);
	}

	function dismissPeriCard() {
		periDismissed = true;
		sessionStorage.setItem('perio-' + today(), '1');
	}

	function dismissDeload() {
		deloadDismissed = true;
		sessionStorage.setItem(_deloadWeekKey(), '1');
	}

	function dismissPhaseCard() {
		if (!phaseTransition) return;
		markPhaseTransitionSeen(phaseTransition.phaseKey);
		phaseTransition = null;
	}

	// ── Helpers ────────────────────────────────────────────────
	function setsLoggedFor(ex: Exercise): number {
		return getTodaySetsForExercise(ex.id).length;
	}
</script>

<svelte:head>
	<title>Today — Vasbyt</title>
</svelte:head>

<div class="today-wrap">

	<!-- Profile strip -->
	<div class="profile-strip">
		<span class="profile-dot"></span>
		<span class="profile-name">{profileName}</span>
	</div>

	<!-- Day badge + title -->
	<div class="day-header">
		<div class="day-meta">
			{#if routineMode}
				<span class="badge">{routineName}</span>
				<h1 class="day-title">{routineDay.title || 'Rest day'}</h1>
			{:else}
				<span class="badge">Week {week} · Day {day}</span>
				<h1 class="day-title">{routineDay.exercises.length > 0 ? routineDay.title : phaseName}</h1>
			{/if}
		</div>
		{#if !routineMode}
			<button class="btn-change" onclick={() => { editing = !editing; }}>
				{editing ? 'Done' : 'Change'}
			</button>
		{/if}
	</div>

	<!-- Week / day editor panel -->
	{#if editing && !routineMode}
		<div class="week-editor">
			<p class="week-editor-label">Program position</p>
			<div class="week-stepper">
				<button class="stepper-btn" disabled={week <= 1} onclick={() => handleSetWeek(week - 1)}>‹</button>
				<div class="stepper-center">
					<span class="stepper-val">Week {week}</span>
					<span class="stepper-phase">{phaseName}</span>
				</div>
				<button class="stepper-btn" disabled={week >= 12} onclick={() => handleSetWeek(week + 1)}>›</button>
			</div>
			<div class="day-picker">
				{#each [1,2,3,4,5,6,7] as d}
					<button class="day-btn" class:active={day === d} onclick={() => handleSetDay(d)}>D{d}</button>
				{/each}
				{#if Object.values(briefingMap).some((b) => b.takeItEasy)}
					<div class="recovery-banner">Low recovery the past few days — same weights today, focus on form</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Readiness selector -->
	<div class="readiness">
		<p class="readiness-label">How are you feeling?</p>
		<div class="readiness-grid">
			{#each [{val:'green',label:'Good'},{val:'amber',label:'OK'},{val:'red',label:'Tired'}] as opt}
				<button
					class="readiness-btn"
					class:active={ready === opt.val}
					class:r-good={opt.val === 'green'}
					class:r-ok={opt.val === 'amber'}
					class:r-tired={opt.val === 'red'}
					onclick={() => handleSetReady(opt.val)}
				>{opt.label}</button>
			{/each}
		</div>
	</div>

	<!-- Check-in summary strip -->
	{#if todayCheckin && (todayCheckin.energy || todayCheckin.sleep)}
		<div class="ci-strip">
			<span class="ci-vals">
				{#if todayCheckin.energy}Energy: {todayCheckin.energy}/10{/if}{#if todayCheckin.energy && todayCheckin.sleep} · {/if}{#if todayCheckin.sleep}Sleep: {todayCheckin.sleep}/10{/if}{#if todayCheckin.soreness !== undefined && todayCheckin.soreness !== null} · Soreness: {todayCheckin.soreness}/10{/if}
			</span>
			<a href="/body" class="ci-edit">edit</a>
		</div>
	{:else}
		<div class="ci-strip">
			<span class="ci-none">No check-in today</span>
			<a href="/body" class="ci-edit">Log it</a>
		</div>
	{/if}

	<!-- Week momentum chip -->
	{#if momentum > 0}
		<div class="momentum-chip">{momentum}/5 workouts this week</div>
	{/if}

	<!-- Phase transition card -->
	{#if phaseTransition}
		<div class="intel-card">
			<div class="intel-body">
				{#if phaseTransition.phaseKey === 'p2'}
					Next week your program shifts to <strong>{phaseTransition.message}</strong> — an extra set per exercise and slightly heavier weights. Your body has been building the base for this.
				{:else}
					Next week you move into <strong>{phaseTransition.message}</strong> — the focus shifts to form, full range of motion, and consistency over load. You've done the hard part.
				{/if}
			</div>
			<button class="btn-dismiss" onclick={dismissPhaseCard}>✕</button>
		</div>
	{/if}

	<!-- Deload banner -->
	{#if deloadSignal && !deloadDismissed}
		<div class="intel-card">
			<div class="intel-body">Your body's been signalling all week. Consider a deload — same exercises, 60% weight, focus on recovery.</div>
			<button class="btn-dismiss" onclick={dismissDeload}>✕</button>
		</div>
	{/if}

	<!-- Progress bar -->
	{#if setsTotal > 0}
		<div class="progress-section">
			<div class="progress-head">
				<span class="progress-label">Today</span>
				<span class="progress-count">{setsDone} / {setsTotal} sets</span>
			</div>
			<div class="progress-bar">
				<div class="progress-bar__fill" style="width: {pct}%"></div>
			</div>
		</div>
	{/if}

	<!-- Exercise list -->
	{#if routineDay.exercises.length > 0}
		<div class="card">
			<div class="card-head">
				<span class="card-title">{routineDay.exercises.length} exercises</span>
				<span class="card-sub">{setsTotal} sets total</span>
			</div>
			<div class="exercise-list">
				{#each routineDay.exercises as ex}
					{@const done = setsLoggedFor(ex)}
					{@const total = Number(ex.sets) || 0}
					<div class="exercise-row" class:complete={done >= total}>
						<div class="exercise-info">
							<span class="exercise-name">{ex.name}</span>
							<span class="exercise-detail">{ex.sets} sets · {ex.reps}</span>
							{#if briefingMap[String(ex.id)]}
								{@const b = briefingMap[String(ex.id)]}
								<span class="exercise-hint {b.isPlateaued ? 'hint-plateau' : b.readyToProgress ? 'hint-up' : 'hint-same'}">{b.suggestion}</span>
							{/if}
						</div>
						<div class="exercise-progress">
							{#if done > 0}
								<span class="sets-done" class:full={done >= total}>
									{done}/{total}
								</span>
							{:else}
								<span class="sets-todo">{total}</span>
							{/if}
						</div>
					</div>
				{/each}
				{#if Object.values(briefingMap).some((b) => b.takeItEasy)}
					<div class="recovery-banner">Low recovery the past few days — same weights today, focus on form</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="card">
			<p class="placeholder-note">Rest day — good work. See you next session.</p>
		</div>
	{/if}

	<!-- Training load card -->
	{#if periInsight && !periDismissed}
		<div class="training-load-card">
			<div class="tl-head">
				<span class="tl-label">Training Load</span>
				<button class="btn-dismiss" onclick={dismissPeriCard}>✕</button>
			</div>
			{#if periInsight.firstWeek}
				<div class="tl-line"><span class="tl-accent">First recorded week</span> — keep it going</div>
			{:else if periInsight.volumePct !== null}
				<div class="tl-line">
					<span class={periInsight.volumePct >= 0 ? 'tl-green' : 'tl-amber'}>
						{periInsight.volumePct >= 0 ? '↑' : '↓'} {Math.abs(periInsight.volumePct)}%
					</span> volume vs last week
				</div>
			{/if}
			{#each periInsight.stalled as s}
				<div class="tl-line"><span class="tl-amber">{s.name}</span> — stuck at {s.weight} kg for {s.sessions} sessions</div>
			{/each}
			{#if periInsight.overreaching}
				<div class="tl-line"><span class="tl-amber">High load 3 weeks running</span> — consider a deload next week</div>
			{/if}
		</div>
	{/if}

	<!-- AI coach note -->
	{#if coachNote || noteLoading}
		<div class="coach-card">
			{#if noteLoading}
				<span class="coach-loading">···</span>
			{:else}
				<span class="coach-label">Coach</span>
				<p class="coach-text">{coachNote}</p>
			{/if}
		</div>
	{/if}

	<!-- Start / Resume workout CTA -->
	{#if routineDay.exercises.length > 0}
		{#if hasResume}
			<a href="/gym" class="btn-primary btn-link btn-resume">Resume Workout →</a>
		{:else}
			<a href="/gym" class="btn-primary btn-link">Start Gym Mode →</a>
		{/if}
	{:else}
		<button class="btn-primary" disabled>Rest day — no workout today</button>
	{/if}

</div>

<style>
	.today-wrap {
		padding-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* Profile strip */
	.profile-strip {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0 8px;
	}
	.profile-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		flex-shrink: 0;
	}
	.profile-name {
		font-weight: 700;
		font-size: 14px;
		color: var(--muted);
	}

	/* Day header */
	.day-meta { flex: 1; }
	.badge {
		display: inline-block;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: .06em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 4px;
	}
	.day-title {
		font-size: 22px;
		font-weight: 800;
		line-height: 1.2;
		color: var(--text);
	}

	/* Progress */
	.progress-section { display: flex; flex-direction: column; gap: 6px; }
	.progress-head {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		font-weight: 700;
	}
	.progress-label { color: var(--text); }
	.progress-count { color: var(--muted); }

	/* Card */
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 14px;
	}
	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
	}
	.card-title { font-weight: 800; font-size: 14px; }
	.card-sub { font-size: 12px; color: var(--muted); font-weight: 700; }

	/* Exercise list */
	.exercise-list { display: flex; flex-direction: column; gap: 2px; }
	.exercise-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px solid var(--line);
	}
	.exercise-row:last-child { border-bottom: none; }
	.exercise-row.complete .exercise-name { color: var(--muted); text-decoration: line-through; }

	.exercise-info { display: flex; flex-direction: column; gap: 2px; }
	.exercise-name { font-weight: 700; font-size: 14px; }
	.exercise-detail { font-size: 12px; color: var(--muted); }

	.exercise-progress { flex-shrink: 0; }
	.sets-done {
		font-size: 13px;
		font-weight: 800;
		color: var(--amber);
		background: rgba(245,166,35,.12);
		padding: 2px 8px;
		border-radius: 999px;
	}
	.sets-done.full {
		color: var(--green);
		background: rgba(47,179,109,.12);
	}
	.sets-todo {
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}

	/* Coach note */
	.coach-card {
		background: var(--card);
		border: 1px solid var(--line);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.coach-label {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: .06em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.coach-text {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text);
		font-weight: 600;
	}
	.coach-loading {
		font-size: 18px;
		color: var(--muted);
		letter-spacing: 3px;
		text-align: center;
	}

	/* Exercise briefing hints */
	.exercise-hint {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: .02em;
		margin-top: 1px;
	}
	.hint-up      { color: var(--green); }
	.hint-same    { color: var(--muted); }
	.hint-plateau { color: var(--amber); }
	.recovery-banner {
		margin-top: 10px;
		padding: 8px 12px;
		background: rgba(245, 166, 35, 0.08);
		border-left: 2px solid var(--amber);
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--amber);
		line-height: 1.4;
	}

	/* Intel cards (phase transition, deload) */
	.intel-card {
		background: rgba(255,255,255,0.05);
		border-left: 3px solid var(--accent);
		border-radius: 8px;
		padding: 12px 14px;
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.intel-body {
		flex: 1;
		font-size: 14px;
		line-height: 1.55;
		color: rgba(255,255,255,0.85);
	}
	.btn-dismiss {
		flex-shrink: 0;
		font-size: 12px;
		padding: 2px 6px;
		opacity: 0.45;
		background: none;
		border: none;
		color: var(--text);
		cursor: pointer;
		line-height: 1;
	}

	/* Training load card */
	.training-load-card {
		background: rgba(255,255,255,0.05);
		border-left: 3px solid var(--accent);
		border-radius: 8px;
		padding: 11px 14px;
	}
	.tl-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 7px;
	}
	.tl-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: .05em;
		color: var(--muted);
	}
	.tl-line {
		font-size: 13px;
		color: rgba(255,255,255,0.82);
		line-height: 1.55;
		margin-bottom: 2px;
	}
	.tl-green  { color: var(--green); font-weight: 700; }
	.tl-amber  { color: var(--amber); font-weight: 700; }
	.tl-accent { color: var(--accent); font-weight: 700; }

	.placeholder-note {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		text-align: center;
		padding: 8px 0;
	}

	/* ── Change button ── */
	.day-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2px; }
	.btn-change {
		flex-shrink: 0;
		font-size: 12px; font-weight: 800;
		color: var(--accent);
		background: rgba(255,255,255,.06);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px 12px;
		margin-top: 2px;
	}

	/* ── Week editor ── */
	.week-editor {
		background: var(--card); border: 1px solid var(--line);
		border-radius: 14px; padding: 14px;
		display: flex; flex-direction: column; gap: 10px;
	}
	.week-editor-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 0; }
	.week-stepper { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.stepper-btn {
		width: 36px; height: 36px; border-radius: 50%;
		background: rgba(255,255,255,.08); border: 1px solid var(--line);
		font-size: 20px; font-weight: 300; color: var(--text);
		display: flex; align-items: center; justify-content: center;
	}
	.stepper-btn:disabled { opacity: 0.25; cursor: not-allowed; }
	.stepper-center { text-align: center; }
	.stepper-val { display: block; font-size: 16px; font-weight: 800; }
	.stepper-phase { display: block; font-size: 11px; color: var(--muted); margin-top: 1px; }
	.day-picker { display: flex; gap: 5px; flex-wrap: wrap; }
	.day-btn {
		flex: 1; min-width: 36px; height: 34px;
		border-radius: 8px; font-size: 12px; font-weight: 800;
		background: rgba(255,255,255,.06); border: 1px solid var(--line);
		color: var(--muted);
	}
	.day-btn.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }

	/* ── Readiness selector ── */
	.readiness { display: flex; flex-direction: column; gap: 8px; }
	.readiness-label { font-size: 12px; font-weight: 800; color: var(--muted); margin: 0; text-transform: uppercase; letter-spacing: .04em; }
	.readiness-grid { display: flex; gap: 8px; }
	.readiness-btn {
		flex: 1; height: 38px; border-radius: 10px; font-size: 13px; font-weight: 800;
		background: rgba(255,255,255,.06); border: 2px solid var(--line); color: var(--muted);
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}
	.readiness-btn.active.r-good  { background: rgba(47,179,109,.18); border-color: var(--green); color: var(--green); }
	.readiness-btn.active.r-ok    { background: rgba(245,166,35,.18);  border-color: var(--amber); color: var(--amber); }
	.readiness-btn.active.r-tired { background: rgba(231,76,60,.18);   border-color: #e74c3c;      color: #e74c3c; }

	/* ── Check-in strip ── */
	.ci-strip {
		display: flex; align-items: center; justify-content: space-between;
		background: rgba(255,255,255,.04); border: 1px solid var(--line);
		border-radius: 10px; padding: 9px 12px;
	}
	.ci-vals { font-size: 13px; font-weight: 700; color: var(--text); }
	.ci-none { font-size: 13px; font-weight: 600; color: var(--muted); }
	.ci-edit {
		font-size: 12px; font-weight: 800; color: var(--accent);
		text-decoration: none; padding: 2px 8px;
		background: rgba(255,255,255,.06); border-radius: 999px; border: 1px solid var(--line);
	}

	/* ── Momentum chip ── */
	.momentum-chip {
		display: inline-block; align-self: flex-start;
		background: rgba(47,179,109,.12); border: 1px solid rgba(47,179,109,.35);
		color: var(--green); border-radius: 999px;
		font-size: 12px; font-weight: 800; padding: 4px 12px;
	}

	/* CTA */
	.btn-primary {
		background: linear-gradient(135deg, var(--accent), var(--accent-light));
		color: var(--accent-text);
		font-weight: 800;
		width: 100%;
		min-height: var(--touch-lg);
		border-radius: 14px;
		font-size: 16px;
	}
	.btn-primary:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.btn-link {
		display: flex; align-items: center; justify-content: center;
		text-decoration: none;
	}
	.btn-resume {
		background: linear-gradient(135deg, #2e7d32, #43a047);
		box-shadow: 0 0 18px rgba(67, 160, 71, 0.35);
	}
</style>
