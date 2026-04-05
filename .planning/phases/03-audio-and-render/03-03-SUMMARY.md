---
phase: 03-audio-and-render
plan: 03
subsystem: video
requirements-completed: [VIDEO-01, VIDEO-02, VIDEO-03, AUDIO-02]
key-files:
  created:
    - lib/render/schema.ts
    - lib/render/schema.test.ts
    - worker/render-video.ts
    - remotion/public/silence-1s.mp3
  modified:
    - remotion/compositions/AssemblySteps.tsx
    - remotion/Root.tsx
    - remotion.config.ts
completed: 2026-04-04
---

# Phase 3 Plan 03 — RenderInput and Remotion SSR

Introduced Zod `renderInputSchema` / `RenderInput`, renamed composition to `assembly`, audio-driven `Sequence` timing, `<Audio>` per step, part fade-in via `interpolate`, Studio defaults with `staticFile('silence-1s.mp3')`, `Config.setPublicDir('remotion/public')`, and `renderAssemblyToMp4` using `bundle`, `selectComposition`, and `renderMedia` with `binariesDirectory` from `ffmpeg-static`.
