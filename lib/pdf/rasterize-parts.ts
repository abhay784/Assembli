import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { PartInventoryItem } from "../claude/extract-parts-inventory";

const execFileAsync = promisify(execFile);

/**
 * Result of rasterizing a single part sprite from a PDF page.
 */
export interface PartSprite {
  partNumber: string;
  name: string;
  /** Local filesystem path to the cropped PNG. */
  localPath: string;
  /** Shape hint from inventory extraction. */
  shape?: string;
  /** Material hint from inventory extraction. */
  material?: string;
}

/**
 * Rasterize the relevant PDF pages and crop individual part sprites.
 *
 * Uses `pdftoppm` (from poppler-utils) to rasterize PDF pages to PNG,
 * then uses ImageMagick `convert` to crop bounding boxes into individual sprites
 * with transparent backgrounds.
 *
 * Falls back gracefully: if pdftoppm or convert aren't available, returns empty array
 * so the pipeline continues with geometric shapes.
 */
export async function rasterizePartSprites(options: {
  pdfPath: string;
  parts: PartInventoryItem[];
  outputDir: string;
  /** DPI for PDF rasterization (default 300 for crisp sprites). */
  dpi?: number;
}): Promise<PartSprite[]> {
  const { pdfPath, parts, outputDir, dpi = 300 } = options;
  await fs.mkdir(outputDir, { recursive: true });

  // Group parts by page to minimize rasterization calls
  const partsByPage = new Map<number, PartInventoryItem[]>();
  for (const part of parts) {
    const existing = partsByPage.get(part.pageIndex) ?? [];
    existing.push(part);
    partsByPage.set(part.pageIndex, existing);
  }

  const sprites: PartSprite[] = [];

  for (const [pageIndex, pageParts] of partsByPage) {
    // Rasterize this page to PNG using pdftoppm
    const pagePrefix = path.join(outputDir, `page-${pageIndex}`);
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
        pagePrefix,
      ]);
    } catch {
      // pdftoppm not available — skip sprite extraction gracefully
      console.warn(
        `pdftoppm not available or failed for page ${pageIndex}, skipping sprite extraction`,
      );
      continue;
    }

    const rasterPath = `${pagePrefix}.png`;

    // Verify the rasterized page exists
    try {
      await fs.access(rasterPath);
    } catch {
      console.warn(`Rasterized page not found at ${rasterPath}`);
      continue;
    }

    // Get rasterized image dimensions using ImageMagick identify
    let imgWidth: number;
    let imgHeight: number;
    try {
      const { stdout } = await execFileAsync("identify", [
        "-format",
        "%w %h",
        rasterPath,
      ]);
      const [w, h] = stdout.trim().split(" ").map(Number);
      imgWidth = w;
      imgHeight = h;
    } catch {
      console.warn("ImageMagick identify not available, skipping crops");
      continue;
    }

    // Crop each part from the rasterized page
    for (const part of pageParts) {
      const { bbox } = part;

      // Convert percentage bounding box to pixel coordinates
      const x = Math.round((bbox.xPct / 100) * imgWidth);
      const y = Math.round((bbox.yPct / 100) * imgHeight);
      const w = Math.round((bbox.wPct / 100) * imgWidth);
      const h = Math.round((bbox.hPct / 100) * imgHeight);

      // Clamp to image bounds
      const cx = Math.max(0, x);
      const cy = Math.max(0, y);
      const cw = Math.min(w, imgWidth - cx);
      const ch = Math.min(h, imgHeight - cy);

      if (cw <= 0 || ch <= 0) continue;

      const spritePath = path.join(
        outputDir,
        `part-${part.partNumber}.png`,
      );

      try {
        // Crop the bounding box region from the full page
        // Then make the white background transparent
        await execFileAsync("convert", [
          rasterPath,
          "-crop",
          `${cw}x${ch}+${cx}+${cy}`,
          "+repage",
          // Remove white background (with 15% fuzz for near-white)
          "-fuzz",
          "15%",
          "-transparent",
          "white",
          // Trim any remaining transparent padding
          "-trim",
          "+repage",
          spritePath,
        ]);

        sprites.push({
          partNumber: part.partNumber,
          name: part.name,
          localPath: spritePath,
          shape: part.shape,
          material: part.material,
        });
      } catch (err) {
        console.warn(
          `Failed to crop sprite for part ${part.partNumber}:`,
          err,
        );
      }
    }

    // Clean up the full-page raster
    await fs.unlink(rasterPath).catch(() => {});
  }

  return sprites;
}
