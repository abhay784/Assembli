import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";
import { getObjectBuffer } from "@/lib/s3/get-object";
import { sceneSchema } from "@/lib/scene/schema";

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
    return NextResponse.json(
      { error: "Scene not ready.", status: state },
      { status: 409 },
    );
  }

  const rv = job.returnvalue as unknown;
  const sceneKey =
    rv !== null &&
    typeof rv === "object" &&
    "sceneKey" in rv &&
    typeof (rv as { sceneKey: unknown }).sceneKey === "string"
      ? (rv as { sceneKey: string }).sceneKey
      : null;

  if (!sceneKey) {
    return NextResponse.json(
      { error: "Scene not available." },
      { status: 404 },
    );
  }

  let raw: Uint8Array;
  try {
    raw = await getObjectBuffer({ key: sceneKey });
  } catch {
    return NextResponse.json(
      { error: "Could not load scene from storage." },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8").decode(raw));
  } catch {
    return NextResponse.json({ error: "Invalid scene JSON." }, { status: 500 });
  }

  const parsed = sceneSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Scene failed validation." }, { status: 500 });
  }

  return NextResponse.json({ scene: parsed.data });
}
