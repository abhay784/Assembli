import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildManualPdfKey,
  presignManualUpload,
  presignVideoDownload,
} from "./presign";

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({})),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

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

describe("presignVideoDownload", () => {
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

  it("returns a presigned URL string", async () => {
    const result = await presignVideoDownload({
      key: "uploads/job-1/output.mp4",
    });
    expect(result).toBe("https://example.com/presigned");
  });

  it("uses GetObjectCommand (not PutObjectCommand)", async () => {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    await presignVideoDownload({ key: "uploads/job-1/output.mp4" });
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "uploads/job-1/output.mp4",
    });
  });

  it("defaults expiresIn to 900", async () => {
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    await presignVideoDownload({ key: "uploads/job-1/output.mp4" });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 900 },
    );
  });

  it("throws when S3_BUCKET is not set", async () => {
    delete process.env.S3_BUCKET;
    await expect(
      presignVideoDownload({ key: "uploads/job-1/output.mp4" }),
    ).rejects.toThrow("S3_BUCKET is not set");
  });
});
