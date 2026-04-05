"use client";

import { Check, Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PartsProgressItem } from "@/lib/parts/aggregate";

type Props = {
  items: PartsProgressItem[];
  hasData: boolean;
  className?: string;
};

export function PartsUsageTracker({ items, hasData, className }: Props) {
  return (
    <Card
      className={cn(
        "border-border/70 shadow-md shadow-black/[0.03] dark:shadow-black/20",
        className,
      )}
    >
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Package className="size-4 text-teal-700 dark:text-teal-400" aria-hidden />
          Parts usage
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!hasData ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No parts usage data available for this manual yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((row) => {
              const done = row.remaining === 0 && row.totalRequired > 0;
              return (
                <li
                  key={row.partCode}
                  className={cn(
                    "rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-colors",
                    done
                      ? "border-emerald-700/25 bg-emerald-50/60 text-muted-foreground dark:border-emerald-500/30 dark:bg-emerald-950/30"
                      : "bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        <span className="font-mono text-teal-800 dark:text-teal-300">
                          {row.partCode}
                        </span>
                        {row.partName ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {row.partName}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {row.usedSoFar} / {row.totalRequired} used
                        {row.totalRequired > 0 ? (
                          <span> · {row.remaining} remaining</span>
                        ) : null}
                      </p>
                    </div>
                    {done ? (
                      <Check
                        className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                        aria-label="All used"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
