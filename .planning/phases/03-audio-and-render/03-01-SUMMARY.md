---
phase: 03-audio-and-render
plan: 01
subsystem: infra
requirements-completed: [AUDIO-01]
key-files:
  created:
    - lib/audio/elevenlabs-client.ts
    - lib/audio/elevenlabs-client.test.ts
  modified:
    - package.json
    - package-lock.json
    - .env.example
completed: 2026-04-04
---

# Phase 3 Plan 01 — Dependencies and ElevenLabs client

Pinned `@elevenlabs/elevenlabs-js`, `@remotion/renderer`, `@remotion/bundler`, `@remotion/media-utils`, and `ffmpeg-static` to 4.0.445-aligned Remotion versions. Added worker-only `synthesizeNarrationToBuffer` with env guards, length limits, and mocked Vitest coverage.
