# Phase 1: Foundation - Research

**Researched:** 2026-04-04  
**Domain:** Next.js 15 App Router, Remotion 4, Zod scene schema, S3 presigned upload, BullMQ/Redis worker scaffold, upload UX  
**Confidence:** HIGH (core stack verified against npm + official Remotion/AWS docs); MEDIUM (exact Next.js body limits — platform-dependent; see Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**SceneJSON schema (Zod)**

- **D-01:** **Minimal breadth** — The Phase 1 schema includes only fields required for Remotion mock compositions and validation. Additional fields (e.g. tools, warnings, diagram refs, per-step confidence) are **not** added ahead of implementation; they arrive when their consuming phase ships.
- **D-02:** **Step identity** — Steps are ordered by **array index only** (0..N-1). No stable string id per step in Phase 1; step counter and ordering derive from position in the `steps` (or equivalent) array.
- **D-03:** **Per-step visuals** — Mock scenes use **structured parts** with **typed props** (e.g. id, label, position, rotation — exact shape to be defined in planning) so templates remain predictable and type-safe. No “single opaque JSON blob” or caption-only placeholder for visuals.

**Remotion preview workflow**

- **D-04:** **Remotion Studio only for preview** — Developers iterate on compositions with `npx remotion studio` (or project equivalent) as a **separate** process from the Next.js dev server. Phase 1 does **not** add an embedded in-app preview route in Next.js for mock compositions.

### Claude's Discretion

- Exact Zod field names, part prop enums, and composition file layout are left to planning/implementation as long as D-01–D-03 are satisfied.
- Upload UX beyond requirements (copy, max size bytes) was not discussed here — planner aligns with INGEST-01/02 and existing stack docs.

### Deferred Ideas (OUT OF SCOPE)

- **Upload limits & errors** — Max PDF size, rejection messaging tone, PDF-only vs future DOCX hint (not discussed; still governed by INGEST-01/02).
- **Job status API** — Polling vs SSE, status granularity (not discussed).
- **Local object storage** — S3 vs MinIO/local for dev (not discussed).
- **Embedded Remotion preview in Next** — Explicitly out for Phase 1 per D-04; could be a later phase if stakeholders need in-browser mock preview without Studio.

### Reviewed Todos (not folded)

- None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INGEST-01 | User can upload a furniture assembly manual via drag-and-drop (PDF) | `react-dropzone` + Next.js page/route UI; presigned PUT flow to S3 after job creation; clear accept/reject UX |
| INGEST-02 | System validates uploaded file type and size before processing | Client: `accept`, `maxSize`, optional magic-byte check (`%PDF-`); server: enforce same rules when issuing presigned URL (content-type, max size in policy or post-validate metadata) |
</phase_requirements>

## Summary

Phase 1 is a **greenfield** foundation: one shared **Zod** schema is the single source of truth for `SceneJSON`, with **TypeScript types inferred** from that schema and consumed by **Remotion 4** compositions (mock data only) and, later, the worker. Preview is **Remotion Studio only** (D-04), run as a second dev process alongside `next dev`.

Upload and job orchestration should **not** stream large PDF bytes through Next.js route handlers. Use **S3 presigned URLs** (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) so the browser uploads directly to object storage; the API creates a **job id**, returns presigned data, and exposes a **polling-friendly status** endpoint. **BullMQ** with **Redis** provides the queue and durable job state for a POC without introducing Postgres in Phase 1; a **separate Node process** (e.g. `tsx`) hosts the worker scaffold, aligned with the project rule that **Remotion’s bundler must not run inside Next.js API routes** [CITED: https://www.remotion.dev/docs/miscellaneous/nextjs].

**Primary recommendation:** Use a **single-package repo** (one root `package.json`) with clear boundaries: Next.js App Router under `app/`, shared `scene` module (Zod + inferred types), `remotion/` entry for Studio, and `worker/` run via `tsx` — add **npm/pnpm workspaces** only if shared-package friction appears.

## Project Constraints (from CLAUDE.md)

The planner and implementers must honor:

- **LLM:** Claude API (Phase 2+; not Phase 1).
- **Animation:** Remotion; **2D exploded-view only**, no 3D.
- **Voice:** ElevenLabs (Phase 3+; not Phase 1).
- **Scope:** v1 is a POC demo, not production-hardened.
- **Architecture:** Next.js + **separate** long-running worker for anything involving `@remotion/bundler` / heavy pipelines; **do not** use `@remotion/bundler` inside Next.js API routes — Webpack-in-Webpack conflict [CITED: https://www.remotion.dev/docs/miscellaneous/nextjs].
- **File storage:** S3 (or compatible); **presigned URLs** for browser upload to avoid routing large bodies through serverless/route limits [project STACK — `.planning/research/STACK.md`].
- **GSD workflow:** Prefer GSD entry points for repo edits (`/gsd-quick`, `/gsd-debug`, `/gsd-execute-phase`) unless the user explicitly bypasses.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | **15.x** (pin `next@15`, e.g. **15.5.14** latest on 15 line) | App Router, route handlers, UI | Matches roadmap; unscoped `next` **latest** is **16.2.2** [VERIFIED: npm registry] — explicitly **avoid accidental major** by pinning 15. |
| react / react-dom | match Next peer | UI | Required by Next 15. |
| remotion | **4.0.445** | Compositions, Studio, shared types with React | Pinned in project STACK; matches `npm view remotion version` [VERIFIED: npm registry]. |
| @remotion/cli | lockstep with remotion | `remotion studio`, bundling | Same major/minor as `remotion`. |
| zod | **^3.25.x** (e.g. **3.25.76**) | SceneJSON validation + inference | Project STACK specifies Zod 3.x; `zod@latest` is **4.3.6** [VERIFIED: npm registry] — Phase 1 should **not** upgrade to 4 unless planned. |
| bullmq | **5.73.0** | Job queue | `npm view bullmq version` [VERIFIED: npm registry]. |
| ioredis | **5.10.1** | Redis client for BullMQ | BullMQ docs/examples standard pairing [ASSUMED: ecosystem convention]. |
| @aws-sdk/client-s3 | **3.1024.0** | S3 API (PutObject, head, etc.) | [VERIFIED: npm registry]. |
| @aws-sdk/s3-request-presigner | **3.1024.0** | Presigned PUT/GET URLs | [VERIFIED: npm registry]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dropzone | **15.0.0** | Drag-and-drop, `accept`, `maxSize` | INGEST-01/02 [VERIFIED: npm registry]. |
| uuid | **13.0.0** | Job id, S3 key prefix | [VERIFIED: npm registry]; note major bump from STACK’s “9.x” mention — use current major. |
| tsx | **4.21.0** | Run `worker` TypeScript entry | [VERIFIED: npm registry]. |
| zod-to-json-schema | **3.25.2** | Emit JSON Schema from Zod for future Claude prompts | Phase 2 prep only; peer `zod: ^3.25.28 \|\| ^4` [VERIFIED: npm registry]. |
| dotenv | latest compatible | Local env loading for worker | Worker process outside Next. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single package | pnpm workspaces (`apps/web`, `packages/scene`, `apps/worker`) | Cleaner boundaries at cost of tooling setup; defer until import cycles or CI pain. |
| Redis-only job metadata | Postgres + BullMQ | Stronger querying/audit; unnecessary for Phase 1 POC per roadmap. |
| Presigned POST | Presigned PUT | Both valid; PUT + known key is simple for PDF binary upload. |

**Installation (illustrative):**

```bash
npm install next@15 react react-dom
npm install remotion @remotion/cli @remotion/bundler
npm install zod@3 bullmq ioredis
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install react-dropzone uuid
npm install -D tsx typescript
npm install -D zod-to-json-schema
```

**Version verification:** Versions in the tables above were checked with `npm view <pkg> version` on 2026-04-04 [VERIFIED: npm registry].

## Architecture Patterns

### Recommended layout: single package

```text
.
├── app/                      # Next.js App Router (UI + route handlers)
├── lib/
│   ├── scene/                # Zod schema, SceneJSON type, mock fixtures
│   └── jobs/                 # Optional: job id helpers, status mapping
├── remotion/                 # Remotion entry, Root.tsx, compositions
│   ├── Root.tsx
│   ├── compositions/
│   └── public/               # optional static assets for Remotion
├── worker/
│   └── index.ts              # BullMQ Worker + stub processor
├── remotion.config.ts
├── next.config.ts
└── package.json              # scripts: dev, dev:worker, remotion:studio
```

**Why not monorepo first:** One `SceneJSON` module imported from `app`, `remotion`, and `worker` avoids workspace bootstrap overhead while meeting Phase 1 success criteria. Promote to workspaces when packaging or deploy split demands it.

### Pattern: Zod → TypeScript (single source of truth)

**What:** Define `sceneSchema` with Zod; export `type SceneJSON = z.infer<typeof sceneSchema>`.

**When:** All code that touches scene data imports types from this module — Remotion `defaultProps`, API validation (Phase 2+), worker (Phase 3+).

**Example:**

```typescript
// Source: Zod docs pattern — https://zod.dev/
import { z } from "zod";

const partSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  rotationDeg: z.number(),
});

const stepSchema = z.object({
  title: z.string(),
  caption: z.string(),
  parts: z.array(partSchema),
});

export const sceneSchema = z.object({
  steps: z.array(stepSchema),
});

export type SceneJSON = z.infer<typeof sceneSchema>;
```

**Phase 2 prep (optional in Phase 1):** `zodToJsonSchema(sceneSchema)` from `zod-to-json-schema` for tool/prompt contracts — no Claude calls required yet [VERIFIED: npm peerDependencies for zod-to-json-schema].

### Pattern: Remotion 4 registration + mock props

**What:** In `remotion/Root.tsx`, register `<Composition>` components with `id`, `component`, `durationInFrames`, `fps`, `width`, `height`, and `defaultProps` typed as `SceneJSON` (or a slice).

**When:** D-04 — developers run `npx remotion studio` (or `npm run remotion:studio`) separately from Next.js [CITED: https://www.remotion.dev/docs/terminology/composition].

**Anti-patterns:**

- **Embedding Studio in Next route** in Phase 1 — excluded by D-04.
- **Opaque `z.record` for visuals** — violates D-03; use discriminated unions or fixed part shapes.

### Pattern: S3 presigned upload (App Router)

**What:**

1. `POST /api/jobs` (or `/api/upload/session`) creates `jobId`, stores initial job state in Redis/BullMQ, returns `{ jobId, uploadUrl, headers, key }`.
2. Browser `fetch(uploadUrl, { method: "PUT", body: file, headers })` — no PDF through Next body.
3. Optional: `HEAD` object or S3 event later; Phase 1 can stub “upload received” in worker.

**CORS:** Bucket CORS must allow browser `Origin` (dev: `http://localhost:3000`), method `PUT`, and headers used (e.g. `Content-Type`) [CITED: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html].

### Pattern: BullMQ worker scaffold

**What:** `new Worker("assembli-jobs", processor, { connection: redis })` in `worker/index.ts`; processor calls `job.updateProgress` or updates custom Redis keys; use **same** queue name string as producer in Next.

**When:** Phase 1 stub — e.g. transition `queued → completed` with delay or noop; wire real pipeline in later phases.

### Pattern: Status API (polling)

**What:** `GET /api/jobs/:id` returns JSON:

```json
{
  "id": "uuid",
  "status": "queued" | "processing" | "completed" | "failed",
  "error": null,
  "updatedAt": "2026-04-04T12:00:00.000Z"
}
```

Map from BullMQ `Job` state (`waiting`, `active`, `completed`, `failed`, …) to the stable enum above for the UI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Queue + retries + visibility | Custom Redis lists | BullMQ | At-least-once, stalled job recovery, UI-tunable concurrency [ASSUMED: library features]. |
| S3 signing | DIY SigV4 string math | `@aws-sdk/s3-request-presigner` | Correctness + maintenance [VERIFIED: STACK]. |
| Dropzone a11y / DnD edge cases | Raw drag events only | `react-dropzone` | Keyboard, file picking, `accept` integration. |
| TS types parallel to Zod | Duplicate interfaces | `z.infer<typeof schema>` | Drift breaks renders silently. |

**Key insight:** The dangerous pitfall is **two schemas** (TS + runtime) — Phase 1 success criterion #4 forbids that.

## Common Pitfalls

### Pitfall 1: Running `@remotion/bundler` inside Next.js route handlers

**What goes wrong:** Build/runtime failures; Webpack bundled inside Webpack.

**Why:** Official Remotion Next.js doc states bundler cannot be used inside an API route [CITED: https://www.remotion.dev/docs/miscellaneous/nextjs].

**How to avoid:** Worker or CLI process only for bundling/rendering; Next routes enqueue work and return status.

### Pitfall 2: Uploading large PDFs through Next.js body

**What goes wrong:** 413 errors, timeouts, memory pressure on serverless.

**Why:** Serverless and edge limits apply even when “it works on localhost.”

**How to avoid:** Presigned direct-to-S3; API only returns metadata + URLs [project STACK].

### Pitfall 3: Trusting browser MIME type alone

**What goes wrong:** `.exe` renamed to `.pdf` passes `accept`.

**Why:** `File.type` is hint-only.

**How to avoid:** Per INGEST-02, add **magic-byte** check (`new Uint8Array(buf, 0, 5)` → ASCII `%PDF-`) before calling presign; mirror checks server-side when validating job readiness.

### Pitfall 4: BullMQ job payload too large

**What goes wrong:** Redis memory bloat if embedding file bytes in `job.data`.

**Why:** BullMQ serializes `data` to Redis.

**How to avoid:** Store **S3 key + jobId + contentType + size** only; worker fetches from S3.

### Pitfall 5: Zod 4 accidental upgrade

**What goes wrong:** Breaking schema API changes while STACK assumes 3.x.

**Why:** `npm install zod` resolves to 4.x today [VERIFIED: npm registry].

**How to avoid:** Pin `zod@3` in `package.json`.

## Code Examples

### Presigned PUT (server sketch)

```typescript
// Source pattern: AWS SDK v3 PutObjectCommand + getSignedUrl — AWS SDK docs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({ region: process.env.AWS_REGION });

export async function presignPdfUpload(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 900 });
}
```

### BullMQ producer + worker names

```typescript
// Source: BullMQ guide patterns — https://docs.bullmq.io/
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!);
export const ASSEMBLI_QUEUE = "assembli-jobs";

export function createQueue() {
  return new Queue(ASSEMBLI_QUEUE, { connection });
}

export function createWorker(processor: Parameters<typeof Worker>[1]) {
  return new Worker(ASSEMBLI_QUEUE, processor, { connection });
}
```

*(Exact `Worker` constructor typing may vary by BullMQ version — adjust per installed types.)*

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bull` (legacy) | `bullmq` | Maintained successor | Use BullMQ only [project STACK]. |
| Upload via API body only | Presigned direct to S3 | Common serverless pattern | Required for scalable PDF ingest. |
| Zod 3 “latest” tag | Zod 4 default on npm | 2025+ | Pin Zod 3 until explicit migration [VERIFIED: npm dist-tags]. |

**Deprecated/outdated:**

- **Duplicated SceneJSON interfaces** — replace with `z.infer`.
- **Rendering inside Vercel functions for long videos** — timeouts; out of scope for Phase 1 anyway.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ioredis is the default Redis client pairing for BullMQ in this ecosystem | Standard Stack | Wrong client config → connection failures; fix by following BullMQ install doc for version. |
| A2 | Next.js route handlers remain unsuitable for multi‑MB PDF buffering in deployed POC | Pitfalls | If deploy target raises limits, presigned approach still valid; only rationale shifts. |
| A3 | `GET /api/jobs/:id` mapping from BullMQ states is sufficient for Phase 1 “queryable status” | Status API | If product needs rich step progress, extend payload in later phase. |

**If this table were empty:** All claims would be verified or cited — the three above remain assumptions pending BullMQ/Next deploy doc cross-check.

## Open Questions (RESOLVED)

Planning closed these for Phase 1 execution (see `01-UI-SPEC.md`, `01-05-PLAN.md`, `01-06-PLAN.md`).

1. **Exact max PDF bytes for INGEST-02** — **RESOLVED:** **25 MB** (`26_214_400` bytes) demo default; enforced client-side (react-dropzone + UI copy) and server-side at presign (`01-05`); S3 bucket policy optional hardening deferred.

2. **Next.js / hosting body limits for non-upload JSON routes** — **RESOLVED:** Job creation stays **metadata-only JSON** (no PDF in route body); presigned browser PUT carries the binary. Re-verify host limits only at deploy if adding larger JSON payloads.

3. **Local S3 (MinIO) vs real AWS in dev** — **RESOLVED:** **Optional** S3-compatible endpoint via standard AWS SDK env overrides (`AWS_ENDPOINT_URL` / region + credentials pattern per `01-05` implementation); MinIO not required for Phase 1 plans.

## Environment Availability

**Step 2.6:** Probed **developer machine** used for this research (not CI).

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next, Remotion, worker | ✓ | v24.13.0 | Use Node 20+ LTS per team policy if needed |
| npm / pnpm | installs | ✓ | (bundled) | — |
| Docker | local Redis compose | ✓ | 28.5.1 | Install Docker or use cloud Redis |
| redis-cli / Redis daemon | BullMQ local | ✗ | — | `docker compose up redis` or Upstash URL |
| AWS credentials | S3 presign | — | — | Dev cannot verify without secrets; use placeholder + MinIO optional |

**Missing dependencies with no fallback:**

- **Redis URL** in env — worker and Next producer fail hard without it.

**Missing dependencies with fallback:**

- **redis-cli** — not required if using Docker Desktop + compose or managed Redis.

## Validation Architecture

> Nyquist enabled in `.planning/config.json` (`workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Vitest** or **Jest** + **@testing-library/react** (choose one in Wave 0; Vitest is common with Next 15) [ASSUMED: ecosystem default] |
| Config file | `vitest.config.ts` or `jest.config.mjs` — **none yet** (greenfield) |
| Quick run command | `npm test` (to be wired) |
| Full suite command | `npm test` |

### Phase 1 → testable dimensions

| Dimension | Behavior | Test type | Automated command (target) | Notes |
|-----------|----------|-----------|----------------------------|-------|
| REQ / schema | Representative mock passes `sceneSchema.safeParse` | unit | `vitest lib/scene/schema.test.ts` | Must fail on invalid part shapes |
| REQ / schema | Step order is array order only (D-02) | unit | reorder steps changes implied “step index” in composition props | Pure logic |
| API contract | `POST` job creation returns `jobId`, presigned fields | integration / supertest | `vitest app/api/jobs/route.test.ts` | Mock S3 client |
| API contract | `GET` job returns stable `status` enum + `error` | integration | same | Map BullMQ states |
| Upload UI | reject non-PDF and oversize files | component | RTL + fake drop | INGEST-02 |
| Security / validation | Presign rejects wrong content-type or size | unit | handler tests | No open presign for arbitrary keys |

### Manual / external checklist

| Checklist item | Pass criteria |
|----------------|---------------|
| Remotion Studio | `npx remotion studio` renders composition with mock `SceneJSON` (D-04) |
| S3 CORS | Browser PUT from `localhost:3000` succeeds with dev bucket CORS |
| Worker | `tsx worker/index.ts` connects to Redis, processes stub job |

### Sampling rate

- **Per task commit:** unit tests for touched modules (`npm test -- --run`).
- **Per wave merge:** full `npm test`.
- **Phase gate:** unit + integration green; manual Studio + S3 checks documented in `VALIDATION.md`.

### Wave 0 Gaps

- [ ] Choose Vitest vs Jest and add config + `npm test` script.
- [ ] Add `lib/scene/schema.test.ts` covering happy path + 2–3 invalid fixtures.
- [ ] Add API route tests with mocked `@aws-sdk/*` and Redis/BullMQ test doubles or test Redis.
- [ ] Document manual Remotion Studio steps for reviewers.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | v1 demo — no auth in scope |
| V3 Session Management | no | — |
| V4 Access Control | partial | Do not expose presigned URLs to other users’ objects — key must include unguessable `jobId` prefix |
| V5 Input Validation | yes | Zod for JSON; PDF `accept` + magic bytes; limit upload size |
| V6 Cryptography | partial | HTTPS in prod; presigned expiry short (e.g. ≤15 min) |

### Known threat patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path/key traversal in S3 key | Tampering | Server generates key; ignore client-supplied path |
| Overlong / decompression PDF bomb (future) | DoS | Enforce max size; consider server-side scan in later phase |
| Open CORS on bucket | Information disclosure | Restrict `AllowedOrigins` to app origins |

## Sources

### Primary (HIGH confidence)

- npm registry — `npm view` for `next`, `next@15`, `remotion`, `zod`, `zod` dist-tags, `bullmq`, `@aws-sdk/client-s3`, `react-dropzone`, `uuid`, `tsx`, `ioredis`, `zod-to-json-schema` (2026-04-04).
- [Remotion: Next.js integration](https://www.remotion.dev/docs/miscellaneous/nextjs) — bundler + API route constraint.
- [Remotion: Composition terminology](https://www.remotion.dev/docs/terminology/composition) — registration model.
- [AWS S3: CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) — browser PUT requirements.
- `.planning/research/STACK.md` — architecture and anti-patterns aligned with this research.

### Secondary (MEDIUM confidence)

- [Zod](https://zod.dev/) — `z.infer` pattern.
- Next.js / Vercel discussions on App Router body limits — **not** individually verified in this session; treat limits as **host-specific** (see Open Questions).

### Tertiary (LOW confidence)

- BullMQ processor API nuances — confirm against installed major version docs when coding.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — npm + project STACK + Remotion doc citation.
- Architecture: **HIGH** — matches roadmap and CONTEXT D-04.
- Pitfalls: **MEDIUM-HIGH** — Remotion constraint verified; body-limit numbers host-dependent.

**Research date:** 2026-04-04  
**Valid until:** ~2026-05-04 (re-verify `next@15` and `zod` major lines before execution if calendar slips).

## RESEARCH COMPLETE
