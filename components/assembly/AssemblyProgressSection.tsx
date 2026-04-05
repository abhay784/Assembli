"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PartsUsageTracker } from "@/components/parts/PartsUsageTracker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  computePartsProgress,
  hasAnyPartsUsage,
} from "@/lib/parts/aggregate";
import type { SceneJSON } from "@/lib/scene/schema";
import { cn } from "@/lib/utils";

const storageKey = (jobId: string) =>
  `assembli.stepCompletion.v1:${jobId}`;

function loadCompleted(jobId: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((n): n is number => typeof n === "number" && n >= 0),
    );
  } catch {
    return new Set();
  }
}

function saveCompleted(jobId: string, set: Set<number>) {
  localStorage.setItem(
    storageKey(jobId),
    JSON.stringify([...set].sort((a, b) => a - b)),
  );
}

type Props = {
  jobId: string;
  /** When set (e.g. dev demo), skips GET /api/jobs/.../scene and uses this scene. */
  initialScene?: SceneJSON;
};

export function AssemblyProgressSection({
  jobId,
  initialScene,
}: Props) {
  const [scene, setScene] = useState<SceneJSON | null>(initialScene ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !initialScene);
  const [completed, setCompleted] = useState<Set<number>>(() =>
    loadCompleted(jobId),
  );

  useEffect(() => {
    setCompleted(loadCompleted(jobId));
  }, [jobId]);

  useEffect(() => {
    if (initialScene) {
      setScene(initialScene);
      setLoadError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/scene`);
        const body = (await res.json()) as SceneJSON | { error?: string };
        if (!res.ok) {
          const msg =
            "error" in body && typeof body.error === "string"
              ? body.error
              : "Could not load scene.";
          if (!cancelled) setLoadError(msg);
          return;
        }
        if (!cancelled) setScene(body as SceneJSON);
      } catch {
        if (!cancelled) setLoadError("Could not load scene.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, initialScene]);

  const toggleStep = useCallback(
    (index: number, completedFlag: boolean) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (completedFlag) next.add(index);
        else next.delete(index);
        saveCompleted(jobId, next);
        return next;
      });
    },
    [jobId],
  );

  const progressItems = useMemo(() => {
    if (!scene) return [];
    return computePartsProgress(scene.steps, completed);
  }, [scene, completed]);

  const partsData = scene ? hasAnyPartsUsage(scene.steps) : false;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading assembly steps…
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Scene unavailable</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (!scene) return null;

  const stepCount = scene.steps.length;

  return (
    <div
      className={cn(
        "flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10",
      )}
    >
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            Assembly steps
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark a step complete when you finish it. Parts usage updates only
            from these actions—not from watching preview or video.
          </p>
        </div>
        <ol className="space-y-3">
          {scene.steps.map((step, index) => {
            const isDone = completed.has(index);
            const n = index + 1;
            return (
              <li key={`${jobId}-step-${index}`}>
                <Card
                  className={cn(
                    "overflow-hidden border-border/70 transition-colors",
                    isDone && "border-emerald-700/30 bg-emerald-50/40 dark:bg-emerald-950/25",
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base font-semibold leading-snug">
                          Step {n} of {stepCount}
                          <span className="font-normal text-muted-foreground">
                            {": "}
                            {step.title}
                          </span>
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {step.caption}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {isDone ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStep(index, false)}
                          >
                            Undo
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                            onClick={() => toggleStep(index, true)}
                          >
                            Mark complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-80">
        <PartsUsageTracker
          items={progressItems}
          hasData={partsData}
        />
      </aside>
    </div>
  );
}
