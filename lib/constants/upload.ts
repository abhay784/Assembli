/** Shared upload limits and queue naming for API, worker, and UI. */

export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export const ALLOWED_PDF_CONTENT_TYPES = ["application/pdf"] as const;

export const ASSEMBLI_QUEUE_NAME = "assembli-jobs";
