/** Mirrors MovieHero's layout (backdrop band, overlapping poster, title lines) so the page doesn't jump when it arrives. */
export default function MovieLoading() {
  return (
    <div aria-busy="true" aria-label="Loading movie">
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8">
        <div className="h-64 md:h-96 w-full bg-surface animate-pulse" />
        <div className="relative -mt-24 md:-mt-32 px-4 md:px-8 flex flex-col md:flex-row gap-6">
          <div className="w-32 md:w-48 aspect-[2/3] shrink-0 rounded-lg bg-surface-2 ring-1 ring-white/[0.06] animate-pulse" />
          <div className="flex-1 pt-2 md:pt-16 space-y-3">
            <div className="h-9 w-2/3 bg-surface rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-surface/70 rounded animate-pulse" />
            <div className="h-4 w-1/4 bg-surface/70 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 md:px-8 max-w-5xl space-y-3">
        <div className="h-5 w-32 bg-surface rounded animate-pulse" />
        <div className="h-4 w-full max-w-3xl bg-surface/70 rounded animate-pulse" />
        <div className="h-4 w-5/6 max-w-3xl bg-surface/70 rounded animate-pulse" />
      </div>
    </div>
  );
}
