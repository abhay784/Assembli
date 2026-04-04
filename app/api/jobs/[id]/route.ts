import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

function mapBullState(state: string): JobStatus {
  if (state === "active") return "processing";
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  return "queued";
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

  return NextResponse.json({
    id: job.id,
    status,
    error,
    updatedAt,
    sceneKey,
  });
}
