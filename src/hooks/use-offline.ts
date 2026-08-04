import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cacheContent, readContent, type ContentKey } from "@/lib/offline/content-cache";
import {
  getServerSyncState,
  getSyncState,
  listQueue,
  subscribeSync,
  syncQueue,
  type QueuedScan,
} from "@/lib/offline/sync";

/** Live connectivity + upload-queue status. */
export function useSyncStatus() {
  const state = useSyncExternalStore(subscribeSync, getSyncState, getServerSyncState);
  const syncNow = useCallback(() => syncQueue(), []);
  return { ...state, syncNow };
}

/** The scans still waiting to upload. */
export function usePendingQueue() {
  const { pending, syncing } = useSyncStatus();
  const [items, setItems] = useState<QueuedScan[]>([]);
  useEffect(() => {
    let alive = true;
    void listQueue().then((q) => alive && setItems(q));
    return () => {
      alive = false;
    };
  }, [pending, syncing]);
  return items;
}

/**
 * Returns reference data, keeping an IndexedDB copy in sync so the page still
 * renders after the app is opened without a connection.
 */
export function useOfflineData<T>(key: ContentKey, data: T): { data: T; cachedAt: string | null } {
  const [value, setValue] = useState<T>(data);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const empty = Array.isArray(data) ? data.length === 0 : !data;
    if (empty) {
      void readContent<T>(key).then((cached) => {
        if (alive && cached) setValue(cached);
      });
    } else {
      setValue(data);
      void cacheContent(key, data).then(() => alive && setCachedAt(new Date().toISOString()));
    }
    return () => {
      alive = false;
    };
  }, [key, data]);

  return { data: value, cachedAt };
}
