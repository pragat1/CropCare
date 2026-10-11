const RECOVERY_MARKER_KEY = "cropcare:password-recovery";

type RecoveryMarker = { userId: string };

export function markPasswordRecovery(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.sessionStorage.setItem(RECOVERY_MARKER_KEY, JSON.stringify({ userId }));
  } catch {
    // Recovery still works in the active page if session storage is unavailable.
  }
}

export function getPasswordRecoveryUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(RECOVERY_MARKER_KEY);
    if (!value) return null;
    const marker = JSON.parse(value) as Partial<RecoveryMarker>;
    return typeof marker.userId === "string" && marker.userId.length > 0 ? marker.userId : null;
  } catch {
    return null;
  }
}

export function clearPasswordRecoveryMarker(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RECOVERY_MARKER_KEY);
  } catch {
    // Ignore storage restrictions; Supabase remains the source of session validity.
  }
}
