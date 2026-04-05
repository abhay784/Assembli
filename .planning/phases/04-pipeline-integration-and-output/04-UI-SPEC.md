---
phase: 4
slug: pipeline-integration-and-output
status: draft
shadcn_initialized: true
preset: new-york
created: 2026-04-04
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for **Pipeline Integration and Output** (OUTPUT-01). Extends **Phase 1** `01-UI-SPEC.md` — do not contradict locked tokens unless this doc explicitly updates them.

**Phase UI scope:** End-to-end journey after PDF selection: **multi-stage pipeline progress**, **terminal states** (success with video, recoverable failure), and **in-browser video preview** of the completed explainer. **Depends on Phase 3** for a real **MP4 URL** (or presigned URL) exposed by the API; until then, UI is built with a **documented placeholder** (mock URL or sample asset) without blocking layout/copy work.

**Sources:** `.planning/ROADMAP.md` (Phase 4), `.planning/REQUIREMENTS.md` (OUTPUT-01, INGEST-03 v2), `01-UI-SPEC.md`, `app/page.tsx`, `components/upload/ManualUpload.tsx`.

---

## Layout & information architecture

| Item | Specification |
|------|----------------|
| Page structure | Single primary column, **max width 640px** for upload + status (unchanged from Phase 1). When **video preview** is shown, allow an **optional widening** to **min(100%, 960px)** for the player region only — title + upload block stay **640px** centered; player sits in a **full-width band** with `max-w-[960px] mx-auto` so 16:9 video does not feel cramped on desktop. |
| Vertical flow | (1) Display title + tagline → (2) upload card (Phase 1) → (3) **Pipeline status** section (appears once a job is active) → (4) **Result** section: error **or** video player (mutually exclusive). |
| Focal rules | During upload, focal point remains the **dropzone card**. After job is queued, focal shifts to **pipeline status**; on completion, focal shifts to **video player** (primary success outcome). |

---

## Design System (inherit + extend)

| Property | Value |
|----------|-------|
| Tool | **shadcn** (existing) |
| Preset | **new-york** (match Phase 1) |
| Component library | **Base UI** / Radix via existing `components/ui/*` |
| Icon library | **lucide-react** — add `CircleCheck`, `Loader2`, `Video`, `AlertCircle`, `Clapperboard` (or similar) for pipeline/video as needed |
| Font | **Geist Sans** (existing `app/layout.tsx`) |

**New primitives (planned adds):** shadcn **Separator** or subtle **border-t** for section breaks; optional **Stepper** pattern implemented with existing **Card** + list (no third-party stepper unless added via official registry). Video: **native `<video controls>`** — no custom video chrome required for v1 unless specified later.

---

## Spacing Scale

Same as Phase 1 (`xs`–`3xl`, multiples of 4). **Additional:**

| Usage | Token |
|-------|-------|
| Gap between upload card and pipeline section | `xl` (32px) |
| Gap between pipeline list and result (error or video) | `lg` (24px) |
| Inner padding for video container | `md` (16px) on mobile, `lg` on `md+` |

---

## Typography

Inherit Phase 1 roles (Body 16/400, Label 14/600, Heading 20/600, Display 28/600).

**New roles:**

| Role | Size | Weight | Usage |
|------|------|--------|--------|
| Section label | 12px | 600 | Uppercase optional; pipeline section title **Processing** or **Your video** |
| Pipeline step | 14px | 400–500 | Step name + short status |
| Video caption | 14px | 400 | Muted helper under player (e.g. duration, filename) |

---

## Color

Inherit Phase 1 palette (slate surfaces, teal accent, red destructive).

**Accent usage extension:** **Play-ready** state (video available) may use accent on a single **“Watch”** or **“Replay”** text button if needed; primary visual success is the **player itself**, not a second competing CTA.

**Muted:** Step labels and secondary timestamps use `text-muted-foreground` (slate-500/600 range per theme).

---

## Pipeline progress (INGEST-03 / Phase 4)

**Requirement:** User sees **progress through stages** without manual intervention (roadmap SC #1).

**UX model:** **Ordered list** of stages (vertical). Each row: **icon** (pending / in progress / complete / failed) + **label** + optional **short subline** (“About 1 min” is **out of scope** unless backend provides ETA — omit or show indeterminate copy only if product agrees).

**Default stage labels** (adjust to match API contract when finalized):

| Order | Label (user-facing) | Maps to typical backend |
|------|------------------------|-------------------------|
| 1 | Uploading manual | S3 PUT (may overlap Phase 1 progress bar — see below) |
| 2 | Extracting steps | LLM / scene JSON |
| 3 | Generating narration | TTS (Phase 3) |
| 4 | Rendering video | Remotion / encode |
| 5 | Finishing up | Upload MP4 / finalize job |

**Rules:**

- **Single source of truth:** Derive row state from **job status payload** (or expanded job detail endpoint). If API only exposes coarse `queued` | `processing` | `completed` | `failed` until Phase 4 backend lands, show **one** indeterminate “Processing…” row + spinner — do **not** fake five green checkmarks.
- **Upload overlap:** While S3 PUT is in progress, keep **existing** determinate progress **inside** the upload card (Phase 1). Pipeline section appears **after** upload succeeds and job id exists — first pipeline step may show **complete** for upload if the API confirms it.
- **Failure:** The **first** failed stage shows **destructive** icon + one-line reason; global error banner repeats **actionable** copy (retry upload, contact support, or “try again” if API provides reset).

---

## Video preview (OUTPUT-01)

**Requirement:** Completed video is **playable in the browser** with an HTML5 player (roadmap SC #2).

| Element | Specification |
|---------|----------------|
| Container | Rounded border aligned with **Card** radius (`rounded-xl` if cards use it); background **secondary** (`bg-card` or white) |
| Aspect ratio | **16:9** box — use `aspect-video` wrapper; **letterbox** if source differs |
| Controls | Native **`controls`** attribute — play/pause, volume, fullscreen, timeline |
| Poster | Optional `poster` image — **not required** for v1 |
| Source | Single `src` from API (`videoUrl` or presigned URL field — **exact field name** to be set when API is defined). **Fallback:** `src` empty → show **skeleton** or **placeholder illustration** + “Video will appear here when processing finishes.” |
| Autoplay | **Off** by default (accessibility + browser policy); optional “Play video” button focusable first |
| Caption line | Below player: optional **Body** 14px muted — job id or filename (match Phase 1 monospace rule for ids if shown) |

---

## Error states (roadmap SC #3)

**Requirement:** Failures show **meaningful** error; **no** indefinite loading.

| Situation | Behavior |
|-----------|----------|
| Job `failed` | Show **Alert** destructive with **server message** if present; else generic **Something went wrong while processing your manual.** + **Try again** (scroll to upload / reset) |
| Poll / network error | Existing copy path: **Could not load job status** — offer **Retry** that refetches |
| Video missing on `completed` | Edge case: if status is completed but `videoUrl` missing — **Alert**: “Video is not available yet. Refresh the page.” |
| Stuck processing | If client detects **no progress change** beyond a **long** threshold (e.g. 10+ minutes), show **non-blocking** warning: “This is taking longer than usual.” + **Retry status** — **do not** auto-fail the job client-side |

---

## Copywriting Contract (Phase 4 additions)

| Element | Copy |
|---------|------|
| Pipeline section title | **Processing your manual** |
| Indeterminate processing | **Working on your video…** (one line under title when granular stages unavailable) |
| Video section title | **Your explainer video** |
| Video ready (helper) | **Play the steps below. You can fullscreen for a closer view.** |
| Error — pipeline failed | **We couldn’t finish the video.** {detail} **Try uploading again** or choose another manual. |
| Error — status unavailable | **Could not load job status.** Check your connection and try again. |
| Placeholder (no URL yet / dev) | **Video preview will appear here when your manual is ready.** |

**Notes:** `{detail}` = server `error` string when safe to show; strip stack traces in UI.

---

## Component inventory (additions)

| UI need | Primitive / pattern |
|---------|----------------------|
| Pipeline list | **Card** or bordered **div** with flex rows + lucide icons |
| Video | Native `<video>` in aspect-ratio wrapper |
| Section titles | Existing **Heading** / `CardTitle` hierarchy |
| Retry | **Button** `variant="outline"` secondary actions |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Add only **separator**, **skeleton** if needed — `npx shadcn add` from official registry | Run `npx shadcn view <block>` before non-official registries |

---

## Implementation notes (dev parallel to Phase 3)

1. **API contract:** Document `GET /api/jobs/:id` (or successor) fields for `stages[]`, `videoUrl`, `failureStage` when backend is ready; until then, **feature-flag** or **mock** stages in dev only — **clearly labeled** in code comments.
2. **Reuse:** Extend **`ManualUpload`** or extract **`<PipelineStatus />`** and **`<VideoResult />`** as separate components under `components/` for testability.
3. **Accessibility:** Focus order: title → upload → status → video → controls. **Announce** status changes for screen readers (`aria-live="polite"` on status region).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
