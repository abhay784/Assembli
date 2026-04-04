/** True when the first five bytes match the PDF file signature `%PDF-`. */
export async function isLikelyPdf(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 5).arrayBuffer();
    if (buffer.byteLength < 5) return false;
    const prefix = new TextDecoder("latin1").decode(buffer);
    return prefix === "%PDF-";
  } catch {
    return false;
  }
}
