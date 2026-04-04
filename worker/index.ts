import "dotenv/config";
import { Worker } from "bullmq";
import {
  ASSEMBLI_QUEUE,
  getRedisConnection,
  parseJobPayload,
} from "../lib/queue";
import { runExtractionJob } from "./extraction-pipeline";

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is required for the Assembli worker.");
  process.exit(1);
}

const connection = getRedisConnection();

const worker = new Worker(
  ASSEMBLI_QUEUE,
  async (job) => {
    const payload = parseJobPayload(job.data);
    console.log(`job ${payload.jobId} s3Key length=${payload.s3Key.length}`);
    return runExtractionJob(payload);
  },
  { connection },
);

worker.on("failed", (job, err) => {
  console.error("Job failed", job?.id, err);
});
