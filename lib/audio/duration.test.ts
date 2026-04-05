import { describe, expect, it } from "vitest";
import { secondsToFramesAt30fps } from "./duration";

describe("secondsToFramesAt30fps", () => {
  it("maps one second to 30 frames", () => {
    expect(secondsToFramesAt30fps(1.0)).toBe(30);
  });

  it("uses at least one frame for tiny durations", () => {
    expect(secondsToFramesAt30fps(0.01)).toBeGreaterThanOrEqual(1);
  });
});
