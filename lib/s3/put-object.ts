import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./presign";

export async function putObjectJson(params: {
  key: string;
  body: string;
  contentType?: string;
}): Promise<void> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType ?? "application/json",
    }),
  );
}
