// Offline upload queue + automatic background sync.
import { supabase } from "@/integrations/supabase/client";
import { analyzeDetection } from "@/lib/detect.functions";
import { compressImage } from "@/lib/image-client";
import { idbAvailable, idbDelete, idbGetAll, idbPut, STORE_QUEUE } from "./db";
import { saveScans } from "./scan-cache";

export type QueuedScan = {
  id: string;
  crop: string;
  blob: Blob;
  filename: string;
  weather?: unknown;
  weatherRisk?: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type SyncState = {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
};

let state: SyncState = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
};

const listeners = new Set<() => void>();

function emit(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
  return state;
}

export function getServerSyncState(): SyncState {
  return { online: true, syncing: false, pending: 0, lastSyncedAt: null, lastError: null };
}

export async function listQueue(): Promise<QueuedScan[]> {
  if (!idbAvailable()) return [];
  try {
    const rows = await idbGetAll<QueuedScan>(STORE_QUEUE);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

async function refreshPending() {
  const q = await listQueue();
  emit({ pending: q.length });
  return q;
}

/** Stores a scan locally so it can be uploaded once connectivity returns. */
export async function queueScan(input: {
  crop: string;
  file: File;
  weather?: unknown;
  weatherRisk?: unknown;
}): Promise<QueuedScan> {
  const compressed = await compressImage(input.file);
  const item: QueuedScan = {
    id: crypto.randomUUID(),
    crop: input.crop,
    blob: compressed,
    filename: compressed.name || "leaf.jpg",
    weather: input.weather,
    weatherRisk: input.weatherRisk,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await idbPut<QueuedScan>(STORE_QUEUE, item);
  await refreshPending();
  return item;
}

export async function removeQueued(id: string): Promise<void> {
  await idbDelete(STORE_QUEUE, id);
  await refreshPending();
}

async function uploadOne(item: QueuedScan): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const ext = (item.filename.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("leaf-images")
    .upload(path, item.blob, { contentType: item.blob.type || "image/jpeg", upsert: false });
  if (upErr) throw upErr;
  const res = await analyzeDetection({
    data: {
      crop: item.crop,
      imagePath: path,
      weather: item.weather as never,
      weatherRisk: item.weatherRisk as never,
    },
  });
  return res.id;
}

/** Uploads everything queued. Safe to call repeatedly — it no-ops while running or offline. */
export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !idbAvailable()) return { synced: 0, failed: 0 };
  if (state.syncing || !navigator.onLine) return { synced: 0, failed: 0 };

  const queue = await refreshPending();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  emit({ syncing: true, lastError: null });
  let synced = 0;
  let failed = 0;
  for (const item of queue.slice().reverse()) {
    if (!navigator.onLine) break;
    try {
      await uploadOne(item);
      await idbDelete(STORE_QUEUE, item.id);
      synced += 1;
    } catch (e) {
      failed += 1;
      const message = e instanceof Error ? e.message : "Upload failed";
      await idbPut<QueuedScan>(STORE_QUEUE, {
        ...item,
        attempts: item.attempts + 1,
        lastError: message,
      });
      emit({ lastError: message });
    }
  }
  await refreshPending();
  emit({
    syncing: false,
    lastSyncedAt: synced > 0 ? new Date().toISOString() : state.lastSyncedAt,
  });
  return { synced, failed };
}

let started = false;

/** Wires connectivity listeners once per browser session. */
export function startSyncEngine(onSynced?: (n: number) => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (started) return () => {};
  started = true;

  const runSync = async () => {
    const { synced } = await syncQueue();
    if (synced > 0) onSynced?.(synced);
  };

  const goOnline = () => {
    emit({ online: true });
    void runSync();
  };
  const goOffline = () => emit({ online: false });

  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);
  emit({ online: navigator.onLine });
  void refreshPending();
  if (navigator.onLine) void runSync();

  const interval = window.setInterval(() => {
    if (navigator.onLine) void runSync();
  }, 60_000);

  return () => {
    window.removeEventListener("online", goOnline);
    window.removeEventListener("offline", goOffline);
    window.clearInterval(interval);
    started = false;
  };
}

export { refreshPending as refreshPendingCount, saveScans };
