"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { SourceHealthDot } from "@/components/overlay/source-health-dot";
import liveboardLogo from "@/logo/logo.png";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { HealthState } from "@/lib/types/liveboard";
import { formatClock, formatDate, formatShortTime } from "@/lib/utils/date";

interface HeaderWidgetProps {
  brandTitle: string;
  title: string;
  now: Date;
  updatedAt?: string;
  dictionary: Dictionary;
  locale: string;
  timezone: string;
  sourceHealth: Array<{ label: string; state?: HealthState }>;
  compact?: boolean;
}

export function HeaderWidget({
  brandTitle,
  title,
  now,
  updatedAt,
  dictionary,
  locale,
  timezone,
  sourceHealth,
  compact = false,
}: HeaderWidgetProps) {
  const updatedDate = updatedAt ? new Date(updatedAt) : null;

  return (
    <div
      className={`rounded-2xl border border-slate-200/10 bg-slate-950/65 shadow-[0_10px_35px_rgba(0,0,0,0.42)] backdrop-blur-md ${
        compact ? "px-5 py-3.5" : "px-6 py-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`shrink-0 overflow-hidden rounded-md border border-slate-200/20 bg-slate-900/70 ${
                compact ? "px-2.5 py-2" : "px-3 py-2.5"
              }`}
            >
              <Image
                src={liveboardLogo}
                alt="Logo Liveboard-TV"
                width={compact ? 120 : 170}
                className="h-auto w-auto object-contain"
                priority
              />
            </div>
            <p className="text-sm tracking-[0.14em] text-slate-300/80 uppercase">{brandTitle}</p>
          </div>
          <h1
            className={`${compact ? "mt-1.5 text-3xl" : "mt-2 text-4xl"} font-bold tracking-tight text-white`}
          >
            {title}
          </h1>
        </div>

        <div className="text-right">
          <p
            className={`${compact ? "text-3xl" : "text-4xl"} font-semibold text-white tabular-nums`}
          >
            {formatClock(now, locale, timezone)}
          </p>
          <p
            className={`${compact ? "mt-0.5 text-sm" : "mt-1 text-base"} text-slate-200/90 capitalize`}
          >
            {formatDate(now, locale, timezone)}
          </p>
          <Badge
            className={`border border-cyan-300/40 bg-cyan-500/15 text-cyan-100 ${
              compact ? "mt-2 px-2.5 py-0.5 text-xs" : "mt-3 px-3 py-1 text-sm"
            }`}
          >
            {dictionary.labels.updatedAt}:{" "}
            {updatedDate ? formatShortTime(updatedDate, locale, timezone) : "--:--"}
          </Badge>
        </div>
      </div>

      <div className={`${compact ? "mt-2.5 gap-3" : "mt-4 gap-4"} flex flex-wrap`}>
        {sourceHealth.map((item) => (
          <SourceHealthDot key={item.label} label={item.label} state={item.state} />
        ))}
      </div>
    </div>
  );
}
