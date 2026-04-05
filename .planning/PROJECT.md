# Assembli

## What This Is

A web app that converts uploaded furniture assembly manuals (PDF, DOCX) into short, step-by-step explainer videos. Consumers upload a manual, the system parses it, simplifies instructions with an LLM, generates animated visuals using Remotion templates, adds ElevenLabs voiceover, and delivers a watchable video — like animated IKEA instructions.

## Core Value

Upload a furniture assembly manual, get back a clear, watchable explainer video that makes the build easy to follow.

## Requirements

### Validated

- Phase 2 (2026-04-04): Claude-backed PDF → Zod-validated SceneJSON pipeline in worker (human UAT pending for real manual).
- Phase 4 (2026-04-05): Job status API exposes presigned `videoUrl` when `videoKey` is present; home UI shows pipeline progress, HTML5 player, and failure states per OUTPUT-01 (full MP4 path still depends on Phase 3).

### Active

- [ ] User can upload a furniture assembly manual (PDF, DOCX)
- [x] System extracts and parses manual content (steps, tools, warnings, diagrams) — PDF path via worker + Claude; DOCX later
- [x] Claude LLM simplifies instructions into structured scene JSON — `extractSceneFromPdfBuffer`
- [x] Scene JSON follows a clean, well-defined schema (not raw generated code)
- [ ] Predefined Remotion animation templates render scenes (parts assembling, arrows, highlights)
- [ ] ElevenLabs generates voice narration from the step script
- [ ] System renders final video with animations, captions, and voiceover synced together
- [ ] Animations are simple exploded-view style (parts moving together, not 3D)
- [ ] Output is a short (1-3 min) video with one step per slide
- [x] User can download or view the completed video — presigned playback URL + in-app player when worker supplies `videoKey` (Phase 4); render still Phase 3

### Out of Scope

- Video editing or timeline editor — v1 is one-shot (upload → video)
- 3D rendering or complex physics-based animations — simple 2D/exploded-view only
- OAuth or account management — not needed for v1 demo
- Non-assembly manuals (electronics setup, software, etc.) — furniture first
- Mobile app — web only
- Real-time collaboration — single user flow

## Context

- Target audience: consumers who bought furniture and want visual assembly help
- Primary manual type: furniture assembly (IKEA-style step-by-step)
- Video style: short and simple, minimal animation, one step per animated slide
- v1 goal: end-to-end demo — upload one real IKEA manual, get a watchable video
- No editing capability needed — pipeline is fully automated
- LLM choice: Claude API for document understanding and instruction simplification
- Animation framework: Remotion (React-based programmatic video)
- Voice narration: ElevenLabs TTS API
- Tech stack and rendering infrastructure: open to research recommendations

## Constraints

- **LLM**: Claude API — chosen for document understanding capability
- **Animation**: Remotion — React-based, programmatic video generation
- **Voice**: ElevenLabs — TTS for narration
- **Scope**: v1 is a proof-of-concept demo, not production-ready
- **Visual complexity**: 2D exploded-view animations only, no 3D

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude for document parsing | Strong document understanding, user preference | — Pending |
| Remotion for video generation | React-based, programmatic, template-friendly | — Pending |
| ElevenLabs for TTS | High-quality voice synthesis API | — Pending |
| No video editor in v1 | Keep scope tight for demo — one-shot pipeline | — Pending |
| Furniture assembly first | Clear domain with visual, step-based instructions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after Phase 4 (Pipeline Integration and Output) implementation*
