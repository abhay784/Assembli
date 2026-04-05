import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function buildManualPdfKey(jobId: string): string {
  if (jobId.includes("/") || jobId.includes("\\")) {
    throw new Error("Invalid job id");
  }
  return `uploads/${jobId}/manual.pdf`;
}

export function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION is not set");
  }
  const endpoint = process.env.AWS_S3_ENDPOINT;
  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

export async function presignManualUpload(options: {
  key: string;
  contentType: string;
}): Promise<{ url: string; expiresIn: number }> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    ContentType: options.contentType,
  });
  const expiresIn = 900;
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}

export async function presignVideoDownload(options: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: options.key });
  return getSignedUrl(client, command, {
    expiresIn: options.expiresIn ?? 900,
  });
}
