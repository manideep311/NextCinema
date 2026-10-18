"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** Re-runs the current route's server components — the retry for a server-rendered section that failed to load. */
export function RefreshButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="text-sm font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
    >
      {isPending ? "Retrying…" : label}
    </button>
  );
}
