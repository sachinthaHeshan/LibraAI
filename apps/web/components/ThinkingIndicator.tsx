"use client";

import { useEffect, useState } from "react";

export function formatThinkingElapsed(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 16 16">
      <path
        d="M8 1.2 9.1 6.1 14 7.2 9.1 8.3 8 13.2 6.9 8.3 2 7.2 6.9 6.1 8 1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ThinkingIndicator({ compact = false }: { compact?: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed =
    elapsedMs >= 1000 ? formatThinkingElapsed(elapsedMs) : null;

  return (
    <div
      aria-label={elapsed ? `Thinking, ${elapsed}` : "Thinking"}
      className={`thinking-indicator ${compact ? "thinking-indicator-compact" : ""}`}
      role="status"
    >
      <span aria-hidden className="thinking-orbs">
        <span className="thinking-orb thinking-orb-a" />
        <span className="thinking-orb thinking-orb-b" />
        <span className="thinking-orb thinking-orb-c" />
        <Sparkle className="thinking-sparkle thinking-sparkle-a" />
        <Sparkle className="thinking-sparkle thinking-sparkle-b" />
        <Sparkle className="thinking-sparkle thinking-sparkle-c" />
      </span>
      <span className="thinking-copy">
        <span className="thinking-word">Thinking</span>
        <span aria-hidden className="thinking-ellipsis">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
      {elapsed ? <span className="thinking-elapsed">{elapsed}</span> : null}
    </div>
  );
}
