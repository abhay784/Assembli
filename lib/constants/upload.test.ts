import { describe, expect, it } from "vitest";
import {
  ALLOWED_PDF_CONTENT_TYPES,
  MAX_PDF_BYTES,
} from "./upload";

describe("upload constants", () => {
  it("caps PDF size at 25 MB", () => {
    expect(MAX_PDF_BYTES).toBe(26214400);
  });

  it("allows application/pdf", () => {
    expect(ALLOWED_PDF_CONTENT_TYPES).toContain("application/pdf");
  });
});
