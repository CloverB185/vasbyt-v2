<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getProfileName, getWeek, getDay,
		getRoutineName, inRoutineMode,
		getPresetRoutines, activatePreset,
		getSavedRoutines, saveCustomRoutine,
		deleteCustomRoutine, activateCustomRoutine,
		type PresetRoutine, type SavedRoutine, type RbDay
	} from '$lib/data/program';
	import { J, S, KEYS } from '$lib/data/storage';

	// ── Profile / position / theme ────────────────────────────
	let profileInput  = $state('');
	let week          = $state(1);
	let day           = $state(1);
	let routineName   = $state('');
	let hasRoutine    = $state(false);
	let theme         = $state('');
	let nameSaved     = $state(false);
	let confirmClear  = $state(false);
	let presets       = $state<PresetRoutine[]>([]);
	let presetApplied = $state('');
	let customRoutines = $state<SavedRoutine[]>([]);

	// ── Equipment ─────────────────────────────────────────────
	let equipChip = $state('');
	const EQUIP_CHIPS = [
		{ val: '',            label: 'All'         },
		{ val: 'bodyweight',  label: 'Bodyweight'  },
		{ val: 'dumbbell',    label: 'Dumbbell'    },
		{ val: 'cable',       label: 'Cable'       },
		{ val: 'barbell',     label: 'Barbell'     },
		{ val: 'machine',     label: 'Machine'     },
		{ val: 'kettlebell',  label: 'Kettlebell'  },
		{ val: 'band',        label: 'Band'        },
	];

	// ── Routine builder state ─────────────────────────────────
	let rbActive   = $state(false);
	let rbId       = $state<string | null>(null);
	let rbName     = $state('');
	let rbDays     = $state<RbDay[]>([]);
	let rbEditDay  = $state(1);
	let rbAdding   = $state(false);
	let rbSearch   = $state('');
	let rbEquip    = $state('');
	let rbSaved    = $state(false);

	// ── Exercise library ──────────────────────────────────────
	interface LibEx { id: string; name: string; target: string; bodyPart: string; equipment: string; }
	let fullLib    = $state<LibEx[]>([]);
	let libState   = $state<'idle' | 'loading' | 'ready' | 'failed'>('idle');

	// ── Derived ───────────────────────────────────────────────
	const rbCurDay  = $derived(rbDays.find((d) => d.day === rbEditDay) ?? rbDays[0]);
	const filteredLib = $derived(filterLib(fullLib, rbEquip, rbSearch));

	onMount(() => {
		profileInput   = getProfileName();
		week           = getWeek();
		day            = getDay();
		routineName    = getRoutineName();
		hasRoutine     = inRoutineMode();
		theme          = J<string>(KEYS.theme(), '');
		presets        = getPresetRoutines();
		customRoutines = getSavedRoutines();

		// Read equipment chip — V1 stores an array of items; V2 stores a string
		const rawEquip = J<unknown>(KEYS.equip(), '');
		if (typeof rawEquip === 'string') equipChip = rawEquip;
		else equipChip = ''; // V1 format or unset → default to all
	});

	// ── Equipment ─────────────────────────────────────────────
	function setEquip(chip: string) {
		equipChip = chip;
		S(KEYS.equip(), chip);
	}

	// ── Profile / settings helpers ────────────────────────────
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
		hasRoutine = false; routineName = '';
	}

	function applyPreset(id: string, name: string) {
		if (!activatePreset(id)) return;
		hasRoutine = true; routineName = name;
		presetApplied = id;
		setTimeout(() => (presetApplied = ''), 2000);
	}

	function applyCustom(r: SavedRoutine) {
		activateCustomRoutine(r.id);
		hasRoutine = true; routineName = r.name;
	}

	function applyTheme(t: string) {
		theme = t; S(KEYS.theme(), t);
		document.documentElement.dataset.theme = t;
	}

	function clearAllData() {
		[
			KEYS.logs(), KEYS.finishes(), KEYS.sessions(),
			KEYS.week(), KEYS.day(), KEYS.activeRoutine(),
			KEYS.routines(), KEYS.coachNote(), KEYS.checkins()
		].forEach((k) => localStorage.removeItem(k));
		week = 1; day = 1; hasRoutine = false; routineName = '';
		customRoutines = []; confirmClear = false;
	}

	// ── Routine builder ───────────────────────────────────────
	function rbDefaultDays(): RbDay[] {
		return Array.from({ length: 7 }, (_, i) => ({
			day: i + 1,
			title: i === 0 ? 'Day 1' : 'Rest',
			isRest: i > 0,
			exercises: []
		}));
	}

	function rbOpen(r?: SavedRoutine) {
		if (r) {
			rbId    = r.id;
			rbName  = r.name;
			rbDays  = r.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) }));
		} else {
			rbId   = null;
			rbName = '';
			rbDays = rbDefaultDays();
		}
		rbEditDay = 1;
		rbAdding  = false;
		rbSearch  = '';
		rbEquip   = equipChip;
		rbSaved   = false;
		rbActive  = true;
		if (libState === 'idle') loadLib();
	}

	function rbClose() {
		rbActive = false;
	}

	function rbToggleRest(dayNum: number) {
		const d = rbDays.find((x) => x.day === dayNum);
		if (!d) return;
		d.isRest = !d.isRest;
		if (!d.isRest && !d.title) d.title = 'Day ' + dayNum;
		rbAdding = false;
		rbDays = [...rbDays]; // trigger reactivity
	}

	function rbPickEx(id: string, name: string) {
		const d = rbDays.find((x) => x.day === rbEditDay);
		if (!d || d.isRest) return;
		if (d.exercises.find((e) => e.id === id)) { rbAdding = false; return; }
		d.exercises = [...d.exercises, { id, name, sets: 3, reps: '10-12', rest: 60 }];
		rbDays = [...rbDays];
		rbAdding = false;
	}

	function rbRemoveEx(dayIdx: number, exIdx: number) {
		rbDays[dayIdx].exercises.splice(exIdx, 1);
		rbDays = [...rbDays];
	}

	function rbSaveRoutine() {
		if (!rbName.trim()) { alert('Give your routine a name first.'); return; }
		const workoutDays = rbDays.filter((d) => !d.isRest && d.exercises.length > 0);
		if (!workoutDays.length) { alert('Add at least one exercise to one workout day.'); return; }
		const desc = workoutDays.length + '-day routine · ' + workoutDays[0].exercises.length + ' exercise' + (workoutDays[0].exercises.length !== 1 ? 's' : '') + ' on first day';
		const r: SavedRoutine = {
			id:   rbId ?? ('custom-' + Date.now()),
			name: rbName.trim(),
			description: desc,
			days: rbDays
		};
		saveCustomRoutine(r);
		customRoutines = getSavedRoutines();
		rbSaved = true;
		setTimeout(() => { rbActive = false; }, 800);
	}

	function deleteCustom(id: string) {
		deleteCustomRoutine(id);
		customRoutines = getSavedRoutines();
		const ar = J<{ id?: string } | null>(KEYS.activeRoutine(), null);
		if (ar?.id === id) { hasRoutine = false; routineName = ''; }
	}

	// ── Exercise library ──────────────────────────────────────
	async function loadLib() {
		if (libState === 'loading' || libState === 'ready') return;
		libState = 'loading';
		try {
			const r = await fetch('/data/full-library.json');
			if (!r.ok) throw new Error('fetch failed');
			fullLib  = await r.json();
			libState = 'ready';
		} catch {
			libState = 'failed';
		}
	}

	function equipMatch(eq: string, chip: string): boolean {
		if (!chip) return true;
		if (chip === 'bodyweight') return eq.startsWith('Body Weight') || eq === 'Assisted' || eq.startsWith('Assisted') || eq === 'Weighted';
		if (chip === 'dumbbell')   return eq.startsWith('Dumbbell');
		if (chip === 'cable')      return eq === 'Cable';
		if (chip === 'barbell')    return eq === 'Barbell' || eq === 'Olympic Barbell';
		if (chip === 'machine')    return eq.includes('Machine') || ['Stationary Bike','Skierg Machine','Stepmill Machine','Upper Body Ergometer','Elliptical Machine'].includes(eq);
		if (chip === 'kettlebell') return eq === 'Kettlebell';
		if (chip === 'band')       return eq === 'Band' || eq.includes('Resistance Band');
		return true;
	}

	function filterLib(lib: LibEx[], chip: string, search: string): Map<string, LibEx[]> {
		const q = search.toLowerCase().trim();
		const filtered = lib.filter((x) => {
			if (!equipMatch(x.equipment, chip)) return false;
			if (q && !x.name.toLowerCase().includes(q)) return false;
			return true;
		}).slice(0, 200);
		const map = new Map<string, LibEx[]>();
		for (const x of filtered) {
			const g = x.target || 'Other';
			if (!map.has(g)) map.set(g, []);
			map.get(g)!.push(x);
		}
		return map;
	}

	function fmtDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
	}
</script>

<svelte:head>
	<title>Settings — Vasbyt</title>
</svelte:head>

<!-- ── ROUTINE BUILDER ── -->
{#if rbActive}
<div class="settings-wrap">

	<div class="rb-header">
		<button class="btn-back" onclick={rbClose}>← Routines</button>
		<span class="label-sm">{rbId ? 'Edit routine' : 'New routine'}</span>
	</div>

	<!-- Routine name -->
	<div class="card">
		<div class="field">
			<label class="field-label" for="rb-name">Routine name</label>
			<input id="rb-name" type="text" maxlength="50" placeholder="e.g. My Upper Body Split" bind:value={rbName} />
		</div>
	</div>

	<!-- Day tabs -->
	<div class="rb-day-tabs">
		{#each rbDays as d}
			<button
				class="rb-day-tab"
				class:rb-day-tab-active={d.day === rbEditDay}
				class:rb-day-tab-rest={d.isRest}
				class:rb-day-tab-has={!d.isRest && d.exercises.length > 0}
				onclick={() => { rbEditDay = d.day; rbAdding = false; }}
			>D{d.day}{#if !d.isRest && d.exercises.length > 0}<span class="rb-dot"></span>{/if}</button>
		{/each}
	</div>

	<!-- Current day panel -->
	{#if rbCurDay}
		<div class="card rb-day-panel">
			<!-- Workout / Rest toggle -->
			<div class="rb-toggle-row">
				<button
					class="rb-toggle"
					class:rb-toggle-active={!rbCurDay.isRest}
					onclick={() => rbToggleRest(rbCurDay.day)}
				>Workout</button>
				<button
					class="rb-toggle"
					class:rb-toggle-active={rbCurDay.isRest}
					onclick={() => rbToggleRest(rbCurDay.day)}
				>Rest</button>
			</div>

			{#if !rbCurDay.isRest}
				<!-- Day title -->
				<input
					class="rb-day-title"
					type="text"
					maxlength="30"
					placeholder="Day name (e.g. Push)"
					bind:value={rbCurDay.title}
				/>

				<!-- Exercise list -->
				{#if rbCurDay.exercises.length > 0}
					{#each rbCurDay.exercises as ex, ei}
						<div class="rb-ex-row">
							<div class="rb-ex-name">{ex.name}</div>
							<div class="rb-ex-inputs">
								<label class="rb-ex-label">
									Sets
									<input class="rb-ex-input" type="number" min="1" max="10"
										bind:value={ex.sets} />
								</label>
								<label class="rb-ex-label">
									Reps
									<input class="rb-ex-input" type="text"
										placeholder="e.g. 8-12" bind:value={ex.reps} />
								</label>
								<label class="rb-ex-label">
									Rest(s)
									<input class="rb-ex-input" type="number" min="15" max="300"
										bind:value={ex.rest} />
								</label>
							</div>
							<button class="rb-ex-del" onclick={() => rbRemoveEx(rbDays.indexOf(rbCurDay), ei)}>✕</button>
						</div>
					{/each}
				{:else}
					<p class="rb-empty-day">No exercises yet — add one below.</p>
				{/if}

				<!-- Add exercise button -->
				<button class="btn-add-ex" onclick={() => { rbAdding = !rbAdding; rbSearch = ''; if (libState === 'idle') loadLib(); }}>
					{rbAdding ? '✕ Close' : '+ Add exercise'}
				</button>

				<!-- Exercise picker -->
				{#if rbAdding}
					<div class="rb-picker">
						<!-- Equipment chips -->
						<div class="rb-chip-row">
							{#each EQUIP_CHIPS as c}
								<button
									class="rb-chip"
									class:rb-chip-active={rbEquip === c.val}
									onclick={() => { rbEquip = c.val; rbSearch = ''; }}
								>{c.label}</button>
							{/each}
						</div>

						<!-- Search -->
						<input
							class="rb-search"
							type="search"
							placeholder="Search exercises…"
							bind:value={rbSearch}
						/>

						<!-- Library -->
						{#if libState === 'loading'}
							<p class="rb-picker-hint">Loading exercise library…</p>
						{:else if libState === 'failed'}
							<p class="rb-picker-hint">Failed to load library — reload the page.</p>
						{:else if filteredLib.size === 0}
							<p class="rb-picker-hint">No exercises match — try a different filter or search.</p>
						{:else}
							<div class="rb-picker-list">
								{#each [...filteredLib.entries()].sort(([a],[b]) => a.localeCompare(b)) as [grp, exs]}
									<div class="rb-picker-group">
										<div class="rb-picker-group-label">{grp}</div>
										{#each exs as x}
											{@const added = rbCurDay.exercises.some((e) => e.id === x.id)}
											<button
												class="rb-picker-item"
												class:rb-picker-item-added={added}
												onclick={() => rbPickEx(x.id, x.name)}
											>{x.name}{added ? ' ✓' : ''}</button>
										{/each}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{:else}
				<p class="rb-rest-note">Rest day — no exercises.</p>
			{/if}
		</div>
	{/if}

	<!-- Save / Cancel -->
	<div class="rb-actions">
		<button class="btn-cancel-rb" onclick={rbClose}>Cancel</button>
		<button class="btn-save-rb" class:btn-saved={rbSaved} onclick={rbSaveRoutine}>
			{rbSaved ? '✓ Saved!' : 'Save routine'}
		</button>
	</div>

	<div class="app-version">Vasbyt v2 preview · vasbyt-v2.pages.dev</div>
</div>

<!-- ── SETTINGS ── -->
{:else}
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
				<input id="profile-name" type="text" bind:value={profileInput} placeholder="Enter your name" />
			</div>
			<button class="btn-save" class:saved={nameSaved} onclick={saveProfileName}>
				{nameSaved ? '✓ Saved' : 'Save name'}
			</button>
		</div>
	</div>

	<!-- Equipment -->
	<div class="section">
		<div class="section-label">Equipment</div>
		<div class="card equip-card">
			<div class="equip-hint">Filters the exercise picker when building a routine.</div>
			<div class="chips">
				{#each EQUIP_CHIPS as c}
					<button
						class="chip"
						class:chip-active={equipChip === c.val}
						onclick={() => setEquip(c.val)}
					>{c.label}</button>
				{/each}
			</div>
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
		{#if hasRoutine}
			<div class="card">
				<div class="routine-row">
					<div>
						<div class="routine-name">{routineName}</div>
						<div class="routine-sub">Active routine</div>
					</div>
					<button class="btn-ghost-red" onclick={clearRoutine}>Clear</button>
				</div>
			</div>
		{:else}
			<p class="muted-note">No routine active — using the 12-week default program. Pick a preset or build your own.</p>
		{/if}
	</div>

	<!-- Preset routines -->
	<div class="section">
		<div class="section-label">Preset routines</div>
		{#each presets as p}
			<div class="preset-card" class:preset-active={p.id === presetApplied}>
				<div class="preset-info">
					<div class="preset-name">{p.name}</div>
					<div class="preset-desc">{p.description}</div>
				</div>
				<button
					class="btn-preset"
					class:btn-preset-done={p.id === presetApplied}
					onclick={() => applyPreset(p.id, p.name)}
				>{p.id === presetApplied ? '✓' : 'Use'}</button>
			</div>
		{/each}
	</div>

	<!-- Custom routines -->
	<div class="section">
		<div class="section-label">My routines</div>
		{#each customRoutines as r}
			<div class="preset-card">
				<div class="preset-info">
					<div class="preset-name">{r.name}</div>
					<div class="preset-desc">{r.description}</div>
				</div>
				<div class="custom-actions">
					<button class="btn-ghost-sm" onclick={() => rbOpen(r)}>Edit</button>
					<button class="btn-ghost-sm" onclick={() => deleteCustom(r.id)}>✕</button>
					<button class="btn-preset" onclick={() => applyCustom(r)}>Use</button>
				</div>
			</div>
		{/each}
		<button class="btn-new-routine" onclick={() => rbOpen()}>+ New routine</button>
	</div>

	<!-- Appearance -->
	<div class="section">
		<div class="section-label">Appearance</div>
		<div class="theme-grid">
			<button class="theme-chip" class:active={theme === ''} onclick={() => applyTheme('')}>
				<span class="theme-dot" style="background: #0e9ab8;"></span>Storm
			</button>
			<button class="theme-chip" class:active={theme === 'bloom'} onclick={() => applyTheme('bloom')}>
				<span class="theme-dot" style="background: #e8728a;"></span>Bloom
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
{/if}

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

/* Profile */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 700; color: var(--muted); }
.btn-save {
	background: var(--accent); color: var(--accent-text);
	font-weight: 800; font-size: 14px;
	min-height: var(--touch); border-radius: 10px; padding: 0 20px;
	align-self: flex-start; transition: background 0.2s;
}
.btn-save.saved { background: var(--green); }

/* Equipment */
.equip-card { gap: 10px; }
.equip-hint { font-size: 12px; color: var(--muted); line-height: 1.4; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
	padding: 6px 14px; border-radius: 999px;
	border: 1px solid var(--line);
	background: rgba(255,255,255,.06);
	color: var(--text); font-size: 13px; font-weight: 700;
	min-height: 38px; white-space: nowrap;
	transition: background .15s, border-color .15s;
}
.chip-active {
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); border-color: transparent;
}

/* Steppers */
.stepper-row { display: flex; align-items: center; justify-content: space-between; }
.stepper-label { font-weight: 700; font-size: 14px; }
.stepper {
	display: flex; align-items: center;
	background: rgba(255,255,255,.06); border: 1px solid var(--line);
	border-radius: 10px; overflow: hidden;
}
.step-btn {
	min-height: 40px; width: 40px; font-size: 18px; font-weight: 700;
	color: var(--accent); background: none; border-radius: 0; padding: 0;
	display: flex; align-items: center; justify-content: center;
}
.step-btn:disabled { color: var(--muted); opacity: .4; }
.step-val { min-width: 36px; text-align: center; font-size: 16px; font-weight: 900; }
.hint { font-size: 12px; color: var(--muted); line-height: 1.5; }

/* Routine */
.routine-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.routine-name { font-weight: 800; font-size: 14px; }
.routine-sub  { font-size: 12px; color: var(--muted); margin-top: 2px; }
.muted-note   { font-size: 13px; color: var(--muted); line-height: 1.5; padding: 2px 0; }

/* Preset / custom routine cards */
.preset-card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 14px; padding: 12px 14px;
	display: flex; align-items: center; justify-content: space-between;
	gap: 12px; transition: border-color .15s;
}
.preset-card.preset-active { border-color: var(--accent); }
.preset-info { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.preset-name { font-weight: 800; font-size: 14px; }
.preset-desc { font-size: 12px; color: var(--muted); line-height: 1.4; }
.btn-preset {
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	color: var(--text); font-weight: 800; font-size: 13px;
	min-height: var(--touch); min-width: 52px; border-radius: 10px; flex-shrink: 0;
	transition: background .15s, border-color .15s, color .15s;
}
.btn-preset-done { background: rgba(47,179,109,.15); border-color: var(--green); color: var(--green); }
.custom-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.btn-ghost-sm {
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	color: var(--muted); font-weight: 700; font-size: 12px;
	min-height: 36px; border-radius: 8px; padding: 0 12px;
}
.btn-new-routine {
	width: 100%; min-height: var(--touch); border-radius: 12px;
	background: rgba(255,255,255,.06); border: 1px dashed var(--line);
	color: var(--accent); font-weight: 800; font-size: 14px;
	margin-top: 4px;
}

/* Theme */
.theme-grid { display: flex; gap: 10px; }
.theme-chip {
	flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
	min-height: var(--touch); border-radius: 12px;
	background: var(--card); border: 1px solid var(--line);
	font-weight: 800; font-size: 14px; color: var(--muted);
	transition: border-color .15s, color .15s;
}
.theme-chip.active { border-color: var(--accent); color: var(--text); }
.theme-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

/* Ghost red */
.btn-ghost-red {
	background: rgba(233,83,83,.12); border: 1px solid rgba(233,83,83,.30);
	color: var(--red); font-weight: 800; font-size: 13px;
	min-height: var(--touch); border-radius: 10px; padding: 0 16px; flex-shrink: 0;
}

/* Danger */
.danger-active { border-color: rgba(233,83,83,.35); }
.danger-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.danger-title { font-weight: 800; font-size: 14px; color: var(--red); }
.danger-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }
.confirm-text { font-size: 14px; font-weight: 700; color: var(--red); text-align: center; }
.confirm-actions { display: flex; gap: 10px; }
.btn-cancel {
	flex: 1; min-height: var(--touch); border-radius: 10px;
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	font-weight: 700; font-size: 14px;
}
.btn-danger {
	flex: 1; min-height: var(--touch); border-radius: 10px;
	background: var(--red); color: #fff; font-weight: 800; font-size: 14px;
}

/* Footer */
.app-version { text-align: center; font-size: 11px; color: var(--muted); padding: 12px 0 4px; opacity: .6; }

/* ── Routine Builder ─────────────────────────────────────── */
.rb-header {
	display: flex; align-items: center; justify-content: space-between;
	padding-bottom: 8px;
}
.btn-back {
	background: none; color: var(--accent); font-weight: 800; font-size: 14px;
	min-height: var(--touch); padding: 0 4px;
}

/* Day tabs */
.rb-day-tabs {
	display: flex; gap: 6px; overflow-x: auto;
	padding-bottom: 2px;
}
.rb-day-tab {
	flex-shrink: 0; min-width: 44px; min-height: 44px; border-radius: 10px;
	background: rgba(255,255,255,.06); border: 1px solid var(--line);
	font-size: 13px; font-weight: 800; color: var(--muted);
	display: flex; align-items: center; justify-content: center; gap: 3px;
	position: relative;
	transition: background .15s, border-color .15s, color .15s;
}
.rb-day-tab-active { background: var(--accent); color: var(--accent-text); border-color: transparent; }
.rb-day-tab-rest   { color: rgba(255,255,255,.3); }
.rb-day-tab-has    { color: var(--text); }
.rb-dot {
	width: 5px; height: 5px; border-radius: 50%;
	background: var(--green); flex-shrink: 0;
}
.rb-day-tab-active .rb-dot { background: var(--accent-text); }

/* Day panel */
.rb-day-panel { gap: 10px; }

/* Workout / Rest toggle */
.rb-toggle-row { display: flex; gap: 0; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); }
.rb-toggle {
	flex: 1; min-height: 40px; font-weight: 800; font-size: 13px;
	color: var(--muted); background: rgba(255,255,255,.04);
	border-radius: 0;
}
.rb-toggle-active { background: rgba(14,154,184,.15); color: var(--accent); }

/* Day title input */
.rb-day-title {
	border-radius: 10px; font-weight: 700; font-size: 14px;
}

/* Exercise rows */
.rb-ex-row {
	border: 1px solid var(--line); border-radius: 10px;
	padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
}
.rb-ex-name { font-size: 14px; font-weight: 800; }
.rb-ex-inputs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.rb-ex-label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 700; color: var(--muted); }
.rb-ex-input {
	margin: 0; padding: 6px 10px; font-size: 13px; font-weight: 700;
	border-radius: 8px; min-height: 36px;
}
.rb-ex-del {
	align-self: flex-end; background: none; color: var(--muted);
	font-size: 13px; min-height: unset; padding: 4px 6px;
	border-radius: 6px;
}
.rb-ex-del:hover { color: var(--red); }
.rb-empty-day { font-size: 13px; color: var(--muted); margin: 4px 0; }
.rb-rest-note { font-size: 13px; color: var(--muted); text-align: center; padding: 12px 0; }

/* Add exercise button */
.btn-add-ex {
	width: 100%; min-height: var(--touch); border-radius: 10px;
	background: rgba(255,255,255,.06); border: 1px solid var(--line);
	font-weight: 800; font-size: 14px; color: var(--accent);
}

/* Exercise picker */
.rb-picker { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.rb-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.rb-chip {
	padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line);
	background: rgba(255,255,255,.06); color: var(--muted);
	font-size: 12px; font-weight: 700; min-height: 34px;
	transition: background .15s, border-color .15s, color .15s;
}
.rb-chip-active { background: rgba(14,154,184,.15); border-color: var(--accent); color: var(--accent); }
.rb-search {
	border-radius: 10px; font-size: 14px; padding: 10px 14px; min-height: 44px; margin: 0;
}
.rb-picker-list { max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.rb-picker-group { display: flex; flex-direction: column; gap: 2px; }
.rb-picker-group-label {
	font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
	color: var(--accent); padding: 6px 0 2px;
}
.rb-picker-item {
	text-align: left; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 700;
	background: rgba(255,255,255,.05); border: 1px solid transparent;
	color: var(--text); min-height: unset;
	transition: background .1s, border-color .1s;
}
.rb-picker-item:hover { background: rgba(255,255,255,.09); border-color: var(--line); }
.rb-picker-item-added { color: var(--accent); }
.rb-picker-hint { font-size: 13px; color: var(--muted); text-align: center; padding: 12px 0; }

/* Builder save/cancel */
.rb-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 4px; }
.btn-cancel-rb {
	min-height: var(--touch); border-radius: 12px;
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	font-weight: 700; font-size: 14px;
}
.btn-save-rb {
	min-height: var(--touch-lg); border-radius: 14px;
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); font-weight: 800; font-size: 15px;
	transition: background .2s;
}
.btn-save-rb.btn-saved { background: var(--green); }
</style>
