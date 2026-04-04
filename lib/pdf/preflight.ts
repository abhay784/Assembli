import { countPdfPages } from "./page-count";

export async function assertPdfPagePreflight(
  buffer: Buffer,
  maxPages: number,
): Promise<void> {
  const numpages = await countPdfPages(buffer);
  if (numpages > maxPages) {
    throw new Error("PDF exceeds maximum page limit");
  }
}
