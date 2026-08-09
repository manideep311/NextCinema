"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { JourneyOrderType } from "@/types/journey";

export const ORDER_LABELS: Record<JourneyOrderType, { label: string; description: string }> = {
  release: {
    label: "Release Order",
    description: "Best for experiencing the story as audiences originally did.",
  },
  chronological: {
    label: "Chronological",
    description: "Follow the story timeline.",
  },
  essential: {
    label: "Essential",
    description: "Skip the optional entries and follow the main story.",
  },
};

interface JourneyOrderSelectorProps {
  journeyId: string;
  orders: JourneyOrderType[];
  selected: JourneyOrderType;
}

/**
 * Only rendered by the page when a journey actually supports more than
 * one order — a journey with a single supported order just shows its
 * timeline directly, per the "don't invent orders" rule. Plain links
 * (not client state) so the order lives in the URL and the page's own
 * server-side data fetch just re-resolves for the new order.
 */
export function JourneyOrderSelector({ journeyId, orders, selected }: JourneyOrderSelectorProps) {
  if (orders.length <= 1) return null;

  const active = ORDER_LABELS[selected];

  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-[0.15em] text-muted mb-2.5">Choose your watch order</p>
      <div role="tablist" aria-label="Watch order" className="inline-flex flex-wrap gap-1 rounded-lg bg-white/[0.03] p-1">
        {orders.map((order) => {
          const isActive = order === selected;
          const { label } = ORDER_LABELS[order];
          return (
            <Link
              key={order}
              href={`/dashboard/journeys/${journeyId}?order=${order}`}
              role="tab"
              aria-selected={isActive}
              scroll={false}
              className="relative px-3.5 py-2 rounded-md text-sm transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="journey-order-bg"
                  className="absolute inset-0 rounded-md bg-primary/15"
                  transition={{ duration: 0.25 }}
                />
              )}
              <span className={`relative z-10 font-medium ${isActive ? "text-primary" : "text-muted hover:text-text transition-colors"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-2.5">{active.description}</p>
    </div>
  );
}
