import { Clapperboard } from "lucide-react";

/**
 * Shared brand mark — clapboard icon + wordmark — reused across the
 * navbar, sidebar, top nav, footer, and auth shell so a rebrand only
 * ever touches this one file. Renders as a fragment (no wrapper element)
 * so it drops into each caller's existing flex container untouched.
 */
export function Logo() {
  return (
    <>
      <Clapperboard className="size-5 text-primary" />
      Next<span className="gradient-text">Cinema</span>
    </>
  );
}
