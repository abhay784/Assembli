import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "./presign";

export async function presignVideoGet(options: {
  key: string;
}): Promise<{ url: string; expiresIn: number }> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  const client = getS3Client();
  const expiresIn = 900;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: options.key,
    ...(options.key.endsWith(".mp4")
      ? { ResponseContentType: "video/mp4" }
      : {}),
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}
