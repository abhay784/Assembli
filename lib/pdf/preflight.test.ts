import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertPdfPagePreflight } from "./preflight";

vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

describe("assertPdfPagePreflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when page count is within limit", async () => {
    const pdfParse = (await import("pdf-parse")).default as ReturnType<
      typeof vi.fn
    >;
    pdfParse.mockResolvedValue({ numpages: 5 });

    await expect(
      assertPdfPagePreflight(Buffer.from("%PDF"), 10),
    ).resolves.toBeUndefined();
  });

  it("rejects with PDF exceeds maximum page limit when over limit", async () => {
    const pdfParse = (await import("pdf-parse")).default as ReturnType<
      typeof vi.fn
    >;
    pdfParse.mockResolvedValue({ numpages: 200 });

    await expect(assertPdfPagePreflight(Buffer.from("%PDF"), 100)).rejects.toThrow(
      "PDF exceeds maximum page limit",
    );
  });
});
