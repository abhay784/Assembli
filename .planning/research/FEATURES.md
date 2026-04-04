# Feature Research

**Domain:** Manual-to-Video Pipeline (Furniture Assembly)
**Researched:** 2026-04-04
**Confidence:** MEDIUM — Table stakes drawn from analogous document-to-video tools (HIGH confidence); assembly-specific UX expectations drawn from installation video research (MEDIUM confidence); anti-features based on project constraints and scope reasoning (HIGH confidence)

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are features that, if missing, cause users to abandon the product or consider it incomplete. They are non-negotiable for v1.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PDF upload | Entry point to the entire product — no upload, no product | Low | PDF is the universal format for furniture manuals; DOCX is bonus |
| Processing status indicator | Video generation takes 1-5+ minutes; users need to know it's working | Low | A progress bar or animated "generating…" state. Without this, users think it's broken and refresh, killing the job |
| Downloadable MP4 output | Users expect to keep or reuse the video; streaming-only feels incomplete | Low | Single download button is sufficient |
| In-browser video preview | Users want to watch before downloading; auto-downloading feels aggressive | Low | Standard HTML5 `<video>` player with play/pause/seek |
| Step-by-step visual structure | Each assembly step on its own slide/scene — users learn by step, not by paragraph | Medium | This is the core information architecture; one step per scene is the expected idiom |
| On-screen step text (captions) | Users reference the text while hands are occupied during assembly; voiceover alone is insufficient | Low | Synchronized captions per scene, not full subtitle track |
| Voiceover narration | Audio instructions free users' eyes for the physical assembly task | Medium | ElevenLabs TTS integration; single consistent voice throughout |
| Audio-visual sync | Narration must match what's shown on screen — desync breaks comprehension | Medium | Remotion handles this at the template level; key to get right at scene schema design time |
| Readable output for real manuals | Must handle actual IKEA-style PDFs with diagrams, numbers, and minimal text — not just clean prose documents | High | The hardest table-stakes item; requires robust PDF parsing and LLM extraction, not naive text chunking |

---

### Differentiators (Competitive Advantage)

These features are not expected by default but create meaningful lift in user satisfaction, shareability, and perceived quality. None are required for a v1 proof-of-concept, but they are worth knowing so the roadmap can leave doors open.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Exploded-view part animations | Parts visually "fly in" and assemble — shows spatial relationships, not just narrates them | High | This is Assembli's core visual differentiator vs. slide-show competitors. Remotion templates with SVG/Canvas paths. Requires a part-placement data model |
| Animated arrows and highlight overlays | Directs attention to the specific connector, screw hole, or join being described | Medium | Can be implemented as a Remotion overlay layer driven by scene JSON fields. High signal-to-noise ratio improvement |
| Numbered step counter HUD | "Step 3 of 12" visible throughout — gives assembly context and reduces cognitive load | Low | Simple Remotion text overlay; low effort, high perceived quality |
| Tool/parts callout at scene start | Each step opens with a brief "you'll need: bolt A, washer B" beat before the animation | Low | Driven by scene JSON; one extra scene type in the template library |
| Warning/caution cards | Safety notes and "do not do X" instructions rendered as a distinct visual card (red border, icon) | Low | Drives real safety value; manuals contain these but most video converters ignore them |
| Multiple voice options | Let users choose a voice tone (calm, energetic) or gender | Low | ElevenLabs supports this; one dropdown in the UI |
| Video chapter markers | Seek bar markers at each major assembly stage (e.g., "Frame," "Shelves," "Doors") | Medium | Requires LLM to identify phase groupings in addition to individual steps |
| Shareable link | Generate a public URL that recipients can watch without downloading | Medium | Requires file hosting (S3 or equivalent) + short-lived signed URL or public bucket |
| Mobile-friendly player | Video plays well on phone screens — users often watch assembly videos on a phone propped up nearby | Low | Responsive CSS on the player embed; no native app required |
| Regenerate individual step | Re-run the pipeline for a single step if the output looks wrong | High | Requires per-step idempotency in the pipeline; saves time over full re-generation but adds significant backend complexity |

---

### Anti-Features (Commonly Requested, Often Problematic)

These are features that seem reasonable, are often requested, but are either out of scope, expensive to build correctly, or actively undermine the product's value proposition. Build deliberately NOT building these.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Timeline / video editor UI | Complex to build, hard to maintain, and transforms Assembli into a video editing tool rather than a pipeline. Users who want editing have Premiere, CapCut, etc. | Keep pipeline fully automated. If the output is wrong, fix the pipeline — not give users a screwdriver |
| 3D rendering or model import | Requires 3D assets (which manuals don't contain), WebGL expertise, and dramatically increases complexity. IKEA-style 2D exploded views communicate the same information | Stick to 2D SVG-style exploded animations within Remotion templates |
| Branching / interactive video | Makes sense for e-learning tools (HeyGen, Colossyan), not for assembly guides where the correct order is fixed | Linear video is correct for assembly; every step is sequential |
| Real-time generation (< 5 seconds) | Remotion rendering, ElevenLabs TTS, and Claude API calls are sequential and take real time. Chasing real-time creates infrastructure complexity disproportionate to the value | Set honest expectations: "Your video is generating, usually ready in 2-4 minutes." Good UX beats false speed |
| User accounts / project management | Not needed for v1 proof-of-concept. Adds auth infrastructure, session management, and saved-video storage — all orthogonal to validating the core pipeline | Anonymous, session-scoped use. One upload, one video, one download |
| Multi-language output | Translation + voice cloning in new languages multiplies complexity and costs without validating the core pipeline first | Ship English first. Language switching is a clean add-on once the pipeline is stable |
| Re-uploading / editing the source manual | Users expect the pipeline to handle the manual correctly. Asking them to re-annotate the manual inverts the value proposition | Improve the parser and LLM prompt to handle edge cases rather than making users do pre-processing work |
| Analytics / engagement tracking | LMS-style drop-off analytics (Libertify, Synthesia) are an enterprise feature. Consumer users uploading a furniture manual don't want their viewing tracked | No analytics in v1; add only if a B2B use case emerges |
| Avatar-led presentation | Talking-head avatars (HeyGen, Colossyan style) add distraction without value for assembly tasks. Users follow the assembly, not the presenter | Animated diagrams + voiceover is the right idiom for this domain |

---

## Feature Dependencies

```
PDF Upload
  └── Document Parsing (PDF → structured text + diagrams)
        └── LLM Instruction Simplification (structured text → scene JSON)
              ├── ElevenLabs TTS (scene script → audio files per scene)
              ├── Remotion Template Rendering (scene JSON + audio → video frames)
              │     ├── Step Counter HUD  [low-hanging, add at template time]
              │     ├── Caption overlays  [required — drives table-stakes caption feature]
              │     ├── Exploded-view part animations  [differentiator — needs part data in scene JSON]
              │     └── Warning cards  [differentiator — needs warning flag in scene JSON]
              └── Final Video Assembly (Remotion renders → encoded MP4)
                    ├── Processing Status Indicator  [needed before this step starts]
                    ├── In-Browser Preview Player  [post-render]
                    └── MP4 Download  [post-render]

Shareable Link  →  depends on  →  File Hosting (S3 or equivalent)
                                    (not required for v1 download-only flow)

Multiple Voice Options  →  depends on  →  ElevenLabs voice selection API
                                           (minimal backend change, UI dropdown)
```

**Critical dependency chain:** The scene JSON schema is the contract between the LLM step and the Remotion step. Every feature that appears in the video (captions, warnings, part callouts, step counter) must be represented as a field in the schema. Schema design is a forcing function for feature decisions — what you want in the video must be in the schema before rendering code is written.

---

## MVP Definition

The v1 proof-of-concept must demonstrate the full end-to-end pipeline with a single real IKEA manual. Success criterion: a human watching the output understands how to assemble the piece of furniture.

**Must have for MVP:**

1. PDF upload (single file, web form)
2. Document parsing that handles real IKEA-style PDFs (numbered steps, part labels, tool lists)
3. LLM scene JSON generation with a well-defined, validated schema
4. ElevenLabs voiceover generation per scene
5. Remotion template rendering with: animations (even simple ones), synced captions, step counter
6. Processing status indicator (polling or websocket, not a spinner that times out)
7. In-browser MP4 preview + download button

**Deliberately deferred from MVP:**

- Shareable links (hosting infrastructure not needed to validate the pipeline)
- Multiple voice options (single default voice is sufficient to validate TTS integration)
- Warning/caution cards (nice to have, add once base template works)
- Tool/parts callout scenes (same — add as a second scene type after first type is proven)
- Mobile-optimized player (desktop-first is fine for a proof-of-concept)
- Any video editing capability

---

## Feature Prioritization Matrix

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| PDF upload + parsing | High | Medium | P0 | 1 |
| LLM scene JSON extraction | High | High | P0 | 1 |
| Remotion template (base) | High | High | P0 | 2 |
| ElevenLabs TTS integration | High | Low | P0 | 2 |
| Audio-visual sync | High | Medium | P0 | 2 |
| Processing status indicator | High | Low | P0 | 2 |
| Step counter HUD | High | Low | P0 | 2 |
| Caption overlays | High | Low | P0 | 2 |
| MP4 download + preview | High | Low | P0 | 3 |
| Warning/caution cards | Medium | Low | P1 | 3 |
| Tool/parts callout scenes | Medium | Low | P1 | 3 |
| Animated arrows + highlights | Medium | Medium | P1 | 3 |
| Exploded-view part animations | High | High | P1 | 3+ |
| Multiple voice options | Low | Low | P2 | Post-MVP |
| Shareable link | Medium | Medium | P2 | Post-MVP |
| Chapter markers | Low | Medium | P2 | Post-MVP |
| Regenerate individual step | Medium | High | P3 | Post-MVP |

**Priority key:** P0 = MVP blocker, P1 = high-value MVP addition, P2 = post-MVP, P3 = v2+

---

## Sources

- [7 Best AI Tools to Turn Documents Into Videos (2026) — Libertify](https://www.libertify.com/7-best-ai-tools-to-turn-documents-into-videos-2026-review/) — MEDIUM confidence; commercial review, but feature lists are accurate to current tools
- [Video vs Interactive 3D Assembly Instructions — Cadasio](https://www.cadasio.com/post/video-vs-interactive-3d-assembly-instructions) — MEDIUM confidence; vendor-authored but based on observable user behavior
- [30 Product Installation Videos That Ensure Seamless User Experience — Advids](https://advids.co/blog/product-installation-video) — MEDIUM confidence; professional video production perspective
- [Improving IKEA assembling furniture experience in collaboration with AI — Medium/Anastasiia Balan](https://medium.com/@anastasia.balan/improving-ikea-assembling-furniture-experience-in-collaboration-with-ai-0d6f1c360314) — LOW confidence; single practitioner perspective but domain-relevant
- [getRenderProgress() — Remotion Docs](https://www.remotion.dev/docs/lambda/getrenderprogress) — HIGH confidence; official documentation
- [AI Video Generator: Complete Guide 2026 — DeepReel](https://deepreel.com/blog/ai-video-generator-complete-guide) — LOW confidence; marketing content, used only for general landscape context
- [PDF to Video Converter — Synthesia](https://www.synthesia.io/tools/pdf-to-video) — MEDIUM confidence; direct competitor product, feature list observable
- [AI Explainer Video Maker — Colossyan](https://www.colossyan.com/posts/ai-generated-explainer-videos-best-tools-examples-that-convert) — MEDIUM confidence; competitor landscape overview
- [PDF Parsing for LLM Input — Nicolas Brosse](https://nbrosse.github.io/posts/pdf-parsing/pdf-parsing.html) — HIGH confidence; technical practitioner post with concrete tool comparisons
