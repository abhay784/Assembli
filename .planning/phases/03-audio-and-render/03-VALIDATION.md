---
phase: 3
slug: audio-and-render
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run typecheck` |
| **Estimated runtime** | ~30–90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npm run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01 T1 | 03-01 | 1 | AUDIO-01 | T-3-01 / — | API key only in worker env | unit | `npm test` | ✅ | ⬜ pending |
| 03-02 T1–T2 | 03-02 | 2 | AUDIO-01, AUDIO-02 | T-3-02 / — | No key leakage in logs | unit | `npm test` | ✅ | ⬜ pending |
| 03-03 T1–T2 | 03-03 | 3 | VIDEO-01–03, AUDIO-02 | T-3-09 / — | Zod caps on render input | unit | `npm test -- --run lib/render/schema.test.ts && npm run typecheck` | ✅ | ⬜ pending |
| 03-04 T1–T3 | 03-04 | 4 | All | T-3-08 / — | Path guard + job JSON | unit | `npm test && npm run typecheck` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing Vitest infrastructure covers new `lib/` modules — add test files alongside new code
- [ ] No new global test harness required unless planner specifies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|---------------------|
| Audible A/V sync | AUDIO-02 | Subjective timing | Run worker with real keys; play MP4; confirm slide holds for narration |
| ElevenLabs voice quality | AUDIO-01 | External service | One full job; confirm all steps have speech |
| Final MP4 in S3 | VIDEO-01–03 | Requires S3 + full pipeline | Complete job; GetObject or presigned URL; play locally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
