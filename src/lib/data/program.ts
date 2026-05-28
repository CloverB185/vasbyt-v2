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
	cues?: string[];
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

const EX_META: Record<string, { name: string; muscles: string[]; rest: number; isBodyweight?: boolean; cues?: string[] }> = {
	'incline-dumbbell-chest-press':           { name: 'Incline DB Press',      muscles: ['Chest', 'Shoulders', 'Triceps'],     rest: 75,  cues: ['Elbows at 45° — not flared out', 'Lower until forearms are vertical', 'Press through the whole palm'] },
	'one-arm-dumbbell-row':                   { name: 'DB Row',                muscles: ['Back', 'Upper Back', 'Arms'],        rest: 60,  cues: ['Pull elbow to hip — not ceiling', 'Chest stays square to the bench', 'Full stretch at the bottom'] },
	'dumbbell-biceps-curl':                   { name: 'Biceps Curl',           muscles: ['Arms', 'Biceps'],                    rest: 45,  cues: ['Elbows pinned to your sides', 'Squeeze hard at the top', '3-count lowering phase'] },
	'hammer-curl':                            { name: 'Hammer Curl',           muscles: ['Arms', 'Forearms'],                  rest: 45,  cues: ['Neutral grip — thumbs up', 'Keep wrist straight throughout', 'Control the descent'] },
	'dumbbell-triceps-kickback':              { name: 'Triceps Kickback',      muscles: ['Arms', 'Triceps'],                   rest: 45,  cues: ['Upper arm parallel to floor', 'Extend fully — lock out at top', "Don't swing the weight"] },
	'incline-bench-rear-delt-fly':            { name: 'Rear Delt Fly',         muscles: ['Posture', 'Rear Shoulders'],         rest: 45,  cues: ['Chest down on the pad', 'Arc back and up — elbows soft', 'Squeeze between the shoulder blades'] },
	'dead-bug':                               { name: 'Dead Bug',              muscles: ['Core', 'Lower Abs'],                 rest: 45,  isBodyweight: true, cues: ['Lower back pressed flat to floor', 'Opposite arm and leg extend slowly', 'Breathe out as you extend'] },
	'heel-taps':                              { name: 'Heel Taps',             muscles: ['Core', 'Lower Abs'],                 rest: 45,  isBodyweight: true, cues: ['Lower back stays flat', 'Reach side to side — no rushing', 'Brace your core throughout'] },
	'side-lying-inner-thigh-raise':           { name: 'Inner Thigh Raise',     muscles: ['Inner Thighs', 'Hips'],              rest: 45,  isBodyweight: true, cues: ['Top leg rests forward — not stacked', 'Lift and lower with control', 'Keep hips stacked vertically'] },
	'bridge-pillow-ball-squeeze':             { name: 'Bridge Squeeze',        muscles: ['Glutes', 'Inner Thighs'],            rest: 60,  isBodyweight: true, cues: ['Squeeze the object as you bridge up', 'Hold glute squeeze 2 sec at top', 'Feet hip-width, toes forward'] },
	'light-sumo-dumbbell-squat':              { name: 'Sumo Squat',            muscles: ['Inner Thighs', 'Glutes', 'Legs'],    rest: 75,  cues: ['Toes out 45°, knees track over toes', 'Chest up, sit deep between heels', 'Drive through heels to stand'] },
	'dumbbell-hip-thrust-glute-bridge':       { name: 'Hip Thrust',            muscles: ['Glutes', 'Hamstrings'],              rest: 60,  cues: ['Shoulders on bench edge — not neck', 'Drive through heels, not toes', 'Squeeze glutes hard at lockout'] },
	'standing-calf-raise':                    { name: 'Calf Raise',            muscles: ['Calves'],                            rest: 45,  cues: ['Full range — heel drops below step', 'Pause 1 second at the top', 'Slow lowering phase'] },
	'side-plank-knees-bent':                  { name: 'Side Plank',            muscles: ['Core', 'Side Waist'],                rest: 45,  isBodyweight: true, cues: ['Hips high — no sagging', 'Stack shoulders, hips, and knees', 'Breathe steadily'] },
	'reverse-crunch':                         { name: 'Reverse Crunch',        muscles: ['Core', 'Lower Abs'],                 rest: 45,  isBodyweight: true, cues: ['Curl hips off floor — no swinging', 'Lower back stays in contact with floor', 'Exhale as hips lift'] },
	'light-dumbbell-lateral-raise':           { name: 'Lateral Raise',         muscles: ['Shoulders'],                         rest: 45,  cues: ['Slight bend at elbow throughout', 'Lead with your elbow — not your hand', 'Stop at shoulder height'] },
	'lying-dumbbell-triceps-extension':       { name: 'Triceps Extension',     muscles: ['Arms', 'Triceps'],                   rest: 45,  cues: ['Elbows point at ceiling — not outward', 'Only forearms move, hinge at elbow', 'Control the lowering phase'] },
	'side-lying-dumbbell-external-rotation':  { name: 'External Rotation',     muscles: ['Shoulders', 'Rotator Cuff'],         rest: 45,  cues: ['Elbow pinned to your side', 'Rotate forearm toward the ceiling', 'Small range — squeeze at top'] },
	'goblet-squat':                           { name: 'Goblet Squat',          muscles: ['Legs', 'Glutes', 'Core'],            rest: 75,  cues: ['Chest up, elbows inside knees', 'Sit deep — hips below knees', 'Drive through heels to stand'] },
	'dumbbell-romanian-deadlift':             { name: 'Romanian Deadlift',     muscles: ['Hamstrings', 'Glutes', 'Back'],      rest: 75,  cues: ['Soft knee, push hips back', 'Keep the weight close to your legs', 'Stop when you feel the hamstring stretch'] },
	'incline-push-up':                        { name: 'Incline Push-Up',       muscles: ['Chest', 'Shoulders', 'Triceps'],     rest: 60,  isBodyweight: true, cues: ['Body in one straight line', 'Lower chest to the surface', 'Elbows at 45° to your torso'] },
	'boxing-light-technique':                 { name: 'Boxing Rounds',         muscles: ['Cardio', 'Arms', 'Core'],            rest: 60,  isBodyweight: true, cues: ['Light fists — power comes from hips', 'Stay on the balls of your feet', 'Keep guard up between punches'] },
	'russian-twist':                          { name: 'Russian Twist',         muscles: ['Core', 'Obliques'],                  rest: 45,  isBodyweight: true, cues: ['Lean back 45°, chest tall', 'Rotate with your torso — not just arms', 'Control the twist each way'] },
	'short-lever-copenhagen-plank':           { name: 'Copenhagen Plank',      muscles: ['Inner Thighs', 'Core'],              rest: 60,  isBodyweight: true, cues: ["Hips square — don't rotate", 'Top leg presses down into surface', 'Breathe steady'] },
	'neutral-grip-dumbbell-shoulder-press':   { name: 'Shoulder Press',        muscles: ['Shoulders', 'Triceps'],              rest: 60,  cues: ['Core braced, ribs down', 'Press up and slightly in', 'Lower until elbows at 90°'] },
	// compound / preset-only exercises
	'squat':                                  { name: 'Squat',                 muscles: ['Quads', 'Glutes', 'Core'],           rest: 120, cues: ['Bar across traps — not neck', 'Knees track toes throughout', 'Hips below parallel for full depth'] },
	'bench-press':                            { name: 'Bench Press',           muscles: ['Chest', 'Shoulders', 'Triceps'],     rest: 90,  cues: ['Arch upper back, retract scapula', "Lower to chest — don't bounce", 'Drive feet into the floor'] },
	'deadlift':                               { name: 'Deadlift',              muscles: ['Back', 'Hamstrings', 'Glutes'],      rest: 120, cues: ['Hip hinge — not a squat', 'Bar over mid-foot, never forward', "Drive the floor away — don't pull"] },
	'romanian-deadlift':                      { name: 'Romanian Deadlift',     muscles: ['Hamstrings', 'Glutes', 'Back'],      rest: 90,  cues: ['Hip hinge, soft knee', 'Bar stays close to legs', 'Stop at hamstring tension'] },
	'lat-pulldown':                           { name: 'Lat Pulldown',          muscles: ['Back', 'Biceps'],                    rest: 75,  cues: ['Lean back slightly', 'Pull bar to upper chest, elbows to hips', 'Control the stretch back up'] },
	'shoulder-press':                         { name: 'Overhead Press',        muscles: ['Shoulders', 'Triceps', 'Core'],      rest: 90,  cues: ['Core tight — no lumbar arch', 'Press through the crown of your head', 'Lower until upper arms are horizontal'] }
};

function _pe(id: string, sets: number, reps: string): Exercise {
	const m = EX_META[id];
	if (!m) return { id, name: id, sets, reps, rest: 60, muscles: [] };
	return {
		id,
		name: m.name,
		sets,
		reps,
		rest: m.rest,
		muscles: m.muscles,
		...(m.isBodyweight ? { isBodyweight: true } : {}),
		...(m.cues?.length      ? { cues: m.cues }   : {}),
	};
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

// ── Preset routines ──────────────────────────────────────────

export interface PresetRoutine {
	id: string;
	name: string;
	description: string;
	days: Record<string, { title: string; exercises: Exercise[] }>;
}

function _px(id: string, name: string, sets: number, reps: string, rest: number): Exercise {
	const m = EX_META[id];
	return { id, name, sets, reps, rest, muscles: m?.muscles ?? [], ...(m?.isBodyweight ? { isBodyweight: true } : {}) };
}

export const PRESET_ROUTINES: PresetRoutine[] = [
	{
		id: 'preset-3day-fullbody',
		name: '3-Day Full Body',
		description: 'Full body 3×/week. Great for beginners or busy schedules.',
		days: {
			'1': { title: 'Full Body A', exercises: [
				_px('incline-dumbbell-chest-press',   'Incline DB Press',         3, '8-12',     75),
				_px('one-arm-dumbbell-row',            'DB Row',                   3, '10-12',    60),
				_px('squat',                           'Squat',                    3, '8-10',    120),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               3, '12-15',    60),
				_px('dead-bug',                        'Dead Bug',                 3, '8-10',     45)
			]},
			'2': { title: 'Rest', exercises: [] },
			'3': { title: 'Full Body B', exercises: [
				_px('bench-press',                     'Bench Press',              3, '8-12',     90),
				_px('lat-pulldown',                    'Lat Pulldown / Pull-Up',   3, '8-12',     75),
				_px('romanian-deadlift',               'Romanian Deadlift',        3, '8-10',     90),
				_px('light-dumbbell-lateral-raise',    'Lateral Raise',            3, '12-15',    60),
				_px('reverse-crunch',                  'Reverse Crunch',           3, '12-15',    45)
			]},
			'4': { title: 'Rest', exercises: [] },
			'5': { title: 'Full Body C', exercises: [
				_px('light-sumo-dumbbell-squat',       'Sumo Squat',               3, '12-15',    75),
				_px('incline-bench-rear-delt-fly',     'Rear Delt Fly',            3, '12-15',    60),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               3, '15',        60),
				_px('standing-calf-raise',             'Calf Raise',               3, '15-20',    45),
				_px('side-plank-knees-bent',           'Side Plank',               2, '30s each', 45)
			]},
			'6': { title: 'Rest', exercises: [] },
			'7': { title: 'Rest', exercises: [] }
		}
	},
	{
		id: 'preset-ppl',
		name: 'Push / Pull / Legs',
		description: '6-day split. Chest & triceps / Back & biceps / Legs.',
		days: {
			'1': { title: 'Push', exercises: [
				_px('bench-press',                     'Bench Press',              4, '6-10',     90),
				_px('incline-dumbbell-chest-press',    'Incline DB Press',         3, '8-12',     75),
				_px('shoulder-press',                  'Overhead Press',           3, '8-12',     75),
				_px('light-dumbbell-lateral-raise',    'Lateral Raise',            3, '12-15',    60),
				_px('lying-dumbbell-triceps-extension','Triceps Extension',        3, '10-12',    60)
			]},
			'2': { title: 'Pull', exercises: [
				_px('deadlift',                        'Deadlift',                 3, '5-8',     120),
				_px('lat-pulldown',                    'Lat Pulldown / Pull-Up',   4, '8-12',     75),
				_px('one-arm-dumbbell-row',            'DB Row',                   3, '10-12',    60),
				_px('incline-bench-rear-delt-fly',     'Rear Delt Fly',            3, '12-15',    60),
				_px('dumbbell-biceps-curl',            'Biceps Curl',              3, '10-12',    60)
			]},
			'3': { title: 'Legs', exercises: [
				_px('squat',                           'Squat',                    4, '6-10',    120),
				_px('romanian-deadlift',               'Romanian Deadlift',        3, '8-12',     90),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               3, '12-15',    75),
				_px('light-sumo-dumbbell-squat',       'Sumo Squat',               3, '12-15',    60),
				_px('standing-calf-raise',             'Calf Raise',               4, '15-20',    45)
			]},
			'4': { title: 'Push', exercises: [
				_px('incline-dumbbell-chest-press',    'Incline DB Press',         4, '8-12',     75),
				_px('shoulder-press',                  'Overhead Press',           3, '8-12',     75),
				_px('light-dumbbell-lateral-raise',    'Lateral Raise',            3, '12-15',    60),
				_px('dumbbell-triceps-kickback',       'Triceps Kickback',         3, '12-15',    60)
			]},
			'5': { title: 'Pull', exercises: [
				_px('one-arm-dumbbell-row',            'DB Row',                   4, '10-12',    75),
				_px('lat-pulldown',                    'Lat Pulldown / Pull-Up',   3, '8-12',     75),
				_px('hammer-curl',                     'Hammer Curl',              3, '10-12',    60),
				_px('incline-bench-rear-delt-fly',     'Rear Delt Fly',            3, '12-15',    60)
			]},
			'6': { title: 'Legs', exercises: [
				_px('squat',                           'Squat',                    3, '8-12',     90),
				_px('romanian-deadlift',               'Romanian Deadlift',        3, '10-12',    75),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               3, '15',        60),
				_px('standing-calf-raise',             'Calf Raise',               3, '20',        45)
			]},
			'7': { title: 'Rest', exercises: [] }
		}
	},
	{
		id: 'preset-upper-lower',
		name: 'Upper / Lower',
		description: '4-day split. Good balance of volume and recovery.',
		days: {
			'1': { title: 'Upper A', exercises: [
				_px('bench-press',                     'Bench Press',              4, '6-10',     90),
				_px('one-arm-dumbbell-row',            'DB Row',                   4, '8-12',     75),
				_px('shoulder-press',                  'Overhead Press',           3, '8-12',     75),
				_px('lat-pulldown',                    'Lat Pulldown',             3, '10-12',    75),
				_px('dumbbell-biceps-curl',            'Biceps Curl',              2, '12',        60),
				_px('lying-dumbbell-triceps-extension','Triceps Extension',        2, '12',        60)
			]},
			'2': { title: 'Lower A', exercises: [
				_px('squat',                           'Squat',                    4, '6-10',    120),
				_px('romanian-deadlift',               'Romanian Deadlift',        3, '8-12',     90),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               3, '12-15',    75),
				_px('standing-calf-raise',             'Calf Raise',               3, '15-20',    45),
				_px('reverse-crunch',                  'Reverse Crunch',           3, '15',        45)
			]},
			'3': { title: 'Rest', exercises: [] },
			'4': { title: 'Upper B', exercises: [
				_px('incline-dumbbell-chest-press',    'Incline DB Press',         4, '8-12',     75),
				_px('incline-bench-rear-delt-fly',     'Rear Delt Fly',            3, '12-15',    60),
				_px('light-dumbbell-lateral-raise',    'Lateral Raise',            3, '12-15',    60),
				_px('hammer-curl',                     'Hammer Curl',              3, '10-12',    60),
				_px('dumbbell-triceps-kickback',       'Triceps Kickback',         3, '12-15',    60)
			]},
			'5': { title: 'Lower B', exercises: [
				_px('deadlift',                        'Deadlift',                 4, '5-8',     120),
				_px('light-sumo-dumbbell-squat',       'Sumo Squat',               3, '12-15',    75),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               3, '15',        60),
				_px('reverse-crunch',                  'Reverse Crunch',           3, '15',        45)
			]},
			'6': { title: 'Rest', exercises: [] },
			'7': { title: 'Rest', exercises: [] }
		}
	},
	{
		id: 'preset-5day-recomp',
		name: '5-Day Dumbbell Recomp',
		description: 'Body recomposition with dumbbells. Split by muscle group.',
		days: {
			'1': { title: 'Chest & Triceps', exercises: [
				_px('incline-dumbbell-chest-press',    'Incline DB Chest Press',   3, '10-12',    75),
				_px('lying-dumbbell-triceps-extension','Triceps Extension',        3, '10-12',    60),
				_px('dumbbell-triceps-kickback',       'Triceps Kickback',         3, '12-15',    60)
			]},
			'2': { title: 'Back & Biceps', exercises: [
				_px('one-arm-dumbbell-row',            'One-Arm DB Row',           3, '10-12',    75),
				_px('incline-bench-rear-delt-fly',     'Rear Delt Fly',            3, '12-15',    60),
				_px('dumbbell-biceps-curl',            'Biceps Curl',              3, '10-12',    60),
				_px('hammer-curl',                     'Hammer Curl',              3, '10-12',    60)
			]},
			'3': { title: 'Legs & Glutes', exercises: [
				_px('light-sumo-dumbbell-squat',       'Sumo Squat',               3, '12-15',    75),
				_px('dumbbell-hip-thrust-glute-bridge','Hip Thrust',               4, '12-15',    75),
				_px('standing-calf-raise',             'Calf Raise',               3, '15-20',    45),
				_px('bridge-pillow-ball-squeeze',      'Bridge Squeeze',           3, '12-15',    45),
				_px('side-lying-inner-thigh-raise',    'Inner Thigh Raise',        3, '15',        45)
			]},
			'4': { title: 'Shoulders & Arms', exercises: [
				_px('light-dumbbell-lateral-raise',         'Lateral Raise',       3, '12-15',    60),
				_px('side-lying-dumbbell-external-rotation','External Rotation',   3, '12-15',    60),
				_px('dumbbell-biceps-curl',                 'Biceps Curl',         3, '10-12',    60),
				_px('lying-dumbbell-triceps-extension',     'Triceps Extension',   3, '10-12',    60)
			]},
			'5': { title: 'Core & Stability', exercises: [
				_px('dead-bug',           'Dead Bug',       3, '8 each',   45),
				_px('side-plank-knees-bent','Side Plank',   2, '30s each', 45),
				_px('reverse-crunch',     'Reverse Crunch', 3, '15',        45),
				_px('heel-taps',          'Heel Taps',      3, '20',        45)
			]},
			'6': { title: 'Rest', exercises: [] },
			'7': { title: 'Rest', exercises: [] }
		}
	}
];

export function getPresetRoutines(): PresetRoutine[] {
	return PRESET_ROUTINES;
}

export function activatePreset(id: string): boolean {
	const preset = PRESET_ROUTINES.find((p) => p.id === id);
	if (!preset) return false;
	S(KEYS.activeRoutine(), { name: preset.name, days: preset.days });
	return true;
}

// ── Routine mode ─────────────────────────────────────────────

interface StoredRoutine {
	name: string;
	days: Record<string, { title: string; exercises: Exercise[] }>;
}

/** A day inside a saved custom routine */
export interface RbDay {
	day: number;
	title: string;
	isRest: boolean;
	exercises: { id: string; name: string; sets: number; reps: string; rest: number }[];
}

/** A saved custom routine stored in KEYS.routines() */
export interface SavedRoutine {
	id: string;
	name: string;
	description: string;
	days: RbDay[];
}

/** Load all saved custom routines */
export function getSavedRoutines(): SavedRoutine[] {
	return J<SavedRoutine[]>(KEYS.routines(), []);
}

/** Save (create or update) a custom routine */
export function saveCustomRoutine(r: SavedRoutine): void {
	const all = getSavedRoutines();
	const idx = all.findIndex((x) => x.id === r.id);
	if (idx >= 0) all[idx] = r; else all.push(r);
	S(KEYS.routines(), all);
}

/** Delete a custom routine by id */
export function deleteCustomRoutine(id: string): void {
	S(KEYS.routines(), getSavedRoutines().filter((r) => r.id !== id));
	// if this was active, clear it
	const active = J<StoredRoutine & { id?: string } | null>(KEYS.activeRoutine(), null);
	if (active && (active as unknown as { id?: string }).id === id) {
		localStorage.removeItem(KEYS.activeRoutine());
	}
}

/** Activate a saved custom routine */
export function activateCustomRoutine(id: string): boolean {
	const r = getSavedRoutines().find((x) => x.id === id);
	if (!r) return false;
	const days: Record<string, { title: string; exercises: Exercise[] }> = {};
	r.days.forEach((d) => {
		days[String(d.day)] = {
			title: d.isRest ? 'Rest' : d.title,
			exercises: d.exercises.map((e) => ({
				id: e.id, name: e.name, sets: e.sets,
				reps: e.reps, rest: e.rest, muscles: []
			}))
		};
	});
	S(KEYS.activeRoutine(), { id, name: r.name, days });
	return true;
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

export function setWeek(n: number): void { S(KEYS.week(), Math.max(1, Math.min(12, n))); }
export function setDay(n: number): void  { S(KEYS.day(),  Math.max(1, Math.min(7,  n))); }

// ── Readiness ────────────────────────────────────────────────
export function getReady(): string       { return J<string>(KEYS.ready(), ''); }
export function setReady(v: string): void { S(KEYS.ready(), v); }

// ── Week momentum ─────────────────────────────────────────────
/** Unique workout days this ISO week (Mon–Sun) based on finishes or logs */
export function getWeekMomentum(): number {
	const now = new Date();
	const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
	const mon = new Date(now); mon.setDate(now.getDate() - dow);
	const monStr = mon.toISOString().slice(0, 10);
	const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
	const sunStr = sun.toISOString().slice(0, 10);
	const uniqueDays = new Set(
		getFinishes()
			.filter((f) => f.date >= monStr && f.date <= sunStr)
			.map((f) => f.date)
	);
	// fall back to log days if no finishes yet
	if (uniqueDays.size === 0) {
		getLogs()
			.filter((l) => l.date >= monStr && l.date <= sunStr)
			.forEach((l) => uniqueDays.add(l.date));
	}
	return uniqueDays.size;
}

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

/**
 * Returns true if `weight` is a new personal record for this exercise.
 * Compares against the best weight logged on any date BEFORE today.
 * Returns false for bodyweight sets (weight = '' or '0').
 */
export function isPR(exerciseId: number | string, weight: string): boolean {
	const w = Number(weight);
	if (!w || w <= 0) return false;
	const t = today();
	const prev = getLogs().filter(
		(l) => String(l.exerciseId) === String(exerciseId) && l.date !== t && Number(l.weight) > 0
	);
	if (prev.length === 0) return false; // no history → not a PR (first ever session)
	const best = Math.max(...prev.map((l) => Number(l.weight)));
	return w > best;
}

/** Muscle groups for an exercise (from EX_META; empty array if unknown) */
export function getExerciseMuscles(id: string | number): string[] {
	return EX_META[String(id)]?.muscles ?? [];
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
	weight?: number;    // kg
	energy?: number;    // 1–10
	sleep?: number;     // 1–10 quality
	soreness?: number;  // 0–10
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

// ── Periodization engine ─────────────────────────────────────

function _isoDate(d: Date): string {
	return (
		d.getFullYear() +
		'-' +
		String(d.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(d.getDate()).padStart(2, '0')
	);
}

export function getWeekBounds(weeksBack: number): { mon: string; sun: string } {
	const now = new Date();
	const dow = now.getDay();
	const diffToMon = dow === 0 ? -6 : 1 - dow;
	const thisMon = new Date(now);
	thisMon.setDate(now.getDate() + diffToMon);
	thisMon.setHours(0, 0, 0, 0);
	const mon = new Date(thisMon);
	mon.setDate(thisMon.getDate() - weeksBack * 7);
	const sun = new Date(mon);
	sun.setDate(mon.getDate() + 6);
	return { mon: _isoDate(mon), sun: _isoDate(sun) };
}

export function getTonnageForWeek(mon: string, sun: string): number {
	return getLogs()
		.filter((l) => l.date >= mon && l.date <= sun && parseFloat(l.weight) > 0)
		.reduce((s, l) => s + (parseFloat(l.weight) || 0) * (parseInt(l.reps) || 0), 0);
}

export function getStalledExercises(): { name: string; weight: number; sessions: number }[] {
	const weighted = getLogs().filter((l) => parseFloat(l.weight) > 0);
	const byEx: Record<string, { name: string; byDate: Record<string, number> }> = {};
	weighted.forEach((l) => {
		const key = String(l.exerciseId);
		if (!byEx[key]) byEx[key] = { name: l.exerciseName || key, byDate: {} };
		const w = parseFloat(l.weight) || 0;
		if (!byEx[key].byDate[l.date] || w > byEx[key].byDate[l.date]) byEx[key].byDate[l.date] = w;
	});
	const stalled: { name: string; weight: number; sessions: number }[] = [];
	Object.values(byEx).forEach(({ name, byDate }) => {
		const dates = Object.keys(byDate).sort().reverse();
		if (dates.length < 3) return;
		const [d0, d1, d2, d3] = dates;
		const w0 = byDate[d0], w1 = byDate[d1], w2 = byDate[d2];
		if (w0 !== w1 || w1 !== w2) return;
		const count = d3 && byDate[d3] === w0 ? 4 : 3;
		stalled.push({ name, weight: w0, sessions: count });
	});
	return stalled.sort((a, b) => b.sessions - a.sessions).slice(0, 3);
}

export function isOverreaching(): boolean {
	const t = [1, 2, 3, 4].map((w) => {
		const b = getWeekBounds(w);
		return getTonnageForWeek(b.mon, b.sun);
	});
	if (t[0] === 0 && t[1] === 0 && t[2] === 0) return false;
	const avg4 = (t[0] + t[1] + t[2] + t[3]) / 4;
	if (avg4 === 0) return false;
	return t[0] >= avg4 * 1.1 && t[1] >= avg4 * 1.1 && t[2] >= avg4 * 1.1;
}

export interface PeriodizationInsight {
	volumePct: number | null;
	firstWeek: boolean;
	stalled: { name: string; weight: number; sessions: number }[];
	overreaching: boolean;
}

export function getPeriodizationInsight(): PeriodizationInsight | null {
	const weighted = getLogs().filter((l) => parseFloat(l.weight) > 0);
	if (weighted.length < 8) return null;
	const thisB = getWeekBounds(0);
	const lastB = getWeekBounds(1);
	const thisTon = getTonnageForWeek(thisB.mon, thisB.sun);
	const lastTon = getTonnageForWeek(lastB.mon, lastB.sun);
	let volumePct: number | null = null;
	let firstWeek = false;
	if (thisTon > 0 && lastTon > 0) {
		volumePct = Math.round(((thisTon - lastTon) / lastTon) * 100);
	} else if (thisTon > 0 && lastTon === 0) {
		firstWeek = true;
	}
	const stalled = getStalledExercises();
	const overreaching = isOverreaching();
	if (volumePct === null && !firstWeek && !stalled.length && !overreaching) return null;
	return { volumePct, firstWeek, stalled, overreaching };
}

export interface PhaseTransitionInfo {
	phaseKey: string;
	message: string;
}

export function getPhaseTransitionInfo(): PhaseTransitionInfo | null {
	if (inRoutineMode()) return null;
	const wk = getWeek();
	if (wk !== 2 && wk !== 6) return null;
	const phaseKey = wk === 2 ? 'p2' : 'p3';
	if (J<Record<string, boolean>>(KEYS.phaseSeen(), {})[phaseKey]) return null;
	const message =
		wk === 2
			? 'Build Strength + Toning'
			: 'Recomposition + Shape';
	return { phaseKey, message };
}

export function markPhaseTransitionSeen(phaseKey: string): void {
	const seen = J<Record<string, boolean>>(KEYS.phaseSeen(), {});
	seen[phaseKey] = true;
	S(KEYS.phaseSeen(), seen);
}

export function getDeloadSignal(): boolean {
	const pts = getCheckins().filter((c) => (c.energy ?? 0) > 0);
	if (!pts.length) return false;
	const recent = pts.slice(-5);
	return recent.reduce((s, c) => s + (c.energy ?? 0), 0) / recent.length < 5;
}

export interface SessionBriefingEntry {
	exerciseId: number | string;
	name: string;
	lastWeight: string;
	suggestion: string;
	readyToProgress: boolean;
	isPlateaued: boolean;
	takeItEasy: boolean;
}

export function getSessionBriefing(exercises: Exercise[]): SessionBriefingEntry[] {
	const allLogs = getLogs();
	const t = today();

	// Readiness synthesis — last 3 check-ins with energy/sleep data
	const recentCi = getCheckins()
		.filter((c) => c.date < t)
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 3);
	const avgEnergy =
		recentCi.length
			? recentCi.reduce((s, c) => s + (c.energy ?? 3), 0) / recentCi.length
			: null;
	const ciWithSleep = recentCi.filter((c) => (c.sleep ?? 0) > 0);
	const avgSleep =
		ciWithSleep.length
			? ciWithSleep.reduce((s, c) => s + (c.sleep ?? 0), 0) / ciWithSleep.length
			: null;
	const takeItEasy = (avgEnergy !== null && avgEnergy < 2.5) || (avgSleep !== null && avgSleep < 5);
	const lowEnergy = avgEnergy !== null && avgEnergy < 2.5;
	const poorSleep = avgSleep !== null && avgSleep < 5;

	return exercises.slice(0, 6).flatMap((ex) => {
		const prevLogs = allLogs.filter(
			(l) => String(l.exerciseId) === String(ex.id) && l.date < t && parseFloat(l.weight) > 0
		);
		if (!prevLogs.length) return [];

		// Last session data
		const lastDate = prevLogs[prevLogs.length - 1].date;
		const lastSets = prevLogs.filter((l) => l.date === lastDate);
		const maxW = Math.max(...lastSets.map((l) => parseFloat(l.weight) || 0));
		if (!maxW) return [];

		// Plateau detection — 3+ distinct dates spanning 14+ days, weight flat or declining
		const dateWeightMap: Record<string, number> = {};
		prevLogs.forEach((l) => {
			const w = parseFloat(l.weight) || 0;
			const existing = dateWeightMap[l.date] ?? 0;
			if (w > existing) dateWeightMap[l.date] = w;
		});
		const sortedDates = Object.keys(dateWeightMap).sort();
		let isPlateaued = false;
		if (sortedDates.length >= 3) {
			const daySpan =
				(new Date(sortedDates[sortedDates.length - 1]).getTime() -
					new Date(sortedDates[0]).getTime()) /
				86_400_000;
			if (daySpan >= 14 && dateWeightMap[sortedDates[sortedDates.length - 1]] <= dateWeightMap[sortedDates[0]]) {
				isPlateaued = true;
			}
		}

		// Reps check — did they hit target last session?
		const targetSets = Number(ex.sets) || 3;
		const minReps = parseInt(String(ex.reps)) || 10;
		const goodSets = lastSets.filter((l) => (parseInt(l.reps) || 0) >= minReps);
		const ready = goodSets.length >= targetSets;

		// Four-state suggestion
		let suggestion: string;
		let readyToProgress = false;
		if (isPlateaued) {
			suggestion = 'Plateau — try tempo or pause reps';
		} else if (takeItEasy) {
			suggestion = `→ ${maxW} kg (keep same)`;
		} else if (ready) {
			suggestion = `↑ try ${(maxW + 2.5).toFixed(1)} kg`;
			readyToProgress = true;
		} else {
			suggestion = `→ ${maxW} kg`;
		}

		return [
			{
				exerciseId: ex.id,
				name: ex.name,
				lastWeight: `${maxW} kg`,
				suggestion,
				readyToProgress,
				isPlateaued,
				takeItEasy: lowEnergy || poorSleep
			}
		];
	});
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
