import { describe, expect, it } from "vitest";
import { renderInputSchema } from "./schema";
import type { SceneJSON } from "../scene/schema";

function step(i: number): SceneJSON["steps"][number] {
  return {
    title: `T${i}`,
    caption: `C${i}`,
    parts: [],
    confidence: 0.9,
    tools: [],
    warnings: [],
  };
}

const baseScene: SceneJSON = {
  steps: [step(0), step(1)],
};

describe("renderInputSchema", () => {
  it("accepts a valid render input", () => {
    const parsed = renderInputSchema.parse({
      ...baseScene,
      durationsInFrames: [10, 20],
      audioFiles: ["/a/x.mp3", "/a/y.mp3"],
    });
    expect(parsed.steps).toHaveLength(2);
  });

  it("rejects length mismatch", () => {
    expect(() =>
      renderInputSchema.parse({
        ...baseScene,
        durationsInFrames: [10],
        audioFiles: ["/a.mp3", "/b.mp3"],
      }),
    ).toThrow(/length mismatch/);
  });

  it("rejects empty steps", () => {
    expect(() =>
      renderInputSchema.parse({
        steps: [],
        durationsInFrames: [],
        audioFiles: [],
      }),
    ).toThrow();
  });

  it("rejects too many steps", () => {
    const steps = Array.from({ length: 201 }, (_, i) => step(i));
    expect(() =>
      renderInputSchema.parse({
        steps,
        durationsInFrames: steps.map(() => 10),
        audioFiles: steps.map((_, i) => `/a/${i}.mp3`),
      }),
    ).toThrow(/too many steps/);
  });

  it("rejects duration above cap", () => {
    expect(() =>
      renderInputSchema.parse({
        ...baseScene,
        durationsInFrames: [9001, 10],
        audioFiles: ["/a.mp3", "/b.mp3"],
      }),
    ).toThrow();
  });

  it("rejects unsafe frame sum", () => {
    const steps = [step(0), step(1)];
    expect(() =>
      renderInputSchema.parse({
        steps,
        durationsInFrames: [Number.MAX_SAFE_INTEGER, 2],
        audioFiles: ["/a.mp3", "/b.mp3"],
      }),
    ).toThrow(/overflow/);
  });
});
