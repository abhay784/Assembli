import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";
import { getObjectJson } from "@/lib/s3/get-object-json";
import { sceneSchema } from "@/lib/scene/schema";

function mapBullState(state: string): "queued" | "processing" | "completed" | "failed" {
  if (state === "active") return "processing";
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  return "queued";
}

function isValidSceneKeyForJob(jobId: string, sceneKey: string): boolean {
  const prefix = `uploads/${jobId}/`;
  if (!sceneKey.startsWith(prefix)) return false;
  const remainder = sceneKey.slice(prefix.length);
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

/**
 * GET extracted SceneJSON for a completed job (server reads S3; key scoped to job id).
 */
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
  if (status !== "completed") {
    return NextResponse.json(
      { error: "Scene is only available when the job is completed." },
      { status: 409 },
    );
  }

  const returnvalue = job.returnvalue as unknown;
  const sceneKey =
    returnvalue !== null &&
    typeof returnvalue === "object" &&
    "sceneKey" in returnvalue &&
    typeof (returnvalue as { sceneKey: unknown }).sceneKey === "string"
      ? (returnvalue as { sceneKey: string }).sceneKey
      : null;

  if (!sceneKey) {
    return NextResponse.json(
      { error: "No scene data for this job." },
      { status: 404 },
    );
  }

  if (!isValidSceneKeyForJob(String(job.id ?? id), sceneKey)) {
    console.warn("Invalid sceneKey for job", job.id);
    return NextResponse.json({ error: "No scene data for this job." }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await getObjectJson<unknown>(sceneKey);
  } catch (err) {
    console.error("[GET /api/jobs/.../scene] S3 read failed:", err);
    return NextResponse.json(
      { error: "Could not load scene data." },
      { status: 500 },
    );
  }

  const parsed = sceneSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Stored scene failed validation." }, { status: 500 });
  }

  return NextResponse.json(parsed.data);
}
