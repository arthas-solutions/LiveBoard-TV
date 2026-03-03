"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TrainStatus } from "@/lib/types/liveboard";

const statusStyles: Record<TrainStatus, string> = {
  ON_TIME: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
  DELAYED: "bg-amber-500/20 text-amber-200 border-amber-400/50",
  CANCELLED: "bg-rose-500/20 text-rose-200 border-rose-400/50",
};

const statusIcon = {
  ON_TIME: CheckCircle2,
  DELAYED: AlertTriangle,
  CANCELLED: XCircle,
} satisfies Record<TrainStatus, React.ComponentType<{ className?: string }>>;

interface StatusBadgeProps {
  status: TrainStatus;
  dictionary: Dictionary;
  delayMinutes?: number;
}

export function StatusBadge({ status, dictionary, delayMinutes }: StatusBadgeProps) {
  const Icon = statusIcon[status];
  const label =
    status === "DELAYED" && typeof delayMinutes === "number" && delayMinutes > 0
      ? `${dictionary.status[status]} +${delayMinutes} min`
      : dictionary.status[status];
  const delayInline =
    status === "DELAYED" && typeof delayMinutes === "number" && delayMinutes > 0
      ? `+${delayMinutes}m`
      : "";

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[12px]",
        statusStyles[status],
      )}
      title={label}
    >
      <Icon className="h-6 w-6" />
      {delayInline && <span className="font-semibold">{delayInline}</span>}
    </Badge>
  );
}
