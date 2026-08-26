"use client";

import { useEffect, useState } from "react";

const FACTORS: { key: "distance" | "urgency" | "fairness" | "capacity"; label: string }[] = [
  { key: "distance", label: "Distance" },
  { key: "urgency", label: "Urgency" },
  { key: "fairness", label: "Fairness" },
  { key: "capacity", label: "Capacity fit" },
];

export type ScoreBreakdown = {
  distance: number;
  urgency: number;
  fairness: number;
  capacity: number;
};

export function AllocationTrace({
  breakdown,
  score,
  rank,
}: {
  breakdown: ScoreBreakdown;
  score?: number | null;
  rank?: number | null;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-medium text-foreground">Why this ranking</span>
        <span>
          {rank != null ? `Rank #${rank}` : null}
          {rank != null && score != null ? " · " : null}
          {score != null ? `Score ${score.toFixed(2)}` : null}
        </span>
      </div>
      {FACTORS.map(({ key, label }, i) => {
        const value = breakdown[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] ease-out"
                style={{
                  width: animated ? `${Math.round(value * 100)}%` : "0%",
                  transitionDuration: "700ms",
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
            <span className="w-9 shrink-0 text-right tabular-nums">
              {Math.round(value * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
