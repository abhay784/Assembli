import { extractSceneFromPdfBuffer } from "../lib/claude/extract-scene";
import { assertPdfPagePreflight } from "../lib/pdf/preflight";
import type { JobPayload } from "../lib/queue";
import { getObjectBuffer } from "../lib/s3/get-object";
import { putObjectJson } from "../lib/s3/put-object";

export async function runExtractionJob(
  payload: JobPayload,
): Promise<{ sceneKey: string }> {
  const buffer = await getObjectBuffer({ key: payload.s3Key });
  const pdfBuffer = Buffer.from(buffer);

  const rawMax = process.env.CLAUDE_MAX_PDF_PAGES;
  const maxPages = Number.parseInt(rawMax ?? "", 10);
  if (Number.isNaN(maxPages) || maxPages < 1) {
    throw new Error("Invalid CLAUDE_MAX_PDF_PAGES");
  }

  await assertPdfPagePreflight(pdfBuffer, maxPages);

  const scene = await extractSceneFromPdfBuffer({ pdfBuffer });
  const sceneKey = `uploads/${payload.jobId}/scene.json`;
  await putObjectJson({
    key: sceneKey,
    body: JSON.stringify(scene, null, 2),
  });

  return { sceneKey };
}
