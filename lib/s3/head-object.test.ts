import { beforeEach, describe, expect, it, vi } from "vitest";
import { S3ServiceException } from "@aws-sdk/client-s3";
import { objectExistsInBucket } from "./head-object";

const send = vi.fn();

vi.mock("./presign", () => ({
  getS3Client: () => ({ send }),
}));

describe("objectExistsInBucket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "us-east-1";
  });

  it("returns true when HeadObject succeeds", async () => {
    send.mockResolvedValueOnce({});
    await expect(
      objectExistsInBucket("uploads/job-1/manual.pdf"),
    ).resolves.toBe(true);
  });

  it("returns false on 404", async () => {
    send.mockRejectedValueOnce(
      new S3ServiceException({
        name: "NotFound",
        $fault: "client",
        $metadata: { httpStatusCode: 404 },
      } as never),
    );
    await expect(
      objectExistsInBucket("uploads/job-1/manual.pdf"),
    ).resolves.toBe(false);
  });
});
