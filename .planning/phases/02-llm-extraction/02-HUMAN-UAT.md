---
status: partial
phase: 02-llm-extraction
source: [02-VERIFICATION.md]
started: 2026-04-04
updated: 2026-04-04
---

## Current Test

Awaiting human E2E with real Anthropic + S3 + Redis.

## Tests

### 1. Worker extracts real PDF to SceneJSON

expected: With `.env` filled (`REDIS_URL`, S3, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, valid `CLAUDE_MAX_PDF_PAGES`), upload a real furniture PDF via UI, run `npm run dev` + `npm run dev:worker`, job completes, S3 key `uploads/{jobId}/scene.json` exists and parses as `sceneSchema`.
result: [pending]

### 2. GET job returns sceneKey when complete

expected: `GET /api/jobs/{id}` JSON has `sceneKey` matching `uploads/{jobId}/scene.json` after success.
result: [pending]

### 3. Page limit rejection before Claude

expected: PDF with page count greater than `CLAUDE_MAX_PDF_PAGES` fails job with user-visible reason containing `PDF exceeds maximum page limit` (not a stack trace in JSON).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

(none yet)
