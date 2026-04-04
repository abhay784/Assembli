---
phase: 02-llm-extraction
plan: 04
subsystem: worker
requirements-completed: [EXTRACT-01, EXTRACT-02, EXTRACT-03]
key-files:
  created: [lib/s3/put-object.ts, worker/extraction-pipeline.ts]
  modified: [worker/index.ts, app/api/jobs/[id]/route.ts, app/api/jobs/route.test.ts, .env.example]
duration: —
completed: 2026-04-04
---

# Phase 2 Plan 04 Summary

Worker runs `runExtractionJob`: GetObject manual, `CLAUDE_MAX_PDF_PAGES` parse guard, preflight, Claude extraction, PutObject pretty JSON to `uploads/{jobId}/scene.json`, returnvalue `{ sceneKey }`. GET `/api/jobs/[id]` includes `sceneKey` when completed.

## Self-Check: PASSED

- Vitest covers `sceneKey` on completed jobs; typecheck green.

## Task Commits

Single commit: `feat(phase-02-04): worker extraction pipeline, S3 scene.json, job sceneKey API`
