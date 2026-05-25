// ============================================================
// STORAGE LAYER — mirrors V1 localStorage structure exactly.
// V2 reads the same keys as V1 so existing data works immediately.
// ============================================================

const PROFILES_KEY   = 'vasbytProfiles.v1';
const ACTIVE_PID_KEY = 'vasbytActiveProfileId.v1';

function _initProfiles(): void {
	if (typeof localStorage === 'undefined') return;
	const profiles = J<{ id: string; name: string; createdAt: string }[]>(PROFILES_KEY, []);
	if (!profiles.find((p) => p.id === 'lischel')) {
		profiles.unshift({ id: 'lischel', name: 'Me', createdAt: new Date().toISOString() });
		S(PROFILES_KEY, profiles);
	}
	if (!localStorage.getItem(ACTIVE_PID_KEY)) {
		localStorage.setItem(ACTIVE_PID_KEY, 'lischel');
	}
}

/** Active profile ID */
export const getPID = (): string => {
	if (typeof localStorage === 'undefined') return 'lischel';
	return localStorage.getItem(ACTIVE_PID_KEY) || 'lischel';
};

/** Profile-aware key: legacy users get bare key, others get namespaced */
export const pKey = (legacyKey: string, slug: string): string => {
	const pid = getPID();
	return pid === 'lischel' ? legacyKey : `vasbyt_${slug}_${pid}`;
};

/** Read from localStorage with typed fallback */
export function J<T>(key: string, fallback: T): T {
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw !== null ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

/** Write to localStorage */
export function S<T>(key: string, value: T): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(key, JSON.stringify(value));
}

/** Today's date as YYYY-MM-DD (local time) */
export function today(): string {
	const d = new Date();
	return (
		d.getFullYear() +
		'-' +
		String(d.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(d.getDate()).padStart(2, '0')
	);
}

// ── Profile-aware storage keys (matching V1 exactly) ────────
export const KEYS = {
	logs:          () => pKey('vasbytLogs.v1',           'logs'),
	sessions:      () => pKey('vasbytSessions.v1',       'sessions'),
	week:          () => pKey('vasbytWeek.v1',            'week'),
	day:           () => pKey('vasbytDay.v1',             'day'),
	ready:         () => pKey('vasbytReady.v1',           'ready'),
	profile:       () => pKey('vasbytProfile.v1',         'profile'),
	checkins:      () => pKey('vasbytCheckins.v1',        'checkins'),
	activeRoutine: () => pKey('vasbytActiveRoutine.v1',   'activeRoutine'),
	routines:      () => pKey('vasbytRoutines.v1',        'routines'),
	coachNote:     () => pKey('vasbytCoachNote.v1',       'coachNote'),
	finishes:      () => pKey('vasbytFinishes.v1',        'finishes'),
	theme:         () => 'vasbytTheme.v1', // shared across profiles
	bodyInsights:  () => pKey('vasbytBodyInsights.v1', 'bodyInsights'),
	phaseSeen:     () => pKey('vasbytPhaseSeen.v1',    'phaseSeen'),
	cardio:        () => pKey('vasbytCardio.v1',       'cardio'),
	equip:         () => pKey('vasbytEquipment.v1',    'equip'),
};

// Init profiles on first load (browser only)
if (typeof localStorage !== 'undefined') _initProfiles();
