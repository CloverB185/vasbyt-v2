<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getProfileName, getWeek, getDay,
		getRoutineName, inRoutineMode,
		getPresetRoutines, activatePreset,
		getSavedRoutines, saveCustomRoutine,
		deleteCustomRoutine, activateCustomRoutine,
		getSupplements, addSupplement, deleteSupplement,
		getTodaySuppStatus, getSuppStreak, markSupp,
		type PresetRoutine, type SavedRoutine, type RbDay,
		type Supplement, type SuppStatus
	} from '$lib/data/program';
	import { J, S, KEYS, today } from '$lib/data/storage';

	// ── Profile / position / theme ────────────────────────────
	let profileInput  = $state('');
	let week          = $state(1);
	let day           = $state(1);
	let routineName   = $state('');
	let hasRoutine    = $state(false);
	let theme         = $state('');
	let nameSaved     = $state(false);
	let confirmClear  = $state(false);
	let importOk      = $state(false);
	let importError   = $state('');
	let presets       = $state<PresetRoutine[]>([]);
	let presetApplied = $state('');
	let customRoutines = $state<SavedRoutine[]>([]);

	// ── Profile extended fields ───────────────────────────────
	let heightInput   = $state('');
	let targetWtInput = $state('');
	let dobInput      = $state('');

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

	// ── Supplements ───────────────────────────────────────────
	let supplements  = $state<Supplement[]>([]);
	let suppStatus   = $state<Record<string, SuppStatus>>({});
	let suppStreak   = $state(0);
	let newSuppName  = $state('');
	let newSuppDose  = $state('');

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

		// Extended profile fields
		const prof = J<Record<string, unknown>>(KEYS.profile(), {});
		heightInput   = prof.height       ? String(prof.height)       : '';
		targetWtInput = prof.targetWeight ? String(prof.targetWeight) : '';
		dobInput      = (prof.dob as string) ?? '';

		// Read equipment chip — V1 stores an array of items; V2 stores a string
		const rawEquip = J<unknown>(KEYS.equip(), '');
		if (typeof rawEquip === 'string') equipChip = rawEquip;
		else equipChip = ''; // V1 format or unset → default to all

		// Supplements
		loadSupps();
	});

	// ── Supplement helpers ────────────────────────────────────
	function loadSupps() {
		supplements = getSupplements();
		suppStatus  = getTodaySuppStatus();
		suppStreak  = getSuppStreak();
	}

	function addSupp() {
		if (!newSuppName.trim()) return;
		addSupplement(newSuppName.trim(), newSuppDose.trim() || undefined);
		newSuppName = ''; newSuppDose = '';
		loadSupps();
	}

	function removeSupp(id: string) {
		deleteSupplement(id);
		loadSupps();
	}

	function toggleSupp(id: string, status: SuppStatus) {
		markSupp(id, status);
		suppStatus = getTodaySuppStatus();
		suppStreak = getSuppStreak();
	}

	// ── Equipment ─────────────────────────────────────────────
	function setEquip(chip: string) {
		equipChip = chip;
		S(KEYS.equip(), chip);
	}

	// ── Profile / settings helpers ────────────────────────────
	function saveProfileDetails() {
		const prof = J<Record<string, unknown>>(KEYS.profile(), {});
		if (profileInput.trim())  prof.name         = profileInput.trim();
		if (heightInput)          prof.height        = Number(heightInput);
		if (targetWtInput)        prof.targetWeight  = Number(targetWtInput);
		if (dobInput)             prof.dob           = dobInput;
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

	// ── Data export / import ─────────────────────────────────
	function _dl(filename: string, content: string, mime: string) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([content], { type: mime }));
		a.download = filename;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function downloadBackup() {
		const d = today();
		const payload = {
			version: '2.0',
			logs:     J(KEYS.logs(),     []),
			checkins: J(KEYS.checkins(), []),
			finishes: J(KEYS.finishes(), []),
			exportedAt: new Date().toISOString()
		};
		_dl(`vasbyt-backup-${d}.json`, JSON.stringify(payload, null, 2), 'application/json');
	}

	function downloadCsv(type: 'workouts' | 'checkins' | 'finishes') {
		const data: Record<string, unknown>[] =
			type === 'checkins' ? J(KEYS.checkins(), [])
			: type === 'finishes' ? J(KEYS.finishes(), [])
			: J(KEYS.logs(), []);
		const headers =
			type === 'checkins'  ? ['date', 'energy', 'sleep', 'soreness', 'weight', 'notes']
			: type === 'finishes' ? ['date', 'week', 'phase', 'day', 'sets', 'exercises', 'readiness', 'startedAt', 'finishedAt']
			: ['date', 'week', 'day', 'exerciseName', 'weight', 'reps'];
		const rows = data.map((o) =>
			headers.map((k) => `"${String(o[k] ?? '').replaceAll('"', '""')}"`).join(',')
		);
		_dl(`${type}-${today()}.csv`, [headers.join(','), ...rows].join('\n'), 'text/csv');
	}

	function importBackup(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const raw = JSON.parse(ev.target?.result as string);
				if (!raw || (!Array.isArray(raw.logs) && !Array.isArray(raw.checkins))) {
					importError = 'Invalid backup — missing logs or checkins.';
					setTimeout(() => (importError = ''), 3500);
					return;
				}
				if (Array.isArray(raw.logs))     S(KEYS.logs(),     raw.logs);
				if (Array.isArray(raw.checkins)) S(KEYS.checkins(), raw.checkins);
				if (Array.isArray(raw.finishes)) S(KEYS.finishes(), raw.finishes);
				importOk = true;
				setTimeout(() => (importOk = false), 3000);
			} catch {
				importError = 'Could not read file — is it a valid JSON backup?';
				setTimeout(() => (importError = ''), 3500);
			}
		};
		reader.readAsText(file);
		// Reset the input so the same file can be re-imported if needed
		(e.target as HTMLInputElement).value = '';
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

	// ── AI Program Builder + Program Import ───────────────────

	const AI_PROXY = 'https://vasbyt-ai-proxy.clover887.workers.dev';
	const AI_MODEL = 'google/gemini-3-flash-preview';

	interface AiDay   { title: string; exercises: AiExRaw[]; }
	interface AiExRaw { name: string; sets: number; reps: string; rest: number; id?: string; }
	interface ReviewItem {
		original: string; matchedId: string | null; confirmedId: string | null;
		matchedName: string | null; confidence: number; equipMismatch: boolean;
	}

	// AI builder state
	let abActive    = $state(false);
	let abStep      = $state<'form' | 'preview'>('form');
	let abExp       = $state('intermediate');
	let abDays      = $state(4);
	let abLength    = $state('45');
	let abFocus     = $state<string[]>([]);
	let abAvoid     = $state('');
	let abLoading   = $state(false);
	let abResult    = $state<{ name: string; days: AiDay[] } | null>(null);
	let abReview    = $state<ReviewItem[]>([]);
	let abActivated = $state(false);

	// Import state
	let piActive    = $state(false);
	let piStep      = $state<'input' | 'parsing' | 'review'>('input');
	let piText      = $state('');
	let piLoading   = $state(false);
	let piResult    = $state<{ name: string; days: AiDay[] } | null>(null);
	let piReview    = $state<ReviewItem[]>([]);
	let piSearch    = $state('');
	let piPickFor   = $state<string | null>(null);
	let piActivated = $state(false);

	const AB_EXP     = [{ val:'beginner',label:'Beginner'},{val:'intermediate',label:'Intermediate'},{val:'advanced',label:'Advanced'}];
	const AB_LENGTHS = ['30','45','60','75'];
	const AB_FOCUS   = ['Chest','Back','Shoulders','Arms','Legs','Glutes','Core'];

	const piPickerLib = $derived(
		piPickFor !== null
			? fullLib.filter(x => {
				const q = piSearch.toLowerCase().trim();
				if (equipChip && !equipMatch(x.equipment, equipChip)) return false;
				if (q && !x.name.toLowerCase().includes(q)) return false;
				return true;
			}).slice(0, 40)
			: []
	);

	function localMatch(name: string): { id: string | null; name: string | null; confidence: number } {
		if (fullLib.length === 0) return { id: null, name: null, confidence: 0 };
		const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
		const n = norm(name);
		const exact = fullLib.find(x => norm(x.name) === n);
		if (exact) return { id: exact.id, name: exact.name, confidence: 1.0 };
		const words = n.split(' ').filter(w => w.length > 3);
		if (!words.length) return { id: null, name: null, confidence: 0 };
		const scored = fullLib
			.map(x => ({ ...x, score: words.filter(w => norm(x.name).includes(w)).length / words.length }))
			.filter(x => x.score >= 0.6).sort((a, b) => b.score - a.score);
		return scored.length > 0
			? { id: scored[0].id, name: scored[0].name, confidence: scored[0].score }
			: { id: null, name: null, confidence: 0 };
	}

	function checkEquipMismatch(id: string): boolean {
		if (!equipChip) return false;
		const ex = fullLib.find(x => x.id === id);
		return ex ? !equipMatch(ex.equipment, equipChip) : false;
	}

	function stripJson(raw: string): string {
		return raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
	}

	async function runAiBuilder() {
		if (abLoading) return;
		if (libState === 'idle') await loadLib();
		abLoading = true;
		try {
			const goal      = J<{ goal?: string }>(KEYS.profile(), {}).goal ?? 'general fitness';
			const equipLabel = EQUIP_CHIPS.find(c => c.val === equipChip)?.label ?? 'All equipment';
			const focusStr  = abFocus.length > 0 ? abFocus.join(', ') : 'balanced full body';
			const prompt = `You are a strength coach. Generate a ${abDays}-day workout program.
Athlete: goal=${goal}, experience=${abExp}, session=${abLength}min, equipment=${equipLabel}, focus=${focusStr}${abAvoid ? ', avoid='+abAvoid : ''}.
Return ONLY valid JSON (no markdown):
{"name":"Short Program Name","days":[{"title":"Day Title","exercises":[{"name":"Exercise Name","sets":3,"reps":"8-10","rest":90}]}]}
Rules: exactly ${abDays} training days. Standard exercise names matching equipment: ${equipLabel}. sets=integer, reps=string, rest=integer seconds.`;
			const resp = await fetch(AI_PROXY, {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: AI_MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
			});
			const parsed = JSON.parse(stripJson((await resp.json())?.choices?.[0]?.message?.content?.trim() ?? '')) as { name: string; days: AiDay[] };
			if (!Array.isArray(parsed.days)) throw new Error('invalid');
			const review: ReviewItem[] = [];
			for (const d of parsed.days) {
				for (const ex of d.exercises) {
					const m = localMatch(ex.name);
					const mismatch = m.id ? checkEquipMismatch(m.id) : false;
					if (m.confidence < 0.8 || mismatch) {
						if (!review.find(r => r.original === ex.name))
							review.push({ original: ex.name, matchedId: m.id, confirmedId: m.id, matchedName: m.name, confidence: m.confidence, equipMismatch: mismatch });
					}
					ex.id = (m.confidence >= 0.8 && !mismatch) ? (m.id ?? undefined) : undefined;
				}
			}
			abResult = parsed; abReview = review; abStep = 'preview';
		} catch { alert('Program generation failed — try again.'); }
		finally { abLoading = false; }
	}

	function activateBuilderProgram() {
		if (!abResult) return;
		const confirmMap = new Map(abReview.map(r => [r.original, r.confirmedId]));
		const days: RbDay[] = abResult.days.map((d, i) => ({
			day: i + 1, title: d.title, isRest: false,
			exercises: d.exercises.map(ex => ({
				id: ex.id ?? confirmMap.get(ex.name) ?? ('gen-' + Math.random().toString(36).slice(2)),
				name: ex.name, sets: Number(ex.sets) || 3, reps: String(ex.reps || '10-12'), rest: Number(ex.rest) || 60
			}))
		}));
		while (days.length < 7) days.push({ day: days.length + 1, title: 'Rest', isRest: true, exercises: [] });
		const r: SavedRoutine = { id: 'ai-' + Date.now(), name: abResult.name || 'AI Program', description: `${abResult.days.length}-day AI-generated`, days };
		saveCustomRoutine(r); activateCustomRoutine(r.id);
		customRoutines = getSavedRoutines(); hasRoutine = true; routineName = r.name;
		abActivated = true;
		setTimeout(() => { abActive = false; abActivated = false; abStep = 'form'; abResult = null; }, 1000);
	}

	async function runImport() {
		if (piLoading || !piText.trim()) return;
		if (libState === 'idle') await loadLib();
		piLoading = true; piStep = 'parsing';
		try {
			// Step 1 — extract structure
			const s1 = `Extract the workout program below. Return ONLY valid JSON (no markdown):
{"name":"Program Name","days":[{"title":"Day Title","exercises":[{"name":"exercise","sets":3,"reps":"8-12","rest":60}]}]}
Include only training days. Preserve exercise names exactly. Defaults: 3 sets, "8-12" reps, 60s rest.

Program text:
${piText}`;
			const r1   = await fetch(AI_PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: AI_MODEL, max_tokens: 4000, messages: [{ role: 'user', content: s1 }] }) });
			const parsed = JSON.parse(stripJson((await r1.json())?.choices?.[0]?.message?.content?.trim() ?? '')) as { name: string; days: AiDay[] };
			if (!Array.isArray(parsed.days)) throw new Error('no days');
			piResult = parsed;

			// Step 2 — match to library
			const names = [...new Set(parsed.days.flatMap(d => d.exercises.map(e => e.name)))];
			const libSnippet = fullLib.filter(x => !equipChip || equipMatch(x.equipment, equipChip))
				.slice(0, 500).map(x => `${x.id}: ${x.name}`).join('\n');
			const s2 = `Match each exercise to the closest library entry. Return ONLY valid JSON array (no markdown):
[{"original":"exercise name","id":"matched-id-or-null","confidence":0.0}]
confidence: 1.0=exact, 0.7+=good match, <0.7=set id to null. Match on movement + equipment. Never invent IDs not in the library.

Exercises:
${names.join('\n')}

Library (id: name):
${libSnippet}`;
			const r2   = await fetch(AI_PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: AI_MODEL, max_tokens: 3000, messages: [{ role: 'user', content: s2 }] }) });
			const matches: { original: string; id: string | null; confidence: number }[] =
				JSON.parse(stripJson((await r2.json())?.choices?.[0]?.message?.content?.trim() ?? ''));

			// Hallucination guard + equipment check
			const validIds  = new Set(fullLib.map(x => x.id));
			const matchMap  = new Map(matches.map(m => [m.original, {
				id: (m.id && validIds.has(m.id) && m.confidence >= 0.7) ? m.id : null,
				confidence: m.confidence,
				matchedName: (m.id && validIds.has(m.id)) ? (fullLib.find(x => x.id === m.id)?.name ?? null) : null
			}]));

			// Attach IDs + build review queue
			const review: ReviewItem[] = [];
			for (const d of piResult!.days) {
				for (const ex of d.exercises) {
					const m = matchMap.get(ex.name) ?? { id: null, confidence: 0, matchedName: null };
					const mismatch = m.id ? checkEquipMismatch(m.id) : false;
					ex.id = (m.id && !mismatch) ? m.id : undefined;
					if (!ex.id && !review.find(r => r.original === ex.name))
						review.push({ original: ex.name, matchedId: m.id, confirmedId: m.id, matchedName: m.matchedName, confidence: m.confidence, equipMismatch: mismatch });
				}
			}
			piReview = review; piStep = 'review';
		} catch { alert('Import failed — check the program text format and try again.'); piStep = 'input'; }
		finally { piLoading = false; }
	}

	function activateImportProgram() {
		if (!piResult) return;
		const confirmMap = new Map(piReview.map(r => [r.original, r.confirmedId]));
		const days: RbDay[] = piResult.days.map((d, i) => ({
			day: i + 1, title: d.title, isRest: false,
			exercises: d.exercises.map(ex => ({
				id: ex.id ?? confirmMap.get(ex.name) ?? ('imp-' + Math.random().toString(36).slice(2)),
				name: ex.name, sets: Number(ex.sets) || 3, reps: String(ex.reps || '10-12'), rest: Number(ex.rest) || 60
			}))
		}));
		while (days.length < 7) days.push({ day: days.length + 1, title: 'Rest', isRest: true, exercises: [] });
		const r: SavedRoutine = { id: 'imp-' + Date.now(), name: piResult.name || 'Imported Program', description: `${piResult.days.length}-day imported program`, days };
		saveCustomRoutine(r); activateCustomRoutine(r.id);
		customRoutines = getSavedRoutines(); hasRoutine = true; routineName = r.name;
		piActivated = true;
		setTimeout(() => { piActive = false; piActivated = false; piStep = 'input'; piText = ''; piResult = null; piReview = []; }, 1000);
	}

	function piPickResult(original: string, id: string, name: string) {
		piReview = piReview.map(r => r.original === original
			? { ...r, confirmedId: id, matchedName: name, equipMismatch: checkEquipMismatch(id) } : r);
		piPickFor = null; piSearch = '';
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

<!-- ── AI PROGRAM BUILDER ── -->
{:else if abActive}
<div class="settings-wrap">

	<div class="rb-header">
		<button class="btn-back" onclick={() => { abActive = false; abStep = 'form'; abResult = null; abReview = []; }}>← Routines</button>
		<span class="label-sm">AI Program Builder</span>
	</div>

	{#if abLoading}
		<div class="ai-loading-card card">
			<div class="ai-dots"><span></span><span></span><span></span></div>
			<div class="ai-loading-note">Building your program…</div>
		</div>

	{:else if abStep === 'form'}
		{@const profGoal = (J(KEYS.profile(), {}) as {goal?: string}).goal ?? 'general fitness'}
		{@const equipLabel = EQUIP_CHIPS.find(c => c.val === equipChip)?.label ?? 'All'}
		{#if libState === 'failed'}
			<div class="lib-fail-warn">⚠ Exercise library failed to load — generated exercises won't match your library. Reload the page to retry.</div>
		{/if}
		<!-- Pre-filled info -->
		<div class="ab-info-card card">
			<div class="ab-prefill-row">
				<span class="ab-prefill-label">Goal</span>
				<span class="ab-prefill-vals">{profGoal}</span>
			</div>
			<div class="ab-prefill-row">
				<span class="ab-prefill-label">Equipment</span>
				<span class="ab-prefill-vals">{equipLabel}</span>
			</div>
			<p class="muted-note" style="margin:0">Change in Settings → Profile / Equipment.</p>
		</div>

		<!-- Experience -->
		<div class="section">
			<div class="section-label">Experience level</div>
			<div class="chips">
				{#each AB_EXP as e}
					<button class="chip" class:chip-active={abExp === e.val} onclick={() => abExp = e.val}>{e.label}</button>
				{/each}
			</div>
		</div>

		<!-- Days per week -->
		<div class="section">
			<div class="section-label">Training days per week</div>
			<div class="card" style="padding:12px 16px">
				<div class="stepper-row">
					<span class="stepper-label">{abDays} days</span>
					<div class="stepper">
						<button class="step-btn" onclick={() => abDays = Math.max(2, abDays - 1)} disabled={abDays <= 2}>−</button>
						<span class="step-val">{abDays}</span>
						<button class="step-btn" onclick={() => abDays = Math.min(6, abDays + 1)} disabled={abDays >= 6}>+</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Session length -->
		<div class="section">
			<div class="section-label">Session length (minutes)</div>
			<div class="chips">
				{#each AB_LENGTHS as l}
					<button class="chip" class:chip-active={abLength === l} onclick={() => abLength = l}>{l} min</button>
				{/each}
			</div>
		</div>

		<!-- Focus areas -->
		<div class="section">
			<div class="section-label">Focus areas (optional)</div>
			<div class="chips">
				{#each AB_FOCUS as f}
					<button class="chip" class:chip-active={abFocus.includes(f)} onclick={() => {
						if (abFocus.includes(f)) abFocus = abFocus.filter(x => x !== f);
						else abFocus = [...abFocus, f];
					}}>{f}</button>
				{/each}
			</div>
		</div>

		<!-- Avoid -->
		<div class="section">
			<div class="section-label">Avoid / notes (optional)</div>
			<input type="text" placeholder="e.g. no overhead press, bad knees" bind:value={abAvoid} />
		</div>

		<button class="btn-primary-settings" onclick={runAiBuilder}>✨ Generate Program</button>

	{:else if abStep === 'preview' && abResult}
		<div class="ab-program-name">{abResult.name}</div>

		{#each abResult.days as d}
			<div class="day-preview-card">
				<div class="day-preview-head">{d.title}</div>
				{#each d.exercises as ex}
					{@const isUnmatched = abReview.some(r => r.original === ex.name && !r.confirmedId)}
					{@const isMismatch  = abReview.some(r => r.original === ex.name && !!r.confirmedId && r.equipMismatch)}
					<div class="day-preview-ex" class:ex-unmatched={isUnmatched}>
						<span>{ex.name}</span>
						{#if isUnmatched}<span class="ex-badge ex-badge-warn">?</span>
						{:else if isMismatch}<span class="ex-badge ex-badge-mismatch">⚠</span>{/if}
						<span class="day-preview-sets">{ex.sets}×{ex.reps}</span>
					</div>
				{/each}
			</div>
		{/each}

		{#if abReview.length > 0}
			<div class="section">
				<div class="section-label">Review queue ({abReview.length})</div>
				{#each abReview as item}
					<div class="review-card" class:review-mismatch={item.equipMismatch}>
						<div class="review-orig">{item.original}</div>
						{#if item.matchedName}
							<div class="review-match">→ {item.matchedName}{item.equipMismatch ? ' ⚠ equipment mismatch' : ''}</div>
						{:else}
							<div class="review-no-match review-warn">No library match found</div>
						{/if}
					</div>
				{/each}
				<p class="muted-note">These exercises will still be added — edit in the routine builder if needed.</p>
			</div>
		{:else}
			<div class="all-matched">✓ All exercises matched</div>
		{/if}

		<button class="btn-primary-settings" class:btn-activated={abActivated} onclick={activateBuilderProgram}>
			{abActivated ? '✓ Activated!' : 'Activate Program →'}
		</button>
	{/if}

	<div class="app-version">Vasbyt v2 preview · vasbyt-v2.pages.dev</div>
</div>

<!-- ── PROGRAM IMPORT ── -->
{:else if piActive}
<div class="settings-wrap">

	<div class="rb-header">
		<button class="btn-back" onclick={() => { piActive = false; piStep = 'input'; piText = ''; piResult = null; piReview = []; }}>← Routines</button>
		<span class="label-sm">Import Program</span>
	</div>

	{#if piStep === 'input'}
		<p class="muted-note">Paste any workout program — AI will extract the structure and match exercises to the library.</p>
		{#if libState === 'failed'}
			<div class="lib-fail-warn">⚠ Exercise library failed to load — exercise matching won't work. Reload the page to retry.</div>
		{/if}
		<textarea class="import-textarea" placeholder="Paste program text here…" bind:value={piText} rows="10"></textarea>
		<button class="btn-primary-settings" disabled={!piText.trim()} onclick={runImport}>Import →</button>

	{:else if piStep === 'parsing'}
		<div class="ai-loading-card card">
			<div class="ai-dots"><span></span><span></span><span></span></div>
			<div class="ai-loading-note">Parsing program…</div>
		</div>
		<div class="ai-loading-card card" style="margin-top:8px">
			<div class="ai-loading-note">Matching exercises to library…</div>
		</div>

	{:else if piStep === 'review' && piResult}
		<div class="import-summary-card card">
			<div class="import-prog-name">{piResult.name}</div>
			<div class="import-prog-sub">{piResult.days.length} days · {piResult.days.reduce((a, d) => a + d.exercises.length, 0)} exercises</div>
		</div>

		{#each piResult.days as d}
			<div class="day-preview-card">
				<div class="day-preview-head">{d.title}</div>
				{#each d.exercises as ex}
					{@const reviewItem = piReview.find(r => r.original === ex.name)}
					{@const isUnmatched = !!reviewItem && !reviewItem.confirmedId}
					{@const isMismatch  = !!reviewItem && !!reviewItem.confirmedId && reviewItem.equipMismatch}
					<div class="day-preview-ex" class:ex-unmatched={isUnmatched}>
						<span>{ex.name}</span>
						{#if isUnmatched}<span class="ex-badge ex-badge-warn">?</span>
						{:else if isMismatch}<span class="ex-badge ex-badge-mismatch">⚠</span>{/if}
						<span class="day-preview-sets">{ex.sets}×{ex.reps}</span>
					</div>
				{/each}
			</div>
		{/each}

		{#if piReview.length > 0}
			<div class="section">
				<div class="section-label">Review queue ({piReview.length})</div>
				{#each piReview as item}
					<div class="review-card" class:review-mismatch={item.equipMismatch}>
						<div class="review-orig">{item.original}</div>
						{#if item.confirmedId}
							<div class="review-match">{item.matchedName}{item.equipMismatch ? ' ⚠ equipment mismatch' : ' ✓'}</div>
						{:else}
							<div class="review-no-match">No library match found</div>
							<button class="btn-pick" onclick={() => { piPickFor = item.original; piSearch = ''; }}>Pick manually →</button>
						{/if}
						{#if piPickFor === item.original}
							<input class="pi-search" type="search" placeholder="Search library…" bind:value={piSearch} />
							{#if piPickerLib.length > 0}
								<div class="pi-picker">
									{#each piPickerLib as x}
										<button class="pi-picker-item" onclick={() => piPickResult(item.original, x.id, x.name)}>{x.name}</button>
									{/each}
								</div>
							{:else}
								<p class="pi-empty">No results — try a different search.</p>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="all-matched">✓ All exercises matched</div>
		{/if}

		<button class="btn-primary-settings" class:btn-activated={piActivated} onclick={activateImportProgram}>
			{piActivated ? '✓ Activated!' : 'Activate Program →'}
		</button>
	{/if}

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
			<div class="profile-row-2">
				<div class="field">
					<label class="field-label" for="profile-height">Height (cm)</label>
					<input id="profile-height" type="number" min="100" max="250" placeholder="e.g. 175" bind:value={heightInput} />
				</div>
				<div class="field">
					<label class="field-label" for="profile-target">Target weight (kg)</label>
					<input id="profile-target" type="number" min="30" max="200" step="0.1" placeholder="e.g. 65" bind:value={targetWtInput} />
				</div>
			</div>
			<div class="field">
				<label class="field-label" for="profile-dob">Date of birth</label>
				<input id="profile-dob" type="date" bind:value={dobInput} />
			</div>
			<p class="profile-hint">Optional fields — leave blank to keep any existing value.</p>
			<button class="btn-save" class:saved={nameSaved} onclick={saveProfileDetails}>
				{nameSaved ? '✓ Saved' : 'Save profile'}
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
		<div class="routine-btns">
			<button class="btn-new-routine" onclick={() => rbOpen()}>+ New routine</button>
			<button class="btn-new-routine btn-ai-build" onclick={() => { abActive = true; if (libState === 'idle') loadLib(); }}>✨ AI Builder</button>
			<button class="btn-new-routine" onclick={() => { piActive = true; if (libState === 'idle') loadLib(); }}>↑ Import</button>
		</div>
	</div>

	<!-- Supplements -->
	<div class="section">
		<div class="section-label">Supplements</div>
		<div class="card supp-card">

			{#if supplements.length > 0}
				{#if suppStreak > 0}
					<div class="supp-streak">🔥 {suppStreak} day{suppStreak === 1 ? '' : 's'} streak</div>
				{/if}

				<div class="supp-today-label">Today</div>
				{#each supplements as s}
					<div class="supp-row">
						<div class="supp-info">
							<span class="supp-name">{s.name}</span>
							{#if s.dose}<span class="supp-dose">{s.dose}</span>{/if}
						</div>
						<div class="supp-btns">
							<button
								class="supp-btn"
								class:supp-taken={suppStatus[s.id] === 'taken'}
								onclick={() => toggleSupp(s.id, 'taken')}>Taken</button>
							<button
								class="supp-btn"
								class:supp-skipped={suppStatus[s.id] === 'skipped'}
								onclick={() => toggleSupp(s.id, 'skipped')}>Skip</button>
						</div>
					</div>
				{/each}

				<div class="card-divider"></div>
			{/if}

			<!-- Add form -->
			<div class="supp-add-row">
				<input
					class="supp-input"
					type="text"
					placeholder="e.g. Vitamin D"
					bind:value={newSuppName}
					onkeydown={(e) => e.key === 'Enter' && addSupp()}
				/>
				<input
					class="supp-dose-input"
					type="text"
					placeholder="Dose (opt.)"
					bind:value={newSuppDose}
				/>
				<button class="supp-add-btn" disabled={!newSuppName.trim()} onclick={addSupp}>+ Add</button>
			</div>

			{#if supplements.length > 0}
				<div class="supp-list">
					{#each supplements as s}
						<div class="supp-item">
							<span class="supp-item-name">{s.name}{s.dose ? ` · ${s.dose}` : ''}</span>
							<button class="supp-del" onclick={() => removeSupp(s.id)} aria-label="Remove {s.name}">×</button>
						</div>
					{/each}
				</div>
			{/if}

		</div>
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

	<!-- Data / Backup -->
	<div class="section">
		<div class="section-label">Data</div>

		<!-- Downloads -->
		<div class="card data-card">
			<div class="data-row">
				<div>
					<div class="data-title">Workout CSV</div>
					<div class="data-sub">All logged sets with weight and reps.</div>
				</div>
				<button class="btn-dl" onclick={() => downloadCsv('workouts')}>↓ CSV</button>
			</div>
			<div class="card-divider"></div>
			<div class="data-row">
				<div>
					<div class="data-title">Check-In CSV</div>
					<div class="data-sub">Energy, sleep, soreness, weight history.</div>
				</div>
				<button class="btn-dl" onclick={() => downloadCsv('checkins')}>↓ CSV</button>
			</div>
			<div class="card-divider"></div>
			<div class="data-row">
				<div>
					<div class="data-title">Full Backup JSON</div>
					<div class="data-sub">All logs + check-ins in one file. Use to restore.</div>
				</div>
				<button class="btn-dl" onclick={downloadBackup}>↓ JSON</button>
			</div>
		</div>

		<!-- Restore -->
		<div class="card data-card">
			{#if importOk}
				<div class="import-ok">✓ Backup restored — data updated.</div>
			{:else if importError}
				<div class="import-err">{importError}</div>
			{:else}
				<div class="data-row">
					<div>
						<div class="data-title">Restore from backup</div>
						<div class="data-sub">Import a .json backup to merge data.</div>
					</div>
					<label class="btn-dl btn-import">
						↑ Import
						<input type="file" accept=".json" style="display:none" onchange={importBackup} />
					</label>
				</div>
			{/if}
		</div>

		<!-- Clear -->
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
.profile-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.profile-hint  { font-size: 11px; color: var(--muted); opacity: .7; line-height: 1.4; }
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
	min-height: var(--touch); white-space: nowrap;
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
	min-height: var(--touch); width: var(--touch); font-size: 18px; font-weight: 700;
	color: var(--accent); background: none; border-radius: 0; padding: 0;
	display: flex; align-items: center; justify-content: center;
}
.step-btn:disabled { color: var(--muted); opacity: .4; }
.step-val { min-width: 36px; text-align: center; font-size: 16px; font-weight: 900; font-variant-numeric: tabular-nums; }
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
	min-height: var(--touch); border-radius: 8px; padding: 0 12px;
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

/* Data / Backup */
.data-card { gap: 0; padding: 0; }
.data-row {
	display: flex; align-items: center; justify-content: space-between; gap: 12px;
	padding: 12px 16px;
}
.data-title { font-weight: 800; font-size: 14px; }
.data-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }
.card-divider { height: 1px; background: var(--line); margin: 0; }
.btn-dl {
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	color: var(--accent); font-weight: 800; font-size: 13px;
	min-height: var(--touch); border-radius: 10px; padding: 0 14px; flex-shrink: 0;
	display: flex; align-items: center; justify-content: center;
	cursor: pointer; white-space: nowrap;
}
.btn-import { cursor: pointer; }
.import-ok  {
	padding: 14px 16px; font-weight: 800; font-size: 14px;
	color: var(--green); text-align: center;
}
.import-err {
	padding: 14px 16px; font-weight: 700; font-size: 13px;
	color: var(--red); text-align: center; line-height: 1.4;
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
	flex: 1; min-height: var(--touch); font-weight: 800; font-size: 13px;
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
	font-size: 12px; font-weight: 700; min-height: var(--touch);
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

/* ── AI Builder / Import ────────────────────────────────── */
.btn-primary-settings {
	width: 100%; min-height: var(--touch-lg); border-radius: 14px;
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); font-weight: 800; font-size: 15px;
	margin-top: 4px; transition: background .2s;
}
.btn-primary-settings:disabled { opacity: .4; cursor: not-allowed; }
.btn-activated { background: var(--green) !important; }

.ai-loading-card {
	display: flex; flex-direction: column; align-items: center;
	justify-content: center; gap: 14px; padding: 32px 16px; text-align: center;
}
.ai-dots { display: flex; gap: 8px; align-items: center; justify-content: center; }
.ai-dots span {
	width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
	animation: ai-bounce 1.2s ease-in-out infinite;
}
.ai-dots span:nth-child(2) { animation-delay: .2s; }
.ai-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes ai-bounce {
	0%, 80%, 100% { transform: scale(.6); opacity: .4; }
	40%            { transform: scale(1);  opacity: 1;  }
}
.ai-loading-note { font-size: 13px; color: var(--muted); font-weight: 700; }

.ab-info-card { gap: 8px; }
.ab-prefill-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ab-prefill-label { font-size: 12px; font-weight: 700; color: var(--muted); }
.ab-prefill-vals  { font-size: 13px; font-weight: 800; color: var(--accent); text-transform: capitalize; }

.ab-program-name {
	font-size: 18px; font-weight: 900; text-align: center;
	padding: 10px 0 4px; color: var(--text);
}

.day-preview-card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 14px; padding: 12px 14px;
	display: flex; flex-direction: column; gap: 6px;
}
.day-preview-head {
	font-size: 12px; font-weight: 800; text-transform: uppercase;
	letter-spacing: .06em; color: var(--accent); margin-bottom: 4px;
}
.day-preview-ex {
	display: flex; align-items: center; gap: 6px;
	font-size: 13px; font-weight: 700; padding: 4px 0;
	border-bottom: 1px solid rgba(255,255,255,.05);
}
.day-preview-ex:last-child { border-bottom: none; }
.day-preview-ex > span:first-child { flex: 1; min-width: 0; }
.ex-unmatched > span:first-child { color: var(--muted); }
.ex-badge {
	font-size: 11px; font-weight: 900; padding: 1px 6px; border-radius: 999px;
	flex-shrink: 0; line-height: 1.4;
}
.ex-badge-warn     { background: rgba(233,174,83,.2); color: #e9ae53; }
.ex-badge-mismatch { background: rgba(233,83,83,.2);  color: var(--red); }
.day-preview-sets  { font-size: 11px; color: var(--muted); flex-shrink: 0; white-space: nowrap; }

.review-card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 12px; padding: 10px 14px;
	display: flex; flex-direction: column; gap: 4px;
}
.review-card.review-mismatch { border-color: rgba(233,83,83,.35); }
.review-orig     { font-size: 13px; font-weight: 800; }
.review-match    { font-size: 12px; color: var(--green); font-weight: 700; }
.review-no-match { font-size: 12px; color: var(--muted); font-weight: 700; }
.review-warn     { color: #e9ae53; }
.all-matched {
	text-align: center; font-size: 13px; font-weight: 800;
	color: var(--green); padding: 12px 0;
}

.import-textarea {
	width: 100%; border-radius: 14px; padding: 14px;
	font-size: 13px; font-weight: 600; line-height: 1.5;
	resize: vertical; min-height: 160px;
	background: var(--card); border: 1px solid var(--line); color: var(--text);
	font-family: inherit; box-sizing: border-box;
}
.import-summary-card { gap: 4px; }
.import-prog-name { font-size: 16px; font-weight: 900; }
.import-prog-sub  { font-size: 12px; color: var(--muted); font-weight: 700; }

.pi-search {
	border-radius: 10px; font-size: 13px; padding: 8px 12px;
	min-height: 40px; margin-top: 6px; width: 100%; box-sizing: border-box;
}
.pi-picker {
	display: flex; flex-direction: column; gap: 2px;
	max-height: 220px; overflow-y: auto; margin-top: 4px;
}
.pi-picker-item {
	text-align: left; padding: 8px 12px; border-radius: 8px;
	font-size: 13px; font-weight: 700;
	background: rgba(255,255,255,.05); border: 1px solid transparent;
	color: var(--text); min-height: unset;
	transition: background .1s;
}
.pi-picker-item:hover { background: rgba(255,255,255,.1); }
.pi-empty { font-size: 12px; color: var(--muted); padding: 8px 0; }
.btn-pick {
	background: rgba(14,154,184,.1); color: var(--accent); font-weight: 800; font-size: 13px;
	min-height: 44px; width: 100%; border-radius: 10px; padding: 0 14px;
	border: 1px dashed rgba(14,154,184,.35); margin-top: 4px;
	display: flex; align-items: center; justify-content: center;
}

.lib-fail-warn {
	background: rgba(233,83,83,.1); border: 1px solid rgba(233,83,83,.3);
	border-radius: 12px; padding: 12px 14px;
	font-size: 13px; font-weight: 700; color: var(--red); line-height: 1.5;
}

/* My routines multi-button row */
.routine-btns { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.btn-ai-build {
	background: rgba(14,154,184,.12);
	border-color: rgba(14,154,184,.3);
	color: var(--accent);
}

/* ── Supplement tracker ─────────────────────────────────────── */
.supp-card { display: flex; flex-direction: column; gap: 10px; }
.supp-streak {
	font-size: 14px; font-weight: 800; color: var(--amber);
	text-align: center; padding: 2px 0; font-variant-numeric: tabular-nums;
}
.supp-today-label {
	font-size: 11px; font-weight: 700; color: var(--muted);
	text-transform: uppercase; letter-spacing: .06em;
}
.supp-row {
	display: flex; align-items: center;
	justify-content: space-between; gap: 10px;
}
.supp-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.supp-name { font-size: 14px; font-weight: 700; }
.supp-dose { font-size: 12px; color: var(--muted); }
.supp-btns { display: flex; gap: 6px; flex-shrink: 0; }
.supp-btn {
	padding: 0 16px; min-height: var(--touch);
	border-radius: 999px; border: 1px solid var(--line);
	background: rgba(255,255,255,.06);
	font-size: 12px; font-weight: 700; color: var(--muted);
	transition: background .15s, border-color .15s, color .15s;
}
.supp-btn.supp-taken  { background: rgba(47,179,109,.18); border-color: var(--green); color: var(--green); }
.supp-btn.supp-skipped { background: rgba(233,83,83,.12); border-color: var(--red);   color: var(--red); }
.supp-add-row { display: flex; gap: 8px; align-items: stretch; }
.supp-input      { flex: 1; min-width: 0; }
.supp-dose-input { width: 100px; flex-shrink: 0; }
.supp-add-btn {
	flex-shrink: 0; min-height: var(--touch); padding: 0 16px;
	background: rgba(14,154,184,.15); border: 1px solid var(--accent);
	color: var(--accent); font-weight: 800; font-size: 13px;
	border-radius: 10px; white-space: nowrap;
}
.supp-add-btn:disabled { opacity: .4; cursor: not-allowed; }
.supp-list { display: flex; flex-direction: column; }
.supp-item {
	display: flex; align-items: center; justify-content: space-between;
	gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line);
}
.supp-item:last-child { border-bottom: none; }
.supp-item-name { font-size: 13px; color: var(--muted); }
.supp-del {
	min-height: var(--touch); width: var(--touch); padding: 0;
	background: none; color: var(--muted); font-size: 18px;
	border-radius: 50%; flex-shrink: 0;
	display: flex; align-items: center; justify-content: center;
}
.supp-del:hover { color: var(--red); }
</style>
