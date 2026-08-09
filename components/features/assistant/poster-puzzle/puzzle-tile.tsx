"use client";

import { motion } from "framer-motion";

interface PuzzleTileProps {
  home: number;
  size: number;
  posterUrl: string;
  isBlank: boolean;
  isHintFrom: boolean;
  isHintTo: boolean;
  disabled: boolean;
  reducedMotion: boolean;
  row: number;
  col: number;
  onClick: () => void;
}

/**
 * A single puzzle piece. Identity (`key`, supplied by the parent) is the
 * tile's *home* index, not its current slot — that's what lets Framer
 * Motion's `layout` prop animate the FLIP transition automatically when
 * the board re-renders tiles in a new order after a move.
 */
export function PuzzleTile({
  size,
  posterUrl,
  isBlank,
  isHintFrom,
  isHintTo,
  disabled,
  reducedMotion,
  row,
  col,
  onClick,
}: PuzzleTileProps) {
  if (isBlank) {
    return <div aria-hidden="true" className="bg-black/50 rounded-[3px]" />;
  }

  const step = size > 1 ? 100 / (size - 1) : 0;

  return (
    <motion.button
      layout
      transition={reducedMotion ? { duration: 0 } : { type: "tween", duration: 0.18, ease: "easeOut" }}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Puzzle piece, row ${row + 1} column ${col + 1} of the completed image`}
      className={`relative rounded-[3px] overflow-hidden bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default ${
        !disabled ? "cursor-pointer hover:brightness-110" : ""
      }`}
      style={{
        backgroundImage: `url(${posterUrl})`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${col * step}% ${row * step}%`,
      }}
    >
      {(isHintFrom || isHintTo) && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 ring-2 ring-inset ring-primary"
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
}
