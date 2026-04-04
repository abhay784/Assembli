# Phase 2: LLM Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md`.

**Date:** 2026-04-04
**Phase:** 2-LLM Extraction
**Areas discussed:** Execution placement, schema extensions, token pre-flight, retries, Claude input mode (documented as recommended defaults)

---

## Session mode

`/gsd-discuss-phase 2` was run in **Cursor** without per-area `AskUserQuestion` UI. Gray areas were derived from `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/01-foundation/01-CONTEXT.md`, and existing code under `lib/scene/` and `worker/`. **Recommended POC defaults** consistent with Phase 1 architecture and stack docs were recorded in `02-CONTEXT.md`. Revise any **D-*** item there before `/gsd-plan-phase 2` if you want different tradeoffs.

---

## Where extraction runs

| Option | Description | Selected |
|--------|-------------|----------|
| BullMQ worker | S3 fetch + Claude + validate in `worker/` | ✓ |
| Next.js API route | Run LLM in request handler | |
| Separate one-off script | Manual CLI only | |

**User's choice:** (defaults) Worker-only — aligns with D-01 in CONTEXT.

---

## Schema: tools, warnings, confidence

| Option | Description | Selected |
|--------|-------------|----------|
| Per-step arrays + per-step confidence | `tools[]`, `warnings[]`, `confidence` on each step | ✓ |
| Document-level only | Single confidence + global lists | |
| Optional nullable fields | Weaker Zod guarantees | |

**User's choice:** (defaults) Per-step arrays (empty when unused) + required `confidence` \[0,1\] per step.

---

## Token pre-flight

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable threshold; fail before API | Env-tunable pages/tokens; clear user error | ✓ |
| Hard-coded only | Fixed limit in code | |
| No pre-flight | Rely on API errors only | |

**User's choice:** (defaults) Pre-flight before first extraction call; numeric threshold left to RESEARCH/calibration.

---

## Zod failure retries

| Option | Description | Selected |
|--------|-------------|----------|
| Max 2 retries (3 attempts) with validation feedback | Per roadmap success criterion | ✓ |
| Single attempt | | |
| Unlimited retries | | |

**User's choice:** (defaults) Capped at 2 retries with Zod error feedback to the model.

---

## Claude's Discretion

- Files API vs inline PDF attachment pattern, prompt structure, mocked Anthropic in tests, optional result persistence format (S3 JSON key vs Redis blob).

## Deferred Ideas

- See **Deferred Ideas** section in `02-CONTEXT.md`.
