"use client";

import { cn } from "@/lib/utils";

interface MarqueeTickerProps {
  text: string;
  className?: string;
  compact?: boolean;
}

export function MarqueeTicker({ text, className, compact = false }: MarqueeTickerProps) {
  const value = text.trim().length > 0 ? text : "Aucune annonce.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200/10 bg-slate-900/85",
        compact ? "py-2" : "py-3",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-slate-950 to-transparent" />
      <div
        className={cn(
          "marquee-track font-medium tracking-wide whitespace-nowrap text-slate-100",
          compact ? "text-base" : "text-lg",
        )}
      >
        <span className="mx-6">{value}</span>
        <span className="mx-6">{value}</span>
      </div>
    </div>
  );
}
