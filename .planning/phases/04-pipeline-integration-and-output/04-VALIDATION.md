---
phase: 04
slug: pipeline-integration-and-output
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-04
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` (project default) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10–30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test` and `npm run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 04-01 | 1 | OUTPUT-01 | T-presign | Presign only job-scoped keys | unit | `npm run test` | ✅ | ⬜ pending |
| 04-01-02 | 04-01 | 1 | OUTPUT-01 | T-error | No stack traces in JSON | unit | `npm run test` | ✅ | ⬜ pending |
| 04-02-01 | 04-02 | 2 | OUTPUT-01 | — | N/A UI | unit/RTL | `npm run test` | ✅ | ⬜ pending |
| 04-02-02 | 04-02 | 2 | OUTPUT-01 | — | aria-live polite | unit/RTL | `npm run test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (Vitest + Testing Library present).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Smooth scroll + focus to video on complete | OUTPUT-01 / D-02 | Browser layout APIs | Upload manual, wait for complete, confirm focus moves to player region |
| End-to-end MP4 playback | OUTPUT-01 | Needs full stack + Phase 3 | Run worker + dev server; verify `<video>` plays |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
