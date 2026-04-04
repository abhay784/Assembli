---
status: human_needed
phase: 02-llm-extraction
updated: 2026-04-04
---

# Phase 2 — Verification

## Automated checks (passed)

- `npm test` — Vitest (scene schema/json-schema, PDF preflight mocks, Claude extraction mocks, job routes including `sceneKey`, existing Phase 1 suites).
- `npm run build` — Next.js 15 production build.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.

## Requirement traceability

| Requirement | Evidence |
|-------------|----------|
| EXTRACT-01 | Worker `runExtractionJob`: S3 GetObject → preflight → `extractSceneFromPdfBuffer` → PutObject `scene.json`; job `returnvalue.sceneKey`. |
| EXTRACT-02 | `sceneSchema` SSOT; Claude prompt includes `sceneJsonSchema`; `safeParse` on model output. |
| EXTRACT-03 | Each step requires `confidence` (0–1) in Zod + mock + extraction contract in system prompt. |

## Success criteria (roadmap)

1. **Real IKEA-style PDF → valid SceneJSON** — Implemented in worker + Claude path; **needs human run** with real PDF, Redis, S3, and `ANTHROPIC_API_KEY`.
2. **Confidence populated by Claude** — Schema and prompt require it; **confirm on real extraction**.
3. **Oversize PDF rejected before LLM** — `assertPdfPagePreflight` + `CLAUDE_MAX_PDF_PAGES`; failure message `PDF exceeds maximum page limit`.
4. **Zod failure → capped retries** — `extractSceneFromPdfBuffer` default 3 attempts (D-08); exhausted → `Extraction failed`.

## Human verification

See `02-HUMAN-UAT.md`: end-to-end upload + worker with real env, confirm `scene.json` in S3 and `sceneKey` on GET.

Reply **approved** after completing the checklist (or report issues for gap closure).
