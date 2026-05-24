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

// ── 12-week program data ──────────────────────────────────────

const EX_META: Record<string, { name: string; muscles: string[]; rest: number; isBodyweight?: boolean }> = {
	'incline-dumbbell-chest-press':           { name: 'Incline DB Press',      muscles: ['Chest', 'Shoulders', 'Triceps'],     rest: 75 },
	'one-arm-dumbbell-row':                   { name: 'DB Row',                muscles: ['Back', 'Upper Back', 'Arms'],        rest: 60 },
	'dumbbell-biceps-curl':                   { name: 'Biceps Curl',           muscles: ['Arms', 'Biceps'],                    rest: 45 },
	'hammer-curl':                            { name: 'Hammer Curl',           muscles: ['Arms', 'Forearms'],                  rest: 45 },
	'dumbbell-triceps-kickback':              { name: 'Triceps Kickback',       muscles: ['Arms', 'Triceps'],                   rest: 45 },
	'incline-bench-rear-delt-fly':            { name: 'Rear Delt Fly',         muscles: ['Posture', 'Rear Shoulders'],         rest: 45 },
	'dead-bug':                               { name: 'Dead Bug',              muscles: ['Core', 'Lower Abs'],                 rest: 45, isBodyweight: true },
	'heel-taps':                              { name: 'Heel Taps',             muscles: ['Core', 'Lower Abs'],                 rest: 45, isBodyweight: true },
	'side-lying-inner-thigh-raise':           { name: 'Inner Thigh Raise',     muscles: ['Inner Thighs', 'Hips'],              rest: 45, isBodyweight: true },
	'bridge-pillow-ball-squeeze':             { name: 'Bridge Squeeze',        muscles: ['Glutes', 'Inner Thighs'],            rest: 60, isBodyweight: true },
	'light-sumo-dumbbell-squat':              { name: 'Sumo Squat',            muscles: ['Inner Thighs', 'Glutes', 'Legs'],    rest: 75 },
	'dumbbell-hip-thrust-glute-bridge':       { name: 'Hip Thrust',            muscles: ['Glutes', 'Hamstrings'],              rest: 60 },
	'standing-calf-raise':                    { name: 'Calf Raise',            muscles: ['Calves'],                            rest: 45 },
	'side-plank-knees-bent':                  { name: 'Side Plank',            muscles: ['Core', 'Side Waist'],                rest: 45, isBodyweight: true },
	'reverse-crunch':                         { name: 'Reverse Crunch',        muscles: ['Core', 'Lower Abs'],                 rest: 45, isBodyweight: true },
	'light-dumbbell-lateral-raise':           { name: 'Lateral Raise',         muscles: ['Shoulders'],                         rest: 45 },
	'lying-dumbbell-triceps-extension':       { name: 'Triceps Extension',     muscles: ['Arms', 'Triceps'],                   rest: 45 },
	'side-lying-dumbbell-external-rotation':  { name: 'External Rotation',     muscles: ['Shoulders', 'Rotator Cuff'],        rest: 45 },
	'goblet-squat':                           { name: 'Goblet Squat',          muscles: ['Legs', 'Glutes', 'Core'],            rest: 75 },
	'dumbbell-romanian-deadlift':             { name: 'Romanian Deadlift',     muscles: ['Hamstrings', 'Glutes', 'Back'],      rest: 75 },
	'incline-push-up':                        { name: 'Incline Push-Up',       muscles: ['Chest', 'Shoulders', 'Triceps'],     rest: 60, isBodyweight: true },
	'boxing-light-technique':                 { name: 'Boxing Rounds',         muscles: ['Cardio', 'Arms', 'Core'],            rest: 60, isBodyweight: true },
	'russian-twist':                          { name: 'Russian Twist',         muscles: ['Core', 'Obliques'],                  rest: 45, isBodyweight: true },
	'short-lever-copenhagen-plank':           { name: 'Copenhagen Plank',      muscles: ['Inner Thighs', 'Core'],              rest: 60, isBodyweight: true },
	'neutral-grip-dumbbell-shoulder-press':   { name: 'Shoulder Press',        muscles: ['Shoulders', 'Triceps'],              rest: 60 }
};

function _pe(id: string, sets: number, reps: string): Exercise {
	const m = EX_META[id];
	if (!m) return { id, name: id, sets, reps, rest: 60, muscles: [] };
	return { id, name: m.name, sets, reps, rest: m.rest, muscles: m.muscles, ...(m.isBodyweight ? { isBodyweight: true } : {}) };
}

const PROGRAM: Record<1 | 2 | 3, Record<1 | 2 | 3 | 4 | 5, RoutineDay>> = {
	1: {
		1: { title: 'Chest + Back + Arms + Deep Core', exercises: [
			_pe('incline-dumbbell-chest-press', 2, '10-12'),
			_pe('one-arm-dumbbell-row',         2, '10 each side'),
			_pe('dumbbell-biceps-curl',         2, '12'),
			_pe('dumbbell-triceps-kickback',    2, '12 each side'),
			_pe('incline-bench-rear-delt-fly',  2, '12'),
			_pe('dead-bug',                     2, '8 each side'),
			_pe('heel-taps',                    2, '10 each side')
		]},
		2: { title: 'Inner Thighs + Glutes + Side Core', exercises: [
			_pe('side-lying-inner-thigh-raise',    2, '12 each side'),
			_pe('bridge-pillow-ball-squeeze',      2, '15'),
			_pe('light-sumo-dumbbell-squat',       2, '10'),
			_pe('dumbbell-hip-thrust-glute-bridge',2, '12'),
			_pe('standing-calf-raise',             2, '15'),
			_pe('side-plank-knees-bent',           2, '20 sec each side'),
			_pe('reverse-crunch',                  2, '10')
		]},
		3: { title: 'Shoulders + Arms + Posture + Lower Core', exercises: [
			_pe('light-dumbbell-lateral-raise',         2, '12'),
			_pe('incline-bench-rear-delt-fly',          2, '12'),
			_pe('hammer-curl',                          2, '12'),
			_pe('lying-dumbbell-triceps-extension',     2, '10-12'),
			_pe('side-lying-dumbbell-external-rotation',2, '12-15 each side'),
			_pe('heel-taps',                            2, '10 each side'),
			_pe('reverse-crunch',                       2, '8-10')
		]},
		4: { title: 'Full Body Strength + Inner Thighs + Core Stability', exercises: [
			_pe('goblet-squat',                   2, '10'),
			_pe('dumbbell-romanian-deadlift',     2, '10'),
			_pe('incline-push-up',                2, '8-12'),
			_pe('one-arm-dumbbell-row',           2, '10 each side'),
			_pe('side-lying-inner-thigh-raise',   2, '12 each side'),
			_pe('dead-bug',                       2, '8 each side')
		]},
		5: { title: 'Boxing + Arms Pump + Core Conditioning', exercises: [
			_pe('boxing-light-technique',        4, '45-60 sec rounds'),
			_pe('dumbbell-biceps-curl',          2, '12'),
			_pe('hammer-curl',                   2, '12'),
			_pe('dumbbell-triceps-kickback',     2, '12 each side'),
			_pe('light-dumbbell-lateral-raise',  2, '12'),
			_pe('incline-bench-rear-delt-fly',   2, '12'),
			_pe('russian-twist',                 2, '8 each side'),
			_pe('side-plank-knees-bent',         2, '20 sec each side')
		]}
	},
	2: {
		1: { title: 'Chest + Back + Arms + Deep Core', exercises: [
			_pe('incline-dumbbell-chest-press', 3, '8-12'),
			_pe('one-arm-dumbbell-row',         3, '10 each side'),
			_pe('dumbbell-biceps-curl',         3, '10-12'),
			_pe('dumbbell-triceps-kickback',    3, '12 each side'),
			_pe('incline-bench-rear-delt-fly',  3, '12'),
			_pe('dead-bug',                     3, '8 each side'),
			_pe('heel-taps',                    2, '12 each side')
		]},
		2: { title: 'Inner Thighs + Glutes + Side Core', exercises: [
			_pe('side-lying-inner-thigh-raise',    3, '12-15 each side'),
			_pe('bridge-pillow-ball-squeeze',      3, '15'),
			_pe('light-sumo-dumbbell-squat',       3, '10-12'),
			_pe('dumbbell-hip-thrust-glute-bridge',3, '10'),
			_pe('standing-calf-raise',             3, '15'),
			_pe('side-plank-knees-bent',           3, '20-30 sec each side'),
			_pe('reverse-crunch',                  2, '10-12')
		]},
		3: { title: 'Shoulders + Arms + Posture + Lower Core', exercises: [
			_pe('light-dumbbell-lateral-raise',         3, '12'),
			_pe('incline-bench-rear-delt-fly',          3, '12'),
			_pe('hammer-curl',                          3, '10-12'),
			_pe('lying-dumbbell-triceps-extension',     3, '10-12'),
			_pe('side-lying-dumbbell-external-rotation',3, '12-15 each side'),
			_pe('heel-taps',                            3, '10-12 each side'),
			_pe('reverse-crunch',                       3, '8-10')
		]},
		4: { title: 'Full Body Strength + Inner Thighs + Core Stability', exercises: [
			_pe('goblet-squat',                   3, '8-10'),
			_pe('dumbbell-romanian-deadlift',     3, '8-10'),
			_pe('incline-dumbbell-chest-press',   3, '10-12'),
			_pe('one-arm-dumbbell-row',           3, '10 each side'),
			_pe('side-lying-inner-thigh-raise',   3, '12-15 each side'),
			_pe('dead-bug',                       3, '8-10 each side')
		]},
		5: { title: 'Boxing + Arms Pump + Core Conditioning', exercises: [
			_pe('boxing-light-technique',        5, '60 sec rounds'),
			_pe('dumbbell-biceps-curl',          3, '12'),
			_pe('hammer-curl',                   3, '12'),
			_pe('dumbbell-triceps-kickback',     3, '12 each side'),
			_pe('light-dumbbell-lateral-raise',  3, '12'),
			_pe('incline-bench-rear-delt-fly',   3, '12'),
			_pe('russian-twist',                 2, '8-10 each side'),
			_pe('side-plank-knees-bent',         3, '20-30 sec each side')
		]}
	},
	3: {
		1: { title: 'Chest + Back + Arms + Deep Core', exercises: [
			_pe('incline-dumbbell-chest-press', 4, '8-10'),
			_pe('one-arm-dumbbell-row',         4, '8-10 each side'),
			_pe('dumbbell-biceps-curl',         3, '10-12'),
			_pe('dumbbell-triceps-kickback',    3, '12 each side'),
			_pe('incline-bench-rear-delt-fly',  3, '12-15'),
			_pe('dead-bug',                     3, '8 each side'),
			_pe('heel-taps',                    3, '12 each side')
		]},
		2: { title: 'Inner Thighs + Glutes + Side Core', exercises: [
			_pe('side-lying-inner-thigh-raise',       4, '15 each side'),
			_pe('bridge-pillow-ball-squeeze',         3, '15'),
			_pe('dumbbell-hip-thrust-glute-bridge',   4, '8-12'),
			_pe('light-sumo-dumbbell-squat',          3, '10'),
			_pe('standing-calf-raise',                3, '15'),
			_pe('side-plank-knees-bent',              3, '25-35 sec each side'),
			_pe('reverse-crunch',                     3, '10'),
			_pe('short-lever-copenhagen-plank',       1, '10-15 sec each side')
		]},
		3: { title: 'Shoulders + Arms + Posture + Lower Core', exercises: [
			_pe('light-dumbbell-lateral-raise',           3, '10-12'),
			_pe('incline-bench-rear-delt-fly',            3, '12-15'),
			_pe('side-lying-dumbbell-external-rotation',  3, '12-15 each side'),
			_pe('hammer-curl',                            3, '10-12'),
			_pe('lying-dumbbell-triceps-extension',       3, '12'),
			_pe('heel-taps',                              3, '12 each side'),
			_pe('reverse-crunch',                         3, '8-10'),
			_pe('neutral-grip-dumbbell-shoulder-press',   2, '8-10')
		]},
		4: { title: 'Full Body Strength + Inner Thighs + Core Stability', exercises: [
			_pe('goblet-squat',                   3, '8-10'),
			_pe('dumbbell-romanian-deadlift',     4, '8-10'),
			_pe('incline-dumbbell-chest-press',   3, '10-12'),
			_pe('one-arm-dumbbell-row',           3, '10 each side'),
			_pe('side-lying-inner-thigh-raise',   3, '15 each side'),
			_pe('dead-bug',                       3, '8 each side')
		]},
		5: { title: 'Boxing + Arms Pump + Core Conditioning', exercises: [
			_pe('boxing-light-technique',        5, '60 sec rounds'),
			_pe('dumbbell-biceps-curl',          3, '12'),
			_pe('hammer-curl',                   3, '12'),
			_pe('dumbbell-triceps-kickback',     3, '12-15 each side'),
			_pe('light-dumbbell-lateral-raise',  3, '12'),
			_pe('incline-bench-rear-delt-fly',   3, '12-15'),
			_pe('russian-twist',                 3, '8-10 each side'),
			_pe('side-plank-knees-bent',         3, '25-35 sec each side')
		]}
	}
};

/** Return a single day from the 12-week program (days 6–7 = rest) */
export function getProgramDay(phase: 1 | 2 | 3, day: number): RoutineDay {
	if (day >= 6) return { title: 'Rest', exercises: [] };
	return PROGRAM[phase][(day as 1 | 2 | 3 | 4 | 5)] ?? { title: 'Rest', exercises: [] };
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

/** Today's routine day (custom routine) or program day as fallback */
export function getRoutineDay(day: number): RoutineDay {
	const routine = J<StoredRoutine | null>(KEYS.activeRoutine(), null);
	if (routine) {
		const d = routine.days[String(day)] || routine.days['1'];
		if (d) return { title: d.title, exercises: d.exercises || [] };
	}
	return getProgramDay(getPhase(getWeek()), day);
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

// ── Check-ins ─────────────────────────────────────────────────

export interface CheckIn {
	date: string;
	weight?: number;   // kg
	energy?: number;   // 1–5
	sleep?: number;    // hours
	notes?: string;
}

export function getCheckins(): CheckIn[] {
	return J<CheckIn[]>(KEYS.checkins(), []);
}

export function getTodayCheckin(): CheckIn | null {
	return getCheckins().find((c) => c.date === today()) ?? null;
}

export function saveCheckin(data: Omit<CheckIn, 'date'>): void {
	const checkins = getCheckins().filter((c) => c.date !== today());
	checkins.push({ ...data, date: today() });
	S(KEYS.checkins(), checkins);
}

export function getRecentCheckins(n = 7): CheckIn[] {
	return [...getCheckins()]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, n);
}

// ── Coach note cache ──────────────────────────────────────────

export interface CoachNote {
	date: string;
	text: string;
}

export function getCachedCoachNote(): CoachNote | null {
	const note = J<CoachNote | null>(KEYS.coachNote(), null);
	if (!note || note.date !== today()) return null;
	return note;
}

export function saveCoachNote(text: string): void {
	S(KEYS.coachNote(), { date: today(), text });
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
