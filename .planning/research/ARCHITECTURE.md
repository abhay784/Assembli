# Architecture Research

**Domain:** Manual-to-Video Pipeline (Furniture Assembly)
**Researched:** 2026-04-04
**Confidence:** HIGH (verified against Remotion official docs, Claude API official docs, community patterns)

---

## Standard Architecture

### System Overview (ASCII Diagram)

```
BROWSER (User)
     |
     | 1. Upload PDF/DOCX (presigned URL or direct)
     v
[Next.js API Layer]
     |
     | 2. Store file, enqueue job
     v
[File Storage]          [Job Queue / DB]
(S3 or Vercel Blob)     (Postgres job table
     |                   or Redis/BullMQ)
     |                        |
     |     3. Worker picks     |
     |        up job          |
     +--------+---------------+
              |
              v
     [Pipeline Orchestrator]
     (Node.js worker / API route handler)
              |
     +--------+--------+-----------+
     |                 |           |
     v                 v           |
[Claude API]     [ElevenLabs]      |
PDF → scene JSON  scene JSON →     |
                  audio .mp3       |
     |                 |           |
     +--------+--------+           |
              |                    |
              v                    |
     [Remotion Lambda / Node]      |
     scene JSON + audio → MP4      |
              |                    |
              v                    |
     [Output Storage]              |
     (S3 or Vercel Blob)           |
              |                    |
              +--------------------+
              |
              | 4. Update job status → "done"
              v
     [Job Status DB Row]
              |
              | 5. Client polls /api/job/:id
              v
BROWSER (User)
     |
     | 6. Video URL available, plays or downloads
     v
[Final MP4 served from storage]
```

### Component Responsibilities

| Component | Responsibility | Key Tech |
|-----------|---------------|----------|
| **Upload Handler** | Receive file, write to storage, create job record | Next.js API route, S3/Vercel Blob |
| **Job Queue** | Track pipeline state (pending, processing, done, failed), decouple steps | Postgres table or BullMQ + Redis |
| **PDF/DOCX Parser** | Extract raw text + embedded images from upload | `pdf-parse`, `mammoth` (DOCX) |
| **Claude Simplifier** | Send parsed content + images to Claude API, receive structured scene JSON | Anthropic SDK, Files API |
| **Scene Schema Validator** | Validate scene JSON against defined schema before downstream use | `zod` |
| **ElevenLabs Narrator** | Accept narration text per scene, return MP3 audio blobs | ElevenLabs SDK |
| **Remotion Renderer** | Accept scene JSON + audio asset URLs as props, render final MP4 | `@remotion/renderer` or `@remotion/lambda` |
| **Output Delivery** | Store rendered MP4, write final URL to job record | S3/Vercel Blob |
| **Status API** | Let client poll job progress (0-100%) and final URL | Next.js API route |
| **Frontend** | Upload UI, progress display, video player | Next.js, React |

---

## Recommended Project Structure

```
assembli/
├── app/                         # Next.js App Router
│   ├── api/
│   │   ├── upload/route.ts      # Receive file, create job
│   │   ├── job/[id]/route.ts    # Job status polling
│   │   └── render/route.ts      # (Internal) trigger render worker
│   ├── page.tsx                 # Upload UI
│   └── result/[id]/page.tsx     # Video result / player page
│
├── lib/
│   ├── pipeline/
│   │   ├── parse.ts             # PDF/DOCX extraction
│   │   ├── simplify.ts          # Claude API: doc → scene JSON
│   │   ├── narrate.ts           # ElevenLabs: scene text → MP3
│   │   └── render.ts            # Remotion: scene JSON + audio → MP4
│   ├── storage.ts               # S3 / Vercel Blob helpers
│   ├── jobs.ts                  # Job table CRUD
│   └── schema.ts                # Zod schema for scene JSON
│
├── remotion/
│   ├── index.ts                 # Remotion composition entry
│   ├── Root.tsx                 # Composition registry
│   ├── templates/
│   │   ├── StepSlide.tsx        # One assembly step: parts + arrow + text
│   │   ├── TitleSlide.tsx       # Intro slide
│   │   └── ToolsSlide.tsx       # Required tools overview
│   └── types.ts                 # SceneJSON TypeScript types (matches schema.ts)
│
├── prisma/
│   └── schema.prisma            # Job table + schema
│
└── public/
```

**Key constraint:** The `remotion/` directory is a self-contained React app. It consumes a `SceneJSON` prop. It has no knowledge of the pipeline — it only knows how to render what it's given.

---

## Architectural Patterns

### Pattern 1: Async Request-Reply (Required for this domain)

Video rendering takes 30 seconds to several minutes. HTTP requests cannot stay open that long.

**How it works:**
1. `POST /api/upload` → returns `{ jobId }` immediately with HTTP 202
2. Client stores `jobId`, polls `GET /api/job/:id` every 3-5 seconds
3. Worker processes in background: parse → simplify → narrate → render
4. Job record transitions: `pending` → `parsing` → `simplifying` → `narrating` → `rendering` → `done` | `failed`
5. Client detects `done`, receives `videoUrl`, shows player

```typescript
// Job state machine
type JobStatus =
  | "pending"
  | "parsing"
  | "simplifying"
  | "narrating"
  | "rendering"
  | "done"
  | "failed";

interface Job {
  id: string;
  status: JobStatus;
  progress: number;       // 0-100 for UI progress bar
  videoUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Pattern 2: Schema-First Scene Contract

Claude API produces JSON. Remotion consumes JSON. These must agree on a single schema — the **Scene Contract**. This is the most important interface in the system.

**Why this matters:** If you let Claude produce free-form JSON and pass it directly to Remotion, you'll get runtime crashes when the LLM drifts. Validate at the boundary.

```typescript
// lib/schema.ts — single source of truth
import { z } from "zod";

const SceneSchema = z.object({
  title: z.string(),
  steps: z.array(z.object({
    stepNumber: z.number(),
    instruction: z.string().max(120), // fits in video caption
    narration: z.string().max(300),   // TTS narration text
    parts: z.array(z.string()),       // part names visible in frame
    animationType: z.enum(["assemble", "highlight", "tools", "title"]),
    durationSeconds: z.number().min(3).max(15),
  })),
  metadata: z.object({
    productName: z.string(),
    estimatedMinutes: z.number(),
    toolsRequired: z.array(z.string()),
  }),
});

export type SceneJSON = z.infer<typeof SceneSchema>;
```

### Pattern 3: Storage-Mediated Handoff

Each pipeline stage stores its output to S3/Blob and passes only a URL to the next stage. Stages do not pass large binary data (PDFs, audio, video) through memory or function arguments.

```
Stage 1 parse    → stores raw text → writes "rawTextKey" to job
Stage 2 simplify → reads rawTextKey, calls Claude → stores sceneJson
Stage 3 narrate  → reads sceneJson, calls ElevenLabs → stores audio.mp3 per step
Stage 4 render   → reads sceneJson + audio URLs, calls Remotion → stores output.mp4
```

This makes each stage independently restartable on failure without re-running earlier stages.

### Pattern 4: Remotion Props = Scene JSON

Remotion renders based entirely on `inputProps`. The backend passes the `SceneJSON` object as props. No file system access, no database calls from inside a Remotion composition.

```typescript
// lib/pipeline/render.ts
import { renderMedia, selectComposition } from "@remotion/renderer";

export async function renderVideo(sceneJson: SceneJSON, audioUrls: string[]) {
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "AssembliVideo",
    inputProps: { sceneJson, audioUrls },
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: "/tmp/output.mp4",
    inputProps: { sceneJson, audioUrls },
  });
}
```

---

## Data Flow

### Phase-by-Phase Data Transformation

```
[PDF File]
    |
    | pdf-parse / pdfjs-dist
    v
[Raw Text + Page Images]          ← stored in memory / temp
    |
    | Claude API (vision + text)
    | Prompt: "Extract assembly steps as structured JSON matching this schema: ..."
    v
[SceneJSON]                       ← validated with Zod, stored to S3
    |
    | ElevenLabs TTS (per step narration field)
    v
[Audio Files: step-1.mp3, step-2.mp3, ...]  ← stored to S3, URLs in job record
    |
    | Remotion render (sceneJson + audioUrls as inputProps)
    v
[MP4 Video File]                  ← stored to S3
    |
    | URL written to job record
    v
[Served to User]
```

### Inter-Service Communication

| From | To | Protocol | Payload |
|------|----|----------|---------|
| Browser | Upload API | HTTP POST multipart | PDF/DOCX file |
| Upload API | Storage | SDK call | Binary file |
| Upload API | Job DB | SQL INSERT | Job record |
| Worker | Claude API | HTTPS REST | Base64 PDF or file_id |
| Worker | ElevenLabs API | HTTPS REST | Text string per scene |
| Worker | Remotion | Node.js in-process or Lambda HTTP | SceneJSON + audio URLs as JSON props |
| Worker | Storage | SDK PUT | Audio .mp3, video .mp4 |
| Worker | Job DB | SQL UPDATE | Status, progress, videoUrl |
| Browser | Status API | HTTP GET (polling) | jobId |

---

## Scaling Considerations

> v1 is a proof-of-concept. Design for single-user operation, but avoid patterns that block scaling later.

| Concern | v1 (Demo) | v2 (Growth) | v3 (Scale) |
|---------|-----------|-------------|------------|
| Job queue | Postgres job table + polling | BullMQ + Redis | Same, add workers |
| Rendering | Remotion Node.js local | Remotion Lambda | Remotion Lambda + concurrency tuning |
| File storage | Vercel Blob or local /tmp | S3 + lifecycle policies | S3 + CloudFront CDN |
| Worker | Next.js API route long-running | Separate Node.js worker process | Containerized worker fleet |
| PDF parsing | In-process Node.js | Same | Same — not a bottleneck |
| LLM calls | Single Claude API call | Prompt caching for repeated manuals | Batch API for bulk |
| Audio gen | Sequential per step | Parallel Promise.all | Same |

**Critical v1 constraint:** Vercel serverless functions have a 60-second (hobby) or 300-second (pro) timeout. A full render pipeline will exceed this. For v1, either use Vercel Pro, run a local Node server, or split pipeline into multiple chained requests with job state stored in DB.

---

## Anti-Patterns

### Anti-Pattern 1: Streaming PDF through API Route Body
**What:** Sending the entire PDF through a Next.js API route as the request body.
**Why bad:** Next.js API routes cap response size at 4MB by default. Most IKEA manuals exceed this.
**Instead:** Use S3 presigned URLs — browser uploads directly to S3, API route only receives the storage key.

### Anti-Pattern 2: Passing Binary Data Between Pipeline Stages
**What:** Keeping audio blobs or PDF bytes in memory and passing them between functions.
**Why bad:** Memory limits on serverless functions, no restart capability on failure.
**Instead:** Store intermediate artifacts to S3 after each stage. Pass only URLs between stages.

### Anti-Pattern 3: Unvalidated LLM Output to Renderer
**What:** Passing Claude's raw JSON response directly to Remotion as inputProps.
**Why bad:** LLMs hallucinate keys, miss fields, or produce wrong types. Remotion will crash at render time with opaque errors.
**Instead:** Zod-validate all Claude output before it leaves the `simplify.ts` stage. Fail fast with a clear error message, not a mid-render crash.

### Anti-Pattern 4: Synchronous Pipeline in a Single HTTP Request
**What:** Upload handler runs parse → simplify → narrate → render in one blocking handler.
**Why bad:** Total pipeline time is 60-180 seconds. No serverless function allows this. Browser will timeout.
**Instead:** Return `jobId` immediately. Process pipeline in background worker. Client polls.

### Anti-Pattern 5: Logic Inside Remotion Compositions
**What:** Calling Claude or ElevenLabs from inside a React component in the Remotion tree.
**Why bad:** Remotion renders compositions by running React in a headless browser. Network calls inside compositions are unreliable, slow, and can cause render failures.
**Instead:** All API calls happen before rendering. Remotion receives only pre-computed, static data as inputProps.

### Anti-Pattern 6: One Monolithic Scene JSON Prompt
**What:** Asking Claude to produce a full 20-step assembly plan in one enormous prompt.
**Why bad:** Context window pressure, hallucinations increase with complexity, hard to debug.
**Instead:** Two-phase Claude interaction — first extract raw steps (simpler task), then simplify and structure each step into scene format (narrower task). Or use a well-constrained single prompt with strict output schema.

---

## Integration Points

### Claude API Integration

- **Method:** Direct API via `@anthropic-ai/sdk`
- **PDF ingestion:** Use Files API (`file_id`) for manuals to avoid re-encoding on retries
- **Output format:** Instruct Claude to return JSON matching the SceneJSON Zod schema. Include the TypeScript type definition in the system prompt.
- **Prompt caching:** Mark the PDF block with `cache_control: { type: "ephemeral" }` — saves ~40-70% of tokens on multi-call interactions with the same document
- **Limits:** 32MB max request size, 100 pages per request for claude-sonnet-4-6 and similar models
- **Source:** https://platform.claude.com/docs/en/build-with-claude/pdf-support

### ElevenLabs Integration

- **Method:** REST API or official Node.js SDK
- **Pattern:** One API call per step narration field (5-20 steps = 5-20 calls). Parallelize with `Promise.all()`.
- **Output:** Stream or download MP3 blobs, upload to S3, record URLs
- **Latency:** ~1-3 seconds per audio generation at normal concurrency
- **Source:** https://elevenlabs.io/docs/overview/models

### Remotion Integration

- **Method:** `@remotion/renderer` for local/Docker; `@remotion/lambda` for serverless
- **v1 recommendation:** Start with `@remotion/renderer` via Node.js — simpler setup, no AWS required for demo
- **v1 constraint:** Runs in the same Node process as the worker. Requires Chromium/Chrome installed.
- **v2 path:** Migrate to `@remotion/lambda` when deploying to cloud — provides distributed rendering, webhooks, and progress tracking via `getRenderProgress()`
- **Props:** Scene JSON + S3 audio URLs passed as `inputProps` (must be JSON-serializable)
- **Source:** https://www.remotion.dev/docs/ssr, https://www.remotion.dev/docs/compare-ssr

### File Storage Integration

- **v1 (simplest):** Vercel Blob — zero-config, works with Vercel deployments
- **v1 alternative:** Local `/tmp` for fully local dev, no cloud needed for a demo
- **v2:** AWS S3 with presigned upload URLs (browser → S3 direct upload bypasses API route size limits)
- **Pattern:** Presigned URL flow: `POST /api/upload/presign` → browser uploads to S3 → browser calls `POST /api/upload/complete` with storage key → pipeline starts

---

## Suggested Build Order

Dependencies determine order. Later stages cannot be built without the contract the earlier stage defines.

```
1. Schema (lib/schema.ts)
   └── Defines SceneJSON — the contract all stages depend on

2. Remotion templates (remotion/)
   └── Requires: Schema
   └── Build templates against mock SceneJSON data first
   └── Enables visual iteration without any pipeline running

3. File upload + job infrastructure (upload API + job DB)
   └── Requires: Storage config, DB schema
   └── Foundation everything else queues against

4. PDF parser (lib/pipeline/parse.ts)
   └── Requires: File storage (read uploaded file)
   └── Pure extraction — no LLM, fully unit-testable

5. Claude simplifier (lib/pipeline/simplify.ts)
   └── Requires: Schema (to validate output), PDF parser output
   └── Most uncertain stage — build first after templates to validate schema

6. ElevenLabs narrator (lib/pipeline/narrate.ts)
   └── Requires: SceneJSON (narration fields), storage (write MP3s)
   └── Straightforward API integration

7. Remotion renderer (lib/pipeline/render.ts)
   └── Requires: SceneJSON, audio URLs, Remotion templates
   └── Integration of all prior stages

8. Pipeline orchestrator + status API
   └── Requires: All stages, job DB
   └── Wires stages together, drives status transitions

9. Frontend
   └── Requires: Upload API, status API, final video URL
   └── Can be stubbed against mock job responses early
```

**Why this order:** Templates (step 2) before pipeline (steps 4-7) lets you validate the visual output without needing the full pipeline working. Schema (step 1) before everything ensures no mismatch between Claude's output and Remotion's input.

---

## Sources

- Remotion SSR docs: https://www.remotion.dev/docs/ssr
- Remotion deployment comparison: https://www.remotion.dev/docs/compare-ssr
- Remotion Lambda + SQS pattern: https://www.remotion.dev/docs/lambda/sqs
- Remotion Lambda progress: https://www.remotion.dev/docs/lambda/getrenderprogress
- Claude API PDF support (official): https://platform.claude.com/docs/en/build-with-claude/pdf-support
- ElevenLabs API overview: https://elevenlabs.io/developers
- ElevenLabs models: https://elevenlabs.io/docs/overview/models
- S3 presigned URL upload pattern: https://dev.to/oliverke/the-architecture-that-lets-us-sleep-scalable-uploads-with-s3-presigned-urls-1jf3
- Async request-reply pattern: https://zuplo.com/learning-center/asynchronous-operations-in-rest-apis-managing-long-running-tasks
- Next.js background job patterns: https://www.nico.fyi/blog/long-running-jobs-nextjs-redis-bull
- AI video pipeline patterns 2026: https://medium.com/@cliprise/the-ai-video-image-stack-2026-architecture-models-workflows-and-the-end-of-single-tool-e4e5d177a00c
