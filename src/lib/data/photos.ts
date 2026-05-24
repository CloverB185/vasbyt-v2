// ============================================================
// PHOTO LAYER — IndexedDB storage matching V1 vasbytPhotos schema.
// V2 reads the same DB as V1 so existing photos carry over.
// ============================================================

const DB_NAME    = 'vasbytPhotos';
const DB_VERSION = 2;
const STORE      = 'photos';

export interface Photo {
	id:      string;        // ISO timestamp string — sort key (desc = newest first)
	date:    string;        // YYYY-MM-DD local time
	time:    string;        // HH:MM
	pose:    string | null; // 'front' | 'back' | 'right' | 'left' | null
	dataUrl: string;        // JPEG base64 data URL, max 900px
}

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
	if (_db) return Promise.resolve(_db);
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;
			if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
			db.createObjectStore(STORE, { keyPath: 'id' });
		};
		req.onsuccess = (e) => {
			_db = (e.target as IDBOpenDBRequest).result;
			_db!.onversionchange = () => { _db?.close(); _db = null; };
			resolve(_db!);
		};
		req.onblocked = () => { _db?.close(); _db = null; };
		req.onerror   = (e) => reject(e);
	});
}

export async function loadPhotos(): Promise<Photo[]> {
	try {
		const db = await openDB();
		return new Promise((resolve) => {
			const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
			req.onsuccess = (e) => {
				const list = ((e.target as IDBRequest).result as Photo[]) || [];
				resolve(list.sort((a, b) => b.id.localeCompare(a.id)));
			};
			req.onerror = () => resolve([]);
		});
	} catch { return []; }
}

export async function storePhoto(file: File, pose: string | null): Promise<Photo> {
	const dataUrl = await compressImage(file);
	const now  = new Date();
	const hrs  = String(now.getHours()).padStart(2, '0');
	const mins = String(now.getMinutes()).padStart(2, '0');
	const record: Photo = {
		id:      now.toISOString(),
		date:    localDate(now),
		time:    `${hrs}:${mins}`,
		pose,
		dataUrl
	};
	const db = await openDB();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(record);
		tx.oncomplete = () => resolve();
		tx.onerror    = (e) => reject(e);
	});
	return record;
}

export async function removePhoto(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror    = (e) => reject(e);
	});
}

// ── Helpers ──────────────────────────────────────────────────

function localDate(d: Date): string {
	return (
		d.getFullYear() + '-' +
		String(d.getMonth() + 1).padStart(2, '0') + '-' +
		String(d.getDate()).padStart(2, '0')
	);
}

function compressImage(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				const MAX = 900;
				let w = img.width, h = img.height;
				if (w > MAX || h > MAX) {
					const ratio = Math.min(MAX / w, MAX / h);
					w = Math.round(w * ratio);
					h = Math.round(h * ratio);
				}
				const canvas = document.createElement('canvas');
				canvas.width = w; canvas.height = h;
				canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
				resolve(canvas.toDataURL('image/jpeg', 0.8));
			};
			img.onerror = reject;
			img.src = e.target!.result as string;
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
