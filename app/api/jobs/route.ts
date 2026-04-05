import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  UploadValidationError,
  validateUploadRequest,
} from "@/lib/jobs/upload-request";
import { buildManualPdfKey, presignManualUpload } from "@/lib/s3/presign";

const postBodySchema = z.object({
  contentType: z.string(),
  sizeBytes: z.number(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
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

  const { contentType } = parsed.data;
  const jobId = uuidv4();
  const key = buildManualPdfKey(jobId);

  let uploadUrl: string;
  let expiresIn: number;
  try {
    const signed = await presignManualUpload({ key, contentType });
    uploadUrl = signed.url;
    expiresIn = signed.expiresIn;
  } catch (err) {
    console.error("[POST /api/jobs] presign failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Could not prepare upload.",
        ...(process.env.NODE_ENV === "development" ? { details: message } : {}),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    jobId,
    uploadUrl,
    headers: {
      "Content-Type": contentType,
    },
    key,
    expiresIn,
  });
}
