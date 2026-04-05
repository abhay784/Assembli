"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
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
import { BorderBeam } from "@/components/ui/border-beam";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { isLikelyPdf } from "./magic-pdf";

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
  discardTitle: "Discard this PDF?",
  discardDescriptionPrefix: "Discard selected file:",
  discardDescriptionRest: "You can choose a different file afterward.",
  discardConfirm: "Discard PDF",
  discardCancel: "Keep file",
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${mb.toFixed(1)} MB`;
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
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);

  const onDropAccepted = (accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    setFile(next);
    setErrorMessage(null);
  };

  const onDropRejected = (rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    if (code === "file-too-large") {
      setErrorMessage(COPY.errOversize);
    } else {
      setErrorMessage(COPY.errWrongType);
    }
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
        | { error?: string };

      if (!sessionResponse.ok) {
        const apiError =
          "error" in sessionPayload && typeof sessionPayload.error === "string"
            ? sessionPayload.error
            : "";
        const devHint =
          process.env.NODE_ENV === "development" && apiError
            ? `\n\nDetails: ${apiError}`
            : "";
        setErrorMessage(`${COPY.errPresign}${devHint}`);
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
        | { error?: string };

      if (!enqueueResponse.ok) {
        const apiError =
          "error" in enqueuePayload && typeof enqueuePayload.error === "string"
            ? enqueuePayload.error
            : "";
        const devHint =
          process.env.NODE_ENV === "development" && apiError
            ? `\n\nDetails: ${apiError}`
            : "";
        setErrorMessage(`${COPY.errEnqueue}${devHint}`);
        return;
      }

      setFile(null);
      router.push(`/jobs/${session.jobId}`);
    } catch {
      setErrorMessage(COPY.errS3);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-teal-900/10 bg-white/80 shadow-[0_24px_80px_-24px_rgba(15,118,110,0.35)] backdrop-blur-md dark:bg-card/80">
        <BorderBeam
          size={70}
          duration={11}
          borderWidth={2}
          colorFrom="#fb923c"
          colorTo="#14b8a6"
        />
        <BorderBeam
          size={48}
          duration={15}
          delay={4}
          borderWidth={1}
          reverse
          colorFrom="#fbbf24"
          colorTo="#f97316"
        />
        <div className="relative z-10 space-y-6 p-6 md:p-8">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-[1.65rem]">
              {COPY.emptyHeading}
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              {COPY.emptyBody}
            </p>
          </div>

          <div
            {...getRootProps({
              "data-testid": "manual-dropzone",
              className: cn(
                "flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-all duration-300",
                isDragActive
                  ? "border-orange-400 bg-gradient-to-br from-teal-50/90 via-amber-50/60 to-orange-50/80 shadow-inner ring-2 ring-orange-300/40"
                  : "border-slate-300/90 bg-gradient-to-b from-white to-slate-50/80 shadow-sm hover:border-teal-400/50 hover:shadow-md",
                uploading && "pointer-events-none opacity-60",
              ),
            })}
          >
            <input {...getInputProps({ id: inputId })} />
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-orange-500 text-white shadow-lg shadow-orange-500/25">
              <FileText className="size-7" aria-hidden />
            </div>
            <p className="max-w-sm text-base leading-relaxed text-slate-600">
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
                }
              }
              event.target.value = "";
            }}
          />

          {file ? (
            <div className="space-y-2 rounded-2xl border border-teal-800/10 bg-teal-50/40 p-4 ring-1 ring-teal-700/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold leading-[1.4] text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-base leading-normal text-slate-600">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {uploading ? (
            <div className="space-y-2">
              <Progress value={progress} className="h-2 w-full bg-slate-200/80" />
              <p className="text-sm font-medium text-teal-900/80">
                {COPY.primaryUploading}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full rounded-full border-2 border-slate-300/80 bg-white/90 font-semibold text-slate-800 shadow-sm transition-all hover:border-orange-400/70 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-slate-900 sm:w-auto"
              onClick={handleChooseClick}
              disabled={uploading}
            >
              {COPY.secondary}
            </Button>
            <ShimmerButton
              type="button"
              borderRadius="9999px"
              className="min-h-12 w-full font-display text-sm font-semibold tracking-wide sm:w-auto sm:min-w-[14rem]"
              background="linear-gradient(135deg, #0f766e 0%, #0d9488 42%, #115e59 100%)"
              shimmerColor="#fde68a"
              shimmerDuration="2.8s"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {COPY.primaryUploading}
                </span>
              ) : (
                <span className="relative z-10">{COPY.primaryCta}</span>
              )}
            </ShimmerButton>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <Alert
          variant="destructive"
          className="rounded-2xl border-red-200/80 bg-red-50/90 shadow-md"
        >
          <AlertCircle className="size-4" />
          <AlertTitle className="font-display font-semibold">Something blocked the upload</AlertTitle>
          <AlertDescription className="whitespace-pre-line text-red-950/90">
            {errorMessage}
          </AlertDescription>
        </Alert>
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
