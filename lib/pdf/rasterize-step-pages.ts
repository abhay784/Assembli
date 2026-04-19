import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Result of rasterizing a single PDF page for use as a step background.
 */
export interface StepPageRaster {
  /** 0-based PDF page index. */
  pageIndex: number;
  /** Local filesystem path to the rasterized PNG. */
  localPath: string;
  /** Pixel width of the rasterized image. */
  width: number;
  /** Pixel height of the rasterized image. */
  height: number;
}

/**
 * Rasterize specific PDF pages to PNG for use as step background images.
 *
 * Uses `pdftoppm` (from poppler-utils) to rasterize each requested page.
 * No cropping or post-processing — the full page is output as-is.
 *
 * Falls back gracefully: if pdftoppm is not available, returns an empty array
 * so the pipeline continues with the dot-grid fallback background.
 *
 * Caller is responsible for cleanup of output files.
 */
export async function rasterizeStepPages(options: {
  pdfPath: string;
  /** 0-based page indices to rasterize. Should be deduplicated by caller. */
  pageIndices: number[];
  outputDir: string;
  /** DPI for rasterization (default 150 — lower than sprites, background only). */
  dpi?: number;
}): Promise<StepPageRaster[]> {
  const { pdfPath, pageIndices, outputDir, dpi = 150 } = options;

  if (pageIndices.length === 0) {
    return [];
  }

  await fs.mkdir(outputDir, { recursive: true });

  const rasters: StepPageRaster[] = [];

  for (const pageIndex of pageIndices) {
    const outputPrefix = path.join(outputDir, `step-page-${pageIndex}`);
    const pageNum = pageIndex + 1; // pdftoppm uses 1-based page numbers

    try {
      await execFileAsync("pdftoppm", [
        "-png",
        "-r",
        String(dpi),
        "-f",
        String(pageNum),
        "-l",
        String(pageNum),
        "-singlefile",
        pdfPath,
        outputPrefix,
      ]);
    } catch {
      // pdftoppm not available or failed — skip this page gracefully
      console.warn(
        `pdftoppm not available or failed for page ${pageIndex}, skipping step background rasterization`,
      );
      continue;
    }

    const rasterPath = `${outputPrefix}.png`;

    try {
      await fs.access(rasterPath);
    } catch {
      console.warn(`Rasterized step page not found at ${rasterPath}`);
      continue;
    }

    // Capture image dimensions using ImageMagick identify
    let width = 0;
    let height = 0;
    try {
      const { stdout } = await execFileAsync("identify", [
        "-format",
        "%w %h",
        rasterPath,
      ]);
      const [w, h] = stdout.trim().split(" ").map(Number);
      width = w;
      height = h;
    } catch {
      console.warn(`Could not identify dimensions of ${rasterPath}, using 0×0`);
    }

    rasters.push({ pageIndex, localPath: rasterPath, width, height });
  }

  return rasters;
}
