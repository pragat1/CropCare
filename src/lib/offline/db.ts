// Minimal promise wrapper around IndexedDB (no dependency) used for offline support.

export const DB_NAME = "leafscan-offline";
export const DB_VERSION = 1;

export const STORE_CONTENT = "content"; // cached reference data (diseases, tips, seasons, quiz)
export const STORE_SCANS = "scans"; // cached detection results for offline reading
export const STORE_QUEUE = "queue"; // pending scan uploads waiting for connectivity

let dbPromise: Promise<IDBDatabase> | null = null;

export function idbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export function openDb(): Promise<IDBDatabase> {
  if (!idbAvailable()) return Promise.reject(new Error("IndexedDB unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CONTENT))
        db.createObjectStore(STORE_CONTENT, { keyPath: "key" });
      if (!db.objectStoreNames.contains(STORE_SCANS)) {
        const s = db.createObjectStore(STORE_SCANS, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const q = db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
        q.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
  return dbPromise;
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

export function idbPut<T>(store: string, value: T): Promise<unknown> {
  return run(store, "readwrite", (s) => s.put(value as unknown as never));
}

export function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return run<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbDelete(store: string, key: IDBValidKey): Promise<unknown> {
  return run(store, "readwrite", (s) => s.delete(key));
}

export function idbClear(store: string): Promise<unknown> {
  return run(store, "readwrite", (s) => s.clear());
}
