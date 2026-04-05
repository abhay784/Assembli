import {
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getS3Client } from "./presign";

/**
 * Returns true if the object exists in the configured bucket.
 */
export async function objectExistsInBucket(key: string): Promise<boolean> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  const client = getS3Client();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      error.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}
