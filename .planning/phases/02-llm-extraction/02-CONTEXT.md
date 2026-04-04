# Phase 2: LLM Extraction - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers: **Claude-powered extraction** from a **real uploaded PDF** (already in S3 from Phase 1) into **Zod-validated `SceneJSON`**, including **per-step confidence** (EXTRACT-03), with **token pre-flight** rejection before any paid LLM call and **capped validation retries** (max 2) on Zod failure. Requirements: **EXTRACT-01**, **EXTRACT-02**, **EXTRACT-03**.

Out of scope for Phase 2: ElevenLabs, Remotion render of extracted data in the worker (Phase 3), in-browser video preview (Phase 4), DOCX (v2 **INGEST-04**), simplifying prose beyond structural extraction (**EXTRACT-04** / v2).

</domain>

<decisions>
## Implementation Decisions

### Execution placement and inputs

- **D-01:** **Worker-only extraction** — The BullMQ worker (not Next.js route handlers) performs download-from-S3, Claude calls, validation, and job status updates. Next remains the producer of jobs and optional lightweight status reads only; no `@remotion/bundler` and no heavy PDF buffering in API routes.
- **D-02:** **Single PDF per job** — Use the existing job payload (`jobId`, `s3Key`, `contentType`, `sizeBytes`). Worker uses `s3Key` to fetch bytes from S3 (or stream) for Claude. No new upload path in Phase 2.
- **D-03:** **Claude document input** — Use the **Anthropic Messages API** with **native PDF** support (per official Claude PDF docs). Prefer **Files API** / file reference for reuse within a conversation when it reduces tokens vs re-uploading; exact SDK pattern is **Claude's discretion** as long as PDF pages stay within product limits and errors are handled.

### Schema and EXTRACT-01 / EXTRACT-03

- **D-04:** **Extend `sceneSchema` in Phase 2** — Phase 1 minimal `steps` + structured `parts` remains the core. Add:
  - **`confidence` on each step** — number in **\[0, 1\]**, required for every step after extraction (EXTRACT-03). Semantics: model-estimated reliability of that step’s structured content (not a legal guarantee).
  - **`tools` and `warnings`** — EXTRACT-01 requires extraction of tools and warnings. Model as **arrays of strings** on **each step** (`tools: string[]`, `warnings: string[]`), defaulting to **empty arrays** when none apply, so Zod stays strict and Remotion can ignore them until Phase 3+.
- **D-05:** **Preserve D-02 from Phase 1** — Still **no separate string step id**; ordering is **array index only**. Titles/captions/parts remain the primary Remotion contract.

### Token pre-flight and cost guards

- **D-06:** **Reject before first extraction call** — If estimated input size (pages × per-page policy or documented token estimate) exceeds a **configurable threshold**, mark job failed with a **clear, user-safe message** (no stack trace to client). Exact threshold value is **not** locked here — **calibrate in RESEARCH** against real IKEA-style PDFs and Anthropic limits; store in env (e.g. `CLAUDE_MAX_PDF_PAGES` or token budget) for tuning without code change.
- **D-07:** **No silent truncation** — If the model or API cannot represent the full manual within limits, **fail the job** with explanation rather than silently dropping pages.

### Zod validation and retries

- **D-08:** **Max 2 retries** (three attempts total) when `sceneSchema.safeParse` fails after a model response. On each retry, send the **validation errors** (paths + messages) back to Claude with instruction to emit **correct JSON only**. After final failure, persist **failed** status and a **short error summary** for the UI (aligned with Phase 4 patterns later).
- **D-09:** **Output contract** — Model must return **JSON only** (no markdown fences in final parse path, or strip in code) matching extended `sceneSchema`. Use **zod-to-json-schema** (or equivalent) derived from the same Zod source for the prompt/tool schema.

### EXTRACT-02 alignment

- **D-10:** **Single source of truth** — `SceneJSON` remains **`z.infer<typeof sceneSchema>`** only; no parallel hand-written interfaces.

### Claude's Discretion

- Prompt wording, use of `tools` / `structured outputs` vs raw JSON-in-message, chunking strategy for very long PDFs (if ever allowed after D-06/D-07), and exact Anthropic SDK calls (Files API vs inline PDF blocks).
- Logging/redaction of prompts and responses in dev vs prod.
- Unit vs integration test split for mocked Anthropic client.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and requirements

- `.planning/ROADMAP.md` — Phase 2 goal, success criteria (real PDF → valid SceneJSON, confidence, pre-flight, retries).
- `.planning/REQUIREMENTS.md` — **EXTRACT-01**, **EXTRACT-02**, **EXTRACT-03**.
- `.planning/PROJECT.md` — Vision; Claude as LLM; v1 POC scope.

### Prior phase contracts

- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01–D-04 (minimal schema then, extended in Phase 2 per D-04/D-05 above).
- `.planning/phases/01-foundation/01-RESEARCH.md` — Pitfalls (PDF not through Next body), stack pins, optional `zod-to-json-schema` note.
- `lib/scene/schema.ts` — Current Zod schema to extend.
- `lib/queue.ts` — Job payload shape; worker entry expectations.

### Stack and product rules

- `.planning/research/STACK.md` — `@anthropic-ai/sdk`, BullMQ worker, Zod 3.x boundary.
- `CLAUDE.md` — Project summary and constraints.

### External (implementers)

- [Claude PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — page limits, Files API, pricing implications.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `lib/scene/schema.ts`, `mock.ts`, `index.ts` — extend schema; update mock for new fields in tests/Studio.
- `worker/index.ts` — replace stub processor with extraction pipeline stages (fetch S3 → preflight → Claude → validate → update job).
- `lib/queue.ts` — `parseJobPayload`; may extend job `data` later if needed (prefer keeping metadata-only if possible).
- `app/api/jobs/[id]/route.ts` — status mapping; may need new substates or error field content for extraction failures.

### Established Patterns

- Zod `.strict()` at scene root for LLM boundary; Vitest for schema and pure helpers.
- S3 access via env-aligned `S3Client` pattern from `lib/s3/presign.ts` (worker may share client factory).

### Integration Points

- Jobs created after Phase 1 upload → worker picks up → writes result to durable store (S3 JSON and/or Redis fields — **planner decides** minimal POC) and marks BullMQ job complete/failed.

</code_context>

<specifics>
## Specific Ideas

- Target manuals: **IKEA-style** multi-page assembly PDFs; pre-flight threshold should be validated against **real samples** before locking a production number.
- Confidence is for **downstream trust UX** in later phases, not a statistical certification.

</specifics>

<deferred>
## Deferred Ideas

- **DOCX ingestion** — v2 **INGEST-04**.
- **Plain-language simplification** beyond structure — **EXTRACT-04**.
- **Parallel per-chunk extraction merge** — only if D-06/D-07 cannot be met with single-pass; would be a significant design spike → backlog unless research proves necessary.

### Reviewed Todos (not folded)

- None (`todo match-phase` returned no matches).

</deferred>

---

*Phase: 02-llm-extraction*
*Context gathered: 2026-04-04*
