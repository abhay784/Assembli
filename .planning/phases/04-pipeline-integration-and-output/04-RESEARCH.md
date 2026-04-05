# Phase 4 — Technical Research

**Phase:** Pipeline Integration and Output  
**Question:** What do we need to know to plan end-to-end pipeline UI + job API extensions well?

## RESEARCH COMPLETE

---

## 1. Current integration points

| Layer | Location | Today |
|-------|----------|--------|
| Job GET | `app/api/jobs/[id]/route.ts` | `status`, `error`, `updatedAt`, `sceneKey` from BullMQ `returnvalue` |
| Client poll | `components/upload/ManualUpload.tsx` | `fetch` every 2s until terminal; inline status copy in success `Alert` |
| Worker return | `worker/extraction-pipeline.ts` (via `worker/index.ts`) | `{ sceneKey }` only until Phase 3 adds render output |

Phase 4 must **not** assume Phase 3 is merged before UI work: the API should expose **`videoUrl: string \| null`** and optional **`stages`** when data exists; the UI must handle **`videoUrl === null`** with honest placeholder copy per `04-UI-SPEC.md`.

---

## 2. Presigned GET for browser video

- **Pattern:** Mirror `presignManualUpload` in `lib/s3/presign.ts`: `GetObjectCommand` + `@aws-sdk/s3-request-presigner` `getSignedUrl`, short TTL (e.g. 900s), `ResponseContentType: video/mp4` when key ends with `.mp4` (optional but improves `<video>` behavior).
- **Security:** Return **presigned URL only** to the client for the **requested job’s** object; never echo raw `AWS_*` secrets. Validate `videoKey` in `returnvalue` belongs to `uploads/{jobId}/` before signing.
- **Naming:** Worker Phase 3 should persist something like `uploads/{jobId}/output.mp4` and set `returnvalue.videoKey`; GET maps to `videoUrl` after presign.

---

## 3. Coarse vs granular pipeline UI (D-01)

- Until the API provides per-stage payloads, response includes **`stages: null`** (or omit). Client renders **one** row: spinner + “Working on your video…” (`04-UI-SPEC.md`).
- When Phase 3+ adds structured progress, extend GET with `stages[]` without breaking D-01 (only show checkmarks for server-reported states).

---

## 4. UX: focus and failure (D-02, D-03)

- On transition to `completed` with a usable `videoUrl`, **`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`** on a ref attached to the video wrapper; then **`focus()`** on the `<video>` element (or a visible “Play video” control if focusing `<video>` is unreliable in test browsers).
- On `failed`, primary CTA path: scroll/anchor to upload card and copy emphasizing **upload another manual** (`04-CONTEXT.md`).

---

## 5. Testing strategy

- **API:** Extend existing Vitest suite in `app/api/jobs/route.test.ts` (already mocks `getJobQueue`) with cases for `videoUrl` when `returnvalue.videoKey` present and presign mocked.
- **UI:** Prefer RTL tests for `PipelineStatus` / `VideoResult` strings and `aria-live` region; keep **manual smoke** for scroll/focus (hard to assert portably).

---

## Validation Architecture

Phase 4 validation uses **Vitest** (`npm test`) as the automated gate:

| Dimension | Approach |
|-----------|----------|
| API contract | Unit tests for `GET` JSON shape (`videoUrl`, `stages`, backward-compatible `sceneKey`) |
| UI copy/structure | RTL tests for section titles and error branches per `04-UI-SPEC.md` |
| Security | Plans include threat_model for presigned URL scope and error sanitization |
| Manual | Full path: upload PDF → job completes → video plays in browser (requires Redis, worker, S3, Phase 3 render or mocked `videoKey`) |

**Wave 0:** Not required — Vitest and Testing Library already in `package.json`.

---

## 6. Dependencies on Phase 3

- **Hard dependency for real MP4:** Worker must write `videoKey` (or equivalent) into `returnvalue` and upload MP4 to S3.
- **Phase 4 can ship first** with `videoUrl: null` and placeholder UI; merging order should still leave **one** coherent story: Phase 3 implements bytes; Phase 4 exposes URL + player.

---

*Research for `/gsd-plan-phase 4` — 2026-04-04*
