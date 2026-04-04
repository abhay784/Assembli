import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockScene } from "../scene/mock";

const { createMock, AnthropicMock } = vi.hoisted(() => {
  const createMock = vi.fn();
  class AnthropicMock {
    messages = { create: createMock };
  }
  return { createMock, AnthropicMock };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: AnthropicMock,
}));

import { extractSceneFromPdfBuffer } from "./extract-scene";

describe("extractSceneFromPdfBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.CLAUDE_MODEL = "claude-test";
    createMock
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "not json" }],
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              steps: [
                {
                  title: "a",
                  caption: "b",
                  parts: [],
                  tools: [],
                  warnings: [],
                },
              ],
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(mockScene) }],
      });
  });

  it("retries on bad output and returns validated SceneJSON (D-08)", async () => {
    const scene = await extractSceneFromPdfBuffer({
      pdfBuffer: Buffer.from("%PDF-1.4"),
    });
    expect(scene).toEqual(mockScene);
    expect(createMock).toHaveBeenCalledTimes(3);
  });
});
