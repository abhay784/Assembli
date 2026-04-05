# Technology Stack

**Analysis Date:** 2026-04-04

## Languages

**Primary:**
- **TypeScript** (~5.8) — Application code across `app/`, `lib/`, `components/`, `worker/`, `remotion/`, and tests.

**Secondary:**
- **CSS** — Global styles in `app/globals.css`; Tailwind v4 via `@tailwindcss/postcss`.
- **JSON** — Scene payloads, `components.json` (shadcn), Remotion default props.

## Runtime

**Environment:**
- **Node.js** — Required for Next.js dev/build, Vitest, `tsx` worker, and Remotion CLI. (Pin a current LTS in deployment docs if not already.)

**Package Manager:**
- **npm** — `package-lock.json` present at repo root.

## Frameworks

**Core:**
- **Next.js** (^15.3, App Router) — UI and API routes under `app/`.
- **React** (^19) — Client components (e.g. `components/upload/ManualUpload.tsx`).

**Video / animation:**
- **Remotion** (4.0.445) — Compositions in `remotion/`; `remotion.config.ts`, `@remotion/cli` for `npm run remotion:studio`.

**Background jobs:**
- **BullMQ** (^5.73) + **ioredis** (^5.6) — Queue in `lib/queue.ts`; worker in `worker/index.ts`.

**LLM:**
- **@anthropic-ai/sdk** (0.82.0) — PDF → SceneJSON in `lib/claude/extract-scene.ts`.

**Validation:**
- **Zod** (^3.25) — Scene schema (`lib/scene/schema.ts`), job payloads (`lib/queue.ts`), API bodies.

**Storage:**
- **@aws-sdk/client-s3** + **@aws-sdk/s3-request-presigner** — S3 client and presigned PUT in `lib/s3/`.

**PDF:**
- **pdf-parse** (^1.1.4) — Page count / preflight in `lib/pdf/`.

**UI:**
- **Tailwind CSS** (^4.2) + **shadcn-style** primitives — `components/ui/*`, `components.json`, `class-variance-authority`, `tailwind-merge`, `clsx`.
- **@base-ui/react**, **lucide-react**, **react-dropzone** (^14.3).

**Testing:**
- **Vitest** (^3.1) + **@vitejs/plugin-react** — `vitest.config.ts`, `vitest.setup.ts`.
- **@testing-library/react** + **jsdom** — Component tests (e.g. `ManualUpload.test.tsx`).

**Lint / types:**
- **ESLint** 9 + **eslint-config-next** — `npm run lint`.
- **TypeScript** `strict: true` — `tsconfig.json`.

## Key Dependencies

| Package | Role |
|---------|------|
| `next` | App shell, `/api/*` routes |
| `bullmq` / `ioredis` | Async extraction jobs |
| `@anthropic-ai/sdk` | Claude Messages API with PDF document block |
| `@aws-sdk/*` | S3 upload, download, head |
| `remotion` / `@remotion/cli` | Video composition (mock data today) |
| `zod` / `zod-to-json-schema` | SceneJSON contract + JSON Schema for prompts |
| `uuid` | Job IDs for uploads |

## Configuration

**Environment:**
- Documented in `.env.example`: `REDIS_URL`, AWS/S3 vars, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `CLAUDE_MAX_PDF_PAGES`, optional `AWS_S3_ENDPOINT` (MinIO).

**Build / tooling:**
- `next.config.ts` — minimal export.
- `tsconfig.json` — `paths`: `@/*` → repo root.
- `remotion.config.ts` — Remotion bundler config.
- `docker-compose.yml` — Local Redis (referenced in `.env.example`).

## Platform Requirements

**Development:**
- Node + npm; Redis (e.g. `docker compose up -d redis`); S3-compatible storage for presigned uploads; worker: `npm run dev:worker`.

**Production (POC):**
- Split processes typical: Next.js host + separate worker process; S3 + Redis reachable from both.

---

*Stack analysis: 2026-04-04*
