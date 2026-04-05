---
phase: 4
slug: pipeline-integration-and-output
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | OUTPUT-01 | — | N/A | unit | `npx vitest run lib/s3/presign.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | OUTPUT-01 | — | Path traversal guard on job ID | unit | `npx vitest run app/api/jobs/route.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | OUTPUT-01 | — | 409 for non-completed job | unit | `npx vitest run app/api/jobs/route.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | OUTPUT-01 | — | N/A | unit | `npx vitest run components/upload/ManualUpload.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | OUTPUT-01 | — | N/A | unit | `npx vitest run components/upload/ManualUpload.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/s3/presign.test.ts` — add `presignVideoDownload` unit test (mock `getSignedUrl`, assert called with `GetObjectCommand`)
- [ ] `app/api/jobs/[id]/video-url/route.test.ts` — route tests: completed → 200, non-completed → 409, not-found → 404
- [ ] `components/upload/ManualUpload.test.tsx` — add tests: `<video>` renders when videoUrl set, fetches `/video-url` once on completed

*Existing infrastructure covers framework and config — only test files need adding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Video plays in browser with audio synced | OUTPUT-01 | Requires real S3/MinIO + Remotion-rendered MP4 + browser | Upload a PDF with worker running, wait for completion, verify `<video>` plays |
| CORS allows video streaming from S3 | OUTPUT-01 | Deployment config, not code | Check browser console for CORS errors when video loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
