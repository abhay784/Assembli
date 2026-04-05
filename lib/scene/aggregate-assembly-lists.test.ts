import { describe, expect, it } from "vitest";
import {
  aggregateParts,
  aggregateTools,
  inventoryMergeKey,
  parseSuggestedQuantity,
} from "./aggregate-assembly-lists";
import { mockScene } from "./mock";
import type { SceneJSON } from "./schema";

describe("parseSuggestedQuantity", () => {
  it("reads × inside parens", () => {
    expect(parseSuggestedQuantity("Screws (×4)")).toBe(4);
  });

  it("reads x suffix", () => {
    expect(parseSuggestedQuantity("Bolts x2")).toBe(2);
  });

  it("defaults to 1", () => {
    expect(parseSuggestedQuantity("Tabletop")).toBe(1);
  });
});

describe("inventoryMergeKey", () => {
  it("folds simple plurals for single-token labels", () => {
    expect(inventoryMergeKey("Screws (×4)")).toBe("screw");
    expect(inventoryMergeKey("Screw")).toBe("screw");
  });

  it("does not fold words ending in ss", () => {
    expect(inventoryMergeKey("Glass")).toBe("glass");
  });

  it("keeps multi-word labels", () => {
    expect(inventoryMergeKey("Front-left leg")).toBe("front-left leg");
  });

  it("merges indexed variants of the same word", () => {
    expect(inventoryMergeKey("dowel1")).toBe("dowel");
    expect(inventoryMergeKey("dowel2")).toBe("dowel");
    expect(inventoryMergeKey("Dowel 1")).toBe("dowel");
    expect(inventoryMergeKey("Dowel_3")).toBe("dowel");
    expect(inventoryMergeKey("Pin #2")).toBe("pin");
  });
});

describe("aggregateParts indexed labels", () => {
  it("merges dowel1, dowel2, Dowel 1 into one row with summed qty", () => {
    const scene: SceneJSON = {
      steps: [
        {
          title: "A",
          caption: "",
          parts: [
            {
              id: "d1",
              label: "dowel1",
              x: 0,
              y: 0,
              rotationDeg: 0,
            },
            {
              id: "d2",
              label: "dowel2",
              x: 0,
              y: 0,
              rotationDeg: 0,
            },
            {
              id: "d3",
              label: "Dowel 1",
              x: 0,
              y: 0,
              rotationDeg: 0,
            },
          ],
          confidence: 1,
          tools: [],
          warnings: [],
        },
      ],
    };
    const parts = aggregateParts(scene);
    expect(parts.filter((p) => p.id === "inv-dowel")).toHaveLength(1);
    expect(parts.find((p) => p.id === "inv-dowel")?.suggestedQty).toBe(3);
  });
});

describe("aggregateParts", () => {
  it("merges screw rows into one line with total qty 4", () => {
    const parts = aggregateParts(mockScene);
    const screw = parts.find((p) => p.id === "inv-screw");
    expect(screw).toBeDefined();
    expect(screw?.suggestedQty).toBe(4);
    expect(screw?.label).toBe("Screw");
  });

  it("has fewer rows than raw unique part ids", () => {
    const rawIds = new Set<string>();
    for (const step of mockScene.steps) {
      for (const p of step.parts) rawIds.add(p.id);
    }
    const merged = aggregateParts(mockScene);
    expect(merged.length).toBeLessThan(rawIds.size);
  });
});

describe("aggregateParts merge rules", () => {
  it("sums unit rows when no pack line exists", () => {
    const scene: SceneJSON = {
      steps: [
        {
          title: "A",
          caption: "",
          parts: [
            {
              id: "a",
              label: "Dowel",
              x: 0,
              y: 0,
              rotationDeg: 0,
            },
            {
              id: "b",
              label: "Dowel",
              x: 0,
              y: 0,
              rotationDeg: 0,
            },
          ],
          confidence: 1,
          tools: [],
          warnings: [],
        },
      ],
    };
    const parts = aggregateParts(scene);
    const dowel = parts.find((p) => p.id === "inv-dowel");
    expect(dowel?.suggestedQty).toBe(2);
  });
});

describe("aggregateTools", () => {
  it("dedupes tools in order", () => {
    const tools = aggregateTools(mockScene);
    expect(tools).toContain("Phillips screwdriver");
    expect(tools.filter((t) => t === "Phillips screwdriver").length).toBe(1);
  });
});
