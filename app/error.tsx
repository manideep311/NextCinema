"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/** Top-level error boundary (landing/auth pages) — styled like the app's empty states. */
export default function RootError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="border border-dashed border-white/10 rounded-lg py-14 px-6 flex flex-col items-center text-center max-w-md w-full">
        <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <AlertTriangle className="size-5 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-base mb-1">Something went wrong</h1>
        <p className="text-muted text-sm max-w-xs mb-4">This page couldn&apos;t load right now. It&apos;s usually temporary.</p>
        <div className="flex items-center gap-4">
          <button onClick={() => unstable_retry()} className="text-sm font-medium text-primary hover:underline">
            Try again
          </button>
          <Link href="/" className="text-sm text-muted hover:text-text">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
