import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { synthesizeNarrationToBuffer } from "../lib/audio/elevenlabs-client";
import { publicStaticFileUrl } from "../lib/remotion/public-static-url";
import { generateAndUploadStepAudio } from "../lib/audio/generate-step-audio";
import { getAudioDurationSecondsFromBuffer } from "../lib/audio/duration";
import { extractPartsInventory } from "../lib/claude/extract-parts-inventory";
import { extractSceneFromPdfBuffer } from "../lib/claude/extract-scene";
import { rasterizePartSprites } from "../lib/pdf/rasterize-parts";
import { assertPdfPagePreflight } from "../lib/pdf/preflight";
import type { JobPayload } from "../lib/queue";
import { renderInputSchema } from "../lib/render/schema";
import { getObjectBuffer } from "../lib/s3/get-object";
import { putObjectBytes, putObjectJson } from "../lib/s3/put-object";
import { assertPathsContainedInDir } from "./path-guard";
import { renderAssemblyToMp4 } from "./render-video";

export async function runAssembliPipeline(
  payload: JobPayload,
): Promise<{ sceneKey: string; videoKey: string }> {
  let workDir: string | undefined;
  let publishedAudioDir: string | undefined;

  const buffer = await getObjectBuffer({ key: payload.s3Key });
  const pdfBuffer = Buffer.from(buffer);

  const rawMax = process.env.CLAUDE_MAX_PDF_PAGES;
  const maxPages = Number.parseInt(rawMax ?? "", 10);
  if (Number.isNaN(maxPages) || maxPages < 1) {
    throw new Error("Invalid CLAUDE_MAX_PDF_PAGES");
  }

  await assertPdfPagePreflight(pdfBuffer, maxPages);

  // ── Phase 0: Extract part sprites from hardware inventory page ──────────
  // Claude identifies parts with bounding boxes → rasterize + crop → upload PNGs
  // This creates a partNumber→URL map that feeds into scene extraction.
  let spriteMap: Map<string, string> = new Map();
  let spritesDir: string | undefined;
  let publishedSpritesDir: string | undefined;

  try {
    const inventory = await extractPartsInventory({ pdfBuffer });

    if (inventory.parts.length > 0) {
      spritesDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "assembli-sprites-"),
      );

      // Write PDF to temp file for pdftoppm
      const tempPdfPath = path.join(spritesDir, "manual.pdf");
      await fs.writeFile(tempPdfPath, pdfBuffer);

      const sprites = await rasterizePartSprites({
        pdfPath: tempPdfPath,
        parts: inventory.parts,
        outputDir: path.join(spritesDir, "cropped"),
      });

      if (sprites.length > 0) {
        // Copy sprites into remotion/public for bundle access
        const publicSpritesRel = `__assembli-sprites/${payload.jobId}`;
        publishedSpritesDir = path.join(
          process.cwd(),
          "remotion/public",
          publicSpritesRel,
        );
        await fs.mkdir(publishedSpritesDir, { recursive: true });

        for (const sprite of sprites) {
          const destFilename = `${sprite.partNumber}.png`;
          await fs.copyFile(
            sprite.localPath,
            path.join(publishedSpritesDir, destFilename),
          );

          const spriteUrl = publicStaticFileUrl(
            `${publicSpritesRel}/${destFilename}`,
          );
          spriteMap.set(sprite.partNumber, spriteUrl);

          // Also upload to S3 for persistence
          const s3Key = `uploads/${payload.jobId}/sprites/${destFilename}`;
          const spriteBytes = await fs.readFile(sprite.localPath);
          await putObjectBytes({
            key: s3Key,
            body: Buffer.from(spriteBytes),
            contentType: "image/png",
          });
        }
      }
    }
  } catch (err) {
    // Sprite extraction is best-effort — pipeline continues with geometric shapes
    console.warn("Part sprite extraction failed (non-fatal):", err);
    spriteMap = new Map();
  } finally {
    if (spritesDir) {
      await fs.rm(spritesDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // ── Phase 1: Extract scene JSON ─────────────────────────────────────────
  const scene = await extractSceneFromPdfBuffer({
    pdfBuffer,
    spriteMap: spriteMap.size > 0 ? spriteMap : undefined,
  });
  const sceneKey = `uploads/${payload.jobId}/scene.json`;
  await putObjectJson({
    key: sceneKey,
    body: JSON.stringify(scene, null, 2),
  });

  try {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "assembli-job-"));
    const audioDir = path.join(workDir, "audio");
    await fs.mkdir(audioDir, { recursive: true });

    const { durationsInFrames, localPaths } = await generateAndUploadStepAudio({
      jobId: payload.jobId,
      audioDir,
      steps: scene.steps,
      synthesize: synthesizeNarrationToBuffer,
      putBytes: putObjectBytes,
      getDuration: getAudioDurationSecondsFromBuffer,
    });

    assertPathsContainedInDir(localPaths, workDir);

    // Remotion resolves <Audio src> via the bundle HTTP server. Absolute filesystem
    // paths become wrong URLs (404). Copy clips into remotion/public (webpack copies
    // that tree to bundle/public/) and pass /public/... URLs — same as staticFile()
    // in the browser; in Node, staticFile() omits /public so we use publicStaticFileUrl.
    const publicAudioRel = `__assembli-audio/${payload.jobId}`;
    publishedAudioDir = path.join(
      process.cwd(),
      "remotion/public",
      publicAudioRel,
    );
    await fs.mkdir(publishedAudioDir, { recursive: true });

    const audioFilesForRender: string[] = [];
    for (const src of localPaths) {
      const base = path.basename(src);
      await fs.copyFile(src, path.join(publishedAudioDir, base));
      audioFilesForRender.push(publicStaticFileUrl(`${publicAudioRel}/${base}`));
    }

    const inputProps = renderInputSchema.parse({
      steps: scene.steps,
      durationsInFrames,
      audioFiles: audioFilesForRender,
    });

    const outputPath = path.join(workDir, "out.mp4");
    await renderAssemblyToMp4({ inputProps, outputLocation: outputPath });

    const videoBytes = await fs.readFile(outputPath);
    const videoKey = `uploads/${payload.jobId}/output.mp4`;
    await putObjectBytes({
      key: videoKey,
      body: videoBytes,
      contentType: "video/mp4",
    });

    return { sceneKey, videoKey };
  } finally {
    if (publishedAudioDir) {
      await fs
        .rm(publishedAudioDir, { recursive: true, force: true })
        .catch(() => {});
    }
    if (publishedSpritesDir) {
      await fs
        .rm(publishedSpritesDir, { recursive: true, force: true })
        .catch(() => {});
    }
    if (workDir) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
