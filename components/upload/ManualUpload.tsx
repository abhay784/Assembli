"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
} from "lucide-react";
import { AssemblyProgressSection } from "@/components/assembly/AssemblyProgressSection";
import { PipelineStatus } from "@/components/pipeline/PipelineStatus";
import { VideoResult } from "@/components/pipeline/VideoResult";
import { MAX_PDF_BYTES } from "@/lib/constants/upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isLikelyPdf } from "./magic-pdf";

type JobStatusPayload = {
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  sceneKey: string | null;
  videoUrl: string | null;
  stages: null;
};

const COPY = {
  primaryCta: "Upload assembly manual",
  primaryUploading: "Uploading…",
  secondary: "Choose PDF from device",
  emptyHeading: "Drop your assembly manual",
  emptyBody:
    "PDF only, up to 25 MB. Drag a file here or use the button below.",
  errWrongType:
    "This file is not a PDF. Choose a `.pdf` assembly manual and try again.",
  errOversize:
    "This PDF is over 25 MB. Use a smaller export or compress the file, then try again.",
  errNotPdf:
    "This file does not look like a valid PDF. It may be mislabeled; export or save as PDF and try again.",
  errPresign:
    "We could not start the upload. Check your connection and try again.",
  errS3:
    "Upload failed before finishing. Check your connection and try again.",
  errEnqueue:
    "Upload finished but processing could not be started. Check your connection and try again.",
  successTitle: "Manual received.",
  discardTitle: "Discard this PDF?",
  discardDescriptionPrefix: "Discard selected file:",
  discardDescriptionRest: "You can choose a different file afterward.",
  discardConfirm: "Discard PDF",
  discardCancel: "Keep file",
  statusPollError: "Could not load job status. Is the dev server running?",
  checkingStatus: "Checking status…",
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${mb.toFixed(1)} MB`;
}

type ApiErrorPayload = { error?: string; details?: string };

function devApiHint(payload: ApiErrorPayload): string {
  if (process.env.NODE_ENV !== "development") return "";
  const detail =
    typeof payload.details === "string" && payload.details.length > 0
      ? payload.details
      : typeof payload.error === "string" && payload.error.length > 0
        ? payload.error
        : "";
  return detail ? `\n\nDetails: ${detail}` : "";
}

function putFileWithProgress(
  url: string,
  body: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}

export function ManualUpload() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [jobStatus, setJobStatus] = useState<
    "queued" | "processing" | "completed" | "failed" | null
  >(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [sceneKey, setSceneKey] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [stages, setStages] = useState<JobStatusPayload["stages"]>(null);
  const [statusPollError, setStatusPollError] = useState<string | null>(null);

  const onDropAccepted = (accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    setFile(next);
    setErrorMessage(null);
    setSuccessJobId(null);
    setJobStatus(null);
    setJobError(null);
    setSceneKey(null);
    setVideoUrl(null);
    setStages(null);
    setStatusPollError(null);
  };

  const onDropRejected = (rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    if (code === "file-too-large") {
      setErrorMessage(COPY.errOversize);
    } else {
      setErrorMessage(COPY.errWrongType);
    }
    setSuccessJobId(null);
    setJobStatus(null);
    setJobError(null);
    setSceneKey(null);
    setVideoUrl(null);
    setStages(null);
    setStatusPollError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_PDF_BYTES,
    multiple: false,
    disabled: uploading,
    noClick: true,
    onDropAccepted,
    onDropRejected,
  });

  const pollIntervalRef = useRef<number | null>(null);

  const fetchJobStatus = useCallback(async () => {
    if (!successJobId) return;
    try {
      const res = await fetch(`/api/jobs/${successJobId}`);
      if (!res.ok) {
        setStatusPollError(COPY.statusPollError);
        return;
      }
      const body = (await res.json()) as JobStatusPayload;
      setStatusPollError(null);
      setJobStatus(body.status);
      setJobError(body.error);
      setSceneKey(body.sceneKey);
      setVideoUrl(body.videoUrl);
      setStages(body.stages);
      if (body.status === "completed" || body.status === "failed") {
        if (pollIntervalRef.current !== null) {
          window.clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch {
      setStatusPollError(COPY.statusPollError);
    }
  }, [successJobId]);

  useEffect(() => {
    if (!successJobId) {
      setJobStatus(null);
      setJobError(null);
      setSceneKey(null);
      setVideoUrl(null);
      setStages(null);
      setStatusPollError(null);
      return;
    }

    let cancelled = false;
    const clearPoll = () => {
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const tick = async () => {
      if (cancelled) return;
      await fetchJobStatus();
    };

    void tick();
    pollIntervalRef.current = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [successJobId, fetchJobStatus]);

  useEffect(() => {
    if (jobStatus !== "completed" || !videoUrl) return;
    const raf = requestAnimationFrame(() => {
      videoSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      setTimeout(() => {
        const el = videoSectionRef.current?.querySelector("video");
        if (el instanceof HTMLVideoElement) {
          el.focus();
        }
      }, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [jobStatus, videoUrl]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleChooseClick = () => {
    if (file) {
      setDiscardOpen(true);
    } else {
      openFilePicker();
    }
  };

  const confirmDiscard = () => {
    setFile(null);
    setDiscardOpen(false);
    setErrorMessage(null);
    openFilePicker();
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setErrorMessage(null);
    setSuccessJobId(null);
    setJobStatus(null);
    setJobError(null);
    setSceneKey(null);
    setVideoUrl(null);
    setStages(null);
    setStatusPollError(null);
    setUploading(true);
    setProgress(0);

    try {
      const pdfOk = await isLikelyPdf(file);
      if (!pdfOk) {
        setErrorMessage(COPY.errNotPdf);
        return;
      }

      const sessionResponse = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type || "application/pdf",
          sizeBytes: file.size,
        }),
      });

      const sessionPayload = (await sessionResponse.json()) as
        | { jobId: string; uploadUrl: string; headers: Record<string, string> }
        | ApiErrorPayload;

      if (!sessionResponse.ok) {
        setErrorMessage(
          `${COPY.errPresign}${devApiHint(sessionPayload as ApiErrorPayload)}`,
        );
        return;
      }

      const session = sessionPayload as {
        jobId: string;
        uploadUrl: string;
        headers: Record<string, string>;
      };

      await putFileWithProgress(
        session.uploadUrl,
        file,
        session.headers,
        setProgress,
      );

      const enqueueResponse = await fetch(
        `/api/jobs/${session.jobId}/enqueue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: file.type || "application/pdf",
            sizeBytes: file.size,
          }),
        },
      );

      const enqueuePayload = (await enqueueResponse.json()) as
        | { ok?: boolean; jobId?: string }
        | ApiErrorPayload;

      if (!enqueueResponse.ok) {
        setErrorMessage(
          `${COPY.errEnqueue}${devApiHint(enqueuePayload as ApiErrorPayload)}`,
        );
        return;
      }

      setSuccessJobId(session.jobId);
      setFile(null);
    } catch {
      setErrorMessage(COPY.errS3);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-[640px]">
        <Card className="overflow-hidden border-border/70 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] dark:bg-card/80 dark:shadow-black/30 dark:ring-white/10">
          <CardHeader className="space-y-2 border-b border-border/50 bg-muted/20 pb-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600/15 to-emerald-600/10 text-teal-800 ring-1 ring-teal-700/15 dark:from-teal-400/15 dark:to-emerald-400/10 dark:text-teal-200 dark:ring-teal-400/20">
                <CloudUpload className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <CardTitle className="text-xl font-semibold leading-[1.25] tracking-tight">
                  {COPY.emptyHeading}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {COPY.emptyBody}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div
              {...getRootProps({
                "data-testid": "manual-dropzone",
                className: cn(
                  "group flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-5 py-10 text-center transition-all duration-200",
                  isDragActive
                    ? "border-teal-600/70 bg-teal-50/80 shadow-inner dark:border-teal-400/60 dark:bg-teal-950/40"
                    : "border-border/80 bg-card/50 hover:border-teal-600/35 hover:bg-muted/30 dark:hover:border-teal-400/25",
                  uploading && "pointer-events-none opacity-60",
                ),
              })}
            >
              <input {...getInputProps({ id: inputId })} />
              <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground ring-1 ring-border/60 transition-colors group-hover:bg-teal-600/10 group-hover:text-teal-800 dark:group-hover:bg-teal-950/50 dark:group-hover:text-teal-200">
                <FileText className="size-7" aria-hidden />
              </span>
              <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                {isDragActive
                  ? "Release to add your manual."
                  : "Drag your PDF here, then upload when ready."}
              </p>
            </div>

            <input
              ref={fileInputRef}
              data-testid="manual-file-input"
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) {
                  if (next.size > MAX_PDF_BYTES) {
                    setErrorMessage(COPY.errOversize);
                  } else if (next.type && next.type !== "application/pdf") {
                    setErrorMessage(COPY.errWrongType);
                  } else {
                    setFile(next);
                    setErrorMessage(null);
                    setSuccessJobId(null);
                    setJobStatus(null);
                    setJobError(null);
                    setSceneKey(null);
                    setVideoUrl(null);
                    setStages(null);
                    setStatusPollError(null);
                  }
                }
                event.target.value = "";
              }}
            />

            {file ? (
              <div className="rounded-xl border border-border/70 bg-muted/25 p-4 ring-1 ring-black/[0.03] dark:ring-white/10">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-teal-800 shadow-sm dark:text-teal-300">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-snug">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {uploading ? (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {COPY.primaryUploading}
                </p>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-border/50 bg-muted/10 px-6 py-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full border-border/80 bg-card/80 sm:w-auto"
              onClick={handleChooseClick}
              disabled={uploading}
            >
              {COPY.secondary}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full bg-teal-700 text-white shadow-md shadow-teal-900/15 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 sm:w-auto"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {COPY.primaryUploading}
                </span>
              ) : (
                COPY.primaryCta
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {errorMessage ? (
        <div className="mx-auto w-full max-w-[640px]">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {errorMessage}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {successJobId ? (
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">
          <Alert className="border-emerald-700/20 bg-emerald-50/90 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-950/35 dark:text-emerald-50">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
            <AlertTitle>{COPY.successTitle}</AlertTitle>
            <AlertDescription>
              <p className="font-mono text-xs text-muted-foreground">
                Job id: {successJobId}
              </p>
              {statusPollError ? (
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                  {statusPollError}
                </p>
              ) : null}
            </AlertDescription>
          </Alert>

          {statusPollError && !jobStatus ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => void fetchJobStatus()}
              >
                Retry status
              </Button>
            </div>
          ) : null}

          {jobStatus ? (
            <>
              <PipelineStatus stages={stages} coarseStatus={jobStatus} />

              {jobStatus === "failed" ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>We couldn&apos;t finish the video.</AlertTitle>
                  <AlertDescription className="space-y-3">
                    {jobError ? (
                      <p className="whitespace-pre-line">{jobError}</p>
                    ) : null}
                    <p className="font-medium">
                      Try uploading again or choose another manual.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void fetchJobStatus()}
                    >
                      Retry status
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {jobStatus === "completed" && sceneKey && successJobId ? (
                <AssemblyProgressSection jobId={successJobId} />
              ) : null}

              <VideoResult
                ref={videoSectionRef}
                videoUrl={videoUrl}
                jobCompleted={jobStatus === "completed"}
              />
            </>
          ) : !statusPollError ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2
                className="size-3.5 animate-spin"
                aria-hidden
              />
              {COPY.checkingStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">
                {COPY.discardDescriptionPrefix}
              </span>{" "}
              {COPY.discardDescriptionRest}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{COPY.discardCancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDiscard}
            >
              {COPY.discardConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
