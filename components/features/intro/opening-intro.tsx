"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Clapperboard } from "lucide-react";
import { INTRO_DURATION_MS } from "@/lib/intro";

// A handful of fixed, deterministic dust motes — restrained on purpose.
const PARTICLES = [
  { x: "18%", y: "38%", d: 60 },
  { x: "29%", y: "63%", d: 240 },
  { x: "44%", y: "30%", d: 140 },
  { x: "58%", y: "70%", d: 320 },
  { x: "71%", y: "35%", d: 200 },
  { x: "83%", y: "58%", d: 100 },
  { x: "9%", y: "72%", d: 380 },
];

const NEXT = "Next".split("");
const CINEMA = "Cinema".split("");

function letterStyle(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}

/**
 * First-visit opening sequence — a short studio-title reveal of the
 * existing NextCinema wordmark (clapperboard + "Next" + gold "Cinema").
 *
 * The whole timeline is CSS keyframes (app/globals.css, `.nc-intro*`), so
 * it starts on the very first paint — before JavaScript loads or React
 * hydrates — and the page underneath is already rendered and hydrating
 * while it plays. This component only (a) removes the overlay from the DOM
 * once the exit fade finishes and (b) lets a click or key press skip it.
 * It's rendered by the root layout only when the session hasn't seen it
 * yet (see proxy.ts), and hidden entirely by CSS for reduced-motion users.
 */
export function OpeningIntro() {
  const [skipping, setSkipping] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion: CSS already hides it, just drop it from the DOM. Otherwise a
    // safety net in case `animationend` fired before hydration (slow devices).
    const timeout = setTimeout(() => setDone(true), reduced ? 0 : INTRO_DURATION_MS + 400);

    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") setSkipping(true);
    };
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (done) return null;

  return (
    <div
      className={`nc-intro${skipping ? " nc-intro--skip" : ""}`}
      aria-hidden="true"
      onPointerDown={() => setSkipping(true)}
      onAnimationEnd={(event) => {
        // Only the overlay's own exit (or skip) fade ends the intro — not child/pseudo-element animations.
        if (event.target === event.currentTarget && (event.animationName === "nc-intro-exit" || event.animationName === "nc-intro-skip")) {
          setDone(true);
        }
      }}
    >
      <div className="nc-intro-strip" />
      {PARTICLES.map((particle) => (
        <span
          key={`${particle.x}-${particle.y}`}
          className="nc-intro-particle"
          style={{ left: particle.x, top: particle.y, "--d": `${particle.d}ms` } as CSSProperties}
        />
      ))}
      <div className="nc-intro-sweep" />

      <div className="nc-intro-stage">
        <span className="nc-intro-line" />
        <p className="nc-intro-word font-serif font-semibold tracking-tight">
          <span className="nc-intro-letter nc-intro-icon" style={letterStyle(0)}>
            <Clapperboard className="text-primary" />
          </span>
          {NEXT.map((letter, index) => (
            <span key={`n${index}`} className="nc-intro-letter" style={letterStyle(index + 1)}>
              {letter}
            </span>
          ))}
          <span className="nc-intro-gold">
            {CINEMA.map((letter, index) => (
              <span key={`c${index}`} className="nc-intro-letter" style={letterStyle(index + 1 + NEXT.length)}>
                {letter}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
