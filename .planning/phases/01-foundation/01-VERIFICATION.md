---
status: human_needed
phase: 01-foundation
updated: 2026-04-04
---

# Phase 1 — Verification

## Automated checks (passed)

- `npm test` — Vitest (upload constants, scene schema, queue, S3 presign mocks, job routes, ManualUpload validation).
- `npm run build` — Next.js 15 production build.
- `npm run lint` — ESLint flat config.
- `npm run typecheck` — `tsc --noEmit`.
- `npx remotion compositions remotion/index.tsx` — lists `assembly-mock` (run on a full OS environment; headless Chrome may fail in restricted sandboxes).

## Requirement traceability

| Requirement | Evidence |
|-------------|----------|
| INGEST-01 | `ManualUpload` POST `/api/jobs` then browser PUT to presigned URL; API tests mock queue/S3. |
| INGEST-02 | Client `maxSize` + MIME + `%PDF-` magic bytes; server `validateUploadRequest` on POST. |

## Success criteria (roadmap)

1. Drag/drop PDF with clear accept/reject — implemented via react-dropzone + specified error copy.
2. SceneJSON → Remotion — `assembly-mock` composition uses `mockScene` / `SceneJSON`.
3. Job on upload + status API — POST creates job + presign; GET `/api/jobs/:id` maps BullMQ state.
4. Zod single source of truth — `SceneJSON` is `z.infer<typeof sceneSchema>` with strict root.

## Human verification

Items listed in `01-HUMAN-UAT.md` (Remotion Studio smoke, browser upload with real env, visual contract).

Reply **approved** after completing the checklist to close the Phase 1 human gate (or report issues for gap closure).
