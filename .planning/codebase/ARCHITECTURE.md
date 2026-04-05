# Architecture

**Analysis Date:** 2026-04-04

## Pattern

**Split web + worker:** Next.js handles HTTP, presigning, and job status. A separate Node process (`worker/index.ts`) runs BullMQ workers so long-running extraction does not block requests.

**Pipeline (current):**
1. Client requests upload slot → `POST /api/jobs` → S3 presigned PUT + `jobId`.
2. Browser PUTs PDF to S3 → `POST /api/jobs/[id]/enqueue` → verifies object with `head-object` → enqueues BullMQ job with `{ jobId, s3Key, contentType, sizeBytes }`.
3. Worker runs `runExtractionJob` (`worker/extraction-pipeline.ts`): S3 get PDF → PDF preflight (page limit) → Claude extraction → Zod-validated `SceneJSON` → S3 put JSON → job completes with `{ sceneKey }`.
4. Client polls `GET /api/jobs/[id]` for status and optional `sceneKey`.

## Layers

| Layer | Responsibility | Key locations |
|-------|----------------|---------------|
| **UI** | Upload UX, progress, polling | `app/page.tsx`, `components/upload/ManualUpload.tsx` |
| **API** | Validation, S3 orchestration, queue | `app/api/jobs/**/*.ts` |
| **Domain** | Scene contract, Claude extraction | `lib/scene/*`, `lib/claude/*`, `lib/pdf/*` |
| **Infrastructure** | Queue, S3 | `lib/queue.ts`, `lib/s3/*` |
| **Worker** | Job execution | `worker/index.ts`, `worker/extraction-pipeline.ts` |
| **Video (preview)** | Remotion compositions | `remotion/Root.tsx`, `remotion/compositions/AssemblySteps.tsx` |

## Data flow

- **Upload path:** Browser → presigned URL → S3 (`uploads/{jobId}/manual.pdf`).
- **Result path:** Worker writes `uploads/{jobId}/scene.json`; API exposes `sceneKey` on completed jobs.

## Entry points

- **Web:** Next.js `app/` (App Router).
- **Worker:** `worker/index.ts` (requires `REDIS_URL`).
- **Remotion Studio:** `npm run remotion:studio` → `remotion/index.tsx` → `RemotionRoot` in `remotion/Root.tsx`.

## Abstractions

- **SceneJSON** — Single Zod schema (`lib/scene/schema.ts`); JSON Schema for Claude (`lib/scene/json-schema.ts`).
- **Job payload** — Validated with Zod in `lib/queue.ts` (`parseJobPayload`).
- **Upload rules** — Shared constants `lib/constants/upload.ts` (max size, MIME, queue name).

## What is not yet wired

- Full video render pipeline (Remotion uses `mockScene` in `remotion/Root.tsx`; comment notes Phase 3 for audio-driven duration).
- TTS, stitching, or final MP4 delivery — not present in worker or API responses beyond `sceneKey`.

---

*Architecture analysis: 2026-04-04*
