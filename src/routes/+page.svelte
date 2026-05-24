<script lang="ts">
	import { onMount } from 'svelte';
	import {
		inRoutineMode,
		getRoutineDay,
		getRoutineName,
		getWeek,
		getDay,
		getPhase,
		getPhaseName,
		getTotalSetsToday,
		getTotalSetsScheduled,
		getProfileName,
		getTodaySetsForExercise,
		type Exercise,
		type RoutineDay
	} from '$lib/data/program';

	// ── State ──────────────────────────────────────────────────
	let profileName  = $state('Me');
	let week         = $state(1);
	let day          = $state(1);
	let phase        = $state<1 | 2 | 3>(1);
	let phaseName    = $state('');
	let routineMode  = $state(false);
	let routineName  = $state('');
	let routineDay   = $state<RoutineDay | null>(null);
	let setsDone     = $state(0);
	let setsTotal    = $state(0);

	// ── Derived ────────────────────────────────────────────────
	let pct = $derived(setsTotal > 0 ? Math.round((setsDone / setsTotal) * 100) : 0);

	// ── Load from localStorage ─────────────────────────────────
	function load() {
		profileName = getProfileName();
		week        = getWeek();
		day         = getDay();
		phase       = getPhase(week);
		phaseName   = getPhaseName(phase);
		routineMode = inRoutineMode();
		routineName = getRoutineName();
		routineDay  = getRoutineDay(day);
		setsDone    = getTotalSetsToday();
		setsTotal   = getTotalSetsScheduled(routineDay?.exercises ?? []);
	}

	onMount(() => {
		load();
	});

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
		<span class="v2-badge">v2 preview</span>
	</div>

	<!-- Day badge + title -->
	<div class="day-header">
		<div class="day-meta">
			{#if routineMode}
				<span class="badge">{routineName}</span>
				<h1 class="day-title">{routineDay?.title ?? 'Rest day'}</h1>
			{:else}
				<span class="badge">Week {week} · Day {day}</span>
				<h1 class="day-title">{phaseName}</h1>
			{/if}
		</div>
	</div>

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
	{#if routineDay && routineDay.exercises.length > 0}
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
			</div>
		</div>
	{:else if !routineMode}
		<div class="card">
			<p class="placeholder-note">
				12-week program exercise list coming in the next build.<br />
				Week {week} · Day {day} · {phaseName}
			</p>
		</div>
	{:else}
		<div class="card">
			<p class="placeholder-note">No routine set up. Set one up in the live app.</p>
		</div>
	{/if}

	<!-- Start workout CTA -->
	{#if routineMode && routineDay && routineDay.exercises.length > 0}
		<a href="/gym" class="btn-primary btn-link">Start Gym Mode →</a>
	{:else}
		<button class="btn-primary" disabled>
			{routineMode ? 'No exercises today' : 'Set up a routine to start'}
		</button>
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
	.v2-badge {
		margin-left: auto;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: .06em;
		text-transform: uppercase;
		background: rgba(14,154,184,.15);
		color: var(--accent);
		padding: 2px 8px;
		border-radius: 999px;
		border: 1px solid var(--line);
	}

	/* Day header */
	.day-header { margin-bottom: 2px; }
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

	.placeholder-note {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.6;
		text-align: center;
		padding: 8px 0;
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
</style>
