---
status: human_needed
phase: 03-audio-and-render
updated: 2026-04-04
---

# Phase 3 — Verification

## Automated checks (passed)

- `npm test` — Vitest (audio client, duration frames, generate-step-audio, render schema, path guard, pipeline mock, jobs API including `videoKey`, existing suites).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — ESLint.
- `npm run build` — Next.js production build.

## Requirement traceability

| Requirement | Evidence |
|-------------|----------|
| AUDIO-01 | `generateAndUploadStepAudio` + `putObjectBytes` → `uploads/{jobId}/audio/NN.mp3`; pipeline uses live TTS + upload. |
| AUDIO-02 | `getAudioDurationSecondsFromBuffer` + `secondsToFramesAt30fps`; `RenderInput.durationsInFrames` drives Remotion `Sequence` lengths. |
| VIDEO-01 | `AssemblySteps` part labels with `interpolate` opacity in first ~20% of each step. |
| VIDEO-02 | Captions and step counter share the same per-step `Sequence` as `<Audio>`. |
| VIDEO-03 | “Step N of M” uses array indices; variable `durationInFrames` per step. |

## Success criteria (roadmap)

1. **Per-step clips in S3** — Implemented; **confirm with real worker + ElevenLabs + S3**.
2. **Exploded-view + captions + step counter** — Implemented in `assembly` composition.
3. **Audio sync** — Frame counts from probed duration; **confirm A/V sync on a rendered MP4**.
4. **MP4 in S3** — `uploads/{jobId}/output.mp4`; **confirm with full env run**.

## Human verification

Complete `03-HUMAN-UAT.md` with real `.env` (Redis, S3, Anthropic, ElevenLabs), worker, and one PDF job.

Reply **approved** after the checklist, or report issues for gap closure.
