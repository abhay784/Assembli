---
phase: 04-pipeline-integration-and-output
plan: 01
subsystem: api
tags: s3, presign, nextjs, vitest

requires:
  - phase: 03
    provides: videoKey on completed jobs (future)
provides:
  - Presigned GET for MP4 playback URLs on job status
  - GET /api/jobs/[id] contract with videoUrl and stages: null
affects:
  - 04-02 UI consumption

tech-stack:
  added: []
  patterns:
    - "Job-scoped S3 key validation before presigning reads"

key-files:
  created:
    - lib/s3/presign-get.ts
  modified:
    - app/api/jobs/[id]/route.ts
    - app/api/jobs/route.test.ts

key-decisions:
  - "videoKey must match uploads/{jobId}/ prefix with safe remainder"
  - "Presign failures on completed jobs return videoUrl: null without 500"

patterns-established:
  - "JobStatusResponse documents stages: null until backend provides stages[]"

requirements-completed:
  - OUTPUT-01

duration: 25min
completed: 2026-04-04
---

# Phase 4: Plan 04-01 Summary

**Job status API now returns a time-limited `videoUrl` when the worker supplies a valid `videoKey`, plus explicit `stages: null`, with Vitest coverage using a mocked presigner.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `presignVideoGet` using `GetObjectCommand` and 900s TTL, with `video/mp4` content type for `.mp4` keys.
- Extended GET `/api/jobs/[id]` with `JobStatusResponse`, safe `videoKey` validation, and non-fatal presign errors.
- Locked the contract in `route.test.ts` with `vi.hoisted` mock for `@/lib/s3/presign-get`.

## Task Commits

1. Task 1–3 — implemented in a single delivery commit (see git history).

## Self-Check: PASSED
