import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildManualPdfKey, presignManualUpload } from "./presign";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(() => Promise.resolve("https://example.com/presigned")),
}));

describe("buildManualPdfKey", () => {
  it("builds a server-side object key", () => {
    expect(buildManualPdfKey("abc-123")).toBe("uploads/abc-123/manual.pdf");
  });

  it("rejects path-like job ids", () => {
    expect(() => buildManualPdfKey("../evil")).toThrow();
  });
});

describe("presignManualUpload", () => {
  const env: NodeJS.ProcessEnv = { ...process.env };

  beforeEach(() => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET = "test-bucket";
    process.env.AWS_ACCESS_KEY_ID = "test";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
  });

  it("returns a presigned URL and expiry", async () => {
    const result = await presignManualUpload({
      key: "uploads/x/manual.pdf",
      contentType: "application/pdf",
    });
    expect(result.url).toContain("example.com");
    expect(result.expiresIn).toBe(900);
  });
});
