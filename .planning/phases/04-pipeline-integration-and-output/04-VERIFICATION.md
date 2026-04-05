---
status: passed
phase: 04-pipeline-integration-and-output
completed: 2026-04-04
---

# Phase 4 — Verification

## Goal (from ROADMAP)

End-to-end product path: upload → visible progress → in-browser video preview; failures surface clearly.

## Must-haves checked

| Criterion | Evidence |
|-----------|----------|
| Job status exposes presigned `videoUrl` for valid worker `videoKey` | `lib/s3/presign-get.ts`, `app/api/jobs/[id]/route.ts`, tests in `app/api/jobs/route.test.ts` |
| Responses include `stages: null` and remain compatible with `sceneKey` | `JobStatusResponse` and GET handler |
| UI shows honest coarse pipeline when `stages` is null | `components/pipeline/PipelineStatus.tsx` |
| HTML5 video in 16:9 container; placeholders per UI-SPEC | `components/pipeline/VideoResult.tsx` |
| Completed + `videoUrl`: smooth scroll and focus to `<video>` | `components/upload/ManualUpload.tsx` (`scrollIntoView`, `focus`) |
| Failed jobs: destructive messaging + retry path | `ManualUpload.tsx` alerts + Retry status |

## Automated checks

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm run test` — pass (includes API contract tests)

## Requirement traceability

- **OUTPUT-01**: Addressed by API `videoUrl` + UI player and pipeline sections (full MP4 generation still depends on Phase 3 worker).

## Human verification

| Item | Status |
|------|--------|
| Real MP4 playback against S3 presigned URL in browser | Pending full Phase 3 render + credentials — not a regression of this phase’s code |

## Gaps found

None that block merging this phase’s planned code. End-to-end demo still requires Phase 3 to populate `videoKey` / render MP4.
