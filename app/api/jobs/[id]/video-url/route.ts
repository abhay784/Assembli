import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";
import { presignVideoDownload } from "@/lib/s3/presign";

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
    return NextResponse.json({ error: "Queue unavailable." }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const state = await job.getState();
  if (state !== "completed") {
    return NextResponse.json({ error: "Job not completed." }, { status: 409 });
  }

  const rv = job.returnvalue as unknown;
  const videoKey =
    rv !== null &&
    typeof rv === "object" &&
    "videoKey" in rv &&
    typeof (rv as { videoKey: unknown }).videoKey === "string"
      ? (rv as { videoKey: string }).videoKey
      : null;

  if (!videoKey) {
    return NextResponse.json(
      { error: "Video not available." },
      { status: 404 },
    );
  }

  const expiresIn = 900;
  let url: string;
  try {
    url = await presignVideoDownload({ key: videoKey, expiresIn });
  } catch {
    return NextResponse.json(
      { error: "Could not generate video URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url, expiresIn });
}
