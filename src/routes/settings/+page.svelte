<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getProfileName, getWeek, getDay,
		getRoutineName, inRoutineMode
	} from '$lib/data/program';
	import { J, S, KEYS } from '$lib/data/storage';

	let profileInput = $state('');
	let week         = $state(1);
	let day          = $state(1);
	let routineName  = $state('');
	let hasRoutine   = $state(false);
	let theme        = $state('');
	let nameSaved    = $state(false);
	let confirmClear = $state(false);

	onMount(() => {
		profileInput = getProfileName();
		week         = getWeek();
		day          = getDay();
		routineName  = getRoutineName();
		hasRoutine   = inRoutineMode();
		theme        = J<string>(KEYS.theme(), '');
	});

	function saveProfileName() {
		const trimmed = profileInput.trim();
		if (!trimmed) return;
		const prof = J<Record<string, unknown>>(KEYS.profile(), {});
		prof.name = trimmed;
		S(KEYS.profile(), prof);
		nameSaved = true;
		setTimeout(() => (nameSaved = false), 1800);
	}

	function adjustWeek(delta: number) {
		week = Math.max(1, week + delta);
		S(KEYS.week(), week);
	}

	function adjustDay(delta: number) {
		day = Math.max(1, Math.min(7, day + delta));
		S(KEYS.day(), day);
	}

	function clearRoutine() {
		localStorage.removeItem(KEYS.activeRoutine());
		hasRoutine  = false;
		routineName = '';
	}

	function applyTheme(t: string) {
		theme = t;
		S(KEYS.theme(), t);
		document.documentElement.dataset.theme = t;
	}

	function clearAllData() {
		[
			KEYS.logs(), KEYS.finishes(), KEYS.sessions(),
			KEYS.week(), KEYS.day(), KEYS.activeRoutine(),
			KEYS.routines(), KEYS.coachNote(), KEYS.checkins()
		].forEach((k) => localStorage.removeItem(k));
		week = 1; day = 1; hasRoutine = false; routineName = '';
		confirmClear = false;
	}
</script>

<svelte:head>
	<title>Settings — Vasbyt</title>
</svelte:head>

<div class="settings-wrap">

	<div class="settings-head">
		<span class="label-sm">SETTINGS</span>
		<h1 class="settings-title">Profile & Prefs</h1>
	</div>

	<!-- Profile -->
	<div class="section">
		<div class="section-label">Profile</div>
		<div class="card">
			<div class="field">
				<label class="field-label" for="profile-name">Your name</label>
				<input
					id="profile-name"
					type="text"
					bind:value={profileInput}
					placeholder="Enter your name"
				/>
			</div>
			<button
				class="btn-save"
				class:saved={nameSaved}
				onclick={saveProfileName}
			>
				{nameSaved ? '✓ Saved' : 'Save name'}
			</button>
		</div>
	</div>

	<!-- Training position -->
	<div class="section">
		<div class="section-label">Training position</div>
		<div class="card">
			<div class="stepper-row">
				<span class="stepper-label">Week</span>
				<div class="stepper">
					<button class="step-btn" onclick={() => adjustWeek(-1)} disabled={week <= 1}>−</button>
					<span class="step-val">{week}</span>
					<button class="step-btn" onclick={() => adjustWeek(1)}>+</button>
				</div>
			</div>
			<div class="stepper-row">
				<span class="stepper-label">Day</span>
				<div class="stepper">
					<button class="step-btn" onclick={() => adjustDay(-1)} disabled={day <= 1}>−</button>
					<span class="step-val">{day}</span>
					<button class="step-btn" onclick={() => adjustDay(1)} disabled={day >= 7}>+</button>
				</div>
			</div>
			<p class="hint">Adjust if your position is out of sync with your actual training day.</p>
		</div>
	</div>

	<!-- Active routine -->
	<div class="section">
		<div class="section-label">Active routine</div>
		<div class="card">
			{#if hasRoutine}
				<div class="routine-row">
					<div>
						<div class="routine-name">{routineName}</div>
						<div class="routine-sub">Active custom routine</div>
					</div>
					<button class="btn-ghost-red" onclick={clearRoutine}>Clear</button>
				</div>
			{:else}
				<p class="muted-note">No custom routine active. Set one up in the live app to sync it here.</p>
			{/if}
		</div>
	</div>

	<!-- Appearance -->
	<div class="section">
		<div class="section-label">Appearance</div>
		<div class="theme-grid">
			<button
				class="theme-chip"
				class:active={theme === ''}
				onclick={() => applyTheme('')}
			>
				<span class="theme-dot" style="background: #0e9ab8;"></span>
				Storm
			</button>
			<button
				class="theme-chip"
				class:active={theme === 'bloom'}
				onclick={() => applyTheme('bloom')}
			>
				<span class="theme-dot" style="background: #e8728a;"></span>
				Bloom
			</button>
		</div>
	</div>

	<!-- Danger zone -->
	<div class="section">
		<div class="section-label">Data</div>
		<div class="card" class:danger-active={confirmClear}>
			{#if !confirmClear}
				<div class="danger-row">
					<div>
						<div class="danger-title">Clear training data</div>
						<div class="danger-sub">Removes all logs, sessions, and position.</div>
					</div>
					<button class="btn-ghost-red" onclick={() => (confirmClear = true)}>Clear</button>
				</div>
			{:else}
				<p class="confirm-text">This cannot be undone. Delete everything?</p>
				<div class="confirm-actions">
					<button class="btn-cancel" onclick={() => (confirmClear = false)}>Cancel</button>
					<button class="btn-danger" onclick={clearAllData}>Yes, delete</button>
				</div>
			{/if}
		</div>
	</div>

	<div class="app-version">Vasbyt v2 preview · vasbyt-v2.pages.dev</div>

</div>

<style>
.settings-wrap {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding-top: 8px;
}

.settings-head  { padding-bottom: 6px; }
.settings-title { font-size: 24px; font-weight: 900; margin-top: 4px; }

.label-sm {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--accent);
}

/* Section */
.section { display: flex; flex-direction: column; gap: 6px; }
.section-label {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted);
	margin-top: 6px;
}

/* Card */
.card {
	background: var(--card);
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 14px 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* Profile field */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 700; color: var(--muted); }

.btn-save {
	background: var(--accent);
	color: var(--accent-text);
	font-weight: 800;
	font-size: 14px;
	min-height: var(--touch);
	border-radius: 10px;
	padding: 0 20px;
	align-self: flex-start;
	transition: background 0.2s, opacity 0.2s;
}
.btn-save.saved {
	background: var(--green);
}

/* Steppers */
.stepper-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.stepper-label { font-weight: 700; font-size: 14px; }
.stepper {
	display: flex;
	align-items: center;
	gap: 0;
	background: rgba(255,255,255,.06);
	border: 1px solid var(--line);
	border-radius: 10px;
	overflow: hidden;
}
.step-btn {
	min-height: 40px;
	width: 40px;
	font-size: 18px;
	font-weight: 700;
	color: var(--accent);
	background: none;
	border-radius: 0;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.step-btn:disabled { color: var(--muted); opacity: 0.4; }
.step-val {
	min-width: 36px;
	text-align: center;
	font-size: 16px;
	font-weight: 900;
	color: var(--text);
}

.hint {
	font-size: 12px;
	color: var(--muted);
	line-height: 1.5;
}

/* Routine */
.routine-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}
.routine-name { font-weight: 800; font-size: 14px; }
.routine-sub  { font-size: 12px; color: var(--muted); margin-top: 2px; }
.muted-note   { font-size: 13px; color: var(--muted); line-height: 1.5; }

/* Theme chips */
.theme-grid {
	display: flex;
	gap: 10px;
}
.theme-chip {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: var(--touch);
	border-radius: 12px;
	background: var(--card);
	border: 1px solid var(--line);
	font-weight: 800;
	font-size: 14px;
	color: var(--muted);
	transition: border-color 0.15s, color 0.15s;
}
.theme-chip.active {
	border-color: var(--accent);
	color: var(--text);
}
.theme-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
}

/* Ghost red button */
.btn-ghost-red {
	background: rgba(233, 83, 83, .12);
	border: 1px solid rgba(233, 83, 83, .30);
	color: var(--red);
	font-weight: 800;
	font-size: 13px;
	min-height: var(--touch);
	border-radius: 10px;
	padding: 0 16px;
	flex-shrink: 0;
}

/* Danger card */
.danger-active { border-color: rgba(233, 83, 83, .35); }
.danger-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}
.danger-title { font-weight: 800; font-size: 14px; color: var(--red); }
.danger-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }

.confirm-text {
	font-size: 14px;
	font-weight: 700;
	color: var(--red);
	text-align: center;
}
.confirm-actions {
	display: flex;
	gap: 10px;
}
.btn-cancel {
	flex: 1;
	min-height: var(--touch);
	border-radius: 10px;
	background: rgba(255,255,255,.07);
	border: 1px solid var(--line);
	font-weight: 700;
	font-size: 14px;
}
.btn-danger {
	flex: 1;
	min-height: var(--touch);
	border-radius: 10px;
	background: var(--red);
	color: #fff;
	font-weight: 800;
	font-size: 14px;
}

/* Footer */
.app-version {
	text-align: center;
	font-size: 11px;
	color: var(--muted);
	padding: 12px 0 4px;
	opacity: 0.6;
}
</style>
