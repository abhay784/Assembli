import { describe, expect, it } from "vitest";
import { mockScene } from "./mock";
import { sceneSchema } from "./schema";

describe("sceneSchema", () => {
  it("accepts mockScene", () => {
    const parsed = sceneSchema.safeParse(mockScene);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing steps", () => {
    const parsed = sceneSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid part numeric type", () => {
    const parsed = sceneSchema.safeParse({
      steps: [
        {
          title: "t",
          caption: "c",
          parts: [{ id: "p", label: "l", x: "bad", y: 0, rotationDeg: 0 }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects extra top-level keys under strict root", () => {
    const parsed = sceneSchema.safeParse({
      steps: [],
      extra: true,
    });
    expect(parsed.success).toBe(false);
  });
});
