import * as React from "react";

const CONFETTI_PIECES = [
  // Top left near icon & title
  { x: "6%", y: "14%", w: 14, h: 6, rot: -25, color: "#10B981" },
  { x: "16%", y: "8%", w: 12, h: 5, rot: 35, color: "#F59E0B" },
  { x: "3%", y: "38%", w: 15, h: 6, rot: 15, color: "#FBBF24" },
  // Top center
  { x: "42%", y: "12%", w: 16, h: 6, rot: -38, color: "#059669" },
  { x: "54%", y: "7%", w: 13, h: 5, rot: 22, color: "#34D399" },
  { x: "64%", y: "16%", w: 15, h: 6, rot: -18, color: "#F59E0B" },
  // Right side
  { x: "78%", y: "10%", w: 14, h: 6, rot: 42, color: "#10B981" },
  { x: "92%", y: "18%", w: 12, h: 5, rot: -28, color: "#FBBF24" },
  { x: "93%", y: "46%", w: 15, h: 6, rot: 52, color: "#34D399" },
  { x: "82%", y: "34%", w: 14, h: 6, rot: -28, color: "#10B981" },
  { x: "88%", y: "62%", w: 13, h: 5, rot: -16, color: "#F59E0B" },
  { x: "72%", y: "48%", w: 15, h: 6, rot: 25, color: "#34D399" },
  { x: "66%", y: "28%", w: 12, h: 5, rot: 28, color: "#FB7185" },
  // Left / mid area
  { x: "26%", y: "46%", w: 13, h: 5, rot: -12, color: "#34D399" },
  { x: "10%", y: "65%", w: 14, h: 6, rot: 38, color: "#F59E0B" },
  { x: "46%", y: "52%", w: 12, h: 5, rot: -32, color: "#10B981" },
];

const SPARKLES = [
  { x: "22%", y: "22%", size: 10, color: "#F59E0B" },
  { x: "72%", y: "12%", size: 12, color: "#FBBF24" },
  { x: "88%", y: "32%", size: 10, color: "#10B981" },
  { x: "78%", y: "54%", size: 9, color: "#F59E0B" },
  { x: "36%", y: "40%", size: 9, color: "#34D399" },
];

export function GoalReachedCelebration() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Celebratory background tint / glow */}
      <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-400/20 blur-2xl dark:bg-emerald-500/10" />
      <div className="absolute top-1/2 left-0 h-32 w-32 rounded-full bg-amber-400/15 blur-xl dark:bg-amber-500/10" />

      {/* Confetti rectangles */}
      {CONFETTI_PIECES.map((piece, i) => (
        <span
          key={`confetti-${i}`}
          className="absolute rounded-[2px] opacity-85 shadow-xs"
          style={{
            left: piece.x,
            top: piece.y,
            width: `${piece.w}px`,
            height: `${piece.h}px`,
            transform: `rotate(${piece.rot}deg)`,
            backgroundColor: piece.color,
          }}
        />
      ))}

      {/* Sparkles / star bursts */}
      {SPARKLES.map((sparkle, i) => (
        <svg
          key={`sparkle-${i}`}
          viewBox="0 0 24 24"
          fill={sparkle.color}
          className="absolute opacity-80"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
          }}
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      ))}
    </div>
  );
}
