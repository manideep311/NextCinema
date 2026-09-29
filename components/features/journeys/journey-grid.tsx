"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { JourneyCardPreview } from "@/services/journeys";
import { JourneyCard } from "@/components/features/journeys/journey-card";
import { fadeInUp, EASE_OUT } from "@/components/motion/motion-config";

interface JourneyGridProps {
  journeys: JourneyCardPreview[];
}

/** Cards stagger in 50ms apart, but only the first dozen: with a catalog of
 *  hundreds, an uncapped stagger would leave cards far down the page
 *  invisible for many seconds. The first screen looks exactly the same. */
const STAGGER_SECONDS = 0.05;
const MAX_STAGGERED = 12;

export function JourneyGrid({ journeys }: JourneyGridProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {journeys.map((journey, index) => (
        <motion.div
          key={journey.id}
          variants={reducedMotion ? undefined : fadeInUp}
          initial={reducedMotion ? undefined : "hidden"}
          animate={reducedMotion ? undefined : "visible"}
          transition={{ duration: 0.25, ease: EASE_OUT, delay: Math.min(index, MAX_STAGGERED) * STAGGER_SECONDS }}
        >
          <JourneyCard journey={journey} />
        </motion.div>
      ))}
    </div>
  );
}
