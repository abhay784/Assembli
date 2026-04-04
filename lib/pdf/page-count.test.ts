import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPdfPages } from "./page-count";

vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

describe("countPdfPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns numpages from pdf-parse", async () => {
    const pdfParse = (await import("pdf-parse")).default as ReturnType<
      typeof vi.fn
    >;
    pdfParse.mockResolvedValue({ numpages: 12 });

    const n = await countPdfPages(Buffer.from("%PDF"));
    expect(n).toBe(12);
    expect(pdfParse).toHaveBeenCalledWith(Buffer.from("%PDF"));
  });
});
