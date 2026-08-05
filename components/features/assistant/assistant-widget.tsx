"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";

// Code-split, not just conditionally rendered — a plain top-level import
// would still ship the mascot SVG + panel JS to every guest's bundle even
// though `if (!user) return null` below skips rendering them. Dynamic
// import means that chunk is only ever fetched once someone is actually
// signed in.
const MascotAvatar = dynamic(() =>
  import("@/components/features/assistant/mascot-avatar").then((m) => m.MascotAvatar)
);
const AssistantPanel = dynamic(() =>
  import("@/components/features/assistant/assistant-panel").then((m) => m.AssistantPanel)
);

/**
 * The site-wide AI companion — a fixed corner mascot (not a free-roaming
 * physics-driven character; see design notes) that opens a holographic
 * quick-action panel on click. Mounted once in the root layout, but only
 * renders for signed-in users — guests never see it, and never load it.
 */
export function AssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="relative pointer-events-none">
        <AnimatePresence>
          {isOpen && <AssistantPanel onClose={() => setIsOpen(false)} onThinkingChange={setIsThinking} />}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Close NextCinema assistant" : "Open NextCinema assistant"}
          aria-expanded={isOpen}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="pointer-events-auto block rounded-full"
        >
          <MascotAvatar isActive={isOpen} isThinking={isThinking} />
        </motion.button>
      </div>
    </div>
  );
}
