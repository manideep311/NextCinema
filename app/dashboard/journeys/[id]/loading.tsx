/** Mirrors JourneyHero + the poster track, so the journey slots in without a layout jump. */
export default function JourneyLoading() {
  return (
    <div aria-busy="true" aria-label="Loading journey">
      <div className="h-3 w-40 bg-surface rounded animate-pulse mb-2" />
      <div className="h-3 w-20 bg-surface/70 rounded animate-pulse mb-8" />
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-32 md:w-40 aspect-[2/3] shrink-0 rounded-lg bg-surface ring-1 ring-white/[0.06] animate-pulse" />
        <div className="space-y-3 flex-1">
          <div className="h-3 w-28 bg-surface/70 rounded animate-pulse" />
          <div className="h-9 w-2/3 bg-surface rounded animate-pulse" />
          <div className="h-4 w-1/4 bg-surface/70 rounded animate-pulse" />
          <div className="h-10 w-32 bg-surface rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="mt-10 mb-6 h-14 glass rounded-xl animate-pulse" />
      <div className="flex gap-4 overflow-hidden pb-6 pt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-[152px] aspect-[2/3] shrink-0 rounded-lg bg-surface ring-1 ring-white/[0.06] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
