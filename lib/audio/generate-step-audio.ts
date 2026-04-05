import fs from "node:fs/promises";
import path from "node:path";
import type { SceneJSON } from "../scene/schema";
import { buildStepNarrationText } from "./narration";
import { secondsToFramesAt30fps } from "./duration";
import { putObjectBytes } from "../s3/put-object";

const JOB_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateAndUploadStepAudio(params: {
  jobId: string;
  audioDir: string;
  steps: SceneJSON["steps"];
  synthesize: (text: string) => Promise<Buffer>;
  putBytes: typeof putObjectBytes;
  getDuration: (buf: Buffer) => Promise<number>;
}): Promise<{
  durationsInFrames: number[];
  audioKeys: string[];
  localPaths: string[];
}> {
  if (!JOB_ID_RE.test(params.jobId)) {
    throw new Error("Invalid jobId for audio key construction");
  }
  if (params.steps.length < 1) {
    throw new Error("At least one step is required");
  }

  await fs.mkdir(params.audioDir, { recursive: true });

  const durationsInFrames: number[] = [];
  const audioKeys: string[] = [];
  const localPaths: string[] = [];

  for (let i = 0; i < params.steps.length; i++) {
    const text = buildStepNarrationText(params.steps[i]);
    const buffer = await params.synthesize(text);
    const padded = String(i).padStart(2, "0");
    const fileName = `${padded}.mp3`;
    const localPath = path.join(params.audioDir, fileName);
    await fs.writeFile(localPath, buffer);

    const seconds = await params.getDuration(buffer);
    durationsInFrames.push(secondsToFramesAt30fps(seconds));

    const key = `uploads/${params.jobId}/audio/${fileName}`;
    audioKeys.push(key);
    localPaths.push(localPath);

    await params.putBytes({
      key,
      body: buffer,
      contentType: "audio/mpeg",
    });
  }

  return { durationsInFrames, audioKeys, localPaths };
}
