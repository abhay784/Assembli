import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";
import { presignVideoGet } from "@/lib/s3/presign-get";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

/**
 * JSON shape for GET /api/jobs/[id]. `stages` is null until the backend exposes granular stages.
 */
export type JobStatusResponse = {
  id: string | number;
  status: JobStatus;
  error: string | null;
  updatedAt: string;
  sceneKey: string | null;
  videoUrl: string | null;
  stages: null;
};

function mapBullState(state: string): JobStatus {
  if (state === "active") return "processing";
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  return "queued";
}

function isValidVideoKeyForJob(jobId: string, videoKey: string): boolean {
  const prefix = `uploads/${jobId}/`;
  if (!videoKey.startsWith(prefix)) return false;
  const remainder = videoKey.slice(prefix.length);
  if (
    !remainder ||
    remainder.startsWith("/") ||
    remainder.includes("..") ||
    remainder.includes("\\")
  ) {
    return false;
  }
  return true;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.includes("/") || id.includes("\\")) {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  let job;
  try {
    const queue = getJobQueue();
    job = await queue.getJob(id);
  } catch {
    return NextResponse.json({ error: "Status unavailable." }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const state = await job.getState();
  const status = mapBullState(state);
  const error =
    status === "failed" ? job.failedReason ?? "Job failed." : null;
  const updatedAt = new Date(
    job.finishedOn ?? job.processedOn ?? job.timestamp,
  ).toISOString();

  const returnvalue = job.returnvalue as unknown;
  const sceneKey =
    status === "completed" &&
    returnvalue !== null &&
    typeof returnvalue === "object" &&
    "sceneKey" in returnvalue &&
    typeof (returnvalue as { sceneKey: unknown }).sceneKey === "string"
      ? (returnvalue as { sceneKey: string }).sceneKey
      : null;

  let videoUrl: string | null = null;
  if (status === "completed") {
    if (
      returnvalue !== null &&
      typeof returnvalue === "object" &&
      "videoKey" in returnvalue &&
      typeof (returnvalue as { videoKey: unknown }).videoKey === "string"
    ) {
      const rawKey = (returnvalue as { videoKey: string }).videoKey;
      if (isValidVideoKeyForJob(String(job.id ?? id), rawKey)) {
        try {
          const signed = await presignVideoGet({ key: rawKey });
          videoUrl = signed.url;
        } catch (err) {
          console.error("presignVideoGet failed", err);
          videoUrl = null;
        }
      } else {
        console.warn("Invalid videoKey for job", job.id);
      }
    }
  }

  const body: JobStatusResponse = {
    id: job.id ?? id,
    status,
    error,
    updatedAt,
    sceneKey,
    videoUrl,
    stages: null,
  };

  return NextResponse.json(body);
}
