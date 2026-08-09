"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface MascotAvatarProps {
  /** True while the panel is open — swaps the icon tone so the trigger visibly acknowledges it. */
  isActive: boolean;
  /** True while a request is in flight — drives a slow, subtle pulse instead of any dramatic motion. */
  isThinking: boolean;
}

/**
 * Bujji's trigger button. Deliberately understated — a small circular
 * control, not a mascot character or a glowing sci-fi robot. The product's
 * intelligence should be invisible; this is just a quiet door into an
 * optional helpful panel, not a visual centerpiece.
 */
export function MascotAvatar({ isActive, isThinking }: MascotAvatarProps) {
  return (
    <div className="relative size-13 flex items-center justify-center">
      {isThinking && (
        <motion.span
          className="absolute inset-0 rounded-full border border-primary/40"
          animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      <div
        className={`relative size-12 rounded-full glass shadow-lg flex items-center justify-center transition-colors ${
          isActive ? "border-primary/50" : ""
        }`}
        style={isActive ? { borderColor: "var(--color-primary)" } : undefined}
      >
        <Bot className={`size-5 transition-colors ${isActive ? "text-primary" : "text-text"}`} strokeWidth={1.75} />
      </div>
    </div>
  );
}