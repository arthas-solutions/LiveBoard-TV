"use client";

import { AlertTriangle, CheckCircle2, TrainFront } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ModuleShell } from "@/components/overlay/module-shell";
import { StatusBadge } from "@/components/overlay/status-badge";
import { Separator } from "@/components/ui/separator";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SourceResponse, TrainBoardData, TrainItem } from "@/lib/types/liveboard";

interface TrainsWidgetProps {
  dictionary: Dictionary;
  source: SourceResponse<TrainBoardData> | null;
  title: string;
  endpointLabel: string;
  safeMode?: boolean;
  compact?: boolean;
  maxItems?: number;
}

interface EndpointTextProps {
  value: string;
  className: string;
}

function renderMessage(
  source: SourceResponse<TrainBoardData> | null,
  dictionary: Dictionary,
  safeMode: boolean,
): string {
  if (!source) {
    return dictionary.labels.unavailable;
  }

  if (source.requiresConfig) {
    return dictionary.labels.configRequired;
  }

  if (safeMode) {
    return dictionary.labels.unavailable;
  }

  return source.message ?? dictionary.labels.unavailable;
}

function EndpointText({ value, className }: EndpointTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) {
      return;
    }

    const evaluateOverflow = () => {
      setShouldMarquee(measure.scrollWidth > container.clientWidth + 8);
    };

    evaluateOverflow();
    window.setTimeout(evaluateOverflow, 0);

    if (typeof document !== "undefined" && "fonts" in document) {
      const fonts = document.fonts;
      void fonts.ready.then(() => evaluateOverflow());
    }

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => evaluateOverflow());
      observer.observe(container);
      observer.observe(measure);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", evaluateOverflow);
    return () => window.removeEventListener("resize", evaluateOverflow);
  }, [value]);

  return (
    <span ref={containerRef} className={`${className} relative`}>
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 invisible whitespace-nowrap"
      >
        {value}
      </span>
      {shouldMarquee ? (
        <span className="train-line-marquee">
          <span>{value}</span>
          <span aria-hidden="true">{value}</span>
        </span>
      ) : (
        <span className="block truncate">{value}</span>
      )}
    </span>
  );
}

function normalizeForDisplay(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueDisplayParts(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = normalizeForDisplay(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    output.push(value);
    seen.add(normalized);
  }
  return output;
}

function buildEndpointValue(item: TrainItem): string {
  const detailParts = uniqueDisplayParts(
    [
      item.endpoint,
      item.lineName,
      item.commercialMode,
      item.network,
      item.physicalMode,
      item.dataFreshness,
      ...(item.additionalInfo ?? []),
    ].filter((entry): entry is string => Boolean(entry && entry.trim().length > 0)),
  );

  return detailParts.length > 0 ? detailParts.join(" • ") : item.endpoint;
}

export function TrainsWidget({
  dictionary,
  source,
  title,
  endpointLabel,
  safeMode = false,
  compact = false,
  maxItems,
}: TrainsWidgetProps) {
  const board = source?.data;
  const hasData = Boolean(board && source?.ok);
  const visibleItems = board ? board.items.slice(0, maxItems ?? board.items.length) : [];
  const detailTextClass = compact ? "text-base" : "text-lg";
  const endpointShortLabel =
    endpointLabel === dictionary.labels.to
      ? "Dest."
      : endpointLabel === dictionary.labels.from
        ? "Prov."
        : endpointLabel;

  return (
    <ModuleShell
      title={title}
      className="h-full"
      contentClassName="h-full min-h-0"
      rightSlot={<span className="text-xs text-slate-300">{source?.source ?? "SNCF"}</span>}
    >
      {!hasData && (
        <p className="text-base text-slate-200/90">{renderMessage(source, dictionary, safeMode)}</p>
      )}

      {hasData && board && (
        <div className="h-full space-y-1">
          {visibleItems.map((item, index) => {
            return (
              <div key={item.id}>
                <div className="flex min-w-0 items-center gap-2 py-0.5 whitespace-nowrap">
                  <span
                    className={`${compact ? "text-lg" : "text-xl"} shrink-0 font-semibold text-white tabular-nums`}
                  >
                    {item.displayTime}
                  </span>
                  <TrainFront className="h-6 w-6 shrink-0 text-slate-300" />
                  <span className={`${detailTextClass} shrink-0 text-slate-300`}>
                    {endpointShortLabel}:
                  </span>
                  <EndpointText
                    value={buildEndpointValue(item)}
                    className={`${detailTextClass} min-w-0 flex-1 overflow-hidden text-slate-100`}
                  />
                  {item.trainNumber && (
                    <span className={`${detailTextClass} shrink-0 text-slate-300`}>
                      {dictionary.labels.train}: {item.trainNumber}
                    </span>
                  )}
                  <span className={`${detailTextClass} shrink-0 text-slate-300`}>
                    {dictionary.labels.platform}: {item.platform ?? "-"}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <StatusBadge
                      status={item.status}
                      dictionary={dictionary}
                      delayMinutes={item.delayMinutes}
                    />
                  </div>
                </div>
                {index < visibleItems.length - 1 && <Separator className="bg-slate-800" />}
              </div>
            );
          })}
          <div className="flex items-center gap-4 pt-0.5 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {dictionary.status.ON_TIME}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              {dictionary.status.DELAYED}
            </span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
