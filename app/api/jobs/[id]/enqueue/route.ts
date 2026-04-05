import { NextResponse } from "next/server";
import { z } from "zod";
import { getJobQueue } from "@/lib/queue";
import {
  UploadValidationError,
  validateUploadRequest,
} from "@/lib/jobs/upload-request";
import { objectExistsInBucket } from "@/lib/s3/head-object";
import { buildManualPdfKey } from "@/lib/s3/presign";

const bodySchema = z.object({
  contentType: z.string(),
  sizeBytes: z.number(),
});

/**
 * Call after the browser has finished PUTting the PDF to S3.
 * Enqueues the BullMQ job so the worker never runs before the object exists.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await context.params;
  if (!jobId || jobId.includes("/") || jobId.includes("\\")) {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    validateUploadRequest(parsed.data);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const { contentType, sizeBytes } = parsed.data;
  let key: string;
  try {
    key = buildManualPdfKey(jobId);
  } catch {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  let exists: boolean;
  try {
    exists = await objectExistsInBucket(key);
  } catch (err) {
    console.error("[POST /api/jobs/.../enqueue] head object failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Could not verify upload in storage.",
        ...(process.env.NODE_ENV === "development" ? { details: message } : {}),
      },
      { status: 500 },
    );
  }

  if (!exists) {
    return NextResponse.json(
      {
        error:
          "Manual PDF is not in storage yet. Wait for the upload to finish, then try again.",
      },
      { status: 409 },
    );
  }

  try {
    const queue = getJobQueue();
    await queue.add(
      jobId,
      { jobId, s3Key: key, contentType, sizeBytes },
      { jobId },
    );
  } catch (err) {
    console.error("[POST /api/jobs/.../enqueue] queue add failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Could not enqueue job.",
        ...(process.env.NODE_ENV === "development" ? { details: message } : {}),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, jobId });
}
