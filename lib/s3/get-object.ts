import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./presign";

export async function getObjectBuffer(params: {
  key: string;
}): Promise<Uint8Array | Buffer> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  const client = getS3Client();
  const out = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: params.key }),
  );
  if (!out.Body) {
    throw new Error("Empty S3 object body");
  }
  return out.Body.transformToByteArray();
}
