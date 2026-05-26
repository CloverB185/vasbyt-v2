<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { J, S, KEYS } from '$lib/data/storage';

	// ── Steps ─────────────────────────────────────────────────
	// 1 = Name  2 = Goal  3 = Equipment  4 = Done
	let step  = $state(1);
	const TOTAL = 4;

	// ── Step data ─────────────────────────────────────────────
	let name  = $state('');
	let goal  = $state('');
	let equip = $state('All');

	const GOALS = [
		{ id: 'strength', label: 'Build Strength', sub: 'Heavier lifts, lower reps' },
		{ id: 'fat-loss', label: 'Lose Fat',        sub: 'Higher reps, keep moving'  },
		{ id: 'general',  label: 'Stay Active',     sub: 'Balanced & sustainable'    },
	];

	const EQUIP_CHIPS = [
		'All', 'Bodyweight', 'Dumbbell', 'Barbell',
		'Machine', 'Kettlebell', 'Band', 'Cable',
	];

	// ── Guards ────────────────────────────────────────────────
	onMount(() => {
		// If already set up, skip onboarding
		const profile = J<{ name?: string }>(KEYS.profile(), {});
		if (profile.name) goto('/');
	});

	// ── Navigation ────────────────────────────────────────────
	function canNext(): boolean {
		if (step === 1) return name.trim().length >= 1;
		if (step === 2) return goal !== '';
		return true;
	}

	function next() {
		if (!canNext()) return;
		if (step < TOTAL) { step++; return; }
		finish();
	}

	function back() {
		if (step > 1) step--;
	}

	function finish() {
		const existing = J<Record<string, unknown>>(KEYS.profile(), {});
		S(KEYS.profile(), { ...existing, name: name.trim(), goal });
		S(KEYS.equip(), equip);
		goto('/');
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') next();
	}
</script>

<svelte:head>
	<title>Welcome — Vasbyt</title>
</svelte:head>

<div class="ob-wrap">

	<!-- Progress dots -->
	<div class="progress">
		{#each Array(TOTAL) as _, i}
			<div class="dot" class:dot-active={i + 1 === step} class:dot-done={i + 1 < step}></div>
		{/each}
	</div>

	<!-- ── Step 1: Name ──────────────────────────────────────── -->
	{#if step === 1}
		<div class="step">
			<div class="ob-brand">Vasbyt<span class="you-can">· You Can!</span></div>
			<h1 class="step-title">What should we<br/>call you?</h1>
			<input
				type="text"
				class="ob-input"
				placeholder="Your name..."
				bind:value={name}
				onkeydown={handleKey}
				maxlength={32}
				autofocus
			/>
		</div>
	{/if}

	<!-- ── Step 2: Goal ──────────────────────────────────────── -->
	{#if step === 2}
		<div class="step">
			<h1 class="step-title">What's your<br/>main goal?</h1>
			<div class="goal-list">
				{#each GOALS as g}
					<button
						type="button"
						class="goal-card"
						class:goal-sel={goal === g.id}
						onclick={() => (goal = g.id)}
					>
						<span class="goal-label">{g.label}</span>
						<span class="goal-sub">{g.sub}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Step 3: Equipment ─────────────────────────────────── -->
	{#if step === 3}
		<div class="step">
			<h1 class="step-title">What equipment<br/>do you have?</h1>
			<p class="step-hint">This filters your exercise options.</p>
			<div class="chip-grid">
				{#each EQUIP_CHIPS as chip}
					<button
						type="button"
						class="chip"
						class:chip-sel={equip === chip}
						onclick={() => (equip = chip)}
					>{chip}</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Step 4: Done ──────────────────────────────────────── -->
	{#if step === 4}
		<div class="step step-done">
			<div class="done-icon">✓</div>
			<h1 class="step-title">You're all set,<br/>{name}!</h1>
			<p class="step-hint">Your 12-week program is ready to go.<br/>You can customise everything in Settings.</p>
		</div>
	{/if}

	<!-- ── Footer nav ────────────────────────────────────────── -->
	<div class="ob-footer">
		{#if step > 1}
			<button type="button" class="ob-back" onclick={back}>← Back</button>
		{:else}
			<div></div>
		{/if}

		<button
			type="button"
			class="ob-next"
			onclick={next}
			disabled={!canNext()}
		>
			{step < TOTAL ? 'Next →' : 'Start Training'}
		</button>
	</div>

</div>

<style>
.ob-wrap {
	min-height: 100dvh;
	display: flex;
	flex-direction: column;
	padding: 24px 20px 20px;
	max-width: 480px;
	margin: 0 auto;
}

/* ── Progress ── */
.progress {
	display: flex;
	gap: 6px;
	margin-bottom: 40px;
}
.dot {
	flex: 1;
	height: 4px;
	border-radius: 2px;
	background: rgba(255,255,255,.12);
	transition: background 0.2s;
}
.dot-done  { background: rgba(0,188,212,.5); }
.dot-active { background: var(--accent); }

/* ── Brand ── */
.ob-brand {
	font-size: 28px;
	font-weight: 900;
	line-height: 1;
	margin-bottom: 28px;
	display: flex;
	align-items: center;
	gap: 8px;
}
.you-can {
	font-size: 0.6em;
	font-weight: 800;
	color: var(--accent);
	letter-spacing: 0.03em;
	text-shadow: 0 0 14px var(--accent), 0 0 28px var(--accent-glow);
}

/* ── Step container ── */
.step {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.step-title {
	font-size: clamp(28px, 8vw, 40px);
	font-weight: 900;
	line-height: 1.15;
	margin: 0 0 24px;
}

.step-hint {
	font-size: 14px;
	color: var(--muted);
	line-height: 1.6;
	margin: 0 0 20px;
}

/* ── Name input ── */
.ob-input {
	width: 100%;
	background: rgba(255,255,255,.07);
	border: 1px solid var(--line);
	border-radius: 16px;
	color: var(--text);
	font-size: 20px;
	font-weight: 700;
	padding: 16px 20px;
	outline: none;
	box-sizing: border-box;
}
.ob-input:focus { border-color: var(--accent); }
.ob-input::placeholder { color: var(--muted); font-weight: 400; }

/* ── Goal cards ── */
.goal-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.goal-card {
	background: rgba(255,255,255,.06);
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 16px 18px;
	text-align: left;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	gap: 4px;
	transition: border-color 0.15s, background 0.15s;
	min-height: 70px;
}
.goal-card.goal-sel {
	border-color: var(--accent);
	background: rgba(0,188,212,.1);
}
.goal-label {
	font-size: 16px;
	font-weight: 800;
	color: var(--text);
}
.goal-card.goal-sel .goal-label { color: var(--accent); }
.goal-sub {
	font-size: 13px;
	color: var(--muted);
}

/* ── Equipment chips ── */
.chip-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.chip {
	background: rgba(255,255,255,.07);
	border: 1px solid var(--line);
	border-radius: 999px;
	color: var(--text);
	font-size: 14px;
	font-weight: 700;
	padding: 10px 18px;
	min-height: 44px;
	cursor: pointer;
	transition: border-color 0.15s, background 0.15s;
}
.chip.chip-sel {
	border-color: var(--accent);
	background: rgba(0,188,212,.15);
	color: var(--accent);
}

/* ── Done step ── */
.step-done {
	align-items: center;
	text-align: center;
	justify-content: center;
	gap: 16px;
}
.done-icon {
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text);
	font-size: 32px;
	font-weight: 900;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 8px;
}

/* ── Footer ── */
.ob-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 24px;
	gap: 12px;
}
.ob-back {
	background: none;
	border: none;
	color: var(--muted);
	font-size: 15px;
	font-weight: 700;
	cursor: pointer;
	padding: 12px 0;
	min-height: 44px;
}
.ob-back:hover { color: var(--text); }
.ob-next {
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text);
	border: none;
	border-radius: 14px;
	font-size: 16px;
	font-weight: 900;
	padding: 14px 28px;
	min-height: 44px;
	cursor: pointer;
	transition: opacity 0.15s, transform 0.1s;
}
.ob-next:disabled { opacity: 0.35; cursor: default; }
.ob-next:not(:disabled):hover { transform: scale(1.02); }
.ob-next:not(:disabled):active { transform: scale(0.98); }
</style>
