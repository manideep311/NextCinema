/** Where a memoized connection attempt lives (module scope in prod, `global` in dev). */
export interface ConnectionSlot<T> {
  current?: Promise<T>;
}

/**
 * Shares one in-flight/established connection across callers, but forgets
 * an attempt that rejects. Without that, one failed connect (a cold
 * Atlas cluster, a DNS blip) would be cached and replayed to every later
 * request until the server restarted.
 */
export function memoizeConnection<T>(slot: ConnectionSlot<T>, connect: () => Promise<T>): Promise<T> {
  if (slot.current) return slot.current;
  const attempt = connect();
  slot.current = attempt;
  attempt.catch(() => {
    // Only clear our own attempt — a newer one may already have replaced it.
    if (slot.current === attempt) slot.current = undefined;
  });
  return attempt;
}
