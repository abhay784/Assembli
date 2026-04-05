# Concerns & Technical Debt

**Analysis Date:** 2026-04-04

## Product / scope

- **POC scope** — End-to-end “manual → scene JSON in S3” is implemented; **full explainer video** (Remotion render, voiceover, final asset) is **not** completed in this codebase snapshot (`remotion/Root.tsx` uses **mock** scene only).
- **PDF-only uploads** — DOCX path from product vision is not implemented (no `mammoth`; validation rejects non-PDF).

## Operational

- **Two-process dev** — App and `npm run dev:worker` must both run for queue processing; easy to forget locally.
- **Redis / S3 required** — Upload and enqueue fail without proper `.env`; errors are generic in places (“Could not prepare upload”) — see `.env.example` troubleshooting lines.

## Security

- **No auth** — Job creation and status are unauthenticated (acceptable for v1 POC if network-trusted; risky if exposed publicly).
- **Secrets in env only** — Good; ensure `.env` never committed (standard `.gitignore` expectation).

## Reliability

- **Claude extraction** — Bounded retries; failures surface as job `failed` with message; no partial results persisted.
- **BullMQ job id** — Uses UUID as `jobId` string; must remain URL-safe (routes validate path chars).

## Performance / cost

- **Large PDFs** — `CLAUDE_MAX_PDF_PAGES` preflight rejects over-limit PDFs before API spend; still sends full PDF to Claude within limit.
- **Polling** — UI polls job status; no SSE/WebSocket observed.

## Maintainability

- **TODO/FIXME grep** — No matches in `*.ts`/`*.tsx` at mapping time; debt is more architectural (video pipeline) than inline hacks.

## Remotion

- **Mock composition** — `assembly-mock` duration tied to `mockScene.steps.length`; real pipeline must swap in dynamic props and likely audio-driven duration (noted in `remotion/Root.tsx`).

---

*Concerns analysis: 2026-04-04*
