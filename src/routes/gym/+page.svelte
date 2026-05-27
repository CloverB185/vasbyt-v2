<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
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
	import { J, S, KEYS, today } from '$lib/data/storage';

	// ── Data ─────────────────────────────────────────────────────
	let exercises    = $state<Exercise[]>([]);
	let routineTitle = $state('');
	let hasRoutine   = $state(false);

	// ── Gym state ─────────────────────────────────────────────────
	let started        = $state(false);
	let exIdx          = $state(0);
	let weight         = $state('');
	let reps           = $state('');
	let setsToday      = $state<LogEntry[]>([]);
	let restSecs       = $state(0);
	let restOn         = $state(false);
	let woDone         = $state(false);
	let totalDone      = $state(0);
	let targetOverride = $state<number | null>(null);

	// ── Notes ─────────────────────────────────────────────────────
	let noteVal   = $state('');
	let noteOpen  = $state(false);
	let _noteTimer: ReturnType<typeof setTimeout> | null = null;

	let _timer: ReturnType<typeof setInterval> | null = null;

	// ── Media / GIF ───────────────────────────────────────────────
	let mediaMap       = $state<Record<string, { id: string }>>({});
	let gifFailed      = $state(false);
	let gifOverlay     = $state(false);
	let gifOvUrl       = $state('');
	let gifOvName      = $state('');
	let gifFeedbackVal = $state<'ok' | 'wrong' | null>(null);

	const GIF_BASE = 'https://vasbyt.pages.dev/assets/gifs/';

	function gifUrlFor(id: string | number): string | null {
		const m = mediaMap[String(id)];
		if (m?.id) return GIF_BASE + encodeURIComponent(m.id) + '.gif';
		return null;
	}

	function openGif(url: string, name: string) {
		gifOvUrl  = url;
		gifOvName = name;
		gifOverlay = true;
	}

	// ── Voice mode ─────────────────────────────────────────────────
	let voiceSupported = $state(false);
	let voiceActive    = $state(false);
	let voiceToast     = $state('');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let _voiceRec: any = null;
	let _voiceToastTimer: ReturnType<typeof setTimeout> | null = null;

	// ── Derived ───────────────────────────────────────────────────
	let ex        = $derived(exercises[exIdx] ?? null);
	let target    = $derived(targetOverride ?? (ex ? (Number(ex.sets) || 3) : 3));
	let done      = $derived(setsToday.length);
	let allDone   = $derived(done >= target);
	let isLast    = $derived(exIdx >= exercises.length - 1);
	let totalSets = $derived(exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0));
	let pct       = $derived(totalSets > 0 ? Math.round((totalDone / totalSets) * 100) : 0);
	let restFmt   = $derived(`${Math.floor(restSecs / 60)}:${String(restSecs % 60).padStart(2, '0')}`);
	let muscles   = $derived((ex?.muscles ?? []).join(' · '));

	// ── Resume helpers ────────────────────────────────────────────
	function saveResume() {
		S(KEYS.resume(), { date: today(), exIdx });
	}
	function clearResume() {
		S(KEYS.resume(), null);
	}

	// ── Load ──────────────────────────────────────────────────────
	onMount(() => {
		const rd     = getRoutineDay(getDay());
		hasRoutine   = rd.exercises.length > 0;
		exercises    = rd.exercises;
		routineTitle = rd.title;

		// Restore mid-session state if resuming
		const resume = J<{ date: string; exIdx: number } | null>(KEYS.resume(), null);
		if (resume && resume.date === today() && exercises.length > 0) {
			started = true;
			exIdx   = Math.min(resume.exIdx, exercises.length - 1);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		voiceSupported = !!SR;

		fetch('/data/workoutx-media-map.json')
			.then(r => r.json())
			.then(m => { mediaMap = m.approved ?? {}; })
			.catch(() => {});

		return () => {
			if (_timer) clearInterval(_timer);
			stopVoice();
		};
	});

	// Reset GIF failed state when exercise changes
	$effect(() => {
		if (ex) gifFailed = false;
	});

	// ── Refresh sets when exercise changes or gym starts ──────────
	$effect(() => {
		if (started && ex) {
			refreshSets();
			prefill();
			loadNote();
			loadGifFeedback();
			targetOverride = null;
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

	// ── Notes ─────────────────────────────────────────────────────
	function loadNote() {
		if (!ex) { noteVal = ''; return; }
		const notes = J<Record<string, string>>(KEYS.gymNotes(), {});
		noteVal = notes[`${ex.id}_${today()}`] ?? '';
	}

	function saveNote() {
		if (!ex) return;
		const notes = J<Record<string, string>>(KEYS.gymNotes(), {});
		const key = `${ex.id}_${today()}`;
		if (noteVal.trim()) notes[key] = noteVal.trim();
		else delete notes[key];
		S(KEYS.gymNotes(), notes);
	}

	function onNoteInput() {
		if (_noteTimer) clearTimeout(_noteTimer);
		_noteTimer = setTimeout(saveNote, 500);
	}

	// ── GIF feedback ──────────────────────────────────────────────
	function loadGifFeedback() {
		if (!ex) { gifFeedbackVal = null; return; }
		const fb = J<Record<string, 'ok' | 'wrong'>>(KEYS.gifFeedback(), {});
		gifFeedbackVal = fb[String(ex.id)] ?? null;
	}

	function saveGifFeedback(flag: 'ok' | 'wrong') {
		if (!ex) return;
		const fb = J<Record<string, 'ok' | 'wrong'>>(KEYS.gifFeedback(), {});
		fb[String(ex.id)] = flag;
		S(KEYS.gifFeedback(), fb);
		gifFeedbackVal = flag;
		_voiceFeedback(flag === 'ok' ? 'GIF confirmed ✓' : 'GIF flagged ✗');
	}

	// ── Steppers ──────────────────────────────────────────────────
	function adjWeight(delta: number) {
		const v = Math.max(0, Math.round((Number(weight || 0) + delta) * 2) / 2);
		weight = String(v);
	}
	function adjReps(delta: number) {
		const v = Math.max(1, Number(reps || 0) + delta);
		reps = String(v);
	}

	// ── Extra set ─────────────────────────────────────────────────
	function addExtraSet() {
		targetOverride = (targetOverride ?? (ex ? Number(ex.sets) || 3 : 3)) + 1;
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
		const r = Math.round(Number(reps));
		if (!ex || r < 1) return;
		if (!ex.isBodyweight && Number(weight) < 0) return;
		saveLog(ex.id, ex.name, weight, String(r));
		refreshSets();
		saveResume();
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
		targetOverride = null; noteOpen = false;
		if (!isLast) { exIdx++; saveResume(); }
		else finishAll();
	}

	function prevEx() {
		stopTimer();
		targetOverride = null; noteOpen = false;
		if (exIdx > 0) { exIdx--; saveResume(); }
	}

	function finishAll() {
		stopVoice();
		clearResume();
		finishWorkout();
		refreshSets();
		woDone = true;
	}

	// ── Voice mode ─────────────────────────────────────────────────
	function _voiceFeedback(msg: string) {
		voiceToast = msg;
		if (_voiceToastTimer) clearTimeout(_voiceToastTimer);
		_voiceToastTimer = setTimeout(() => (voiceToast = ''), 1800);
	}

	function _voiceProcess(transcript: string) {
		const t = transcript.toLowerCase().replace(/[.,!?]+$/, '').trim();

		if (/^(next|next exercise|next ex|move on)$/.test(t)) {
			_voiceFeedback('Next ›'); nextEx(); return;
		}
		if (/^(previous|prev|back|go back)$/.test(t)) {
			_voiceFeedback('‹ Previous'); prevEx(); return;
		}
		if (/^(skip|skip rest|rest done|done resting|skip timer|go)$/.test(t)) {
			_voiceFeedback('Rest skipped'); stopTimer(); return;
		}
		if (/^(finish|finish workout|done workout|end workout|wrap up|all done)$/.test(t)) {
			_voiceFeedback('Finishing…'); finishAll(); return;
		}
		if (/^(stop|stop listening|stop voice|off|quiet|mute)$/.test(t)) {
			_voiceFeedback('Voice off'); stopVoice(); return;
		}
		if (/^(same|same as last|copy|copy last|same weight)$/.test(t)) {
			const last = setsToday.at(-1);
			if (last) { weight = last.weight; reps = last.reps; _voiceFeedback('Same as last'); }
			return;
		}
		if (/^(done|log set|log it|commit|good|tick|yes|yep|yeah|logged|log)$/.test(t)) {
			if (!allDone && !restOn) { _voiceFeedback('Set logged ✓'); logSet(); }
			return;
		}

		const wPat = '(\\d+(?:\\.\\d+)?)\\s*(?:kg|kilo|kilos|kilograms?)';
		const rPat = '(\\d+)\\s*(?:reps?|repetitions?|times?)';
		const combWR = t.match(new RegExp('^' + wPat + '\\s+' + rPat + '$'));
		const combRW = t.match(new RegExp('^' + rPat + '\\s+' + wPat + '$'));
		if (combWR || combRW) {
			const wVal = combWR ? combWR[1] : combRW![2];
			const rVal = combWR ? combWR[2] : combRW![1];
			weight = wVal; reps = rVal;
			_voiceFeedback(`${wVal} kg × ${rVal}`);
			return;
		}
		const wOnly = t.match(new RegExp('^' + wPat + '$'));
		if (wOnly) { weight = wOnly[1]; _voiceFeedback(`${wOnly[1]} kg`); return; }
		const rOnly = t.match(new RegExp('^' + rPat + '$'));
		if (rOnly) { reps = rOnly[1]; _voiceFeedback(`${rOnly[1]} reps`); return; }
	}

	function startVoice() {
		if (voiceActive) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		if (!SR) return;
		_voiceRec = new SR();
		_voiceRec.continuous = true;
		_voiceRec.interimResults = false;
		_voiceRec.lang = 'en-ZA';
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		_voiceRec.onresult = (e: any) => {
			const last = e.results[e.results.length - 1];
			if (last.isFinal) _voiceProcess(last[0].transcript);
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		_voiceRec.onerror = (e: any) => {
			if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
				voiceActive = false;
				_voiceFeedback('Mic blocked — check permissions');
			}
		};
		_voiceRec.onend = () => {
			if (voiceActive) { try { _voiceRec.start(); } catch { /* auto-restart after silence */ } }
		};
		try {
			_voiceRec.start();
			voiceActive = true;
			_voiceFeedback('Listening — "next", "done", "skip" or a weight');
		} catch {
			voiceActive = false;
		}
	}

	function stopVoice() {
		voiceActive = false;
		if (_voiceRec) { try { _voiceRec.stop(); } catch { /* ignore */ } _voiceRec = null; }
	}

	function toggleVoice() { voiceActive ? stopVoice() : startVoice(); }
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
	<h1 class="sr-only">Gym session — {routineTitle}</h1>
	<!-- Progress bar -->
	<div class="gym-prog">
		<div class="gym-prog-fill" style="width:{pct}%"></div>
	</div>

	<!-- Exercise GIF -->
	{#if ex && !gifFailed}
		{@const gUrl = gifUrlFor(ex.id)}
		{#if gUrl}
			<div class="ex-gif" onclick={() => openGif(gUrl, ex!.name)}>
				<img
					src={gUrl}
					alt={ex.name}
					loading="lazy"
					class="gif-img"
					onerror={() => gifFailed = true}
				/>
				<span class="gif-hint">tap to enlarge</span>
			</div>
		{/if}
	{/if}

	<!-- GIF feedback strip -->
	{#if ex && !gifFailed && gifUrlFor(ex.id)}
		<div class="gif-feedback">
			<span class="gif-fb-lbl">Right GIF?</span>
			<button
				class="gif-fb-btn"
				class:gif-fb-active={gifFeedbackVal === 'ok'}
				onclick={() => saveGifFeedback('ok')}
				aria-label="Correct GIF"
			>✓</button>
			<button
				class="gif-fb-btn gif-fb-wrong"
				class:gif-fb-active={gifFeedbackVal === 'wrong'}
				onclick={() => saveGifFeedback('wrong')}
				aria-label="Wrong GIF"
			>✗</button>
		</div>
	{/if}

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

	<!-- Target + count + voice + note toggles -->
	<div class="gym-target">
		<span class="target-txt">{ex.sets} sets · {ex.reps}</span>
		<div class="target-actions">
			{#if voiceSupported}
				<button class="voice-btn" class:voice-on={voiceActive} onclick={toggleVoice}>
					{voiceActive ? '● Voice' : 'Voice'}
				</button>
			{/if}
			<button class="note-btn" class:note-has={noteVal.trim()} onclick={() => (noteOpen = !noteOpen)}>
				Note{noteVal.trim() ? ' ●' : ''}
			</button>
		</div>
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

	<!-- Exercise note -->
	{#if noteOpen}
		<div class="note-card">
			<textarea
				class="note-input"
				placeholder="Note for this exercise..."
				rows={3}
				bind:value={noteVal}
				oninput={onNoteInput}
			></textarea>
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
						<label class="input-lbl" for="inp-weight">kg</label>
						<div class="stepper-row">
							<button class="step-btn" onclick={() => adjWeight(-2.5)} aria-label="Decrease weight">−</button>
							<input
								id="inp-weight"
								class="set-input"
								type="number"
								inputmode="decimal"
								placeholder="0"
								min="0"
								max="500"
								step="0.5"
								bind:value={weight}
							/>
							<button class="step-btn" onclick={() => adjWeight(2.5)} aria-label="Increase weight">+</button>
						</div>
					</div>
				{:else}
					<div class="input-grp bw-grp">
						<span class="bw-lbl">Bodyweight</span>
					</div>
				{/if}
				<div class="input-grp">
					<label class="input-lbl" for="inp-reps">reps</label>
					<div class="stepper-row">
						<button class="step-btn" onclick={() => adjReps(-1)} aria-label="Decrease reps">−</button>
						<input
							id="inp-reps"
							class="set-input"
							type="number"
							inputmode="numeric"
							placeholder="0"
							min="1"
							max="999"
							step="1"
							bind:value={reps}
						/>
						<button class="step-btn" onclick={() => adjReps(1)} aria-label="Increase reps">+</button>
					</div>
				</div>
			</div>
			<button class="btn-primary" onclick={logSet} disabled={Math.round(Number(reps)) < 1}>
				Log Set {done + 1}
			</button>
		</div>
	{/if}

	<!-- Next / Finish CTA -->
	{#if allDone}
		<div class="next-row">
			<button class="btn-add-set" onclick={addExtraSet}>+ Set</button>
			<button class="btn-primary btn-next-main" onclick={nextEx}>
				{isLast ? 'Finish ◎' : 'Next →'}
			</button>
		</div>
	{/if}
{/if}

<!-- GIF lightbox overlay -->
{#if gifOverlay}
	<div class="gif-overlay" onclick={() => gifOverlay = false}>
		<p class="gif-ov-name">{gifOvName}</p>
		<img src={gifOvUrl} alt={gifOvName} class="gif-ov-img" />
		<p class="gif-ov-close">Tap anywhere to close</p>
	</div>
{/if}

<!-- Voice feedback toast (persists across re-renders) -->
{#if voiceToast}
	<div class="voice-toast">{voiceToast}</div>
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
.stepper-row { display: flex; align-items: center; gap: 6px; }
.step-btn {
	flex-shrink: 0; width: 44px; min-height: var(--touch-lg);
	background: rgba(255,255,255,.06); border: 1px solid var(--line);
	border-radius: 12px; font-size: 22px; font-weight: 900;
	color: var(--text); line-height: 1;
}
.step-btn:active { background: rgba(255,255,255,.12); }
.set-input { flex: 1; min-width: 0; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 10px; font-size: 28px; font-weight: 900; text-align: center; color: var(--text); min-height: var(--touch-lg); }
.set-input:focus { outline: none; border-color: var(--accent); }
.bw-grp    { justify-content: center; align-items: center; }
.bw-lbl    { font-size: 14px; font-weight: 700; color: var(--muted); }

/* ── Nav buttons ─────────────────────────────────────────────── */
.nav-btn { min-width: var(--touch); min-height: var(--touch); background: var(--card); border: 1px solid var(--line); border-radius: 12px; font-size: 18px; font-weight: 700; color: var(--text); flex-shrink: 0; }
.nav-btn:disabled { opacity: .3; }

/* ── Shared buttons ──────────────────────────────────────────── */
.btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent-light)); color: var(--accent-text); font-weight: 900; width: 100%; min-height: var(--touch-lg); border-radius: 16px; font-size: 16px; }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }
.btn-ghost { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 12px; font-weight: 700; font-size: 14px; color: var(--muted); min-height: var(--touch); }

/* ── Target actions (voice + note) ──────────────────────────── */
.target-actions { display: flex; gap: 6px; align-items: center; }

/* ── Note toggle button ──────────────────────────────────────── */
.note-btn {
	font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
	color: var(--muted); border: 1px solid var(--line);
	border-radius: 999px; padding: 4px 12px; min-height: var(--touch);
	transition: color 0.15s, border-color 0.15s;
}
.note-btn.note-has { color: var(--accent); border-color: var(--accent); }

/* ── Note card ───────────────────────────────────────────────── */
.note-card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 14px; padding: 10px 12px; margin: 4px 0;
}
.note-input {
	width: 100%; background: transparent; border: none; resize: none;
	color: var(--text); font-size: 14px; font-family: inherit; line-height: 1.55;
}
.note-input:focus { outline: none; }
.note-input::placeholder { color: rgba(255,255,255,.22); }

/* ── Next row (add set + next/finish) ────────────────────────── */
.next-row { display: flex; gap: 10px; margin-top: 8px; }
.btn-add-set {
	flex-shrink: 0; padding: 0 18px; min-height: var(--touch-lg);
	border-radius: 16px; font-size: 15px; font-weight: 900;
	background: rgba(255,255,255,.06); border: 1px solid var(--line); color: var(--text);
}
.btn-next-main { flex: 1; }

/* ── Voice ───────────────────────────────────────────────────── */
.voice-btn {
	font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
	color: var(--muted); border: 1px solid var(--line);
	border-radius: 999px; padding: 4px 12px; min-height: var(--touch);
	transition: color 0.15s, border-color 0.15s;
}
.voice-btn.voice-on { color: var(--accent); border-color: var(--accent); }
.voice-toast {
	position: fixed; bottom: 104px; left: 50%; transform: translateX(-50%);
	background: rgba(0,0,0,0.82); color: #fff;
	padding: 8px 20px; border-radius: 999px;
	font-size: 14px; font-weight: 700;
	pointer-events: none; z-index: 9999; white-space: nowrap;
}

/* ── GIF feedback strip ──────────────────────────────────────── */
.gif-feedback {
	display: flex; align-items: center; gap: 8px;
	padding: 0 0 8px;
}
.gif-fb-lbl {
	flex: 1; font-size: 11px; font-weight: 700;
	color: rgba(255,255,255,.28); text-transform: uppercase; letter-spacing: .05em;
}
.gif-fb-btn {
	font-size: 15px; font-weight: 900;
	border: 1px solid var(--line); border-radius: 999px;
	padding: 4px 16px; min-height: var(--touch);
	color: rgba(255,255,255,.35); background: none;
	transition: color 0.15s, border-color 0.15s;
}
.gif-fb-btn.gif-fb-active { color: var(--accent); border-color: var(--accent); background: rgba(0,188,212,.08); }
.gif-fb-wrong.gif-fb-active { color: var(--red); border-color: var(--red); background: rgba(233,83,83,.08); }

/* ── GIF visual ──────────────────────────────────────────────── */
.ex-gif {
	position: relative; cursor: pointer;
	border-radius: 12px; overflow: hidden; margin-bottom: 10px;
}
.gif-img { width: 100%; border-radius: 12px; display: block; }
.gif-hint {
	position: absolute; bottom: 6px; right: 8px;
	background: rgba(0,0,0,0.45); color: #fff;
	font-size: 11px; padding: 2px 7px; border-radius: 20px; pointer-events: none;
}

/* ── GIF overlay ─────────────────────────────────────────────── */
.gif-overlay {
	position: fixed; inset: 0; background: rgba(0,0,0,0.88);
	z-index: 9999; display: flex; flex-direction: column;
	align-items: center; justify-content: center;
	padding: 20px; cursor: pointer;
}
.gif-ov-name  { color: #fff; font-weight: 700; font-size: 15px; margin-bottom: 14px; text-align: center; }
.gif-ov-img   { max-width: 100%; max-height: 72vh; border-radius: 12px; display: block; }
.gif-ov-close { color: #aaa; font-size: 13px; margin-top: 14px; }

/* ── Label ───────────────────────────────────────────────────── */
.label-sm { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
</style>
