---
phase: 04-pipeline-integration-and-output
plan: 02
subsystem: ui
tags: react, shadcn, a11y

requires:
  - phase: 04-01
    provides: videoUrl, stages on GET /api/jobs/[id]
provides:
  - PipelineStatus and VideoResult components
  - ManualUpload wired to new API with scroll/focus on success
affects:
  - app home layout

tech-stack:
  added: []
  patterns:
    - "Coarse-only pipeline UI when stages === null (no fake steps)"

key-files:
  created:
    - components/pipeline/PipelineStatus.tsx
    - components/pipeline/VideoResult.tsx
  modified:
    - components/upload/ManualUpload.tsx
    - app/page.tsx

key-decisions:
  - "960px band for pipeline/video; 640px for title + upload card"
  - "forwardRef on VideoResult for scrollIntoView + video focus"

patterns-established:
  - "aria-live polite on pipeline region"

requirements-completed:
  - OUTPUT-01

duration: 35min
completed: 2026-04-04
---

# Phase 4: Plan 04-02 Summary

**Home page now uses a wider band for pipeline and video, with honest coarse progress, native video playback, failure copy per UI-SPEC, and smooth scroll plus focus to the player when a presigned URL is available.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- Added `PipelineStatus` with single-row coarse states when `stages` is null.
- Added `VideoResult` with 16:9 player, placeholders, and destructive alert when completed without URL.
- Reworked `ManualUpload` layout (640px upload, 960px results) and polling for `videoUrl` / `stages`.

## Task Commits

1. Tasks 1–4 — implemented in a single delivery commit (see git history).

## Self-Check: PASSED
