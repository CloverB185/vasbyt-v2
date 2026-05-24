<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getTodayCheckin, saveCheckin, getRecentCheckins,
		type CheckIn
	} from '$lib/data/program';

	let todayEntry  = $state<CheckIn | null>(null);
	let editing     = $state(false);
	let history     = $state<CheckIn[]>([]);

	// Form fields
	let weight = $state('');
	let energy = $state(3);
	let sleep  = $state('');
	let notes  = $state('');
	let saved  = $state(false);

	onMount(() => {
		refresh();
	});

	function refresh() {
		todayEntry = getTodayCheckin();
		history    = getRecentCheckins(7);
		if (todayEntry) {
			weight = todayEntry.weight != null ? String(todayEntry.weight) : '';
			energy = todayEntry.energy ?? 3;
			sleep  = todayEntry.sleep  != null ? String(todayEntry.sleep) : '';
			notes  = todayEntry.notes  ?? '';
		} else {
			weight = ''; energy = 3; sleep = ''; notes = '';
		}
	}

	function submit() {
		saveCheckin({
			weight: weight ? Number(weight) : undefined,
			energy,
			sleep:  sleep  ? Number(sleep)  : undefined,
			notes:  notes.trim() || undefined
		});
		saved = true;
		editing = false;
		refresh();
		setTimeout(() => (saved = false), 2000);
	}

	function energyLabel(e: number): string {
		return ['', 'Drained', 'Low', 'Okay', 'Good', 'Excellent'][e] ?? '';
	}

	function energyColor(e: number | undefined): string {
		if (!e) return 'var(--muted)';
		if (e >= 4) return 'var(--green)';
		if (e === 3) return 'var(--amber)';
		return 'var(--red)';
	}

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
	}

	let showForm = $derived(!todayEntry || editing);
</script>

<svelte:head>
	<title>Body — Vasbyt</title>
</svelte:head>

<div class="body-wrap">

	<div class="body-head">
		<span class="label-sm">BODY</span>
		<h1 class="body-title">Daily Check-In</h1>
	</div>

	<!-- Today already logged -->
	{#if todayEntry && !editing}
		<div class="card logged-card">
			<div class="logged-top">
				<div class="logged-check">✓ Logged today</div>
				<button class="btn-edit" onclick={() => (editing = true)}>Edit</button>
			</div>
			<div class="logged-stats">
				{#if todayEntry.weight}
					<div class="stat-pill">
						<span class="pill-label">Weight</span>
						<span class="pill-val">{todayEntry.weight} kg</span>
					</div>
				{/if}
				<div class="stat-pill">
					<span class="pill-label">Energy</span>
					<span class="pill-val" style="color: {energyColor(todayEntry.energy)}">
						{todayEntry.energy}/5 · {energyLabel(todayEntry.energy ?? 3)}
					</span>
				</div>
				{#if todayEntry.sleep}
					<div class="stat-pill">
						<span class="pill-label">Sleep</span>
						<span class="pill-val">{todayEntry.sleep} h</span>
					</div>
				{/if}
			</div>
			{#if todayEntry.notes}
				<div class="logged-notes">"{todayEntry.notes}"</div>
			{/if}
		</div>

	<!-- Check-in form -->
	{:else}
		<div class="card form-card">
			{#if saved}
				<div class="save-flash">✓ Saved</div>
			{/if}

			<!-- Weight -->
			<div class="field">
				<label class="field-label" for="ci-weight">Weight (kg) — optional</label>
				<input
					id="ci-weight"
					type="number"
					min="30" max="250" step="0.1"
					placeholder="e.g. 68.5"
					bind:value={weight}
				/>
			</div>

			<!-- Energy -->
			<div class="field">
				<label class="field-label" for="ci-energy">
					Energy — <span style="color: {energyColor(energy)}">{energy}/5 · {energyLabel(energy)}</span>
				</label>
				<div class="energy-row">
					{#each [1,2,3,4,5] as n}
						<button
							class="energy-btn"
							class:active={energy === n}
							style={energy === n ? `background: ${energyColor(n)}22; border-color: ${energyColor(n)};` : ''}
							onclick={() => (energy = n)}
						>{n}</button>
					{/each}
				</div>
			</div>

			<!-- Sleep -->
			<div class="field">
				<label class="field-label" for="ci-sleep">Sleep (hours) — optional</label>
				<input
					id="ci-sleep"
					type="number"
					min="2" max="12" step="0.5"
					placeholder="e.g. 7.5"
					bind:value={sleep}
				/>
			</div>

			<!-- Notes -->
			<div class="field">
				<label class="field-label" for="ci-notes">Notes — optional</label>
				<textarea
					id="ci-notes"
					rows="2"
					placeholder="Anything worth noting today..."
					bind:value={notes}
				></textarea>
			</div>

			<div class="form-actions">
				{#if editing}
					<button class="btn-cancel" onclick={() => (editing = false)}>Cancel</button>
				{/if}
				<button class="btn-primary" onclick={submit}>
					{editing ? 'Update' : 'Log check-in'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Recent history -->
	{#if history.filter(h => h.date !== (todayEntry?.date ?? '')).length > 0}
		<div class="section-label">Recent</div>
		<div class="history-card">
			{#each history.filter(h => !todayEntry || h.date !== todayEntry.date) as entry}
				<div class="history-row">
					<span class="history-date">{formatDate(entry.date)}</span>
					<div class="history-pills">
						{#if entry.weight}
							<span class="h-pill">{entry.weight}kg</span>
						{/if}
						{#if entry.energy}
							<span class="h-pill" style="color: {energyColor(entry.energy)}">E{entry.energy}</span>
						{/if}
						{#if entry.sleep}
							<span class="h-pill">{entry.sleep}h sleep</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if history.length === 0}
		<div class="empty">
			<span class="empty-icon">◎</span>
			<p>Log your first check-in above to start tracking.</p>
		</div>
	{/if}

</div>

<style>
.body-wrap  { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
.body-head  { padding-bottom: 4px; }
.body-title { font-size: 24px; font-weight: 900; margin-top: 4px; }

.label-sm {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--accent);
}

/* Cards */
.card {
	background: var(--card);
	border: 1px solid var(--line);
	border-radius: 16px;
	padding: 16px;
}

/* Logged state */
.logged-card { display: flex; flex-direction: column; gap: 12px; }
.logged-top  { display: flex; align-items: center; justify-content: space-between; }
.logged-check {
	font-size: 14px; font-weight: 800; color: var(--green);
}
.btn-edit {
	font-size: 13px; font-weight: 800; color: var(--accent);
	background: rgba(14,154,184,.12); border: 1px solid var(--line);
	border-radius: 8px; min-height: 34px; padding: 0 14px;
}
.logged-stats { display: flex; flex-direction: column; gap: 8px; }
.stat-pill {
	display: flex; justify-content: space-between; align-items: center;
	padding: 6px 0; border-bottom: 1px solid var(--line);
}
.stat-pill:last-child { border-bottom: none; padding-bottom: 0; }
.pill-label { font-size: 13px; color: var(--muted); font-weight: 700; }
.pill-val   { font-size: 14px; font-weight: 800; }
.logged-notes {
	font-size: 13px; color: var(--muted); font-style: italic; line-height: 1.5;
}

/* Form */
.form-card { display: flex; flex-direction: column; gap: 14px; }
.save-flash {
	font-size: 13px; font-weight: 800; color: var(--green);
	text-align: center; padding: 4px 0;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 700; color: var(--muted); }

textarea {
	background: var(--panel);
	border: 1px solid var(--line);
	border-radius: 10px;
	color: var(--text);
	padding: 10px 14px;
	width: 100%;
	resize: none;
	font: inherit;
}
textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(14,154,184,.25); }

/* Energy buttons */
.energy-row { display: flex; gap: 8px; }
.energy-btn {
	flex: 1; min-height: 44px; border-radius: 10px;
	background: var(--panel); border: 1px solid var(--line);
	font-size: 16px; font-weight: 900; color: var(--muted);
	transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.energy-btn.active { color: var(--text); }

/* Form actions */
.form-actions { display: flex; gap: 10px; }
.btn-cancel {
	min-height: var(--touch); border-radius: 10px;
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	font-weight: 700; font-size: 14px; padding: 0 20px;
}
.btn-primary {
	flex: 1;
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); font-weight: 800; font-size: 15px;
	min-height: var(--touch-lg); border-radius: 14px;
}

/* Section label */
.section-label {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted);
	margin-top: 4px;
}

/* History */
.history-card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 16px; overflow: hidden;
}
.history-row {
	display: flex; align-items: center; justify-content: space-between;
	padding: 11px 14px; border-bottom: 1px solid var(--line); gap: 10px;
}
.history-row:last-child { border-bottom: none; }
.history-date { font-size: 13px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
.history-pills { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.h-pill {
	font-size: 12px; font-weight: 800; color: var(--muted);
	background: rgba(255,255,255,.05); border: 1px solid var(--line);
	border-radius: 999px; padding: 2px 10px;
}

/* Empty */
.empty {
	display: flex; flex-direction: column; align-items: center;
	gap: 10px; padding: 48px 0; text-align: center;
}
.empty-icon { font-size: 40px; opacity: .3; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }
</style>
