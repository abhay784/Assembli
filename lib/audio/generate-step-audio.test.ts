import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAndUploadStepAudio } from "./generate-step-audio";
import type { SceneJSON } from "../scene/schema";

const jobId = "550e8400-e29b-41d4-a716-446655440000";

const steps: SceneJSON["steps"] = [
  {
    title: "A",
    caption: "B",
    parts: [],
    confidence: 0.9,
    tools: [],
    warnings: [],
  },
  {
    title: "C",
    caption: "D",
    parts: [],
    confidence: 0.8,
    tools: [],
    warnings: [],
  },
];

describe("generateAndUploadStepAudio", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("uploads padded keys and returns aligned arrays", async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "assembli-audio-test-"));
    const synthesize = vi
      .fn()
      .mockResolvedValueOnce(Buffer.from("a"))
      .mockResolvedValueOnce(Buffer.from("b"));
    const putBytes = vi.fn().mockResolvedValue(undefined);
    const getDuration = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0.5);

    const out = await generateAndUploadStepAudio({
      jobId,
      audioDir: tmpDir,
      steps,
      synthesize,
      putBytes,
      getDuration,
    });

    expect(out.durationsInFrames).toEqual([30, 15]);
    expect(out.audioKeys).toEqual([
      `uploads/${jobId}/audio/00.mp3`,
      `uploads/${jobId}/audio/01.mp3`,
    ]);
    expect(out.localPaths[0]).toMatch(/00\.mp3$/);
    expect(out.localPaths[1]).toMatch(/01\.mp3$/);
    expect(putBytes).toHaveBeenCalledTimes(2);
    expect(putBytes.mock.calls[0][0].key).toMatch(
      new RegExp(`^uploads/${jobId}/audio/00\\.mp3$`),
    );
  });
});
