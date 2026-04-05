# Repository Structure

**Analysis Date:** 2026-04-04

## Top level

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router: `layout.tsx`, `page.tsx`, `globals.css`, `api/jobs/` |
| `components/` | React UI; `upload/` (feature), `ui/` (primitives) |
| `lib/` | Shared server/client-safe modules: `claude/`, `scene/`, `s3/`, `pdf/`, `jobs/`, `queue.ts`, `utils.ts`, `constants/` |
| `worker/` | BullMQ worker entry + `extraction-pipeline.ts` |
| `remotion/` | Remotion entry, `compositions/`, uses `lib/scene/mock` |
| `.planning/` | GSD planning artifacts (`config.json`, phases, research) |
| `.claude/` | GSD tooling, skills, hooks (not app runtime) |
| `docker-compose.yml` | Local Redis |
| `.env.example` | Required env vars for dev |

## App Router

- `app/api/jobs/route.ts` — Create job + presign.
- `app/api/jobs/[id]/route.ts` — Job status GET.
- `app/api/jobs/[id]/enqueue/route.ts` — Post-upload enqueue.

## Library layout (`lib/`)

- `lib/claude/` — Anthropic client, model env, JSON parse helpers, `extract-scene.ts`.
- `lib/scene/` — `schema.ts`, `json-schema.ts`, `mock.ts`, `index.ts`, co-located `*.test.ts`.
- `lib/s3/` — Presign, get, put, head; tests per module.
- `lib/pdf/` — `page-count.ts`, `preflight.ts`.
- `lib/jobs/` — `upload-request.ts` validation.
- `lib/constants/upload.ts` — PDF limits and queue name.

## Components

- `components/upload/ManualUpload.tsx` — Main upload + status UI.
- `components/upload/magic-pdf.ts` — PDF sniffing helper.
- `components/ui/*` — Card, Button, Alert, Progress, etc. (shadcn-style).

## Tests

Co-located `*.test.ts` / `*.test.tsx` next to sources under `lib/`, `app/api/`, `components/` per `vitest.config.ts` `include` patterns.

## Naming

- **Routes:** Next.js conventional `route.ts` in folder segments.
- **Imports:** `@/` alias → repo root (`tsconfig.json` paths).
- **Queue:** Human-readable name `assembli-jobs` in `lib/constants/upload.ts`.

---

*Structure analysis: 2026-04-04*
