# External Integrations

**Analysis Date:** 2026-04-04

## Anthropic (Claude)

**Purpose:** Extract structured `SceneJSON` from uploaded PDF manuals.

**Where:**
- `lib/claude/extract-scene.ts` — `messages.create` with `document` block (`base64` PDF).
- `lib/claude/model.ts` — `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`.
- `lib/claude/parse-json-response.ts` — Parses model text to JSON.

**Notes:** Retries on invalid JSON / Zod failures (up to 3 attempts). System prompt embeds JSON Schema from `lib/scene/json-schema.ts`.

## AWS S3 (or compatible)

**Purpose:** Store uploaded PDFs, written `scene.json`, presigned browser upload.

**Where:**
- `lib/s3/presign.ts` — Presigned PUT (`presignManualUpload`), `buildManualPdfKey`, `getS3Client` (optional `AWS_S3_ENDPOINT`, path-style for MinIO).
- `lib/s3/get-object.ts` — Worker reads PDF.
- `lib/s3/put-object.ts` — Worker writes scene JSON.
- `lib/s3/head-object.ts` — Enqueue route verifies object exists before queue add.

**Env:** `AWS_REGION`, `S3_BUCKET`, optional `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, optional `AWS_S3_ENDPOINT`.

## Redis

**Purpose:** BullMQ backend for job queue.

**Where:**
- `lib/queue.ts` — `getRedisConnection()`, `getJobQueue()`; queue name `assembli-jobs` from `lib/constants/upload.ts`.

**Env:** `REDIS_URL` (required for API enqueue paths and `worker/index.ts`).

## In-repo API surface (not third-party, but “integration points”)

| Surface | File | Role |
|---------|------|------|
| `POST /api/jobs` | `app/api/jobs/route.ts` | Create job id, presign upload |
| `POST /api/jobs/[id]/enqueue` | `app/api/jobs/[id]/enqueue/route.ts` | Verify S3 object, enqueue BullMQ |
| `GET /api/jobs/[id]` | `app/api/jobs/[id]/route.ts` | Poll job status, `sceneKey` on success |

## Not integrated in code (roadmap / docs)

- **ElevenLabs** — Mentioned in project vision (`CLAUDE.md`); no package or calls in `package.json` yet.
- **DOCX** — `mammoth` not in dependencies; upload validation is PDF-only (`lib/jobs/upload-request.ts`).
- **Remotion Lambda / hosted render** — Local/CLI Remotion only; no AWS Lambda render pipeline in repo.

---

*Integrations analysis: 2026-04-04*
