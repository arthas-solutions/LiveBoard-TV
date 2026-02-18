"use client";

import { Quote } from "lucide-react";

import { ModuleShell } from "@/components/overlay/module-shell";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { QuoteData, SourceResponse } from "@/lib/types/liveboard";

interface QuoteWidgetProps {
  dictionary: Dictionary;
  source: SourceResponse<QuoteData> | null;
  safeMode?: boolean;
  compact?: boolean;
}

function renderMessage(
  source: SourceResponse<QuoteData> | null,
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

export function QuoteWidget({
  dictionary,
  source,
  safeMode = false,
  compact = false,
}: QuoteWidgetProps) {
  const hasData = source?.data && source.ok;

  return (
    <ModuleShell
      title={dictionary.labels.quote}
      className="h-full"
      contentClassName={compact ? "h-full min-h-0 pt-2 pb-2.5" : "h-full min-h-0"}
      rightSlot={<span className="text-xs text-slate-300">{source?.source ?? "Wikiquote"}</span>}
    >
      {!hasData && (
        <p className="text-base text-slate-200/90">{renderMessage(source, dictionary, safeMode)}</p>
      )}

      {hasData && source.data && (
        <div className="relative flex h-full min-h-0 flex-col">
          <Quote className="pointer-events-none absolute -top-1 left-0 h-8 w-8 text-cyan-200/25" />
          <div className="flex min-h-0 flex-1 items-center">
            <p
              className={`${compact ? "line-clamp-4 text-base" : "text-lg"} relative z-10 w-full pr-1 pl-6 leading-tight font-medium text-slate-50 italic`}
            >
              {source.data.quote}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-700/70 pt-1.5">
            <p className={`${compact ? "text-xs" : "text-sm"} font-semibold tracking-wide text-slate-200`}>
              {source.data.author}
            </p>
            {source.data.isFallback && !compact && (
              <Badge variant="outline" className="border-amber-400/50 text-amber-100">
                Fallback
              </Badge>
            )}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
