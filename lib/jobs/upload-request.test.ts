import { describe, expect, it } from "vitest";
import { UploadValidationError, validateUploadRequest } from "./upload-request";

describe("validateUploadRequest", () => {
  it("accepts a valid PDF declaration", () => {
    expect(() =>
      validateUploadRequest({
        contentType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).not.toThrow();
  });

  it("rejects non-PDF content types", () => {
    expect(() =>
      validateUploadRequest({
        contentType: "image/png",
        sizeBytes: 100,
      }),
    ).toThrow(UploadValidationError);
  });

  it("rejects zero or negative size", () => {
    expect(() =>
      validateUploadRequest({
        contentType: "application/pdf",
        sizeBytes: 0,
      }),
    ).toThrow(UploadValidationError);
  });

  it("rejects oversize declarations", () => {
    expect(() =>
      validateUploadRequest({
        contentType: "application/pdf",
        sizeBytes: 26 * 1024 * 1024,
      }),
    ).toThrow(UploadValidationError);
  });
});
