// ============================================================
// PROGRAM LAYER — reads active routine or 12-week program
// from localStorage and exposes typed structures for the UI.
// ============================================================

import { J, S, KEYS, today } from './storage';

// ── Types ────────────────────────────────────────────────────

export interface Exercise {
	id: number | string;
	name: string;
	sets: number;
	reps: string;
	rest: number;
	muscles: string[];
	isBodyweight?: boolean;
}

export interface RoutineDay {
	title: string;
	exercises: Exercise[];
}

export interface LogEntry {
	id: string;
	date: string;
	exerciseId: number | string;
	exerciseName: string;
	weight: string;
	reps: string;
	week?: number;
	day?: number;
	newPR?: boolean;
}

// ── Routine mode ─────────────────────────────────────────────

interface StoredRoutine {
	name: string;
	days: Record<string, { title: string; exercises: Exercise[] }>;
}

/** True if a custom routine is active */
export function inRoutineMode(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return J<StoredRoutine | null>(KEYS.activeRoutine(), null) !== null;
}

/** Today's routine day data, or null if not in routine mode */
export function getRoutineDay(day: number): RoutineDay | null {
	const routine = J<StoredRoutine | null>(KEYS.activeRoutine(), null);
	if (!routine) return null;
	const d = routine.days[String(day)] || routine.days['1'];
	if (!d) return null;
	return { title: d.title, exercises: d.exercises || [] };
}

/** Active routine name */
export function getRoutineName(): string {
	const routine = J<StoredRoutine | null>(KEYS.activeRoutine(), null);
	return routine?.name ?? '';
}

// ── Program position ─────────────────────────────────────────

export function getWeek(): number  { return J<number>(KEYS.week(), 1); }
export function getDay(): number   { return J<number>(KEYS.day(),  1); }

export function getPhase(week: number): 1 | 2 | 3 {
	if (week <= 2)  return 1;
	if (week <= 6)  return 2;
	return 3;
}

export function getPhaseName(phase: 1 | 2 | 3): string {
	const names: Record<1 | 2 | 3, string> = {
		1: 'Foundation + Form',
		2: 'Build Strength + Toning',
		3: 'Recomposition + Shape'
	};
	return names[phase];
}

// ── Logs ─────────────────────────────────────────────────────

export function getLogs(): LogEntry[] {
	return J<LogEntry[]>(KEYS.logs(), []);
}

/** Sets logged today for a given exercise ID */
export function getTodaySetsForExercise(exerciseId: number | string): LogEntry[] {
	const t = today();
	return getLogs().filter(
		(l) => l.date === t && String(l.exerciseId) === String(exerciseId)
	);
}

/** Total sets logged today across all exercises */
export function getTotalSetsToday(): number {
	return getLogs().filter((l) => l.date === today()).length;
}

/** Total sets scheduled today (sum of sets per exercise) */
export function getTotalSetsScheduled(exercises: Exercise[]): number {
	return exercises.reduce((s, ex) => s + (Number(ex.sets) || 0), 0);
}

/** Profile display name */
export function getProfileName(): string {
	const prof = J<{ name?: string }>(KEYS.profile(), {});
	return prof.name || 'Me';
}

// ── Gym actions ──────────────────────────────────────────────

/** Save a log entry and return it */
export function saveLog(
	exerciseId: number | string,
	exerciseName: string,
	weight: string,
	reps: string
): LogEntry {
	const logs = getLogs();
	const entry: LogEntry = {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
		date: today(),
		exerciseId,
		exerciseName,
		weight,
		reps,
		week: getWeek(),
		day: getDay()
	};
	logs.push(entry);
	S(KEYS.logs(), logs);
	return entry;
}

/** Most recent weight logged for an exercise (any date) */
export function getLastWeightForExercise(exerciseId: number | string): string {
	const all = getLogs().filter((l) => String(l.exerciseId) === String(exerciseId) && l.weight);
	return all.at(-1)?.weight ?? '';
}

/** Most recent reps logged for an exercise (any date) */
export function getLastRepsForExercise(exerciseId: number | string): string {
	const all = getLogs().filter((l) => String(l.exerciseId) === String(exerciseId) && l.reps);
	return all.at(-1)?.reps ?? '';
}

/** Remove the most recent set logged today for an exercise */
export function undoLastSetToday(exerciseId: number | string): boolean {
	const logs = getLogs();
	const t = today();
	let lastIdx = -1;
	logs.forEach((l, i) => {
		if (l.date === t && String(l.exerciseId) === String(exerciseId)) lastIdx = i;
	});
	if (lastIdx === -1) return false;
	logs.splice(lastIdx, 1);
	S(KEYS.logs(), logs);
	return true;
}

/** All finish records */
export function getFinishes(): { date: string; week: number; day: number }[] {
	return J<{ date: string; week: number; day: number }[]>(KEYS.finishes(), []);
}

/** Logs from the current ISO week (Mon–Sun) */
export function getLogsThisWeek(): LogEntry[] {
	const now = new Date();
	const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
	const mon = new Date(now); mon.setDate(now.getDate() - dow);
	const monStr = mon.toISOString().slice(0, 10);
	return getLogs().filter((l) => l.date >= monStr);
}

/** Finishes from the current ISO week */
export function getFinishesThisWeek(): { date: string; week: number; day: number }[] {
	const now = new Date();
	const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
	const mon = new Date(now); mon.setDate(now.getDate() - dow);
	const monStr = mon.toISOString().slice(0, 10);
	return getFinishes().filter((f) => f.date >= monStr);
}

/** Top N exercises by all-time set count */
export function getTopExercises(n = 5): { name: string; sets: number }[] {
	const counts: Record<string, number> = {};
	getLogs().forEach((l) => {
		counts[l.exerciseName] = (counts[l.exerciseName] ?? 0) + 1;
	});
	return Object.entries(counts)
		.map(([name, sets]) => ({ name, sets }))
		.sort((a, b) => b.sets - a.sets)
		.slice(0, n);
}

/** Save a finish record and advance the day/week counters */
export function finishWorkout(): void {
	const w = getWeek();
	const d = getDay();
	const finishes = J<{ date: string; week: number; day: number }[]>(KEYS.finishes(), []);
	finishes.push({ date: today(), week: w, day: d });
	S(KEYS.finishes(), finishes);
	const nextDay = d >= 7 ? 1 : d + 1;
	const nextWeek = d >= 7 ? w + 1 : w;
	S(KEYS.day(), nextDay);
	S(KEYS.week(), nextWeek);
}
