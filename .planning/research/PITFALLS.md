# Pitfalls Research

**Domain:** Manual-to-Video Pipeline (Furniture Assembly)
**Researched:** 2026-04-04
**Confidence:** HIGH (core pitfalls verified across official docs + multiple independent sources)

---

## Critical Pitfalls

### Pitfall 1: Treating Claude's PDF Input as a Document Reader — It's a Vision Model

**What goes wrong:**
Claude converts every PDF page into an image internally before processing. An IKEA-style manual that is 40 pages of diagrams will consume 40x the image token budget (roughly 7,000 tokens per page for visual analysis vs. 1,500 for text-only). A dense 30-page manual can fill the entire 200K token context window before step extraction even begins, causing truncation or silent failure of later pages.

**Why it happens:**
Teams assume Claude "reads" PDFs like a text file. The Anthropic docs are explicit: "since PDF support relies on Claude's vision capabilities, it is subject to the same limitations." Dense PDFs with many small-font pages, complex tables, or heavy graphics can fill the context window before reaching the page limit.

**How to avoid:**
- Count tokens before sending: use the token counting API to verify the PDF fits
- Split large manuals into page-range chunks (10-15 pages per call) and merge results
- Downsample embedded images in the PDF pre-flight to reduce image token cost
- Use the Files API to upload once, reference by `file_id` — avoids re-encoding overhead on retries
- Set a hard limit: reject PDFs over a configurable page threshold with a user-facing message

**Warning signs:**
- Extraction results that stop mid-manual with no error
- Steps that reference part numbers not mentioned in earlier output
- Token usage approaching 150K+ on a single API call

**Phase to address:** Document parsing / ingestion phase (Phase 1)

---

### Pitfall 2: Scene JSON Schema Is Designed by Guessing, Not by the Template

**What goes wrong:**
The LLM is prompted to emit a scene schema, then Remotion templates are written later to consume it. When template capabilities and schema structure diverge — a template can't animate "exploded_view_offset" because it was never built for that — you face a rewrite of either the schema, all previously generated content, or both. This is the most common cause of mid-project rewrites in document-to-animation pipelines.

**Why it happens:**
The pipeline is built left-to-right (parse → LLM → schema → Remotion) when the correct dependency is right-to-left: Remotion template capabilities define what the schema can express.

**How to avoid:**
- Design the schema starting from animation templates, not from what Claude can output
- Lock the schema before any LLM prompt engineering begins
- Version the schema (`"schemaVersion": 1`) from day one so breaking changes are detected
- Every Remotion template component should have a corresponding TypeScript type; the schema IS the type
- Validate Claude's output against the schema (Zod/Pydantic) on every call — never pass unvalidated JSON to Remotion

**Warning signs:**
- Schema fields that no Remotion template actually reads
- Template components with hardcoded fallbacks for fields that "might be there"
- Schema growing ad-hoc as new manual content appears

**Phase to address:** Schema design (before Phase 1 LLM work); schema validation (Phase 1)

---

### Pitfall 3: LLM Hallucination on Assembly Diagram Content

**What goes wrong:**
IKEA manuals are predominantly image-based with minimal text — arrows, numbered parts, tool icons, quantity callouts, and isometric views. Claude processes these as images and will hallucinate part numbers, screw quantities, or step descriptions when the diagram is low resolution, rotated, or has small callout text. The generated script sounds plausible but is factually wrong about the assembly.

**Why it happens:**
Even Sonnet-class models "may hallucinate" on very low-resolution, rotated, or tiny images per Anthropic's own guidance. IKEA PDFs frequently use very small annotation text adjacent to arrows. The LLM has no way to signal uncertainty — it outputs confident JSON regardless.

**How to avoid:**
- Pre-process PDFs: ensure proper upright orientation, minimum 150 DPI effective resolution per page
- Add explicit graceful degradation instructions in the system prompt: "If you cannot clearly read a part number, output `null` for that field — do not guess"
- Include a `confidence` field in the scene schema so low-confidence steps can be flagged for human review or skipped
- Treat the voiceover script as derived from the structured JSON — never have Claude write prose narration directly from visual diagrams

**Warning signs:**
- Part counts that don't match the physical hardware list on the manual's first page
- Steps that reference tools not shown in the manual
- Identical narration text across visually different steps

**Phase to address:** LLM prompt engineering phase (Phase 1); QA validation pass before render

---

### Pitfall 4: Audio Duration Is Unknown Until After Generation — Then It's Too Late

**What goes wrong:**
Remotion compositions require a fixed `durationInFrames` at definition time. The ElevenLabs API returns audio of variable length depending on the TTS voice speed and script length. If the composition duration is set before audio is generated, slides will either cut off mid-sentence or have awkward silence at the end. Multiply this across 15-20 steps and the video is unwatchable.

**Why it happens:**
Teams design Remotion compositions assuming each slide will be a fixed duration (e.g., "5 seconds per step"). The audio generation step happens later and produces variable-length clips. The two systems don't communicate until render time.

**How to avoid:**
- Generate all ElevenLabs audio first, measure each file's exact duration in milliseconds
- Compute Remotion slide durations from audio duration: `durationInFrames = Math.ceil((audioDuration / 1000) * fps) + paddingFrames`
- Pass computed durations into Remotion as composition props — never hardcode slide lengths
- Add 0.3-0.5 seconds of padding per slide for breathing room
- Use `useAudioData` in Remotion to introspect audio if dynamic adjustment is needed

**Warning signs:**
- Any hardcoded frame count per slide in Remotion templates
- Video where narration is cut off mid-word at slide transitions
- Slides with 2+ seconds of blank silence after narration ends

**Phase to address:** Pipeline orchestration phase (Phase 2/3); audio-first render sequencing

---

### Pitfall 5: Retry Loops Without Budget = Infinite Cost Spirals

**What goes wrong:**
LLM structured output failures are addressed with automatic retries. Each retry makes a full Claude API call with the full PDF payload. A document that consistently fails schema validation (bad diagram, ambiguous page) triggers 3-5 retries per call, multiplied across all steps. At 7,000 tokens per page for visual PDF processing, a single bad document can cost $5-10+ in API calls.

**Why it happens:**
Retry logic is implemented as a simple "try again" loop with no budget cap. Developers assume retries are cheap because text API calls usually are. PDF-as-vision calls are not.

**How to avoid:**
- Cap retries at 2 maximum per step — not per document
- On second retry, switch to a degraded prompt: "Extract only the step text, ignore diagram details"
- Implement per-request token budget tracking and abort if cumulative usage exceeds threshold
- Use Claude's structured output / tool use mode rather than asking for raw JSON to reduce parse failures at source
- Pre-validate the input document (page count, file size, has text layer) before sending to Claude

**Warning signs:**
- No maximum retry count in the parsing code
- No per-document cost tracking or logging
- API logs showing the same document submitted 4+ times

**Phase to address:** LLM orchestration layer (Phase 1-2)

---

## Technical Debt Patterns

### Pattern 1: Monolithic Pipeline Function

The entire flow — PDF upload, Claude extraction, ElevenLabs TTS, Remotion render — ends up as one large async function. When one step fails, the entire pipeline re-runs from scratch, including expensive calls already completed. This becomes critical when Remotion renders take 30-120 seconds.

**Prevention:** Model each pipeline stage as a checkpointed job with persistent intermediate state. Save Claude's JSON output to disk/DB before proceeding. Save each ElevenLabs audio file keyed to step ID. Remotion renders only run after audio assets are confirmed saved.

**Phase:** Architecture/infrastructure phase

---

### Pattern 2: Template Proliferation

Each "slightly different" furniture type or step type gets its own Remotion composition. What starts as 3 templates becomes 12 within a few weeks. Each template drifts from the shared schema, making schema updates a nightmare.

**Prevention:** Design one flexible base template with a limited set of layout variant props (e.g., `layout: "parts-assembly" | "tool-callout" | "warning"`). Resist creating new templates — extend the variant system instead.

**Phase:** Remotion template design phase

---

### Pattern 3: Voiceover Script Written Twice

Claude generates a scene description for animation. Then separately, Claude writes narration text. These two representations diverge — the animation shows Step 4 but the narration says "finally." The script is being synthesized from prose, not from the structured step data.

**Prevention:** Single source of truth: the structured JSON scene object is the only input to narration generation. The narration template is a deterministic transformation of `scene.stepText` + `scene.toolName` — not a separate Claude call.

**Phase:** LLM prompt engineering phase

---

## Integration Gotchas

### ElevenLabs Character Limits Per Request
Model-dependent: Eleven v3 caps at 5,000 characters per request; Multilingual v2 at 10,000. A long step description plus a detailed tool list could hit this limit. Implement automatic chunking and concatenation of audio clips if step narration exceeds the limit.

### ElevenLabs Concurrency Rate Limiting
HTTP 429 responses have two distinct causes: `too_many_concurrent_requests` (tier limit — queue requests) vs `system_busy` (transient — exponential backoff). Conflating these causes incorrect retry behavior. Implement separate handlers for each code.

### Remotion + AWS Lambda: av1 Codec Not Available
The `av1` codec is unavailable on Lambda due to function size constraints. Default to `h264` for Lambda renders. H.265 has poor browser compatibility. Stick with h264 for maximum delivery compatibility.

### Remotion Lambda Concurrency Quota
Default AWS Lambda concurrency limit is 1,000 per region per account, and may be lower on new accounts. Remotion's parallel rendering model relies heavily on concurrency. For a v1 demo this is not an issue, but if ever adding a queue, request quota increases early — AWS review takes time and requires justification.

### Claude PDF: No Password-Protected Files
Claude's PDF support rejects encrypted/password-protected PDFs silently or with an opaque error. Some furniture manuals distributed by retailers may be locked. Add a pre-flight check: attempt to read the first page and fail fast with a user-friendly error if the PDF is protected.

### DOCX Files Require Separate Handling
Claude's native PDF support does not extend to DOCX. DOCX files must be converted to PDF (via LibreOffice headless, Pandoc, or a conversion API) before sending to Claude. This conversion adds latency and can alter diagram fidelity. Test with real DOCX furniture manuals — not just PDFs — before claiming DOCX support.

---

## Performance Traps

### Trap 1: Rendering at Full Resolution During Development
Remotion renders at whatever resolution the composition specifies. Rendering 1080p video locally during every dev iteration wastes minutes per test. Use `--scale 0.5` or a low-resolution composition during development and switch to full resolution only for final output.

### Trap 2: GPU-Dependent CSS Effects in Remotion
CSS filters (`blur`, `drop-shadow`), WebGL canvases, and GPU-accelerated transforms cause severe bottlenecks on cloud instances without GPUs (Lambda, most CI). Avoid these entirely for v1. Use precomputed images and simple CSS transforms only.

### Trap 3: Not Measuring Concurrency Before Setting It
Remotion's `--concurrency` flag for Lambda renders needs calibration per video type. A value too low wastes parallelism; too high triggers Lambda cold starts. Use Remotion's built-in benchmark command before committing to a concurrency value.

### Trap 4: Naive Sequential Audio Generation
Generating ElevenLabs audio for all steps sequentially (one API call, wait, next) is slow. A 15-step manual at ~1 second per TTS call = 15 seconds minimum. Generate all TTS calls in parallel with a concurrency cap of 5 (ElevenLabs tier limit) using `Promise.all` with a semaphore.

---

## UX Pitfalls

### Pitfall 1: No Progress Feedback on a 2-3 Minute Operation
The full pipeline (parse → LLM → TTS → render) takes 2-3 minutes. Without visible progress, users assume the page is broken and refresh, creating duplicate jobs. Implement a step-by-step status stream: "Parsing manual... Extracting steps (12/15)... Generating audio... Rendering video..."

### Pitfall 2: Unplayable Video Delivered to Browser
Remotion can output WebM (VP8/VP9) or MP4 (h264). Safari has historically struggled with VP9 in `<video>` tags without MSE. Deliver h264 MP4 for universal browser playback without codec negotiation complexity.

### Pitfall 3: Silent Failure on Bad Manual
If the PDF is a scan of a scan, largely image-based with no text layer, or has rotated pages, Claude may produce minimal or hallucinated output. Without explicit failure modes, the user receives a video with narration like "Step 1: [unclear diagram]." Define minimum quality thresholds: if fewer than 3 steps are extracted, reject and tell the user the manual format is not supported.

### Pitfall 4: Video Too Long for the Content
The 1-3 minute target can balloon if each step generates 10 seconds of narration. A 30-step IKEA wardrobe at 10s/step = 5 minutes. Cap narration at 6-8 seconds per step by word-count limiting the TTS script, not by cutting off the audio mid-play.

---

## "Looks Done But Isn't" Checklist

These are failure modes that produce a working-looking demo that breaks on real inputs:

- [ ] **Only tested with one specific PDF** — the IKEA manual the team knows well. Novel manuals with different layouts will fail differently.
- [ ] **Steps extracted but order not verified** — Claude may reorder steps if the prompt doesn't enforce sequential extraction. The video makes no assembly sense.
- [ ] **Audio generated but not duration-matched to slides** — the video plays all audio but slide transitions don't align with sentence endings.
- [ ] **"Part A into Part B" narration without knowing what Part A looks like** — pure text narration with no visual anchor. Unhelpful for the actual assembly task.
- [ ] **Schema validated in tests but not in production pipeline** — Claude output goes directly to Remotion in prod, crashes when schema drifts.
- [ ] **Render succeeds locally but fails on Lambda** — WebGL effects, local fonts, or absolute file paths used in Remotion templates break in the Lambda environment.
- [ ] **DOCX conversion tested with a Word document, not a real furniture manual DOCX** — real manufacturer DOCX files have embedded images, tracked changes, or complex styles that break naive conversion.
- [ ] **No handling for ElevenLabs 429** — the first time a batch of requests hits the rate limit, all audio generation fails silently.
- [ ] **Video delivered but can't be downloaded** — download functionality assumed to work via browser `<a href>` on an S3 URL, but CORS headers not set.

---

## Pitfall-to-Phase Mapping

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PDF upload + ingestion | File size / page count exceeds token budget | Pre-flight check; chunk large PDFs |
| Claude document parsing | Hallucination on diagram-heavy pages | Graceful degradation prompt; confidence field |
| Claude document parsing | Retry cost spiral on bad documents | Max 2 retries; degraded fallback prompt; cost budget |
| Schema design | Schema-template mismatch causing rewrite | Design schema from Remotion first |
| LLM structured output | Malformed JSON crashing pipeline | Zod/Pydantic validation on every response |
| TTS audio generation | Variable audio length breaks fixed slide timing | Generate audio first, derive frame counts from duration |
| TTS audio generation | Rate limit 429 not handled | Separate handlers for `too_many_concurrent` vs `system_busy` |
| Remotion template design | GPU effects fail on Lambda | CSS-only, no WebGL; test in Lambda environment |
| Remotion render | Local fonts / paths not found in Lambda | Bundle all assets; use Google Fonts or self-hosted woff2 |
| Pipeline orchestration | Full re-run on partial failure | Checkpoint each stage; save intermediate outputs |
| Video delivery | CORS blocks download | Set S3 CORS + CloudFront headers before shipping |
| UX | User sees blank screen during 2-3 min pipeline | Server-sent events or polling for step-by-step status |

---

## Sources

- [Anthropic PDF Support Official Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — HIGH confidence (official, current)
- [Remotion Performance Tips](https://www.remotion.dev/docs/performance) — HIGH confidence (official docs)
- [Remotion Lambda Limits](https://www.remotion.dev/docs/lambda/limits) — HIGH confidence (official docs)
- [Remotion Encoding Guide](https://www.remotion.dev/docs/encoding) — HIGH confidence (official docs)
- [ElevenLabs Latency Optimization](https://elevenlabs.io/docs/best-practices/latency-optimization) — HIGH confidence (official docs)
- [ElevenLabs Character Limits FAQ](https://help.elevenlabs.io/hc/en-us/articles/13298164480913-What-s-the-maximum-amount-of-characters-and-text-I-can-generate) — HIGH confidence (official docs)
- [LLMs for Structured Data Extraction from PDFs — Unstract](https://unstract.com/blog/comparing-approaches-for-using-llms-for-structured-data-extraction-from-pdfs/) — MEDIUM confidence (industry blog, verified against official sources)
- [LLM Structured Output in 2026 — DEV Community](https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk) — MEDIUM confidence
- [How to Fix Remotion Audio Out of Sync — CrePal](https://crepal.ai/blog/aivideo/blog-how-to-fix-remotion-audio-out-of-sync/) — MEDIUM confidence (community verified against Remotion docs)
- [PDF Pipeline Production Case Study — DEV Community](https://dev.to/kailash_ac43c0ef1daf14abd/what-changed-when-our-research-pipeline-hit-a-pdf-wall-production-case-study-g94) — MEDIUM confidence (real-world incident report)
- [IKEA-Manual: Seeing Shape Assembly Step by Step — NeurIPS 2022](https://proceedings.neurips.cc/paper_files/paper/2022/file/b645d1a085bcb39bece5c03703b62464-Paper-Datasets_and_Benchmarks.pdf) — HIGH confidence (peer-reviewed research on IKEA manual parsing challenges)
- [Claude Vision for Document Analysis — GetStream](https://getstream.io/blog/anthropic-claude-visual-reasoning/) — MEDIUM confidence
- [LLM Structured Outputs: Schema Validation for Real Pipelines — Collin Wilkins](https://collinwilkins.com/articles/structured-output) — MEDIUM confidence
- [ElevenLabs API Guide 2025 — Webfuse](https://www.webfuse.com/blog/elevenlabs-api-in-2025-the-ultimate-guide-for-developers) — MEDIUM confidence
