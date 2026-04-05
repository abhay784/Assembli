"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, Wrench, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import type { SceneJSON } from "@/lib/scene/schema";
import {
  aggregateParts,
  aggregateTools,
} from "@/lib/scene/aggregate-assembly-lists";
const STATUS_COPY = {
  queued: "Queued — waiting for the worker to start…",
  processing:
    "Processing — extracting steps, generating audio, and rendering video…",
  completed: "Ready — your assembly workspace is below.",
  failed: "Processing failed.",
} as const;

type JobStatus = "queued" | "processing" | "completed" | "failed";

export function AssemblyWorkspace({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneJSON | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [partCounts, setPartCounts] = useState<Record<string, number>>({});
  const videoUrlFetchedRef = useRef(false);

  const tools = useMemo(() => (scene ? aggregateTools(scene) : []), [scene]);
  const parts = useMemo(() => (scene ? aggregateParts(scene) : []), [scene]);

  useEffect(() => {
    if (!scene || parts.length === 0) return;
    setPartCounts((prev) => {
      const next = { ...prev };
      for (const p of parts) {
        if (next[p.id] === undefined) {
          next[p.id] = p.suggestedQty;
        }
      }
      return next;
    });
  }, [scene, parts]);

  const pollRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setStatus("failed");
              setJobError("Job not found.");
            }
            clearPoll();
            return;
          }
          if (!cancelled) setPollError("Could not load job status.");
          return;
        }
        const body = (await res.json()) as {
          status: JobStatus;
          error: string | null;
        };
        if (cancelled) return;
        setPollError(null);
        setStatus(body.status);
        setJobError(body.error);

        if (body.status === "completed") {
          clearPoll();
          if (!videoUrlFetchedRef.current) {
            videoUrlFetchedRef.current = true;
            void fetch(`/api/jobs/${jobId}/video-url`)
              .then((r) => (r.ok ? r.json() : null))
              .then((data: { url?: string } | null) => {
                if (data?.url && !cancelled) setVideoUrl(data.url);
              })
              .catch(() => {});
          }
        }
        if (body.status === "failed") {
          clearPoll();
        }
      } catch {
        if (!cancelled) setPollError("Could not load job status.");
      }
    };

    void tick();
    pollRef.current = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [jobId, clearPoll]);

  useEffect(() => {
    if (status !== "completed") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/scene`);
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) {
            setSceneError(err.error ?? "Could not load assembly data.");
          }
          return;
        }
        const data = (await res.json()) as { scene: SceneJSON };
        if (!cancelled) {
          setScene(data.scene);
          setSceneError(null);
        }
      } catch {
        if (!cancelled) setSceneError("Could not load assembly data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, jobId]);

  const bumpPart = (id: string, delta: number) => {
    setPartCounts((c) => {
      const row = parts.find((p) => p.id === id);
      const fallback = row?.suggestedQty ?? 1;
      const cur = c[id] ?? fallback;
      const next = Math.max(0, Math.min(999, cur + delta));
      return { ...c, [id]: next };
    });
  };

  return (
    <div className="assembli-backdrop min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 transition-colors hover:text-orange-600"
          >
            <ArrowLeft className="size-4" aria-hidden />
            New upload
          </Link>
          <p className="font-mono text-xs text-slate-500">Job {jobId}</p>
        </div>

        {pollError ? (
          <p className="mb-6 rounded-xl bg-amber-100/90 px-4 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-600/25">
            {pollError}
          </p>
        ) : null}

        {status && status !== "completed" && status !== "failed" ? (
          <div className="mb-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-teal-800/10 bg-white/70 px-6 py-16 text-center shadow-lg backdrop-blur-md">
            <Loader2
              className="size-10 animate-spin text-teal-600"
              aria-hidden
            />
            <p className="max-w-md text-base font-medium text-slate-700">
              {STATUS_COPY[status]}
            </p>
          </div>
        ) : null}

        {status === "failed" && jobError ? (
          <div className="mb-10 rounded-2xl border border-red-200 bg-red-50/90 p-6 shadow-md">
            <p className="font-display text-lg font-semibold text-red-900">
              {STATUS_COPY.failed}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-red-950">
              {jobError}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Try again
            </Link>
          </div>
        ) : null}

        {status === "completed" ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <section className="relative w-full">
              <div className="relative overflow-hidden rounded-3xl border border-teal-900/10 bg-white/80 shadow-[0_24px_80px_-24px_rgba(15,118,110,0.35)] backdrop-blur-md">
                <BorderBeam
                  size={64}
                  duration={12}
                  borderWidth={2}
                  colorFrom="#fb923c"
                  colorTo="#14b8a6"
                />
                <div className="relative z-10 p-4 md:p-6">
                  <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
                    Explainer video
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Tools and parts sit below — use less vertical scrolling.
                  </p>
                  {videoUrl ? (
                    <video
                      controls
                      src={videoUrl}
                      className="mt-4 w-full rounded-2xl border-2 border-teal-200/60 bg-black shadow-[0_12px_40px_-12px_rgba(13,148,136,0.45)] ring-2 ring-orange-200/40"
                      aria-label="Assembly video preview"
                    >
                      Your browser does not support HTML5 video.
                    </video>
                  ) : (
                    <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl bg-slate-900/5 text-sm text-slate-500">
                      <Loader2
                        className="mr-2 size-5 animate-spin text-teal-600"
                        aria-hidden
                      />
                      Loading video…
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-lg backdrop-blur-sm md:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                  <Wrench className="size-4" aria-hidden />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 md:text-lg">
                  Tools you&apos;ll need
                </h3>
              </div>
              {sceneError ? (
                <p className="text-sm text-red-700">{sceneError}</p>
              ) : !scene ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading checklist…
                </p>
              ) : tools.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No tools were called out in the manual — use common sense and
                  the video.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {tools.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-teal-800/15 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-slate-800 md:text-sm"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
                  <Package className="size-4" aria-hidden />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 md:text-lg">
                  Parts inventory
                </h3>
                <span className="text-xs text-slate-500 md:text-sm">
                  Tap ± as you use pieces · at 0 the line strikes through
                </span>
              </div>
              {!scene ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading parts…
                </p>
              ) : parts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  No parts list in this scene.
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {parts.map((p) => {
                    const count = partCounts[p.id] ?? p.suggestedQty;
                    const depleted = count === 0;
                    return (
                      <li
                        key={p.id}
                        className={`flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-2.5 py-2.5 ${
                          depleted ? "border-slate-300/60 bg-slate-100/50" : ""
                        }`}
                      >
                        <span
                          className={`min-w-0 w-full break-words text-left text-xs font-medium leading-snug text-balance md:text-[13px] ${
                            depleted
                              ? "text-slate-500 line-through decoration-2 decoration-slate-500"
                              : "text-slate-800"
                          }`}
                        >
                          {p.label}
                        </span>
                        <div className="flex w-full shrink-0 items-center justify-center gap-0.5 border-t border-slate-200/60 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0 rounded-full border-2 md:size-8"
                            aria-label={`Decrease count for ${p.label}`}
                            onClick={() => bumpPart(p.id, -1)}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span
                            className={`min-w-[1.75rem] text-center font-display text-sm font-bold tabular-nums ${
                              depleted
                                ? "text-slate-500 line-through decoration-2"
                                : "text-slate-900"
                            }`}
                            aria-live="polite"
                            data-testid={`part-count-${p.id}`}
                          >
                            {count}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0 rounded-full border-2 md:size-8"
                            aria-label={`Increase count for ${p.label}`}
                            onClick={() => bumpPart(p.id, 1)}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {status === null && !pollError ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-10 animate-spin text-teal-600" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
