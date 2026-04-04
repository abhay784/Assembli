import {
  ALLOWED_PDF_CONTENT_TYPES,
  MAX_PDF_BYTES,
} from "../constants/upload";

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export function validateUploadRequest(input: {
  contentType: string;
  sizeBytes: number;
}): void {
  const allowed = ALLOWED_PDF_CONTENT_TYPES as readonly string[];
  if (!allowed.includes(input.contentType)) {
    throw new UploadValidationError("Only PDF uploads are supported.");
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new UploadValidationError("sizeBytes must be a positive number.");
  }
  if (input.sizeBytes > MAX_PDF_BYTES) {
    throw new UploadValidationError("This PDF is over 25 MB.");
  }
}
