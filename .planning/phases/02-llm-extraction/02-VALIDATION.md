---
phase: 02
slug: llm-extraction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test && npm run typecheck` |
| **Estimated runtime** | ~30 seconds |

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
| 02-01-01 | 01 | 1 | EXTRACT-02 / EXTRACT-03 | T-02-01 | No secrets in schema files | unit | `npm test` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | EXTRACT-01 (preflight) | T-02-02 | PDF bytes only in worker memory; no logging of full buffer | unit | `npm test` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | EXTRACT-01–03 | T-02-03 | API key from env only; mocked in tests | unit | `npm test` | ✅ | ⬜ pending |
| 02-04-01 | 04 | 3 | EXTRACT-01–03 | T-02-04 | User-safe `failedReason`; no stack to client | integration/manual | `npm test` + manual worker run | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing Vitest infrastructure from Phase 1 covers baseline; no new Wave 0 install unless planner adds a new top-level test root.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real PDF → valid SceneJSON | EXTRACT-01 | Needs live Anthropic + S3 | Upload IKEA-style PDF, run worker, confirm job `completed` and `scene.json` in S3 passes `sceneSchema.parse` locally |
| Pre-flight on oversized PDF | EXTRACT-01 / success criteria | Needs crafted or real large PDF | Set low `CLAUDE_MAX_PDF_PAGES`, upload, expect `failed` with clear error before API usage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
