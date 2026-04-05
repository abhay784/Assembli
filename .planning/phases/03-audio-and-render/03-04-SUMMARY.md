---
phase: 03-audio-and-render
plan: 04
subsystem: worker
requirements-completed: [VIDEO-01, VIDEO-02, VIDEO-03, AUDIO-01, AUDIO-02]
key-files:
  created:
    - worker/path-guard.ts
    - worker/path-guard.test.ts
    - worker/assembli-pipeline.test.ts
  modified:
    - worker/extraction-pipeline.ts
    - worker/index.ts
    - app/api/jobs/[id]/route.ts
    - app/api/jobs/route.test.ts
    - components/upload/ManualUpload.tsx
    - vitest.config.ts
completed: 2026-04-04
---

# Phase 3 Plan 04 — End-to-end worker and API/UI

Replaced extraction-only job with `runAssembliPipeline`: extract → TTS + S3 audio → validated `RenderInput` → `assertPathsContainedInDir` → `renderAssemblyToMp4` → S3 `output.mp4`, returning `{ sceneKey, videoKey }`. Extended GET job JSON and ManualUpload with `videoKey` display. Added path-guard tests and mocked pipeline integration test.
