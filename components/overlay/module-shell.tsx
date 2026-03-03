"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModuleShellProps {
  title: string;
  className?: string;
  contentClassName?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function ModuleShell({
  title,
  className,
  contentClassName,
  rightSlot,
  children,
}: ModuleShellProps) {
  return (
    <Card
      className={cn(
        "h-full min-h-0 gap-0 border border-slate-200/10 bg-slate-950/65 py-0 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
    >
      <CardHeader className="px-3 pt-1.5 pb-0.5">
        <CardTitle className="flex items-center justify-between text-base leading-none font-semibold tracking-wide text-slate-100">
          <span>{title}</span>
          {rightSlot}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("px-3 pt-1.5 pb-2.5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
