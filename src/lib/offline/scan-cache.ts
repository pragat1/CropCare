// Locally saved scan results, so history stays readable without a connection.
import { idbAvailable, idbGetAll, idbPut, STORE_SCANS } from "./db";

export type CachedScan = {
  id: string;
  crop: string;
  disease: string | null;
  is_healthy: boolean;
  confidence: number | null;
  severity: string | null;
  summary: string | null;
  created_at: string;
};

export async function saveScans(scans: CachedScan[]): Promise<void> {
  if (!idbAvailable() || scans.length === 0) return;
  try {
    await Promise.all(scans.map((s) => idbPut<CachedScan>(STORE_SCANS, s)));
  } catch {
    /* best effort */
  }
}

export async function readScans(): Promise<CachedScan[]> {
  if (!idbAvailable()) return [];
  try {
    const rows = await idbGetAll<CachedScan>(STORE_SCANS);
    return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  } catch {
    return [];
  }
}
