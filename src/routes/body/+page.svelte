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
	let energy      = $state('');
	let sleep       = $state('');
	let soreness    = $state('');
	let notes       = $state('');
	let ciSaved     = $state(false);

	// ── Photos state ──────────────────────────────────────────
	let photos       = $state<Photo[]>([]);
	let selectedPose = $state<string | null>(null);
	let photoSaving  = $state(false);
	let expanded     = $state<string | null>(null); // expanded photo dataUrl

	// ── Measurements ─────────────────────────────────────────
	interface Measurement {
		date: string;
		chest?: number; waist?: number; hips?: number; arms?: number;
		shoulders?: number; upperArm?: number; thigh?: number; calf?: number;
	}
	let measurements  = $state<Measurement[]>([]);
	let mChest        = $state('');
	let mWaist        = $state('');
	let mHips         = $state('');
	let mArms         = $state('');
	let mShoulders    = $state('');
	let mUpperArm     = $state('');
	let mThigh        = $state('');
	let mCalf         = $state('');
	let mSaved        = $state(false);
	let showMForm     = $state(false);

	// ── WHR ───────────────────────────────────────────────────
	let whr      = $state<number | null>(null);
	let whrCat   = $state('');
	let whrColor = $state('');

	// ── Measurement trend chart ───────────────────────────────
	type MeasMetric = Exclude<keyof Measurement, 'date'>;
	interface MeasTrendPoint { date: string; value: number; day: string; month: string; height: number; }
	const MEAS_METRICS: { key: MeasMetric; label: string }[] = [
		{ key: 'waist',    label: 'Waist'     },
		{ key: 'hips',     label: 'Hips'      },
		{ key: 'chest',    label: 'Chest'     },
		{ key: 'arms',     label: 'Arms'      },
		{ key: 'shoulders',label: 'Shoulders' },
		{ key: 'upperArm', label: 'Upper arm' },
		{ key: 'thigh',    label: 'Thigh'     },
		{ key: 'calf',     label: 'Calf'      },
	];
	let measTrendMetric = $state<MeasMetric>('waist');
	let measTrendPoints = $state<MeasTrendPoint[]>([]);
	let measMetricCounts = $state<Partial<Record<MeasMetric, number>>>({});

	// ── Quick weight log ─────────────────────────────────────
	let quickWeight  = $state('');
	let weightSaved  = $state(false);
	let targetWeight = $state<number | null>(null);

	// ── BMI + target progress ─────────────────────────────────
	let bmi       = $state<number | null>(null);
	let bmiCat    = $state('');
	let bmiColor  = $state('');
	let curWeight = $state<number | null>(null);

	// ── Weight chart ──────────────────────────────────────────
	interface WeightPoint { date: string; weight: number; day: string; month: string; height: number; }
	let weightPoints  = $state<WeightPoint[]>([]);

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
		buildWeightChart();
		loadMeasurements();
		const prof = J<{ targetWeight?: number; height?: number }>(KEYS.profile(), {});
		targetWeight = prof.targetWeight ?? null;
		calcBMI(prof.height);
	});

	// ── Check-in ──────────────────────────────────────────────

	function refreshCheckin() {
		todayEntry = getTodayCheckin();
		history    = getRecentCheckins(7);
		if (todayEntry) {
			weight   = todayEntry.weight   != null ? String(todayEntry.weight)   : '';
			energy   = todayEntry.energy   != null ? String(todayEntry.energy)   : '';
			sleep    = todayEntry.sleep    != null ? String(todayEntry.sleep)    : '';
			soreness = todayEntry.soreness != null ? String(todayEntry.soreness) : '';
			notes    = todayEntry.notes    ?? '';
		} else {
			weight = ''; energy = ''; sleep = ''; soreness = ''; notes = '';
		}
	}

	function submitCheckin() {
		saveCheckin({
			weight:   weight   ? Number(weight)   : undefined,
			energy:   energy   ? Number(energy)   : undefined,
			sleep:    sleep    ? Number(sleep)    : undefined,
			soreness: soreness ? Number(soreness) : undefined,
			notes:    notes.trim() || undefined
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

	// ── Weight chart ─────────────────────────────────────────

	function buildWeightChart() {
		const all = J<CheckIn[]>(KEYS.checkins(), []);
		const pts = all.filter(c => c.weight != null && c.weight! > 0).slice(-10);
		if (pts.length < 2) { weightPoints = []; return; }
		const weights = pts.map(c => c.weight!);
		const minW = Math.min(...weights), maxW = Math.max(...weights);
		const range = maxW - minW;
		const MAX_H = 56, MIN_H = 8;
		weightPoints = pts.map(c => {
			const d = new Date(c.date + 'T00:00:00');
			return {
				date: c.date,
				weight: c.weight!,
				day:   String(d.getDate()),
				month: d.toLocaleString('en', { month: 'short' }),
				height: range > 0 ? Math.round(MIN_H + ((c.weight! - minW) / range) * (MAX_H - MIN_H)) : MAX_H
			};
		});
	}

	// ── BMI + WHR ────────────────────────────────────────────────

	function calcBMI(height: number | undefined) {
		const allCI = J<CheckIn[]>(KEYS.checkins(), []);
		const wPts = allCI.filter(c => c.weight && c.weight > 0);
		if (!wPts.length || !height || height < 50) return;
		const cw = wPts[wPts.length - 1].weight!;
		curWeight = cw;
		const hm  = height / 100;
		const b   = Math.round((cw / (hm * hm)) * 10) / 10;
		bmi = b;
		if      (b < 18.5) { bmiCat = 'Below range';  bmiColor = 'var(--amber)'; }
		else if (b < 25)   { bmiCat = 'Healthy range'; bmiColor = 'var(--green)'; }
		else if (b < 30)   { bmiCat = 'Above range';   bmiColor = 'var(--amber)'; }
		else               { bmiCat = 'High BMI';       bmiColor = 'var(--red)';   }
	}

	function logWeight() {
		const kg = parseFloat(quickWeight);
		if (!kg || kg < 20 || kg > 300) return;
		const existing = getTodayCheckin();
		saveCheckin({ ...(existing ?? {}), weight: kg });
		quickWeight = '';
		weightSaved = true;
		refreshCheckin();
		buildWeightChart();
		setTimeout(() => (weightSaved = false), 2000);
	}

	// ── Measurements ─────────────────────────────────────────

	function loadMeasurements() {
		measurements = J<Measurement[]>(KEYS.measurements(), []);
		const last = measurements[measurements.length - 1];
		if (last) {
			mChest     = last.chest     != null ? String(last.chest)     : '';
			mWaist     = last.waist     != null ? String(last.waist)     : '';
			mHips      = last.hips      != null ? String(last.hips)      : '';
			mArms      = last.arms      != null ? String(last.arms)      : '';
			mShoulders = last.shoulders != null ? String(last.shoulders) : '';
			mUpperArm  = last.upperArm  != null ? String(last.upperArm)  : '';
			mThigh     = last.thigh     != null ? String(last.thigh)     : '';
			mCalf      = last.calf      != null ? String(last.calf)      : '';
		}
		calcWHR();
		buildMeasTrend();
	}

	function buildMeasTrend(metric?: MeasMetric) {
		if (metric) measTrendMetric = metric;
		const m = measTrendMetric;
		// Count how many entries have each metric
		const counts: Partial<Record<MeasMetric, number>> = {};
		for (const mk of MEAS_METRICS) {
			counts[mk.key] = measurements.filter(e => e[mk.key] != null).length;
		}
		measMetricCounts = counts;

		const pts = measurements
			.filter(e => e[m] != null)
			.slice(-8)
			.map(e => {
				const d = new Date(e.date + 'T00:00:00');
				return {
					date: e.date,
					value: e[m] as number,
					day:   String(d.getDate()),
					month: d.toLocaleString('en', { month: 'short' })
				};
			});

		if (pts.length < 2) { measTrendPoints = []; return; }

		const vals  = pts.map(p => p.value);
		const minV  = Math.min(...vals);
		const maxV  = Math.max(...vals);
		const range = maxV - minV || 1;

		measTrendPoints = pts.map(p => ({
			...p,
			height: Math.max(8, Math.round(((p.value - minV) / range) * 52) + 8)
		}));
	}

	function calcWHR() {
		const all  = J<Measurement[]>(KEYS.measurements(), []);
		const last = all[all.length - 1];
		if (!last?.waist || !last?.hips) { whr = null; return; }
		const r = Math.round((last.waist / last.hips) * 100) / 100;
		whr = r;
		if      (r <= 0.80) { whrCat = 'Healthy';   whrColor = 'var(--green)'; }
		else if (r <= 0.85) { whrCat = 'Moderate';  whrColor = 'var(--amber)'; }
		else                { whrCat = 'High risk';  whrColor = 'var(--red)';   }
	}

	function saveMeasurement() {
		if (!mChest && !mWaist && !mHips && !mArms && !mShoulders && !mUpperArm && !mThigh && !mCalf) return;
		const entry: Measurement = {
			date:       todayStr(),
			chest:      mChest     ? Number(mChest)     : undefined,
			waist:      mWaist     ? Number(mWaist)     : undefined,
			hips:       mHips      ? Number(mHips)      : undefined,
			arms:       mArms      ? Number(mArms)      : undefined,
			shoulders:  mShoulders ? Number(mShoulders) : undefined,
			upperArm:   mUpperArm  ? Number(mUpperArm)  : undefined,
			thigh:      mThigh     ? Number(mThigh)     : undefined,
			calf:       mCalf      ? Number(mCalf)      : undefined,
		};
		const existing = J<Measurement[]>(KEYS.measurements(), []);
		const idx = existing.findIndex(m => m.date === entry.date);
		if (idx >= 0) existing[idx] = entry; else existing.push(entry);
		S(KEYS.measurements(), existing);
		measurements = existing;
		calcWHR();
		buildMeasTrend();
		mSaved = true; showMForm = false;
		setTimeout(() => (mSaved = false), 2000);
	}

	function energyColor(e: number | undefined): string {
		if (!e) return 'var(--muted)';
		if (e >= 8) return 'var(--green)';
		if (e >= 5) return 'var(--amber)';
		return 'var(--red)';
	}

	function energyLabel(e: number): string {
		if (e >= 9) return 'Excellent';
		if (e >= 7) return 'Good';
		if (e >= 5) return 'Okay';
		if (e >= 3) return 'Low';
		return 'Drained';
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
				{#if todayEntry.energy}
					<div class="stat-pill">
						<span class="pill-label">Energy</span>
						<span class="pill-val" style="color: {energyColor(todayEntry.energy)}">
							{todayEntry.energy}/10 · {energyLabel(todayEntry.energy)}
						</span>
					</div>
				{/if}
				{#if todayEntry.sleep}
					<div class="stat-pill">
						<span class="pill-label">Sleep quality</span>
						<span class="pill-val">{todayEntry.sleep}/10</span>
					</div>
				{/if}
				{#if todayEntry.soreness != null}
					<div class="stat-pill">
						<span class="pill-label">Soreness</span>
						<span class="pill-val">{todayEntry.soreness}/10</span>
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
				<label class="field-label" for="ci-energy">Energy 1–10 — optional</label>
				<div class="field-hint">1 = exhausted · 10 = full energy</div>
				<input id="ci-energy" type="number" min="1" max="10" placeholder="e.g. 7" bind:value={energy} />
			</div>
			<div class="field">
				<label class="field-label" for="ci-sleep">Sleep quality 1–10 — optional</label>
				<div class="field-hint">1 = terrible · 10 = excellent</div>
				<input id="ci-sleep" type="number" min="1" max="10" placeholder="e.g. 8" bind:value={sleep} />
			</div>
			<div class="field">
				<label class="field-label" for="ci-soreness">Soreness 0–10 — optional</label>
				<div class="field-hint">0 = none · 10 = can barely move</div>
				<input id="ci-soreness" type="number" min="0" max="10" placeholder="e.g. 3" bind:value={soreness} />
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
						{#if entry.energy}<span class="h-pill" style="color: {energyColor(entry.energy)}">E{entry.energy}/10</span>{/if}
						{#if entry.sleep}<span class="h-pill">S{entry.sleep}/10</span>{/if}
						{#if entry.soreness != null}<span class="h-pill">Sor{entry.soreness}/10</span>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Weight ── -->
	<div class="section-label">Weight</div>
	<div class="card wt-quick-card">
		<div class="wt-entry-row">
			<input
				class="wt-input"
				type="number" step="0.1" min="20" max="300"
				placeholder="e.g. 75 kg"
				bind:value={quickWeight}
				onkeydown={(e) => { if (e.key === 'Enter') logWeight(); }}
			/>
			<button class="btn-log-wt" class:btn-wt-saved={weightSaved}
					disabled={!quickWeight || weightSaved} onclick={logWeight}>
				{weightSaved ? '✓ Logged' : 'Log weight'}
			</button>
		</div>
		{#if targetWeight}
			<div class="wt-target-note">Target: {targetWeight} kg</div>
		{/if}
	</div>

	{#if weightPoints.length >= 2}
		<div class="card wt-card">
			<div class="wt-bars">
				{#each weightPoints as pt}
					<div class="wt-col">
						<span class="wt-val">{pt.weight}</span>
						<div class="wt-bar" style="height: {pt.height}px"></div>
						<span class="wt-day">{pt.day}</span>
						<span class="wt-month">{pt.month}</span>
					</div>
				{/each}
			</div>
			{#if targetWeight}
				<div class="wt-target-label">Target: {targetWeight} kg</div>
			{/if}
		</div>
	{/if}

	<!-- ── BMI + Target progress ── -->
	{#if bmi}
		<div class="card bmi-card">
			<div class="bmi-row">
				<div class="bmi-val-block">
					<span class="bmi-num" style="color:{bmiColor}">{bmi}</span>
					<span class="bmi-sub">BMI</span>
				</div>
				<div class="bmi-info">
					<div class="bmi-cat" style="color:{bmiColor}">{bmiCat}</div>
					<div class="bmi-range">Healthy range: 18.5 – 24.9</div>
				</div>
			</div>
			{#if targetWeight && curWeight}
				{@const gap = Math.abs(curWeight - targetWeight).toFixed(1)}
				{@const atTarget = parseFloat(gap) < 0.2}
				{@const arrow = curWeight > targetWeight ? '↓' : '↑'}
				<div class="wt-goal-row">
					<span class="wt-goal-lbl">Target</span>
					{#if atTarget}
						<span class="wt-goal-val" style="color:var(--green)">✓ Target reached!</span>
					{:else}
						<span class="wt-goal-val">{curWeight} → {targetWeight} kg · {gap} kg {arrow}</span>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── WHR ── -->
	{#if whr}
		<div class="card bmi-card">
			<div class="bmi-row">
				<div class="bmi-val-block">
					<span class="bmi-num" style="color:{whrColor}">{whr}</span>
					<span class="bmi-sub">WHR</span>
				</div>
				<div class="bmi-info">
					<div class="bmi-cat" style="color:{whrColor}">{whrCat}</div>
					<div class="bmi-range">Waist-to-hip ratio</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Measurement trend chart ── -->
	{#if measurements.length >= 2}
		<div class="card trend-card">
			<div class="trend-head">
				<span class="trend-title">Measurements</span>
				<span class="trend-sub">last {measTrendPoints.length || '—'} entries</span>
			</div>

			<!-- Metric chips -->
			<div class="trend-chips">
				{#each MEAS_METRICS as m}
					{@const count = measMetricCounts[m.key] ?? 0}
					{#if count >= 2}
						<button
							type="button"
							class="trend-chip"
							class:trend-chip-active={measTrendMetric === m.key}
							onclick={() => buildMeasTrend(m.key)}
						>{m.label}</button>
					{/if}
				{/each}
			</div>

			<!-- Bar chart -->
			{#if measTrendPoints.length >= 2}
				<div class="mt-bars">
					{#each measTrendPoints as pt}
						<div class="mt-col">
							<span class="mt-val">{pt.value}</span>
							<div class="mt-bar" style="height: {pt.height}px"></div>
							<span class="mt-day">{pt.day}</span>
							<span class="mt-month">{pt.month}</span>
						</div>
					{/each}
				</div>
				{@const first = measTrendPoints[0].value}
				{@const last  = measTrendPoints[measTrendPoints.length - 1].value}
				{@const delta = Math.round((last - first) * 10) / 10}
				{@const sign  = delta > 0 ? '+' : ''}
				<div class="trend-delta" style="color:{delta < 0 ? 'var(--green)' : delta > 0 ? 'var(--amber)' : 'var(--muted)'}">
					{sign}{delta} cm since first entry
				</div>
			{:else}
				<div class="trend-empty">Log 2+ entries to see trend</div>
			{/if}
		</div>
	{/if}

	<!-- ── Measurements ── -->
	<div class="section-label">Measurements</div>
	<div class="card meas-card">
		{#if mSaved}<div class="save-flash">✓ Saved</div>{/if}

		{#if measurements.length > 0 && !showMForm}
			{@const last = measurements[measurements.length - 1]}
			<div class="meas-latest">
				<div class="meas-pills">
					{#if last.chest     != null}<span class="meas-pill">Chest <b>{last.chest}</b> cm</span>{/if}
					{#if last.waist     != null}<span class="meas-pill">Waist <b>{last.waist}</b> cm</span>{/if}
					{#if last.hips      != null}<span class="meas-pill">Hips <b>{last.hips}</b> cm</span>{/if}
					{#if last.arms      != null}<span class="meas-pill">Arms <b>{last.arms}</b> cm</span>{/if}
					{#if last.shoulders != null}<span class="meas-pill">Shoulders <b>{last.shoulders}</b> cm</span>{/if}
					{#if last.upperArm  != null}<span class="meas-pill">Upper arm <b>{last.upperArm}</b> cm</span>{/if}
					{#if last.thigh     != null}<span class="meas-pill">Thigh <b>{last.thigh}</b> cm</span>{/if}
					{#if last.calf      != null}<span class="meas-pill">Calf <b>{last.calf}</b> cm</span>{/if}
				</div>
				<div class="meas-meta">{formatDate(last.date)}</div>
			</div>

			{#if measurements.length > 1}
				<div class="meas-table">
					<div class="meas-thead">
						<span>Date</span><span>Chest</span><span>Waist</span><span>Hips</span><span>Arms</span>
					</div>
					{#each measurements.slice(-5).reverse() as m}
						<div class="meas-trow">
							<span class="meas-td-date">{formatDate(m.date)}</span>
							<span>{m.chest ?? '—'}</span>
							<span>{m.waist ?? '—'}</span>
							<span>{m.hips  ?? '—'}</span>
							<span>{m.arms  ?? '—'}</span>
						</div>
					{/each}
				</div>
			{/if}

			<button class="btn-edit" onclick={() => (showMForm = true)}>Log new</button>
		{/if}

		{#if showMForm || measurements.length === 0}
			<div class="meas-form">
				<div class="meas-2col">
					<div class="meas-row">
						<label class="field-label" for="m-chest">Chest (cm)</label>
						<input id="m-chest" type="number" step="0.5" placeholder="e.g. 95" bind:value={mChest} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-waist">Waist (cm)</label>
						<input id="m-waist" type="number" step="0.5" placeholder="e.g. 80" bind:value={mWaist} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-hips">Hips (cm)</label>
						<input id="m-hips" type="number" step="0.5" placeholder="e.g. 98" bind:value={mHips} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-arms">Arms (cm)</label>
						<input id="m-arms" type="number" step="0.5" placeholder="e.g. 35" bind:value={mArms} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-shoulders">Shoulders (cm)</label>
						<input id="m-shoulders" type="number" step="0.5" placeholder="e.g. 110" bind:value={mShoulders} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-upperarm">Upper arm (cm)</label>
						<input id="m-upperarm" type="number" step="0.5" placeholder="e.g. 32" bind:value={mUpperArm} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-thigh">Thigh (cm)</label>
						<input id="m-thigh" type="number" step="0.5" placeholder="e.g. 55" bind:value={mThigh} />
					</div>
					<div class="meas-row">
						<label class="field-label" for="m-calf">Calf (cm)</label>
						<input id="m-calf" type="number" step="0.5" placeholder="e.g. 38" bind:value={mCalf} />
					</div>
				</div>
				<div class="form-actions">
					{#if showMForm}
						<button class="btn-cancel" onclick={() => (showMForm = false)}>Cancel</button>
					{/if}
					<button class="btn-primary" onclick={saveMeasurement}>Save measurements</button>
				</div>
			</div>
		{/if}
	</div>

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
	border-radius: 8px; min-height: var(--touch); padding: 0 14px;
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
.field-hint { font-size: 11px; color: var(--muted); margin-top: -2px; }
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
	background: none; min-height: var(--touch); padding: 0 8px;
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
	font-size: 12px; font-weight: 800; min-height: var(--touch); padding: 0 14px;
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
.btn-reanalyse { font-size: 12px; font-weight: 800; color: var(--muted); background: none; min-height: var(--touch); padding: 0 8px; }
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

/* ── Quick weight log ── */
.wt-quick-card { gap: 8px; padding: 12px 16px; }
.wt-entry-row { display: flex; gap: 10px; align-items: center; }
.wt-input {
	flex: 0 0 90px; min-height: 44px; border-radius: 10px;
	font-size: 18px; font-weight: 900; text-align: center;
	padding: 0 10px; margin: 0;
}
.btn-log-wt {
	flex: 1; min-height: 44px; border-radius: 10px;
	background: linear-gradient(135deg, var(--accent), var(--accent-light));
	color: var(--accent-text); font-weight: 800; font-size: 14px;
	transition: background .2s;
}
.btn-log-wt:disabled { opacity: .4; cursor: not-allowed; }
.btn-wt-saved { background: var(--green) !important; }
.wt-target-note  { font-size: 12px; color: var(--muted); font-weight: 700; }
.wt-target-label {
	font-size: 11px; color: var(--muted); font-weight: 700;
	text-align: center; padding-top: 6px; letter-spacing: .02em;
}

/* ── Weight trend chart ── */
.wt-card { }
.wt-bars {
	display: flex;
	align-items: flex-end;
	gap: 4px;
	height: 80px;
}
.wt-col {
	flex: 1;
	display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
	height: 100%;
}
.wt-val {
	font-size: 8px; color: rgba(255,255,255,.5);
	margin-bottom: 3px; line-height: 1;
}
.wt-bar {
	width: 100%;
	background: var(--accent);
	border-radius: 3px 3px 0 0;
	opacity: .8;
	min-height: 8px;
}
.wt-day   { font-size: 9px; color: rgba(255,255,255,.45); margin-top: 4px; line-height: 1.2; }
.wt-month { font-size: 8px; color: rgba(255,255,255,.25); line-height: 1.2; }

/* ── BMI / WHR cards ── */
.bmi-card { padding: 16px; }
.bmi-row { display: flex; align-items: center; gap: 16px; }
.bmi-val-block { display: flex; flex-direction: column; align-items: center; min-width: 64px; }
.bmi-num { font-size: 32px; font-weight: 700; line-height: 1; }
.bmi-sub { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 2px; }
.bmi-info { display: flex; flex-direction: column; gap: 4px; }
.bmi-cat { font-size: 16px; font-weight: 600; }
.bmi-range { font-size: 12px; color: var(--muted); }
.wt-goal-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); }
.wt-goal-lbl { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.wt-goal-val { font-size: 14px; font-weight: 600; }

/* ── Measurement trend chart ── */
.trend-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.trend-head { display: flex; align-items: baseline; justify-content: space-between; }
.trend-title { font-size: 14px; font-weight: 700; }
.trend-sub { font-size: 11px; color: var(--muted); }

.trend-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.trend-chip {
	background: rgba(255,255,255,.05);
	border: 1px solid var(--line);
	border-radius: 20px;
	padding: 5px 12px;
	font-size: 12px; font-weight: 600;
	color: rgba(255,255,255,.55);
	cursor: pointer;
	min-height: var(--touch);
}
.trend-chip-active {
	background: rgba(14,154,184,.15);
	border-color: var(--accent);
	color: var(--accent);
}

.mt-bars { display: flex; align-items: flex-end; gap: 6px; padding: 8px 0 4px; overflow-x: auto; }
.mt-col  { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 32px; }
.mt-val  { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.8); }
.mt-bar  {
	width: 18px;
	background: var(--accent);
	border-radius: 3px 3px 0 0;
	opacity: .75;
	min-height: 8px;
}
.mt-day   { font-size: 9px;  color: rgba(255,255,255,.45); margin-top: 4px; }
.mt-month { font-size: 8px;  color: rgba(255,255,255,.25); }

.trend-delta { font-size: 12px; color: var(--muted); text-align: right; }
.trend-empty { font-size: 13px; color: var(--muted); text-align: center; padding: 12px 0; }

/* ── Measurements ── */
.meas-card { display: flex; flex-direction: column; gap: 12px; }
.meas-latest { display: flex; flex-direction: column; gap: 6px; }
.meas-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.meas-pill {
	background: rgba(255,255,255,.06);
	border: 1px solid var(--line);
	border-radius: 8px;
	padding: 6px 10px;
	font-size: 12px;
	color: rgba(255,255,255,.6);
}
.meas-pill b { color: var(--accent); font-weight: 700; }
.meas-meta { font-size: 11px; color: var(--muted); }

.meas-table { width: 100%; }
.meas-thead, .meas-trow {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
	gap: 4px;
	font-size: 11px;
	padding: 5px 0;
}
.meas-thead {
	color: var(--muted);
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: .04em;
	border-bottom: 1px solid var(--line);
}
.meas-trow {
	color: rgba(255,255,255,.75);
	border-bottom: 1px solid rgba(255,255,255,.05);
}
.meas-trow:last-child { border-bottom: none; }
.meas-td-date { color: var(--muted); }

.meas-form { display: flex; flex-direction: column; gap: 10px; }
.meas-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.meas-row { display: flex; flex-direction: column; gap: 4px; }
.meas-row input {
	width: 100%;
	background: rgba(255,255,255,.07);
	border: 1px solid var(--line);
	border-radius: 10px;
	padding: 10px 12px;
	color: #fff;
	font-size: 15px;
	-moz-appearance: textfield;
}
.meas-row input::-webkit-outer-spin-button,
.meas-row input::-webkit-inner-spin-button { -webkit-appearance: none; }
</style>
