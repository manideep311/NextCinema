"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useEyeTracking } from "@/hooks/use-eye-tracking";

interface MascotAvatarProps {
  /** True while the holographic panel is open — brightens the core/eyes and stops idle wandering so it visibly "pays attention." */
  isActive: boolean;
  /** True while the assistant is "thinking" (a request is in flight) — faster core pulse, eyes look up. */
  isThinking: boolean;
}

const BLINK_INTERVAL_MS = 4200;
const BLINK_DURATION_MS = 140;

/**
 * A small original armored companion, built entirely from SVG + Framer
 * Motion (no 3D asset pipeline available here) — brushed-metal capsule
 * body, a pulsing cyan chest core, glowing cursor-tracking eyes, shoulder
 * lights, and a flickering jet stabilizer underneath.
 */
export function MascotAvatar({ isActive, isThinking }: MascotAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eyeOffset = useEyeTracking(containerRef);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), BLINK_DURATION_MS);
    }, BLINK_INTERVAL_MS + Math.random() * 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="relative w-16 h-20 select-none pointer-events-none">
      {/* Idle float + gentle sway — pauses while the panel is open so it reads as "attentive" rather than distracted */}
      <motion.div
        animate={
          isActive
            ? { y: 0, rotate: 0 }
            : { y: [0, -5, 0], rotate: [-2, 2, -2] }
        }
        transition={
          isActive
            ? { duration: 0.3 }
            : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
        }
        className="w-full h-full"
      >
        <svg viewBox="0 0 64 80" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="mascot-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id="mascot-core" x1="0.5" y1="0.5" r="0.5">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="60%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mascot-jet" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Jet stabilizer flame */}
          <motion.ellipse
            cx="32"
            cy="74"
            rx="7"
            ry="8"
            fill="url(#mascot-jet)"
            animate={{ scaleY: [0.8, 1.15, 0.8], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "32px 68px" }}
          />

          {/* Shoulder lights */}
          <motion.circle
            cx="12" cy="42" r="2"
            fill="#06B6D4"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          <motion.circle
            cx="52" cy="42" r="2"
            fill="#06B6D4"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
          />

          {/* Body */}
          <rect x="14" y="30" width="36" height="34" rx="14" fill="url(#mascot-metal)" stroke="#1e293b" strokeWidth="1" />
          {/* Arm stubs */}
          <rect x="6" y="36" width="9" height="16" rx="4.5" fill="url(#mascot-metal)" stroke="#1e293b" strokeWidth="1" />
          <rect x="49" y="36" width="9" height="16" rx="4.5" fill="url(#mascot-metal)" stroke="#1e293b" strokeWidth="1" />

          {/* Chest core */}
          <motion.circle
            cx="32" cy="46" r="8"
            fill="url(#mascot-core)"
            animate={{
              scale: isThinking ? [1, 1.25, 1] : [1, 1.08, 1],
              opacity: [0.75, 1, 0.75],
            }}
            transition={{ duration: isThinking ? 0.6 : 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "32px 46px" }}
          />
          <circle cx="32" cy="46" r="3.5" fill="#ecfeff" />

          {/* Head */}
          <rect x="18" y="6" width="28" height="26" rx="12" fill="url(#mascot-metal)" stroke="#1e293b" strokeWidth="1" />
          {/* Visor */}
          <rect x="21" y="14" width="22" height="11" rx="5.5" fill="#0f172a" />

          {/* Eyes — nudged by cursor offset, squashed on blink */}
          <motion.ellipse
            cx={27 + eyeOffset.x}
            cy={isThinking ? 17 : 19.5 + eyeOffset.y}
            rx="2.6"
            ry={isBlinking ? 0.3 : 2.2}
            fill="#67e8f9"
          />
          <motion.ellipse
            cx={37 + eyeOffset.x}
            cy={isThinking ? 17 : 19.5 + eyeOffset.y}
            rx="2.6"
            ry={isBlinking ? 0.3 : 2.2}
            fill="#67e8f9"
          />
        </svg>
      </motion.div>

      {/* Attention ring while the panel is open */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0.5, 0.15, 0.5], scale: [1, 1.15, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 24px 4px rgba(6,182,212,0.35)" }}
        />
      )}
    </div>
  );
}
