---
phase: 03-audio-and-render
plan: 02
subsystem: audio
requirements-completed: [AUDIO-01, AUDIO-02]
key-files:
  created:
    - lib/audio/narration.ts
    - lib/audio/duration.ts
    - lib/audio/duration.test.ts
    - lib/audio/generate-step-audio.ts
    - lib/audio/generate-step-audio.test.ts
  modified:
    - lib/s3/put-object.ts
completed: 2026-04-04
---

# Phase 3 Plan 02 — Per-step audio pipeline

Added `putObjectBytes`, `buildStepNarrationText`, ffmpeg-based duration probing from buffers (Node-safe; `@remotion/media-utils` is browser-only), `secondsToFramesAt30fps`, and `generateAndUploadStepAudio` writing local MP3s under a caller-provided directory plus S3 keys `uploads/{jobId}/audio/NN.mp3`.
