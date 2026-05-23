// ============================================================
// PROGRAM LAYER — reads active routine or 12-week program
// from localStorage and exposes typed structures for the UI.
// ============================================================

import { J, KEYS, today } from './storage';

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
