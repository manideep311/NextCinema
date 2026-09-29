import Link from "next/link";
import { Film } from "lucide-react";

/** 404 — unknown routes, movie ids TMDB doesn't know, and journeys that aren't currently available. */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="border border-dashed border-white/10 rounded-lg py-14 px-6 flex flex-col items-center text-center max-w-md w-full">
        <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Film className="size-5 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="font-serif text-base mb-1">Not found</h1>
        <p className="text-muted text-sm max-w-xs mb-4">That page, movie, or journey doesn&apos;t exist (or isn&apos;t available right now).</p>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
