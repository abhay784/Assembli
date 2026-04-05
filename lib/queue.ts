import { Queue } from "bullmq";
import IORedis from "ioredis";
import { z } from "zod";
import { ASSEMBLI_QUEUE_NAME } from "./constants/upload";

/** BullMQ queue name — matches `ASSEMBLI_QUEUE_NAME` in upload constants. */
export const ASSEMBLI_QUEUE = ASSEMBLI_QUEUE_NAME;

const jobPayloadSchema = z.object({
  jobId: z.string().min(1),
  s3Key: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().finite().positive(),
});

export type JobPayload = z.infer<typeof jobPayloadSchema>;

export function parseJobPayload(data: unknown): JobPayload {
  return jobPayloadSchema.parse(data);
}

let sharedConnection: IORedis | null = null;
let sharedQueue: Queue | null = null;

export function getRedisConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  if (!sharedConnection) {
    sharedConnection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return sharedConnection;
}

/** BullMQ expects its own Redis connection (not shared with blocking consumers). */
export function getJobQueue(): Queue {
  if (!sharedQueue) {
    sharedQueue = new Queue(ASSEMBLI_QUEUE, {
      connection: getRedisConnection().duplicate(),
    });
  }
  return sharedQueue;
}
