# Phase 2: LLM Extraction — Research

**Researched:** 2026-04-04  
**Domain:** Anthropic Messages API + native PDF, Zod boundary, BullMQ worker, S3 GetObject/PutObject, PDF page pre-flight, retry economics  
**Confidence:** HIGH for API/SDK patterns (public Anthropic docs); MEDIUM for optimal token/page thresholds on IKEA PDFs until calibrated on real files

<user_constraints>
## User Constraints (from 02-CONTEXT.md)

### Locked decisions (summary)

- **D-01–D-03:** Worker-only pipeline; single PDF per job via existing `s3Key`; Claude Messages API with native PDF (Files API optional).
- **D-04–D-05:** Extend `sceneSchema`: per-step `confidence` ∈ [0,1], `tools: string[]`, `warnings: string[]` (default empty); no string step ids.
- **D-06–D-07:** Configurable pre-flight reject before first paid extraction call; no silent truncation — fail with explanation.
- **D-08–D-09:** Max **2** retries after Zod failure (3 attempts total); feed `safeParse` issues back to model; JSON-only output path; derive JSON Schema from Zod (`zod-to-json-schema`).

### Claude’s discretion

Prompt wording, tool vs message JSON, Files API vs inline `document` block, logging/redaction, test split (mocked SDK vs integration).

</user_constraints>

<phase_requirements>
## Phase requirements

| ID | Description | Research support |
|----|-------------|------------------|
| EXTRACT-01 | Extract steps, tools, warnings from PDF via Claude | Worker downloads PDF from S3 → Messages API with `pdf` document input → map to extended step schema |
| EXTRACT-02 | Clean SceneJSON, Zod-validated | Single `sceneSchema`; `safeParse` at boundary; retries with Zod error payload |
| EXTRACT-03 | Per-step confidence | Required numeric field on each step; prompt instructs model to score structural reliability |

</phase_requirements>

## Summary

Phase 2 adds a **worker-resident extraction pipeline**: **GetObject** the uploaded manual from S3 (key from existing BullMQ payload), run **page-count pre-flight** locally, then call **Anthropic Claude** with **native PDF** support. Responses are parsed as JSON and validated with the **same Zod schema** as the rest of the app (`z.infer<typeof sceneSchema>`). On validation failure, the worker retries up to **two** additional times with the **Zod issue list** in the follow-up user message. Successful `SceneJSON` should be persisted to **S3** (e.g. `uploads/{jobId}/scene.json`) so the Next.js API stays thin and job payloads stay small; the status API can expose a **result pointer** (S3 key) or signed URL in a later polish — for POC, returning the **key** or a **boolean** `hasScene` plus key is acceptable if documented.

**Package additions:** `@anthropic-ai/sdk` (pinned per `CLAUDE.md` / STACK, e.g. **0.82.x**), `zod-to-json-schema` (Zod 3 peer), `pdf-parse` for **page count** pre-flight (already listed in STACK for text-layer probing; `numpages` is sufficient for D-06).

**Pre-flight:** After downloading the PDF buffer, run `pdf-parse` (or equivalent) to read **`numpages`**. Compare to `CLAUDE_MAX_PDF_PAGES` (env, integer, **required in worker** with a documented default only for local dev if you choose — prefer failing closed in prod if unset). If over limit, **do not** call Claude; fail job with a **short, user-safe** message (no stack traces to clients). Calibrate default against [Claude PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) limits and real IKEA-style manuals.

**Anthropic call shape (illustrative):** `messages.create` with `model` from env (e.g. `CLAUDE_MODEL=claude-sonnet-4-20250514` or project-chosen), `max_tokens` sized for long JSON, `messages: [{ role: 'user', content: [...] }]`, where `content` includes a `document` block of `type: 'document'`, `source: { type: 'base64', media_type: 'application/pdf', data: '<base64>' }` **or** a `file_id` if using Files API for reuse. Exact SDK field names must match installed `@anthropic-ai/sdk` types.

**JSON extraction:** Prefer asking the model for **JSON only** in instructions; strip optional markdown fences in code before `JSON.parse`. If the SDK supports **structured outputs** / JSON mode compatible with your model, evaluate — if not available, strict prompt + parse + Zod is the POC path per CONTEXT.

**Worker ↔ API contract:** BullMQ `failedReason` should carry **user-safe** strings for `failed` status (already returned as `error` in `app/api/jobs/[id]/route.ts`). On success, either rely on `returnvalue` (small) or **only** S3 for large JSON; avoid stuffing full SceneJSON into Redis job fields.

## Pitfalls

| Risk | Mitigation |
|------|------------|
| Passing large PDF through Next.js | Keep extraction in `worker/index.ts` only (D-01) |
| Unbounded Claude spend on bad inputs | Page pre-flight + capped retries (D-06, D-08) |
| Silent partial manuals | D-07: fail if API signals overflow / refuse |
| Schema drift | One Zod source; `zod-to-json-schema` for prompts only |
| Logging secrets | Redact API keys; avoid logging full PDF base64 |

## Open questions (execution)

1. **Default `CLAUDE_MAX_PDF_PAGES`:** Start conservative (e.g. 50–100), tune after 2–3 real IKEA PDFs.
2. **Model ID:** Store in env; document in `.env.example`.
3. **Scene result visibility:** For Phase 2 UAT, exposing `sceneS3Key` on completed jobs may be enough; presigned GET can be Phase 4.

## Validation Architecture

> Nyquist Dimension 8 — executable verification hooks for Phase 2.

### Test infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config | `vitest.config.ts` |
| Quick command | `npm test` |
| Full command | `npm test` + `npm run typecheck` |
| Focus | `lib/scene/**/*.test.ts`, `lib/pdf/**/*.test.ts`, `lib/claude/**/*.test.ts`, `worker/**/*.test.ts` (if added) |

### Automated vs manual

| Behavior | Automated | Notes |
|----------|-----------|--------|
| Zod schema accepts extended mock | Yes | Vitest on `mockScene` |
| Page pre-flight throws over limit | Yes | Unit test with mocked `numpages` or tiny PDF fixture |
| Retry loop invokes model max 3× | Yes | Mock `@anthropic-ai/sdk` |
| End-to-end Claude + real PDF | **Manual** | Requires `ANTHROPIC_API_KEY` and sample PDF; document in UAT |
| Worker processes job in dev | **Manual** | `docker compose up redis`, `npm run dev:worker`, upload flow |

### Sampling expectations

- After schema plan: `npm test` green.
- After Claude module plan: unit tests green without network.
- Before phase sign-off: one manual run with real PDF through worker.

## RESEARCH COMPLETE
