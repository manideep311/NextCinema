"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { JourneyCardPreview } from "@/services/journeys";
import { JourneyCard } from "@/components/features/journeys/journey-card";
import { staggerContainer, fadeInUp, EASE_OUT } from "@/components/motion/motion-config";

interface JourneyGridProps {
  journeys: JourneyCardPreview[];
}

export function JourneyGrid({ journeys }: JourneyGridProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={reducedMotion ? undefined : staggerContainer(50)}
      initial={reducedMotion ? undefined : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      {journeys.map((journey) => (
        <motion.div
          key={journey.id}
          variants={reducedMotion ? undefined : fadeInUp}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          <JourneyCard journey={journey} />
        </motion.div>
      ))}
    </motion.div>
  );
}
