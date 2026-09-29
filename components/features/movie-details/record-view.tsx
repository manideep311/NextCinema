"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Invisible: records a signed-in user's view of a movie ("viewed/opened",
 * for Recently Viewed — not "watched") with a single POST of the movie id.
 * The server resolves the movie itself and throttles repeat views; the ref
 * guard keeps React's dev double-mount from sending it twice. Guests
 * record nothing.
 */
export function RecordView({ movieId }: { movieId: number }) {
  const { user } = useAuth();
  const recordedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || recordedRef.current === movieId) return;
    recordedRef.current = movieId;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [user, movieId]);

  return null;
}
