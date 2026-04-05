---
phase: quick
plan: 260405-ekf
subsystem: pipeline, remotion, schema
tags: [sprite, rasterization, background-image, pdf, remotion]
dependency_graph:
  requires: []
  provides:
    - lib/scene/schema.ts (pageIndex + backgroundImageUrl fields on stepSchema)
    - lib/pdf/rasterize-step-pages.ts (rasterizeStepPages function)
    - worker/extraction-pipeline.ts (Phase 1.5 step page rasterization)
    - remotion/compositions/AssemblySteps.tsx (IsoCanvas background image support)
  affects:
    - lib/claude/extract-scene.ts (SYSTEM_PROMPT instructs pageIndex emission)
tech_stack:
  added: []
  patterns:
    - PDF page rasterization via pdftoppm (graceful fallback if unavailable)
    - Step background image injection post-extraction
    - Conditional Remotion Img rendering in IsoCanvas
key_files:
  created:
    - lib/pdf/rasterize-step-pages.ts
  modified:
    - lib/scene/schema.ts
    - lib/claude/extract-scene.ts
    - worker/extraction-pipeline.ts
    - remotion/compositions/AssemblySteps.tsx
decisions:
  - "Use opacity: 0.35 for background image so manual diagram is visible without overpowering animated parts overlay"
  - "Phase 1.5 runs after scene extraction so pageIndex values from Claude are available before rasterization"
  - "Graceful fallback: if pdftoppm unavailable or rasterization fails, pipeline continues with dot-grid background"
  - "publishedStepPagesDir cleaned up in same finally block as publishedAudioDir and publishedSpritesDir"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-05T17:34:38Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase quick Plan 260405-ekf: Sprite-Based Assembly Animation Summary

**One-liner:** Manual diagram pages rasterized via pdftoppm and injected as semi-transparent backgrounds in Remotion IsoCanvas, replacing the synthetic dot-grid with actual PDF content.

## What Was Built

The pipeline now extracts `pageIndex` values from Claude's scene extraction output, rasterizes those PDF pages at 150 DPI using `pdftoppm`, copies the PNGs to `remotion/public`, uploads them to S3, and injects `backgroundImageUrl` into each step object before rendering. The Remotion `IsoCanvas` component conditionally renders a Remotion `<Img>` background at 35% opacity when `backgroundImageUrl` is present, falling back to the dot-grid pattern when absent.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Schema + Rasterizer + Prompt updates | 640703b |
| 2 | Pipeline integration + Remotion background rendering | 107d9ea |

## Changes by File

**lib/scene/schema.ts** — Added `pageIndex: z.number().int().min(0).optional()` and `backgroundImageUrl: z.string().optional()` to `stepSchema` after `detailInset`. Both fields are optional so existing scene JSON without them remains valid. `sceneJsonSchema` and `renderInputSchema` pick up the new fields automatically (no manual changes needed).

**lib/pdf/rasterize-step-pages.ts** — New file. Exports `StepPageRaster` interface and `rasterizeStepPages` function. Iterates `pageIndices`, calls `pdftoppm -png -r {dpi} -f {page+1} -l {page+1} -singlefile` per page, collects results. Gracefully returns empty array if `pdftoppm` is unavailable (same fallback pattern as `rasterize-parts.ts`).

**lib/claude/extract-scene.ts** — Appended pageIndex instruction to `SYSTEM_PROMPT`. Instructs Claude to emit `pageIndex` (0-based) per step and explicitly states NOT to emit `backgroundImageUrl` (pipeline-injected only).

**worker/extraction-pipeline.ts** — Added Phase 1.5 block after scene extraction: collects unique `pageIndex` values, rasterizes pages, copies to `remotion/public/__assembli-step-pages/{jobId}/`, uploads to S3 at `uploads/{jobId}/step-pages/`, injects `backgroundImageUrl` into step objects. Added `publishedStepPagesDir` cleanup to the existing finally block. Import added for `rasterizeStepPages`.

**remotion/compositions/AssemblySteps.tsx** — Updated `IsoCanvas` component to conditionally render `<Img src={step.backgroundImageUrl} />` at `opacity: 0.35` with `objectFit: "contain"` when `backgroundImageUrl` is present. Falls back to dot-grid `<div>` when absent. Drafting corner marks retained in both modes.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths are wired. Steps without a `pageIndex` from Claude gracefully fall back to dot-grid.

## Threat Flags

None beyond the plan's threat model (T-quick-01: pageIndex validated as non-negative int by Zod; T-quick-02: same DDoS risk profile as existing rasterizePartSprites, accepted).

## Self-Check: PASSED

- FOUND: lib/scene/schema.ts
- FOUND: lib/pdf/rasterize-step-pages.ts
- FOUND: lib/claude/extract-scene.ts
- FOUND: worker/extraction-pipeline.ts
- FOUND: remotion/compositions/AssemblySteps.tsx
- FOUND: commit 640703b (Task 1)
- FOUND: commit 107d9ea (Task 2)
