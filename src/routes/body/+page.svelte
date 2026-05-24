<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getTodayCheckin, saveCheckin, getRecentCheckins,
		getRecentCheckins as getCheckinHistory,
		type CheckIn
	} from '$lib/data/program';
	import { J, S, KEYS } from '$lib/data/storage';
	import { loadPhotos, storePhoto, removePhoto, type Photo } from '$lib/data/photos';

	// ── Check-in state ────────────────────────────────────────
	let todayEntry  = $state<CheckIn | null>(null);
	let editing     = $state(false);
	let history     = $state<CheckIn[]>([]);
	let weight      = $state('');
	let energy      = $state(3);
	let sleep       = $state('');
	let notes       = $state('');
	let ciSaved     = $state(false);

	// ── Photos state ──────────────────────────────────────────
	let photos       = $state<Photo[]>([]);
	let selectedPose = $state<string | null>(null);
	let photoSaving  = $state(false);
	let expanded     = $state<string | null>(null); // expanded photo dataUrl

	// ── AI state ─────────────────────────────────────────────
	let bodyInsight     = $state('');
	let insightLoading  = $state(false);
	let compareResult   = $state('');
	let compareDate1    = $state('');
	let compareDate2    = $state('');
	let compareLoading  = $state(false);

	const AI_PROXY   = 'https://vasbyt-ai-proxy.clover887.workers.dev';
	const MODEL      = 'google/gemini-3-flash-preview';
	const POSE_OPTS  = ['front', 'back', 'right', 'left'];
	const POSE_LABEL: Record<string, string> = { front: 'Front', back: 'Back', right: 'Right', left: 'Left' };

	// ── Derived ───────────────────────────────────────────────
	let showForm    = $derived(!todayEntry || editing);
	let sessionDates = $derived(groupByDate(photos));

	onMount(async () => {
		refreshCheckin();
		photos = await loadPhotos();
		loadCachedInsights();
		autoTriggerInsight();
	});

	// ── Check-in ──────────────────────────────────────────────

	function refreshCheckin() {
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

	function submitCheckin() {
		saveCheckin({
			weight: weight ? Number(weight) : undefined,
			energy,
			sleep:  sleep  ? Number(sleep)  : undefined,
			notes:  notes.trim() || undefined
		});
		ciSaved = true; editing = false;
		refreshCheckin();
		setTimeout(() => (ciSaved = false), 2000);
	}

	// ── Photos ────────────────────────────────────────────────

	async function handleFileInput(e: Event, fromCamera: boolean) {
		const input = e.target as HTMLInputElement;
		const file  = input.files?.[0];
		if (!file) return;
		photoSaving = true;
		try {
			await storePhoto(file, selectedPose);
			photos = await loadPhotos();
		} finally {
			photoSaving = false;
			input.value = '';
		}
	}

	async function handleDelete(id: string) {
		await removePhoto(id);
		photos = await loadPhotos();
		// clear compare cache if photo deleted
		const bi = J<Record<string, unknown>>(KEYS.bodyInsights(), {});
		if (bi.photoCompare) {
			delete bi.photoCompare;
			S(KEYS.bodyInsights(), bi);
			compareResult = ''; compareDate1 = ''; compareDate2 = '';
		}
	}

	function groupByDate(list: Photo[]): { date: string; photos: Photo[] }[] {
		const map = new Map<string, Photo[]>();
		for (const p of list) {
			if (!map.has(p.date)) map.set(p.date, []);
			map.get(p.date)!.push(p);
		}
		return Array.from(map.entries())
			.sort(([a], [b]) => b.localeCompare(a))
			.map(([date, photos]) => ({ date, photos }));
	}

	function formatDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
	}

	// ── AI — Body Insight ─────────────────────────────────────

	interface BodyInsightsCache {
		date?: string;
		insight?: string;
		photoCompare?: { date: string; result: string; photo1date: string; photo2date: string };
	}

	function loadCachedInsights() {
		const bi = J<BodyInsightsCache>(KEYS.bodyInsights(), {});
		const sevenDaysAgo = daysAgoStr(7);
		if (bi.insight && bi.date && bi.date >= sevenDaysAgo) {
			bodyInsight = bi.insight;
		}
		const thirtyDaysAgo = daysAgoStr(30);
		if (bi.photoCompare?.result && bi.photoCompare.date >= thirtyDaysAgo) {
			compareResult = bi.photoCompare.result;
			compareDate1  = bi.photoCompare.photo1date;
			compareDate2  = bi.photoCompare.photo2date;
		}
	}

	function autoTriggerInsight() {
		const checkins = getCheckinHistory(10);
		if (checkins.length < 3) return;
		const bi = J<BodyInsightsCache>(KEYS.bodyInsights(), {});
		if (bi.insight && bi.date && bi.date >= daysAgoStr(7)) return;
		fetchBodyInsight();
	}

	async function fetchBodyInsight() {
		if (insightLoading) return;
		insightLoading = true;
		try {
			const checkins = getCheckinHistory(7);
			const payload = {
				recentCheckins: checkins.map(c => ({
					date: c.date,
					energy: c.energy ?? null,
					sleep:  c.sleep  ?? null,
					weight: c.weight ?? null
				}))
			};
			const prompt =
				'You are a warm, encouraging personal trainer and health coach. ' +
				'Based on the check-in data below, write 2 sentences of supportive, motivating coaching. ' +
				'Celebrate positive trends in energy or sleep. If weight is present, mention direction only if encouraging. ' +
				'End with one specific, achievable tip for this week. ' +
				'Speak directly using "you". No markdown, no greeting, no sign-off, no clinical language.\n\n' +
				'Data: ' + JSON.stringify(payload);

			const resp = await fetch(AI_PROXY, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: MODEL, max_tokens: 150, messages: [{ role: 'user', content: prompt }] })
			});
			if (!resp.ok) return;
			const data = await resp.json();
			const text = data?.choices?.[0]?.message?.content?.trim();
			if (text) {
				bodyInsight = text;
				const bi = J<BodyInsightsCache>(KEYS.bodyInsights(), {});
				bi.date = todayStr(); bi.insight = text;
				S(KEYS.bodyInsights(), bi);
			}
		} catch { /* silent */ } finally {
			insightLoading = false;
		}
	}

	// ── AI — Photo Comparison ─────────────────────────────────

	async function comparePhotos(force = false) {
		if (compareLoading) return;
		if (!force && compareResult) return; // already cached

		compareLoading = true;
		try {
			// Group sessions by date, oldest first
			const sessionMap = new Map<string, Photo[]>();
			for (const p of photos) {
				if (!sessionMap.has(p.date)) sessionMap.set(p.date, []);
				sessionMap.get(p.date)!.push(p);
			}
			const dates = Array.from(sessionMap.keys()).sort();
			if (dates.length < 1) return;

			const oldDate = dates[0];
			const newDate = dates[dates.length - 1];
			const oldSess = sessionMap.get(oldDate)!;
			const newSess = sessionMap.get(newDate)!;

			// Match same poses; fall back to first of each
			const POSE_ORDER = ['front', 'back', 'right', 'left'];
			const pairs: { pose: string | null; old: Photo; new: Photo }[] = [];

			if (dates.length >= 2) {
				for (const pose of POSE_ORDER) {
					if (pairs.length >= 3) break;
					const oldP = oldSess.find(p => p.pose === pose);
					const newP = newSess.find(p => p.pose === pose);
					if (oldP && newP) pairs.push({ pose, old: oldP, new: newP });
				}
				if (!pairs.length) pairs.push({ pose: null, old: oldSess[0], new: newSess[0] });
			} else {
				pairs.push({ pose: null, old: photos[photos.length - 1], new: photos[0] });
			}

			const POSE_LONG: Record<string, string> = { front: 'front view', back: 'back view', right: 'right side', left: 'left side' };
			const content: unknown[] = [];
			for (const pr of pairs) {
				const label = pr.pose ? (POSE_LONG[pr.pose] ?? pr.pose) : 'photo';
				content.push({ type: 'text', text: `${label} — ${oldDate}` });
				content.push({ type: 'image_url', image_url: { url: pr.old.dataUrl } });
				content.push({ type: 'text', text: `${label} — ${newDate}` });
				content.push({ type: 'image_url', image_url: { url: pr.new.dataUrl } });
			}
			const poseNames = pairs.map(p => p.pose ? (POSE_LONG[p.pose] ?? p.pose) : 'view').join(', ');
			content.push({ type: 'text', text:
				`These are progress photos comparing ${oldDate} vs ${newDate}, showing: ${poseNames}. ` +
				'Give a warm, specific, non-judgmental analysis in three parts — natural sentences, no labels or headers: ' +
				'(1) what has visibly changed (posture, shape, muscle definition, proportions), ' +
				'(2) what looks consistent and strong, ' +
				'(3) one specific encouragement for the next phase. ' +
				'Focus on shape, posture, and strength — never mention weight, fat, or body mass. Under 110 words. No markdown, no greeting, no sign-off.'
			});

			const resp = await fetch(AI_PROXY, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: MODEL, max_tokens: 350, messages: [{ role: 'user', content }] })
			});
			if (!resp.ok) return;
			const data = await resp.json();
			const result = data?.choices?.[0]?.message?.content?.trim();
			if (result) {
				compareResult = result;
				compareDate1  = oldDate;
				compareDate2  = newDate;
				const bi = J<BodyInsightsCache>(KEYS.bodyInsights(), {});
				bi.photoCompare = { date: todayStr(), result, photo1date: oldDate, photo2date: newDate };
				S(KEYS.bodyInsights(), bi);
			}
		} catch { /* silent */ } finally {
			compareLoading = false;
		}
	}

	// ── Utilities ─────────────────────────────────────────────

	function todayStr(): string {
		const d = new Date();
		return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
	}

	function daysAgoStr(n: number): string {
		const d = new Date(Date.now() - n * 86400000);
		return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
	}

	function energyColor(e: number | undefined): string {
		if (!e) return 'var(--muted)';
		if (e >= 4) return 'var(--green)';
		if (e === 3) return 'var(--amber)';
		return 'var(--red)';
	}

	function energyLabel(e: number): string {
		return ['', 'Drained', 'Low', 'Okay', 'Good', 'Excellent'][e] ?? '';
	}
</script>

<svelte:head>
	<title>Body — Vasbyt</title>
</svelte:head>

<!-- Photo expand overlay -->
{#if expanded}
	<div class="photo-overlay" onclick={() => (expanded = null)} role="button" tabindex="0" onkeydown={e => e.key === 'Escape' && (expanded = null)}>
		<img src={expanded} alt="Progress photo" />
		<button class="overlay-close" onclick={(e) => { e.stopPropagation(); expanded = null; }}>×</button>
	</div>
{/if}

<div class="body-wrap">

	<!-- Header -->
	<div class="body-head">
		<span class="label-sm">BODY</span>
		<h1 class="body-title">Daily Check-In</h1>
	</div>

	<!-- ── Check-in ── -->
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
	{:else}
		<div class="card form-card">
			{#if ciSaved}<div class="save-flash">✓ Saved</div>{/if}
			<div class="field">
				<label class="field-label" for="ci-weight">Weight (kg) — optional</label>
				<input id="ci-weight" type="number" min="30" max="250" step="0.1" placeholder="e.g. 68.5" bind:value={weight} />
			</div>
			<div class="field">
				<label class="field-label" for="ci-energy">
					Energy — <span style="color: {energyColor(energy)}">{energy}/5 · {energyLabel(energy)}</span>
				</label>
				<div class="energy-row">
					{#each [1,2,3,4,5] as n}
						<button class="energy-btn" class:active={energy === n}
							style={energy === n ? `background: ${energyColor(n)}22; border-color: ${energyColor(n)};` : ''}
							onclick={() => (energy = n)}>{n}</button>
					{/each}
				</div>
			</div>
			<div class="field">
				<label class="field-label" for="ci-sleep">Sleep (hours) — optional</label>
				<input id="ci-sleep" type="number" min="2" max="12" step="0.5" placeholder="e.g. 7.5" bind:value={sleep} />
			</div>
			<div class="field">
				<label class="field-label" for="ci-notes">Notes — optional</label>
				<textarea id="ci-notes" rows="2" placeholder="Anything worth noting today..." bind:value={notes}></textarea>
			</div>
			<div class="form-actions">
				{#if editing}
					<button class="btn-cancel" onclick={() => (editing = false)}>Cancel</button>
				{/if}
				<button class="btn-primary" onclick={submitCheckin}>{editing ? 'Update' : 'Log check-in'}</button>
			</div>
		</div>
	{/if}

	<!-- ── AI Body Insight ── -->
	{#if bodyInsight || insightLoading}
		<div class="insight-card">
			{#if insightLoading}
				<span class="loading-dots">···</span>
			{:else}
				<span class="label-sm">Body Insight</span>
				<p class="insight-text">{bodyInsight}</p>
				<button class="btn-refresh" onclick={fetchBodyInsight}>Refresh</button>
			{/if}
		</div>
	{/if}

	<!-- ── Check-in history ── -->
	{#if history.filter(h => !todayEntry || h.date !== todayEntry.date).length > 0}
		<div class="section-label">Recent check-ins</div>
		<div class="history-card">
			{#each history.filter(h => !todayEntry || h.date !== todayEntry.date) as entry}
				<div class="history-row">
					<span class="history-date">{formatDate(entry.date)}</span>
					<div class="history-pills">
						{#if entry.weight}<span class="h-pill">{entry.weight}kg</span>{/if}
						{#if entry.energy}<span class="h-pill" style="color: {energyColor(entry.energy)}">E{entry.energy}</span>{/if}
						{#if entry.sleep}<span class="h-pill">{entry.sleep}h</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Progress Photos ── -->
	<div class="section-label">Progress photos</div>

	<!-- Pose selector -->
	<div class="pose-chips">
		<button class="pose-chip" class:active={selectedPose === null} onclick={() => (selectedPose = null)}>No label</button>
		{#each POSE_OPTS as pose}
			<button class="pose-chip" class:active={selectedPose === pose} onclick={() => (selectedPose = pose)}>
				{POSE_LABEL[pose]}
			</button>
		{/each}
	</div>

	<!-- Upload buttons -->
	<div class="upload-row">
		<label class="upload-btn" class:loading={photoSaving}>
			{photoSaving ? '···' : '⊕ Camera'}
			<input type="file" accept="image/*" capture="environment" onchange={(e) => handleFileInput(e, true)} />
		</label>
		<label class="upload-btn" class:loading={photoSaving}>
			{photoSaving ? '···' : '⊕ Gallery'}
			<input type="file" accept="image/*" onchange={(e) => handleFileInput(e, false)} />
		</label>
	</div>

	<!-- Photo grid grouped by date -->
	{#if sessionDates.length > 0}
		{#each sessionDates as session}
			<div class="photo-session">
				<div class="photo-session-date">{formatDate(session.date)}</div>
				<div class="photo-grid">
					{#each session.photos as photo}
						<div class="photo-thumb">
							<img src={photo.dataUrl} alt={photo.pose ?? 'photo'}
								onclick={() => (expanded = photo.dataUrl)}
								loading="lazy" />
							<div class="photo-label">{photo.pose ? POSE_LABEL[photo.pose] : photo.time}</div>
							<button class="photo-del" onclick={() => handleDelete(photo.id)}>×</button>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		<!-- AI Comparison -->
		{#if photos.length >= 2}
			<div class="compare-section">
				{#if compareLoading}
					<div class="compare-loading">Analysing photos ···</div>
				{:else if compareResult}
					<div class="compare-result">
						<div class="compare-header">
							<span class="label-sm">AI Progress · {compareDate1} → {compareDate2}</span>
							<button class="btn-reanalyse" onclick={() => comparePhotos(true)}>Reanalyse</button>
						</div>
						<p class="compare-text">{compareResult}</p>
					</div>
				{:else}
					<button class="btn-compare" onclick={() => comparePhotos(false)}>
						Compare progress with AI
					</button>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="empty">
			<span class="empty-icon">◎</span>
			<p>Add your first progress photo above.</p>
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
.section-label {
	font-size: 11px; font-weight: 800; letter-spacing: .06em;
	text-transform: uppercase; color: var(--muted); margin-top: 4px;
}

/* Card base */
.card {
	background: var(--card); border: 1px solid var(--line);
	border-radius: 16px; padding: 16px;
}

/* Check-in — logged */
.logged-card { display: flex; flex-direction: column; gap: 12px; }
.logged-top  { display: flex; align-items: center; justify-content: space-between; }
.logged-check { font-size: 14px; font-weight: 800; color: var(--green); }
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
.logged-notes { font-size: 13px; color: var(--muted); font-style: italic; line-height: 1.5; }

/* Check-in — form */
.form-card { display: flex; flex-direction: column; gap: 14px; }
.save-flash { font-size: 13px; font-weight: 800; color: var(--green); text-align: center; padding: 4px 0; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 700; color: var(--muted); }
textarea {
	background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
	color: var(--text); padding: 10px 14px; width: 100%; resize: none; font: inherit;
}
textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(14,154,184,.25); }
.energy-row { display: flex; gap: 8px; }
.energy-btn {
	flex: 1; min-height: 44px; border-radius: 10px;
	background: var(--panel); border: 1px solid var(--line);
	font-size: 16px; font-weight: 900; color: var(--muted);
	transition: background 0.15s, border-color 0.15s;
}
.energy-btn.active { color: var(--text); }
.form-actions { display: flex; gap: 10px; }
.btn-cancel {
	min-height: var(--touch); border-radius: 10px;
	background: rgba(255,255,255,.07); border: 1px solid var(--line);
	font-weight: 700; font-size: 14px; padding: 0 20px;
}
.btn-primary {
	flex: 1; background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); font-weight: 800; font-size: 15px;
	min-height: var(--touch-lg); border-radius: 14px;
}

/* Body insight */
.insight-card {
	background: var(--card); border: 1px solid var(--line);
	border-left: 3px solid var(--accent); border-radius: 12px;
	padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
}
.insight-text { font-size: 14px; line-height: 1.6; color: var(--text); }
.loading-dots { font-size: 18px; color: var(--muted); letter-spacing: 3px; text-align: center; }
.btn-refresh {
	align-self: flex-end; font-size: 12px; font-weight: 800; color: var(--muted);
	background: none; min-height: 30px; padding: 0 8px;
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

/* Pose chips */
.pose-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.pose-chip {
	font-size: 12px; font-weight: 800; min-height: 34px; padding: 0 14px;
	border-radius: 999px; background: var(--card); border: 1px solid var(--line);
	color: var(--muted); transition: border-color 0.15s, color 0.15s;
}
.pose-chip.active { border-color: var(--accent); color: var(--accent); }

/* Upload buttons */
.upload-row { display: flex; gap: 10px; }
.upload-btn {
	flex: 1; min-height: var(--touch); border-radius: 12px;
	background: var(--card); border: 1px solid var(--line);
	font-size: 14px; font-weight: 800; color: var(--accent);
	display: flex; align-items: center; justify-content: center;
	cursor: pointer; transition: border-color 0.15s; gap: 6px;
}
.upload-btn input { display: none; }
.upload-btn.loading { color: var(--muted); }
.upload-btn:hover:not(.loading) { border-color: var(--accent); }

/* Photo grid */
.photo-session { display: flex; flex-direction: column; gap: 6px; }
.photo-session-date {
	font-size: 11px; font-weight: 800; text-transform: uppercase;
	letter-spacing: .04em; color: var(--muted);
}
.photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.photo-thumb {
	position: relative; border-radius: 10px; overflow: hidden;
	aspect-ratio: 3/4; background: var(--panel);
}
.photo-thumb img {
	width: 100%; height: 100%; object-fit: cover;
	cursor: pointer; display: block;
}
.photo-label {
	position: absolute; bottom: 0; left: 0; right: 0;
	background: rgba(0,0,0,.55); font-size: 10px; font-weight: 800;
	text-align: center; padding: 3px 4px; color: rgba(255,255,255,.8);
	text-transform: uppercase; letter-spacing: .04em;
}
.photo-del {
	position: absolute; top: 4px; right: 4px;
	width: 24px; height: 24px; border-radius: 50%;
	background: rgba(0,0,0,.6); color: #fff;
	font-size: 14px; font-weight: 700; line-height: 1;
	display: flex; align-items: center; justify-content: center;
	min-height: unset; padding: 0;
}

/* AI Compare */
.compare-section { display: flex; flex-direction: column; gap: 8px; }
.compare-loading { text-align: center; padding: 14px; color: var(--muted); font-size: 13px; font-weight: 700; }
.compare-result {
	background: rgba(14,154,184,.06); border: 1px solid var(--line);
	border-left: 3px solid var(--accent); border-radius: 12px; padding: 12px 14px;
	display: flex; flex-direction: column; gap: 8px;
}
.compare-header { display: flex; justify-content: space-between; align-items: center; }
.btn-reanalyse { font-size: 12px; font-weight: 800; color: var(--muted); background: none; min-height: 30px; padding: 0; }
.compare-text { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,.75); }
.btn-compare {
	width: 100%; min-height: var(--touch); border-radius: 12px;
	background: var(--card); border: 1px solid var(--border-strong);
	font-size: 14px; font-weight: 800; color: var(--accent);
}

/* Photo overlay */
.photo-overlay {
	position: fixed; inset: 0; background: rgba(0,0,0,.9);
	display: flex; align-items: center; justify-content: center;
	z-index: 200; padding: 20px;
}
.photo-overlay img { max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; }
.overlay-close {
	position: absolute; top: 16px; right: 16px;
	width: 44px; height: 44px; border-radius: 50%;
	background: rgba(255,255,255,.15); color: #fff;
	font-size: 22px; font-weight: 700;
	display: flex; align-items: center; justify-content: center;
	min-height: unset;
}

/* Empty */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 0; text-align: center; }
.empty-icon { font-size: 36px; opacity: .3; }
.empty p { font-size: 14px; color: var(--muted); line-height: 1.6; }
</style>
