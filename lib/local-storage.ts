/**
 * Safe read from Local Storage. Returns null during SSR (no window),
 * on missing keys, or on any parse failure — callers always get a
 * clean null rather than a thrown exception to handle.
 */
export function readFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Safe write to Local Storage. Fails silently on quota errors or
 * disabled storage (e.g. private browsing) — the app should degrade
 * gracefully rather than crash over a non-critical persistence failure.
 */
export function writeToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Intentionally silent — see comment above.
  }
}
