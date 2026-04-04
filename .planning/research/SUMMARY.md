# Project Research Summary

**Project:** Assembli — Manual-to-Video Pipeline
**Domain:** Document-to-Video Pipeline (Furniture Assembly)
**Researched:** 2026-04-04
**Confidence:** MEDIUM-HIGH

## Executive Summary

Assembli is an AI-powered pipeline that converts furniture assembly manuals (PDF/DOCX) into narrated step-by-step videos. The product is uniquely constrained by three external systems that must cooperate: Claude (document understanding), ElevenLabs (TTS audio generation), and Remotion (programmatic video composition). Research confirms this class of system is well-understood as an "async document-to-media pipeline" — the architecture is not novel, but the integration surface between these three systems demands careful contract design before any code is written. The single most important pre-build decision is defining the scene JSON schema, which acts as the contract between the LLM extraction step and the Remotion rendering step. Get this wrong and the project requires a mid-build rewrite.

The recommended approach is: (1) design the schema starting from what Remotion templates can animate — not from what Claude can output; (2) run the render pipeline in a separate long-running Node.js worker process rather than inside Next.js API routes, because `@remotion/bundler` cannot be run inside Next.js due to a hard Webpack-on-Webpack conflict; (3) generate all ElevenLabs audio before computing Remotion slide durations, since TTS output length is variable and must drive frame counts — not the other way around. The tech stack is almost entirely dictated by the project requirements (Remotion, Claude, ElevenLabs), leaving only infrastructure choices open.

The key risks are: hallucination on diagram-heavy IKEA-style PDFs (Claude converts every PDF page to an image, filling the context window faster than expected); schema drift between Claude output and Remotion templates if designed left-to-right rather than right-to-left; and audio-visual desync if slide durations are hardcoded before TTS generation. All three are avoidable with upfront discipline: token pre-flight checks, schema-first design, and audio-first render sequencing.

---

## Key Findings

### Recommended Stack

The stack is largely locked by project requirements. Remotion 4.x handles video composition, Claude via `@anthropic-ai/sdk` handles document understanding, and ElevenLabs via `@elevenlabs/elevenlabs-js` handles TTS. The surrounding infrastructure uses Next.js 15 (App Router) for the web layer, BullMQ + Redis for async job queuing, AWS S3 for durable file storage, and Zod for schema validation at the LLM output boundary.

The most important structural decision: `@remotion/bundler` cannot run inside Next.js API routes (Webpack-on-Webpack conflict). The render worker must be a separate Node.js process. For v1, both processes run locally or on the same server. The Remotion Lambda path is the recommended v2 migration for cloud rendering.

**Core technologies:**
- **Next.js 15 (App Router):** Web framework and API layer — industry default for TypeScript full-stack; supports SSE/polling patterns needed for job status
- **Remotion 4.0.445:** Video composition and rendering — locked by project requirement; React component model maps naturally to per-step templates
- **@anthropic-ai/sdk 0.82.0:** Claude API client — official TypeScript SDK; Files API support for repeated PDF use
- **@elevenlabs/elevenlabs-js 2.30.0:** ElevenLabs TTS — official SDK; `textToSpeech.convert()` returns audio buffer ready for S3 upload
- **BullMQ 5.x + Redis 7.x:** Async job queue — video rendering is a multi-minute operation that cannot run in an HTTP request handler
- **AWS S3 (@aws-sdk/client-s3 v3):** File storage for uploads, audio assets, and rendered video — presigned URLs bypass Next.js 4MB API route limit
- **Zod 3.x:** Schema validation at the LLM output boundary — derives TypeScript types from the same schema used to validate Claude's JSON output; essential to prevent render-time crashes
- **mammoth 1.12.0:** DOCX-to-text extraction — Claude does not accept raw DOCX; text must be extracted first
- **ffmpeg-static:** Bundled ffmpeg binary — required by `@remotion/renderer` without a system install

### Expected Features

The core value proposition is a fully automated pipeline: upload a PDF, receive a narrated step-by-step video. Users expect the pipeline to handle real IKEA-style manuals (diagrams, numbered parts, minimal prose text) — not just clean prose documents. Audio-visual sync is a table-stakes requirement, not a differentiator.

**Must have (table stakes):**
- PDF upload (drag-and-drop, handles real IKEA-style PDFs with diagrams)
- Processing status indicator with step-level granularity ("Generating audio... Rendering video...")
- Remotion template with synchronized captions, step counter HUD, and basic animations
- ElevenLabs voiceover narration — one consistent voice throughout
- In-browser HTML5 video player + MP4 download button
- Audio-visual sync — narration duration drives slide durations, not hardcoded values
- Step-by-step visual structure — one scene per assembly step

**Should have (competitive):**
- Warning/caution cards — distinct visual treatment for safety notes (low effort, high safety value)
- Tool/parts callout at scene start — "you'll need: bolt A, washer B" beat per step
- Animated directional arrows and highlight overlays — directs visual attention within a step
- Numbered step counter HUD ("Step 3 of 12") — low effort, high perceived quality
- Exploded-view part animations — core visual differentiator vs. slide-show competitors; requires part-placement data in the scene schema

**Defer (v2+):**
- User accounts / project management — adds auth complexity without validating the core pipeline
- Multiple voice options — single default voice validates TTS integration
- Shareable links — not needed for download-only v1 proof-of-concept
- Multi-language output — language switching is a clean add-on after the pipeline is stable
- Regenerate individual step — requires per-step pipeline idempotency; significant backend complexity
- Video editing UI — inverts the product's value proposition; fix the pipeline, not give users a screwdriver

### Architecture Approach

The system follows a classic async request-reply pipeline with storage-mediated stage handoffs. The browser uploads a file via S3 presigned URL, a Next.js API route creates a job record and returns a `jobId`, and the browser polls for status. A separate BullMQ worker processes the job through four sequential stages: PDF parsing → Claude scene JSON extraction → ElevenLabs audio generation → Remotion video rendering. Each stage writes its output to S3 and passes only a URL to the next stage, making every stage independently restartable on failure.

**Major components:**
1. **Upload Handler (Next.js API route)** — receives presigned URL request, creates job record, returns `jobId` immediately (HTTP 202)
2. **BullMQ Worker (separate Node.js process)** — orchestrates all four pipeline stages; updates job status and progress percentage
3. **PDF/DOCX Parser (`lib/pipeline/parse.ts`)** — text extraction via `pdf-parse` (text-layer PDFs) and `mammoth` (DOCX); pure extraction, no LLM
4. **Claude Simplifier (`lib/pipeline/simplify.ts`)** — sends parsed content to Claude, receives SceneJSON, validates with Zod before proceeding
5. **Scene Schema (`lib/schema.ts`)** — single source of truth; the Zod schema is the contract between Claude and Remotion; TypeScript type derived from schema
6. **ElevenLabs Narrator (`lib/pipeline/narrate.ts`)** — one TTS call per step (parallelized with concurrency cap of 5); measures audio duration for Remotion frame counts
7. **Remotion Templates (`remotion/templates/`)** — self-contained React app; receives static SceneJSON + audio URLs as `inputProps`; no network calls inside compositions
8. **Status API (Next.js API route)** — `GET /api/job/:id`; returns status, progress (0-100), and `videoUrl` when complete
9. **Frontend (Next.js pages)** — upload UI with `react-dropzone`, live status polling, HTML5 video player

### Critical Pitfalls

1. **Scene schema designed before Remotion templates** — The most common cause of mid-build rewrites. Claude's output schema must be derived from what Remotion templates can animate, not the other way around. Design templates against mock data first, then lock the schema, then write the LLM prompt to match. Never let schema evolve ad-hoc after templates are built.

2. **Audio duration unknown until after generation** — Remotion requires fixed `durationInFrames` per slide. ElevenLabs returns variable-length audio. Generate all TTS audio first, measure each file's exact duration in milliseconds, then compute frame counts as `Math.ceil((audioDuration / 1000) * fps) + paddingFrames`. Any hardcoded slide duration will cause desync.

3. **Claude treats every PDF page as an image** — Dense IKEA manuals can exhaust the 200K token context window before all steps are extracted. Pre-flight check: count tokens before sending, reject PDFs over a configurable page threshold, and split large documents into 10-15 page chunks. Use the Files API to upload once and reference by `file_id` for retries.

4. **Retry loops without cost budget** — LLM validation failures triggering automatic retries on full-PDF vision calls can cost $5-10+ per document. Cap retries at 2 maximum; switch to a degraded text-only prompt on the second retry. Log cumulative token usage per job.

5. **@remotion/bundler in a Next.js API route** — Will silently fail or crash with a Webpack conflict. The render worker is a hard architectural requirement, not an optimization. Vercel serverless functions also have execution timeouts (60-300 seconds) that a full render pipeline will exceed; the worker must run as a long-lived process on a VPS or EC2 instance.

---

## Implications for Roadmap

Based on research, the dependency chain is strict: schema must precede templates, templates must precede pipeline integration, and audio generation must precede render. The natural phase structure follows the data flow, with the most uncertain stage (Claude extraction) validated early against real IKEA PDFs before committing to downstream components.

### Phase 1: Foundation — Schema, Templates, Infrastructure

**Rationale:** The scene JSON schema is the contract everything else depends on. If it changes after templates and prompts are built, rework cascades through the entire codebase. Templates must be built against mock schema data first to validate the visual design before any pipeline is wired. Infrastructure (file storage, job queue, job status DB) is a prerequisite for everything else.
**Delivers:** Working Remotion templates with mock data, S3 upload flow, BullMQ worker scaffold, job state machine, schema locked as a Zod type
**Addresses:** PDF upload (table stakes), processing status indicator foundation, step-by-step visual structure (template), on-screen captions and step counter
**Avoids:** Schema-template mismatch (Pitfall 2); Remotion bundler in Next.js (structural constraint)

### Phase 2: LLM Extraction — PDF Parsing and Claude Integration

**Rationale:** The most uncertain stage in the pipeline. Claude's behavior on real IKEA PDFs must be validated before committing to the full pipeline orchestration. Build and test the parse → simplify chain in isolation against real manuals. Validate Zod schema enforcement on Claude output.
**Delivers:** Working `parse.ts` + `simplify.ts` that produces valid SceneJSON from a real IKEA PDF; Zod validation enforced at the boundary; token pre-flight check
**Addresses:** Readable output for real manuals (table stakes); LLM scene JSON extraction (P0 feature)
**Avoids:** Context window exhaustion on dense PDFs (Pitfall 1); hallucination propagation without confidence fields (Pitfall 3); retry cost spiral (Pitfall 5)

### Phase 3: Audio and Render Pipeline

**Rationale:** With SceneJSON validated, ElevenLabs TTS and Remotion render can be integrated in the correct order: audio first, then derive frame counts, then render. This is the phase where audio-visual sync is either built correctly or becomes a permanent debt.
**Delivers:** Working `narrate.ts` → `render.ts` chain; audio duration drives Remotion slide durations; final MP4 output stored to S3
**Addresses:** Voiceover narration (table stakes); audio-visual sync (table stakes); ElevenLabs TTS integration (P0 feature)
**Avoids:** Audio-visual desync from hardcoded slide durations (Pitfall 4); ElevenLabs 429 handling; h264 codec for universal browser playback

### Phase 4: Pipeline Orchestration and End-to-End Integration

**Rationale:** Wire all stages together through the BullMQ worker with checkpointed state. This is the integration phase — each stage was built and tested in isolation; now the full upload-to-video flow runs end-to-end against a real IKEA manual.
**Delivers:** Full pipeline running end-to-end; granular job status updates per stage; error handling and partial failure recovery; CORS headers for S3 download
**Addresses:** Processing status indicator (table stakes); MP4 download + preview (P0 feature); full pipeline reliability
**Avoids:** Silent failures on bad manuals (UX pitfall); no progress feedback causing user refreshes (UX pitfall); CORS blocking download

### Phase 5: Polish and Differentiators

**Rationale:** With the core pipeline validated end-to-end on real inputs, add the features that elevate perceived quality without changing the architecture. These are all low-effort, high-visibility additions that share the existing scene schema and template system.
**Delivers:** Warning/caution card scene type; tool/parts callout scene type; animated arrows and highlight overlays; mobile-responsive player; multiple voice option dropdown (ElevenLabs voice selection)
**Addresses:** Warning/caution cards (P1); tool/parts callout (P1); animated arrows (P1)
**Avoids:** Template proliferation (keep variant system, not new templates per feature)

### Phase Ordering Rationale

- **Schema before everything:** Remotion templates, Claude prompts, and Zod validators all depend on the schema. A schema change after any of these are built is expensive. Weeks 1-2 must lock the schema.
- **Templates before pipeline:** Templates built against mock data let the visual design be validated and iterated without API costs. The pipeline integration then targets a known, working template.
- **LLM extraction before audio/render:** Claude's output quality on real manuals is the highest-uncertainty stage. Validate it in isolation before building downstream stages that depend on it.
- **Audio before render:** ElevenLabs audio duration is the input to Remotion frame computation. This dependency is non-negotiable and must be wired correctly in Phase 3.
- **Full pipeline wiring last:** Integration complexity compounds quickly; all stages should be independently functional before being wired together.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (LLM Extraction):** Claude behavior on real IKEA PDFs is empirically variable. Pre-build prompt engineering experiments with 3-5 diverse manuals are strongly recommended before committing the final schema. The token counting and chunking strategy should be tested with actual target documents.
- **Phase 3 (Audio + Render):** ElevenLabs concurrency tier limits and per-model character caps require validation against the actual account tier. Remotion frame count calculation from audio duration should be verified with real variable-length TTS output.
- **Phase 4 (Orchestration):** BullMQ checkpoint strategy and failure recovery behavior under partial pipeline failure deserves a short spike before full implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** S3 presigned URL uploads, Next.js App Router API routes, and BullMQ worker scaffolding are all extremely well-documented with standard patterns.
- **Phase 5 (Polish):** Adding scene type variants to an existing Remotion template system follows the established pattern from Phase 1; no novel integration required.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack is locked by project requirements; surrounding infrastructure (BullMQ, S3, Zod) is verified against official docs and widely-deployed patterns |
| Features | MEDIUM | Table stakes and anti-features have HIGH confidence; differentiator prioritization is inferred from analogous tools and domain reasoning rather than direct user research |
| Architecture | HIGH | Async request-reply pipeline, storage-mediated stage handoffs, and Remotion bundler separation are all verified against official Remotion docs and real production patterns |
| Pitfalls | HIGH | All 5 critical pitfalls are verified across official documentation (Anthropic, Remotion, ElevenLabs) plus community incident reports; the schema-before-templates pitfall is directly corroborated by Remotion team guidance |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Real IKEA PDF behavior:** The actual token consumption and hallucination rate on real IKEA-style manuals (vs. text-heavy PDFs) can only be confirmed empirically. The chunking thresholds (page count limits) need calibration against real target documents before Phase 2 is planned in detail.
- **ElevenLabs account tier limits:** Character limits per request (5K-10K depending on model) and concurrent request caps depend on the account tier. Verify actual limits before designing the parallelization strategy in Phase 3.
- **Remotion Lambda readiness:** STACK.md recommends starting with a self-hosted Node.js worker. If the project timeline includes a deployed demo, the AWS setup (IAM, Lambda function, S3 CORS) adds non-trivial overhead. This decision point should be made explicit in the roadmap rather than deferred.
- **DOCX support scope:** Real manufacturer DOCX furniture manuals have embedded images, tracked changes, and complex styles that break naive conversion. Unless DOCX support is explicitly in scope, it should be treated as a post-v1 feature with a clear caveat in the v1 release.

---

## Sources

### Primary (HIGH confidence)
- [Remotion SSR/Node.js Docs](https://www.remotion.dev/docs/ssr) — rendering architecture, bundler constraints, Lambda migration path
- [Remotion Next.js Integration](https://www.remotion.dev/docs/miscellaneous/nextjs) — bundler-in-API-route limitation (hard constraint)
- [Remotion Deployment Comparison](https://www.remotion.dev/docs/compare-ssr) — Lambda vs Node.js vs Vercel rendering options
- [Remotion Performance Tips](https://www.remotion.dev/docs/performance) — GPU effects, concurrency, development workflow
- [Remotion Lambda Limits](https://www.remotion.dev/docs/lambda/limits) — codec availability, concurrency quotas
- [Claude PDF Support (Official)](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — image token costs, page limits, Files API, password-protected PDF handling
- [ElevenLabs Character Limits](https://help.elevenlabs.io/hc/en-us/articles/13298164480913) — per-request caps by model
- [ElevenLabs Latency Optimization](https://elevenlabs.io/docs/best-practices/latency-optimization) — concurrency patterns
- [IKEA-Manual NeurIPS 2022](https://proceedings.neurips.cc/paper_files/paper/2022/file/b645d1a085bcb39bece5c03703b62464-Paper-Datasets_and_Benchmarks.pdf) — peer-reviewed research on IKEA manual parsing challenges

### Secondary (MEDIUM confidence)
- [BullMQ npm / docs](https://www.npmjs.com/package/bullmq) — version confirmation, TypeScript support
- [Next.js background job patterns](https://www.nico.fyi/blog/long-running-jobs-nextjs-redis-bull) — BullMQ + Next.js integration pattern
- [PDF Pipeline Production Case Study](https://dev.to/kailash_ac43c0ef1daf14abd/what-changed-when-our-research-pipeline-hit-a-pdf-wall-production-case-study-g94) — real-world context window exhaustion incident
- [LLM Structured Output 2026](https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk) — schema validation patterns
- [Remotion Audio Out-of-Sync Fix](https://crepal.ai/blog/aivideo/blog-how-to-fix-remotion-audio-out-of-sync/) — audio duration → frame count pattern
- [7 Best AI Tools to Turn Documents Into Videos 2026](https://www.libertify.com/7-best-ai-tools-to-turn-documents-into-videos-2026-review/) — competitive feature landscape

### Tertiary (LOW confidence)
- [Improving IKEA assembling experience with AI — Medium/Balan](https://medium.com/@anastasia.balan/improving-ikea-assembling-furniture-experience-in-collaboration-with-ai-0d6f1c360314) — domain-specific UX perspective; single practitioner

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
