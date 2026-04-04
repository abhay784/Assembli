import pdfParse from "pdf-parse";

export async function countPdfPages(buffer: Buffer): Promise<number> {
  const data = await pdfParse(buffer);
  return data.numpages;
}
