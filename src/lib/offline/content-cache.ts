// Caches the static reference data (disease database, tips, seasons, quiz) into
// IndexedDB so it stays readable when the device is offline.
import { idbAvailable, idbGet, idbPut, STORE_CONTENT } from "./db";

export type ContentKey = "diseases" | "tips" | "cropTips" | "seasons" | "seasonList" | "quizzes";

type ContentRow<T> = { key: ContentKey; data: T; updatedAt: string };

export async function cacheContent<T>(key: ContentKey, data: T): Promise<void> {
  if (!idbAvailable()) return;
  try {
    const existing = await idbGet<ContentRow<T>>(STORE_CONTENT, key);
    const next = JSON.stringify(data);
    if (existing && JSON.stringify(existing.data) === next) return;
    await idbPut<ContentRow<T>>(STORE_CONTENT, { key, data, updatedAt: new Date().toISOString() });
  } catch {
    /* caching is best-effort */
  }
}

export async function readContent<T>(key: ContentKey): Promise<T | null> {
  if (!idbAvailable()) return null;
  try {
    const row = await idbGet<ContentRow<T>>(STORE_CONTENT, key);
    return row?.data ?? null;
  } catch {
    return null;
  }
}

/** Seeds every reference dataset shipped with the app into IndexedDB. */
export async function seedOfflineContent(): Promise<void> {
  if (!idbAvailable()) return;
  const [{ DISEASES }, { TIPS, CROP_TIPS }, { SEASONS, SEASON_LIST }, { QUIZZES }] = await Promise.all([
    import("@/lib/data/diseases"),
    import("@/lib/data/tips"),
    import("@/lib/data/seasons"),
    import("@/lib/data/quizzes"),
  ]);
  await Promise.all([
    cacheContent("diseases", DISEASES),
    cacheContent("tips", TIPS),
    cacheContent("cropTips", CROP_TIPS),
    cacheContent("seasons", SEASONS),
    cacheContent("seasonList", SEASON_LIST),
    cacheContent("quizzes", QUIZZES),
  ]);
}