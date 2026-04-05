import { describe, expect, it } from "vitest";
import { mockScene } from "@/lib/scene/mock";
import {
  aggregateTotalRequiredByPart,
  computePartsProgress,
  hasAnyPartsUsage,
} from "./aggregate";

describe("aggregateTotalRequiredByPart", () => {
  it("sums quantities per partCode across steps", () => {
    const map = aggregateTotalRequiredByPart(mockScene.steps);
    expect(map.get("C")?.total).toBe(12);
    expect(map.get("D")?.total).toBe(8);
    expect(map.get("E")?.total).toBe(4);
  });
});

describe("computePartsProgress", () => {
  it("usedSoFar only from completed step indices", () => {
    const completed = new Set([0]);
    const items = computePartsProgress(mockScene.steps, completed);
    const c = items.find((i) => i.partCode === "C");
    expect(c?.usedSoFar).toBe(4);
    expect(c?.totalRequired).toBe(12);
    expect(c?.remaining).toBe(8);
  });

  it("reverses when undoing completion", () => {
    const completed = new Set([0, 1]);
    const items = computePartsProgress(mockScene.steps, completed);
    const c = items.find((i) => i.partCode === "C");
    expect(c?.usedSoFar).toBe(8);
    const undone = computePartsProgress(mockScene.steps, new Set([0]));
    const c2 = undone.find((i) => i.partCode === "C");
    expect(c2?.usedSoFar).toBe(4);
  });

  it("sorts incomplete parts before complete", () => {
    const completed = new Set([0, 1, 2]);
    const items = computePartsProgress(mockScene.steps, completed);
    expect(items.every((i) => i.remaining === 0)).toBe(true);
  });
});

describe("hasAnyPartsUsage", () => {
  it("is true for mock scene", () => {
    expect(hasAnyPartsUsage(mockScene.steps)).toBe(true);
  });

  it("is false when no partsUsed", () => {
    expect(
      hasAnyPartsUsage([
        {
          title: "t",
          caption: "c",
          parts: [],
          confidence: 1,
          tools: [],
          warnings: [],
        },
      ]),
    ).toBe(false);
  });
});
