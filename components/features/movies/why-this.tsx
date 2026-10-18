import type { SignalExplanation } from "@/types/movie";

export interface MatchExplanation {
  /** Title of the movie this pick was scored against. */
  comparedWith: string;
  signals: SignalExplanation[];
}

const SIGNAL_LABELS: Record<SignalExplanation["signal"], string> = {
  genre: "Genres",
  keyword: "Keywords",
  cast: "Cast",
  director: "Director",
  rating: "Similar rating",
  popularity: "Similar popularity",
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * The "Why this?" breakdown behind a match score: one bar per signal
 * showing how similar the two movies are on it, next to that signal's
 * weight. Signals with no data on either side are shown as such — their
 * weight is spread over the rest. Built on <details>, so it needs no
 * client JavaScript and works with the keyboard out of the box.
 */
export function WhyThis({ explanation, score }: { explanation: MatchExplanation; score: number }) {
  const applicableWeight = explanation.signals.reduce((sum, s) => sum + (s.applicable ? s.weight : 0), 0);

  return (
    <details className="group/why mt-1.5 text-xs">
      <summary className="cursor-pointer list-none text-muted hover:text-text transition-colors select-none [&::-webkit-details-marker]:hidden">
        <span className="underline decoration-dotted underline-offset-2">Why this?</span>
      </summary>
      <div className="mt-2 rounded-md border border-white/[0.08] bg-surface/80 p-2.5 space-y-2">
        <p className="text-muted leading-snug">
          Compared with <span className="text-text">{explanation.comparedWith}</span>
        </p>
        <ul className="space-y-1.5">
          {explanation.signals.map((signal) => (
            <li key={signal.signal}>
              <div className="flex items-baseline justify-between gap-1.5">
                <span className={signal.applicable ? "text-text" : "text-muted"}>
                  {SIGNAL_LABELS[signal.signal]} <span className="text-muted tabular-nums">×{percent(signal.weight)}</span>
                </span>
                <span className="text-muted tabular-nums shrink-0">{signal.applicable ? percent(signal.similarity) : "no data"}</span>
              </div>
              <div className="h-1 mt-0.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                {signal.applicable && (
                  <div className="h-full rounded-full bg-primary" style={{ width: percent(signal.similarity) }} />
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-muted leading-snug">
          Bars show similarity; ×n% is each signal&apos;s weight. {score}% match is the weighted average of the{" "}
          {applicableWeight < 0.999 ? `signals with data (${percent(applicableWeight)} of the total weight)` : "signals above"}.
        </p>
      </div>
    </details>
  );
}
