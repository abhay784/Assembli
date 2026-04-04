import { describe, expect, it } from "vitest";
import { ASSEMBLI_QUEUE_NAME } from "./constants/upload";
import { ASSEMBLI_QUEUE, parseJobPayload } from "./queue";

describe("queue helpers", () => {
  it("exports the same queue name as upload constants", () => {
    expect(ASSEMBLI_QUEUE).toBe(ASSEMBLI_QUEUE_NAME);
  });

  it("parses valid metadata payloads", () => {
    const payload = parseJobPayload({
      jobId: "550e8400-e29b-41d4-a716-446655440000",
      s3Key: "uploads/550e8400-e29b-41d4-a716-446655440000/manual.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(payload.jobId).toMatch(/550e8400/);
  });

  it("rejects payloads with missing fields", () => {
    expect(() =>
      parseJobPayload({
        jobId: "x",
        s3Key: "k",
        contentType: "application/pdf",
      }),
    ).toThrow();
  });

  it("rejects non-positive sizeBytes", () => {
    expect(() =>
      parseJobPayload({
        jobId: "x",
        s3Key: "k",
        contentType: "application/pdf",
        sizeBytes: 0,
      }),
    ).toThrow();
  });
});
