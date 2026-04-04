"use client";

import { useId, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
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
  successTitle: "Manual received.",
  successBody: "Your job is queued.",
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
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);

  const onDropAccepted = (accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    setFile(next);
    setErrorMessage(null);
    setSuccessJobId(null);
  };

  const onDropRejected = (rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    if (code === "file-too-large") {
      setErrorMessage(COPY.errOversize);
    } else {
      setErrorMessage(COPY.errWrongType);
    }
    setSuccessJobId(null);
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
    setSuccessJobId(null);
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

      if (!sessionResponse.ok) {
        setErrorMessage(COPY.errPresign);
        return;
      }

      const session = (await sessionResponse.json()) as {
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold leading-[1.2]">
            {COPY.emptyHeading}
          </CardTitle>
          <CardDescription className="text-base leading-normal">
            {COPY.emptyBody}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps({
              "data-testid": "manual-dropzone",
              className: cn(
                "flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                isDragActive
                  ? "border-neutral-900 bg-slate-100"
                  : "border-slate-300 bg-white",
                uploading && "pointer-events-none opacity-60",
              ),
            })}
          >
            <input {...getInputProps({ id: inputId })} />
            <FileText
              className="size-8 text-muted-foreground"
              aria-hidden
            />
            <p className="text-base leading-normal text-muted-foreground">
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
                }
              }
              event.target.value = "";
            }}
          />

          {file ? (
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold leading-[1.4]">
                    {file.name}
                  </p>
                  <p className="text-base leading-normal text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {uploading ? (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{COPY.primaryUploading}</p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={handleChooseClick}
            disabled={uploading}
          >
            {COPY.secondary}
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
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

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {successJobId ? (
        <Alert>
          <CheckCircle2 className="size-4 text-primary" />
          <AlertTitle>{COPY.successTitle}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{COPY.successBody}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {successJobId}
            </p>
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
