# Stack Research

**Domain:** Manual-to-Video Pipeline (Furniture Assembly)
**Researched:** 2026-04-04
**Overall Confidence:** MEDIUM-HIGH (core pipeline components are locked by project requirements; surrounding infrastructure is well-established)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (App Router) | Web framework, API routes, upload handling, UI | Industry default for TypeScript full-stack apps; App Router supports streaming and server actions; SSR for status polling; wide deployment target support |
| TypeScript | 5.x | Language | Type safety across the LLM schema boundary (scene JSON) is critical — runtime type mismatches here break videos silently |
| Remotion | 4.0.445 (latest 4.x stable) | React-based programmatic video composition and rendering | Locked by project requirement; React component model maps naturally to "one slide per step" template system; `@remotion/renderer` handles server-side rendering |
| @anthropic-ai/sdk | 0.82.0 | Claude API client for PDF parsing and scene JSON generation | Official SDK, TypeScript-first, matches pinned LLM choice; version 0.82.x includes Files API beta support |
| @elevenlabs/elevenlabs-js | 2.30.0 | ElevenLabs TTS API — generate MP3 narration per step | Official SDK; TypeScript-safe; `textToSpeech.convert()` returns audio buffer ready for file storage |
| BullMQ | 5.x (5.73.0 latest) | Background job queue for the render pipeline | Video rendering is a multi-minute CPU/IO job — must run async, not in an HTTP request handler; Redis-backed, production-proven for AI pipelines |
| Redis | 7.x | BullMQ backing store | Required by BullMQ; use Upstash Redis for zero-ops on a demo deployment |
| AWS S3 (or compatible) | SDK v3 (@aws-sdk/client-s3) | File storage: uploaded manuals, generated audio files, final rendered video | Decouples file lifecycle from server memory; presigned URLs let browser upload directly, avoiding 4MB API route limit; video output files need durable storage |
| Zod | 3.x | Scene JSON schema validation at the LLM output boundary | Parse Claude's JSON response at runtime with a typed schema; prevents malformed scene data from corrupting Remotion renders; generates JSON Schema from TS types for prompting Claude |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mammoth | 1.12.0 | DOCX-to-plain-text extraction | Run before sending DOCX to Claude; converts Word binary to raw text that fits cleanly into a prompt; do NOT pass raw .docx bytes to the LLM |
| pdf-parse | 1.x | Pre-extraction PDF text layer (optional fast path) | Use as a cheap fallback to check if a PDF is text-extractable before paying Claude vision tokens; if text layer is good, embed text-only into the prompt |
| @aws-sdk/s3-request-presigner | 3.x | Generate S3 presigned upload/download URLs | Required companion to `@aws-sdk/client-s3` for browser-direct uploads |
| ffmpeg-static | latest | Bundled ffmpeg binary for Remotion renderer | Remotion's `@remotion/renderer` requires ffmpeg; `ffmpeg-static` provides a pre-built binary usable from Node.js without system install |
| framer-motion | 11.x | UI animations in Next.js frontend | Status progress animations in upload/processing UI; optional but improves perceived quality for a demo |
| react-dropzone | 14.x | Drag-and-drop file upload UI component | Clean, accessible file upload; handles drag events, MIME type filtering (PDF/DOCX), and file size limits |
| uuid | 9.x | Job IDs and S3 key namespacing | Prevent filename collisions in S3; correlate BullMQ job ID with S3 key |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Remotion Studio (npx remotion studio) | Visual preview of Remotion compositions during development | Run separately from Next.js dev server; use to iterate on animation templates before wiring to the pipeline |
| Docker Compose | Local Redis for BullMQ | Single-command Redis instance: `docker compose up redis`; replace with Upstash for deployed demo |
| Vercel | Deployment target for Next.js frontend and API routes | Free tier sufficient for demo; does NOT run the Remotion renderer — that requires a separate process (see Architecture notes) |
| tsx / ts-node | Run standalone render worker TypeScript process | The BullMQ worker that calls `@remotion/renderer` must run as a separate Node.js process, not inside Next.js |
| dotenv | Environment variable management | API keys for Anthropic, ElevenLabs, AWS, Redis URL |

---

## Architecture Decision: Next.js + Separate Render Worker

This is the most important structural decision in the stack.

**`@remotion/bundler` cannot run inside Next.js API routes.** Remotion's bundler uses Webpack internally, and Next.js also uses Webpack — you cannot bundle Webpack with Webpack. This is a hard constraint documented by the Remotion team.

**The correct architecture:**

```
Browser
  └─ uploads file via presigned URL → S3
  └─ POST /api/jobs → Next.js API route
        └─ enqueues BullMQ job (job_id returned to browser)
        └─ browser polls GET /api/jobs/:id for status

BullMQ Worker (separate Node.js process)
  └─ picks up job from Redis queue
  └─ downloads file from S3
  └─ extracts text (pdf-parse or mammoth)
  └─ calls Claude API → scene JSON (validated with Zod)
  └─ calls ElevenLabs per step → audio files → uploads to S3
  └─ calls @remotion/renderer renderMedia() → final video → uploads to S3
  └─ updates job status in Redis
```

This means you have two processes in production: the Next.js server and the render worker. For a v1 demo, run both locally. For deployment, the render worker runs on a VPS or EC2 instance (not Vercel).

**Remotion Lambda as alternative:** Remotion Lambda (AWS Lambda) avoids the bundler problem entirely and is the officially recommended approach for most teams. However, it requires an AWS account, IAM role setup, Lambda function deployment, and S3 bucket configuration — more moving parts for a first demo. The self-hosted worker approach is simpler to understand and debug locally. Start with self-hosted; migrate to Lambda if render times become a problem.

---

## Installation

```bash
# Next.js app
npx create-next-app@latest assembli --typescript --tailwind --app

# Core pipeline dependencies
npm install @anthropic-ai/sdk @elevenlabs/elevenlabs-js
npm install remotion @remotion/renderer @remotion/bundler @remotion/cli
npm install bullmq ioredis
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install zod mammoth pdf-parse uuid

# Frontend UX
npm install react-dropzone

# Dev tools
npm install -D ffmpeg-static tsx dotenv
npm install -D @types/uuid @types/mammoth

# Optional: framer-motion for status UI
npm install framer-motion
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Rendering trigger | Self-hosted BullMQ worker | Remotion Lambda | Lambda has faster renders and better scalability, but requires more AWS setup (IAM, S3, Lambda deploy) — adds friction for a demo POC. Migrate to Lambda in v2. |
| Job queue | BullMQ + Redis | Inngest / QStash | BullMQ is explicit and inspectable; Inngest/QStash are managed services with vendor lock-in and less local debuggability. BullMQ works identically locally and in prod. |
| File storage | AWS S3 | Cloudflare R2 / local disk | R2 is viable zero-egress alternative; local disk breaks when the worker runs on a different machine. S3 is universally understood. |
| DOCX parsing | mammoth | docx (npm) / libreoffice | mammoth is the simplest text-extraction path; `docx` library is for programmatic creation; libreoffice headless is overkill and fragile in Docker |
| PDF pre-parsing | pdf-parse | pdfplumber (Python) | We're in Node.js — pdf-parse is sufficient for text-layer extraction. Claude handles the heavy lifting on visual/structured PDFs anyway. |
| Schema validation | Zod | TypeBox / Ajv | Zod provides TypeScript type inference from schemas, not just runtime validation. This is essential: derive the `SceneJSON` TS type from the same Zod schema used to validate Claude output. |
| Frontend framework | Next.js | Remix / SvelteKit | Next.js is the default for TypeScript web apps; most Remotion documentation targets it; widest ecosystem support for SSE/polling patterns needed for job status |
| LLM | Claude API | OpenAI GPT-4o | Locked by project requirement. Claude's document understanding (native PDF vision support) is a genuine advantage here — it reads furniture assembly diagrams. |

---

## What NOT to Use

**Do not use `@remotion/bundler` in a Next.js API route.** It will silently fail or crash with a Webpack conflict. Always run bundling and rendering in a separate Node.js process.

**Do not render video inside a Vercel serverless function.** Vercel has a 10-second execution timeout for hobby tier and 60-second for pro. A 30-step furniture assembly video render takes 2-10 minutes. Rendering must happen in a long-running process (VPS, EC2, or Remotion Lambda).

**Do not use the old `bull` package (not `bullmq`).** `bull` is the legacy v3 package. `bullmq` is the actively maintained successor with better TypeScript support and flow/dependency features. They are different packages.

**Do not pass raw DOCX bytes to Claude.** Claude's document API supports PDF natively; DOCX is not a supported document type. Always extract text first with mammoth, then pass text in the prompt.

**Do not generate Remotion JSX/TSX code from Claude output.** This is the single largest v1 pitfall. Generating dynamic React code from an LLM and executing it is an eval() security hole that is also impossible to validate. Instead, Claude outputs a clean scene JSON that maps to predefined Remotion template components. The schema defines what's renderable; Claude fills in the data.

**Do not use `elevenlabs-js` (the non-official npm package) or `elevenlabs-node`.** The correct official package is `@elevenlabs/elevenlabs-js`. The others are third-party wrappers that lag behind the API.

**Do not stream audio in real-time to Remotion.** ElevenLabs audio must be fully generated and written to disk (or S3) as an MP3 file before passing to `@remotion/renderer`. Remotion reads audio from the filesystem during render.

---

## Sources

- [Remotion SSR Comparison](https://www.remotion.dev/docs/compare-ssr) — official docs on Lambda vs Node.js vs Vercel rendering options
- [Remotion Next.js Integration](https://www.remotion.dev/docs/miscellaneous/nextjs) — official docs on bundler limitation in Next.js API routes
- [Remotion Renderer API](https://www.remotion.dev/docs/renderer) — `renderMedia()` and `@remotion/renderer` package docs
- [Remotion SSR Node.js](https://www.remotion.dev/docs/ssr-node) — Node.js-specific rendering API reference
- [Remotion v5 Migration](https://www.remotion.dev/docs/5-0-migration) — planned breaking changes (v5 not yet released; use v4.0.445 stable)
- [Claude PDF Support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — official PDF API docs: 600-page limit, Files API for repeated use, token costs per page
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — version 0.82.0 as of 2026-04-04
- [ElevenLabs JS SDK GitHub](https://github.com/elevenlabs/elevenlabs-js) — official Node.js SDK
- [ElevenLabs npm](https://www.npmjs.com/package/elevenlabs) — version 2.30.0 latest
- [BullMQ npm](https://www.npmjs.com/package/bullmq) — version 5.73.0 latest
- [mammoth npm](https://www.npmjs.com/package/mammoth) — version 1.12.0, DOCX text extraction
- [Zod](https://zod.dev/) — TypeScript-first schema validation, standard for LLM output validation
- [Next.js S3 Presigned URL Pattern](https://conermurphy.com/blog/presigned-urls-nextjs-s3-upload/) — presigned URL upload pattern for Next.js App Router
