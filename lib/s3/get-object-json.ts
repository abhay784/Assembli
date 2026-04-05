import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./presign";

/**
 * Reads an object from S3 and parses JSON (e.g. scene.json).
 */
export async function getObjectJson<T>(key: string): Promise<T> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  const client = getS3Client();
  const out = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const raw = await out.Body?.transformToString();
  if (raw === undefined || raw === "") {
    throw new Error("Empty S3 object body");
  }
  return JSON.parse(raw) as T;
}
