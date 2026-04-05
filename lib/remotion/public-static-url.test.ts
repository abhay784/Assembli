import { describe, expect, it } from "vitest";
import { publicStaticFileUrl } from "./public-static-url";

describe("publicStaticFileUrl", () => {
  it("prefixes /public and encodes segments", () => {
    expect(publicStaticFileUrl("__assembli-audio/job-id/00.mp3")).toBe(
      "/public/__assembli-audio/job-id/00.mp3",
    );
  });

  it("strips a leading slash on the argument", () => {
    expect(publicStaticFileUrl("/silence-1s.mp3")).toBe("/public/silence-1s.mp3");
  });
});
