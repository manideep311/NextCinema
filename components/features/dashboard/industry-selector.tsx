"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PRIMARY_INDUSTRIES, type PrimaryIndustryId } from "@/lib/industries";

interface IndustrySelectorProps {
  active: PrimaryIndustryId;
  onSelect: (id: PrimaryIndustryId) => void;
}

/**
 * Editorial section navigation, not a filter bar — restrained warm-gold
 * underline on the active industry, clean sans-serif with letter-spacing,
 * no pills/buttons/borders. Built as an ARIA tablist (this genuinely does
 * control which panel of content is showing) with full keyboard support:
 * Tab into the group, Left/Right (or Home/End) to move between industries,
 * Enter/Space to activate the focused one.
 */
export function IndustrySelector({ active, onSelect }: IndustrySelectorProps) {
  const reducedMotion = useReducedMotion();
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusIndex(index: number) {
    const clamped = (index + PRIMARY_INDUSTRIES.length) % PRIMARY_INDUSTRIES.length;
    itemRefs.current[clamped]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusIndex(PRIMARY_INDUSTRIES.length - 1);
    }
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase mb-3">Explore</p>
      <div
        role="tablist"
        aria-label="Choose a film industry"
        className="flex items-center gap-6 overflow-x-auto no-scrollbar -mx-1 px-1"
      >
        {PRIMARY_INDUSTRIES.map((industry, index) => {
          const isActive = industry.id === active;
          return (
            <button
              key={industry.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="tab"
              type="button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelect(industry.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="relative shrink-0 pb-2.5 text-sm tracking-[0.06em] uppercase transition-colors duration-200 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className={isActive ? "font-medium text-primary" : "font-normal text-muted hover:text-text"}>
                {industry.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId={reducedMotion ? undefined : "industry-selector-underline"}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 bottom-0 h-px bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
