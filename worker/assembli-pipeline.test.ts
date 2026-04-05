import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jobId = "550e8400-e29b-41d4-a716-446655440000";

const mockScene = {
  steps: [
    {
      title: "Lay out parts",
      caption: "Identify pieces.",
      parts: [
        {
          id: "a",
          label: "A",
          x: 10,
          y: 20,
          rotationDeg: 0,
        },
      ],
      confidence: 0.9,
      tools: [] as string[],
      warnings: [] as string[],
    },
  ],
};

const {
  putObjectJson,
  putObjectBytes,
  renderAssemblyToMp4,
} = vi.hoisted(() => ({
  putObjectJson: vi.fn(() => Promise.resolve()),
  putObjectBytes: vi.fn(() => Promise.resolve()),
  renderAssemblyToMp4: vi.fn(
    async ({ outputLocation }: { outputLocation: string }) => {
      await fs.writeFile(outputLocation, Buffer.from("fake-mp4"));
    },
  ),
}));

vi.mock("../lib/s3/get-object", () => ({
  getObjectBuffer: vi.fn(() => Promise.resolve(Buffer.from("%PDF-1.4 test"))),
}));

vi.mock("../lib/pdf/preflight", () => ({
  assertPdfPagePreflight: vi.fn(() => Promise.resolve()),
}));

vi.mock("../lib/claude/extract-scene", () => ({
  extractSceneFromPdfBuffer: vi.fn(() => Promise.resolve(mockScene)),
}));

vi.mock("../lib/audio/generate-step-audio", () => ({
  generateAndUploadStepAudio: vi.fn(
    async ({ audioDir }: { audioDir: string }) => {
      const p = path.join(audioDir, "00.mp3");
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, Buffer.from("fake"));
      return {
        durationsInFrames: [30],
        audioKeys: [`uploads/${jobId}/audio/00.mp3`],
        localPaths: [p],
      };
    },
  ),
}));

vi.mock("./render-video", () => ({
  renderAssemblyToMp4,
}));

vi.mock("../lib/s3/put-object", () => ({
  putObjectJson,
  putObjectBytes,
}));

describe("runAssembliPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLAUDE_MAX_PDF_PAGES = "100";
  });

  it("returns sceneKey and videoKey and uploads mp4", async () => {
    const { runAssembliPipeline } = await import("./extraction-pipeline");
    const result = await runAssembliPipeline({
      jobId,
      s3Key: `uploads/${jobId}/manual.pdf`,
      contentType: "application/pdf",
      sizeBytes: 100,
    });

    expect(result.sceneKey).toBe(`uploads/${jobId}/scene.json`);
    expect(result.videoKey).toBe(`uploads/${jobId}/output.mp4`);
    expect(result.videoKey.endsWith("output.mp4")).toBe(true);
    expect(renderAssemblyToMp4).toHaveBeenCalledTimes(1);
    expect(putObjectBytes).toHaveBeenCalled();
    expect(
      putObjectBytes.mock.calls.some((call) => {
        const arg = (call as unknown[])[0] as {
          key: string;
          contentType: string;
        };
        return (
          arg.contentType === "video/mp4" &&
          arg.key === `uploads/${jobId}/output.mp4`
        );
      }),
    ).toBe(true);
  });
});
