import "dotenv/config";
import { Worker } from "bullmq";
import {
  ASSEMBLI_QUEUE,
  getRedisConnection,
  parseJobPayload,
} from "../lib/queue";
import { runAssembliPipeline } from "./extraction-pipeline";

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is required for the Assembli worker.");
  process.exit(1);
}

const connection = getRedisConnection().duplicate();

const worker = new Worker(
  ASSEMBLI_QUEUE,
  async (job) => {
    const payload = parseJobPayload(job.data);
    console.log(`job ${payload.jobId} s3Key length=${payload.s3Key.length}`);
    return runAssembliPipeline(payload);
  },
  { connection },
);

worker.on("active", (job) => {
  console.log(`Job ${job.id} active (worker picked up from queue)`);
});

worker.on("completed", (job) => {
  const rv = job.returnvalue as { sceneKey?: string; videoKey?: string } | undefined;
  console.log(
    `Job ${job.id} completed sceneKey=${rv?.sceneKey ?? ""} videoKey=${rv?.videoKey ?? ""}`,
  );
});

worker.on("failed", (job, err) => {
  console.error("Job failed", job?.id, err);
});
