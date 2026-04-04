---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (recommended in 01-RESEARCH.md; confirm in Wave 0) |
| **Config file** | `vitest.config.ts` — none yet (greenfield; Wave 0 installs) |
| **Quick run command** | `npm test` (to be wired in Wave 0) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (target once suite exists) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run` (or project quick equivalent)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | INGEST-01 / INGEST-02 | — | N/A until plans exist | — | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Populate rows when PLAN.md tasks are finalized; align with `## Validation Architecture` in `01-RESEARCH.md`.*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` + `npm test` script
- [ ] `lib/scene/schema.test.ts` (or equivalent path) — happy path + invalid fixtures for Zod scene schema
- [ ] API route tests with mocked `@aws-sdk/*` and Redis/BullMQ doubles (or test Redis)
- [ ] `@testing-library/react` for upload dropzone rejection paths (INGEST-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Remotion Studio mock preview | Roadmap success #2 | Requires Remotion dev server | Run `npx remotion studio`; load composition with mock SceneJSON; confirm structure matches schema |
| S3 browser PUT | INGEST-01 | Real bucket + CORS | Create job via API; PUT PDF with presigned URL from app origin; confirm object in bucket |
| Worker Redis connection | Roadmap success #3 | Live Redis | Run `tsx worker/index.ts`; confirm processor connects and stub updates job state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
