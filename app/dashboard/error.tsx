"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Dashboard error boundary — same dashed-border empty-state look the app
 * already uses. In production `error.message` is a generic string (Next
 * never forwards server error details to the browser), so nothing
 * sensitive can leak through here.
 */
export default function DashboardError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="border border-dashed border-white/10 rounded-lg py-14 px-6 flex flex-col items-center text-center">
      <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-5 text-primary" strokeWidth={1.5} />
      </div>
      <h2 className="font-serif text-base mb-1">Something didn&apos;t load</h2>
      <p className="text-muted text-sm max-w-xs mb-4">
        A movie data request failed or timed out. It&apos;s usually temporary.
      </p>
      <button onClick={() => unstable_retry()} className="text-sm font-medium text-primary hover:underline">
        Try again
      </button>
    </div>
  );
}
