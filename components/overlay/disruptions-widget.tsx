"use client";

import { AlertCircle } from "lucide-react";
import { useMemo } from "react";

import { ModuleShell } from "@/components/overlay/module-shell";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { DisruptionsData, SourceResponse, TrainBoardData, TrainItem } from "@/lib/types/liveboard";

interface DisruptionsWidgetProps {
  dictionary: Dictionary;
  source: SourceResponse<DisruptionsData> | null;
  departuresSource: SourceResponse<TrainBoardData> | null;
  arrivalsSource: SourceResponse<TrainBoardData> | null;
  departuresMaxItems: number;
  arrivalsMaxItems: number;
  safeMode?: boolean;
  compact?: boolean;
  maxLines?: number;
}

function renderMessage(
  source: SourceResponse<DisruptionsData> | null,
  departuresSource: SourceResponse<TrainBoardData> | null,
  arrivalsSource: SourceResponse<TrainBoardData> | null,
  dictionary: Dictionary,
  safeMode: boolean,
) {
  if (!source && !departuresSource && !arrivalsSource) {
    return dictionary.labels.unavailable;
  }

  if (source?.requiresConfig || departuresSource?.requiresConfig || arrivalsSource?.requiresConfig) {
    return dictionary.labels.configRequired;
  }

  if (safeMode) {
    return dictionary.labels.unavailable;
  }

  return source?.message ?? dictionary.labels.unavailable;
}

function normalizeTrainKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeTextKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

function fallbackReasonForTrain(item: TrainItem): string | undefined {
  if (typeof item.delayMinutes === "number" && item.delayMinutes > 0) {
    return `+${item.delayMinutes} min`;
  }

  const candidate = item.additionalInfo?.find((entry) => entry.trim().length > 0);
  return candidate?.trim();
}

function collectDelayedBoardTrains(
  departuresSource: SourceResponse<TrainBoardData> | null,
  arrivalsSource: SourceResponse<TrainBoardData> | null,
  departuresMaxItems: number,
  arrivalsMaxItems: number,
): Array<{ train: string; displayTime: string; fallbackReason?: string }> {
  const allItems = [
    ...(departuresSource?.data?.items.slice(0, departuresMaxItems) ?? []),
    ...(arrivalsSource?.data?.items.slice(0, arrivalsMaxItems) ?? []),
  ];

  const delayed = allItems.filter((item) => item.status === "DELAYED");
  const unique = new Map<string, { train: string; displayTime: string; fallbackReason?: string }>();

  for (const item of delayed) {
    const train = item.trainNumber?.trim() || item.lineCode?.trim();
    if (!train) {
      continue;
    }

    const key = [
      normalizeTrainKey(train),
      item.displayTime.trim(),
      normalizeTextKey(item.endpoint),
    ].join("|");
    const fallbackReason = fallbackReasonForTrain(item);

    if (!unique.has(key)) {
      unique.set(key, { train, displayTime: item.displayTime, fallbackReason });
      continue;
    }

    const current = unique.get(key);
    if (current && !current.fallbackReason && fallbackReason) {
      unique.set(key, { ...current, fallbackReason });
    }
  }

  return Array.from(unique.values());
}

function buildReasonByTrain(
  source: SourceResponse<DisruptionsData> | null,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!source?.data?.items?.length) {
    return map;
  }

  for (const disruption of source.data.items) {
    const reason = disruption.reasons?.[0] ?? disruption.reason ?? disruption.title;
    if (!reason) {
      continue;
    }

    for (const rawTrain of disruption.trainNumbers ?? []) {
      const train = rawTrain.trim();
      if (!train) {
        continue;
      }

      const key = normalizeTrainKey(train);
      if (!map.has(key)) {
        map.set(key, reason);
      }
    }
  }

  return map;
}

export function DisruptionsWidget({
  dictionary,
  source,
  departuresSource,
  arrivalsSource,
  departuresMaxItems,
  arrivalsMaxItems,
  safeMode = false,
  compact = false,
  maxLines = 9,
}: DisruptionsWidgetProps) {
  const delayedTrains = useMemo(
    () =>
      collectDelayedBoardTrains(
        departuresSource,
        arrivalsSource,
        departuresMaxItems,
        arrivalsMaxItems,
      ),
    [departuresSource, arrivalsSource, departuresMaxItems, arrivalsMaxItems],
  );

  const reasonByTrain = useMemo(() => buildReasonByTrain(source), [source]);
  const trainLines = delayedTrains.map((entry) => {
    const reason =
      reasonByTrain.get(normalizeTrainKey(entry.train)) ??
      entry.fallbackReason ??
      dictionary.labels.reasonUnknown;
    return { train: entry.train, displayTime: entry.displayTime, reason };
  });
  const visibleLines = trainLines.slice(0, maxLines);
  const hiddenCount = Math.max(trainLines.length - visibleLines.length, 0);
  const boardIsUnavailable = !departuresSource?.data && !arrivalsSource?.data;

  return (
    <ModuleShell
      title={dictionary.labels.disruptions}
      className="h-full"
      contentClassName={compact ? "h-full min-h-0 pb-1" : "h-full min-h-0"}
      rightSlot={<span className="text-xs text-slate-300">{source?.source ?? "IDFM"}</span>}
    >
      {(safeMode || boardIsUnavailable) && (
        <p className="flex items-center gap-2 text-base text-slate-200/90">
          <AlertCircle className="h-6 w-6" />
          {renderMessage(source, departuresSource, arrivalsSource, dictionary, safeMode)}
        </p>
      )}

      {!safeMode && !boardIsUnavailable && (
        <ul className={`${compact ? "space-y-1" : "space-y-1.5"} h-full`}>
          {visibleLines.map((line, index) => (
            <li
              key={`${line.train}-${line.displayTime}-${index}`}
              className="rounded-lg border border-slate-200/10 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
            >
              <span className="font-semibold">{dictionary.labels.train} : </span>
              {line.train}
              <span className="ml-1 text-slate-300">({line.displayTime})</span>
              <span className="ml-2 font-semibold">{dictionary.labels.reason} : </span>
              <span className="text-amber-100">{line.reason}</span>
            </li>
          ))}
          {visibleLines.length === 0 && (
            <li className="text-sm text-slate-300">{dictionary.labels.noDelayedTrains}</li>
          )}
          {hiddenCount > 0 && (
            <li className="text-[11px] text-slate-400">+{hiddenCount} autres trains en retard</li>
          )}
        </ul>
      )}
    </ModuleShell>
  );
}
