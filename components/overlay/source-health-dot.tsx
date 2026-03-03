"use client";

import { cn } from "@/lib/utils";
import type { HealthState } from "@/lib/types/liveboard";

const healthDotStyles: Record<HealthState, string> = {
  ok: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-rose-500",
  config: "bg-slate-400",
};

interface SourceHealthDotProps {
  state?: HealthState;
  label: string;
}

export function SourceHealthDot({ state = "down", label }: SourceHealthDotProps) {
  return (
    <span
      className="inline-flex items-center gap-2 text-sm text-slate-200/90"
      title={`${label}: ${state}`}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full", healthDotStyles[state])} />
      {label}
    </span>
  );
}
