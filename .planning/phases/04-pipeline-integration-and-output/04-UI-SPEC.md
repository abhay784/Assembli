---
phase: 4
slug: pipeline-integration-and-output
status: approved
shadcn_initialized: true
preset: base-nova
created: 2026-04-04
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for **pipeline output and status** (OUTPUT-01). Generated for `/gsd-ui-phase`; verified against the six checker dimensions.

**Phase UI scope:** Everything in the **post-upload success region** of `ManualUpload`: job status copy (queued / processing / completed / failed), optional scene key display for debugging, **HTML5 video preview** of the finished MP4 via presigned URL, **status polling errors**, and **prominent failure messages** when the worker reports `failed`. Upload dropzone, validation, S3 upload, and discard dialog remain governed by **Phase 1** — [01-UI-SPEC.md](../01-foundation/01-UI-SPEC.md) — except where this document updates **implemented** stack facts (shadcn preset) to match the repo.

**Sources:** `04-RESEARCH.md`, `REQUIREMENTS.md` (OUTPUT-01), `ROADMAP.md`, `components/upload/ManualUpload.tsx`, `components.json`.

---

## Layout & focal point (post-upload)

| Item | Specification |
|------|----------------|
| Container | Success feedback lives in a shadcn **Alert** below the upload **Card**; same column width and outer `gap-4` (16px) stacking as the rest of `ManualUpload` |
| Visual hierarchy (processing) | (1) Success title **Manual received.** → (2) body line about status below → (3) **mono** job id → (4) **bold** status line (queued / processing / completed / failed) |
| Visual hierarchy (completed + video) | (1) **Done — your assembly video is ready.** → (2) `<video controls>` is the **primary focal element** — full width within the alert, `rounded-lg`, **8px** top margin (`mt-2`) separating it from copy above |
| Visual hierarchy (failed) | (1) **Processing failed.** → (2) worker `failedReason` in a **destructive-tinted** inset panel (`rounded-md`, `bg-destructive/10`, destructive text) — must remain **readable** (no single-line truncation; `whitespace`/`break-words` as needed for long messages) |
| Scene key (completed) | Optional **debug** block below status: label **Scene key** (Label typography), value **mono** body — `break-all`; does not compete visually with the video player |

---

## Design System (as implemented)

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Preset | **base-nova** (`components.json` — supersedes Phase 1 “planned new-york” note for live app) |
| Component library | Radix primitives via shadcn |
| Icon library | **lucide-react** |
| Font | **Geist** / Next.js defaults via app layout (inherit) |

---

## Spacing Scale

Inherit Phase 1 tokens (multiples of 4). **Phase 4 additions:**

| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Margin above `<video>` (`mt-2`) |
| md | 16px | Space between paragraphs in status block (`space-y-1` / `space-y-2` where already used) |

Exceptions: same as Phase 1 (44px min touch target on buttons; 2px borders/rings exempt).

---

## Typography

Inherit Phase 1 roles (Body 16px / 400 / 1.5, Label 14px / 600 / 1.4, Heading 20px, Display 28px, weights 400 and 600 only for custom text).

**Phase 4 usage:**

| UI fragment | Role |
|-------------|------|
| Status line (`statusQueued` / `statusProcessing` / …) | Label 14px semibold (`font-medium` / `text-sm` aligned to 14px) |
| Job id, scene key values | Monospace **12px** (`text-xs`) for ids; scene key value may use `text-base` only if readability requires — prefer **14px** mono for consistency |
| Poll spinner row “Checking status…” | Body 14px muted |
| Video fallback text | Body 16px inside `<video>` slot |

**Rule:** Do not introduce additional display sizes for Phase 4-only UI.

---

## Color

Inherit Phase 1 60/30/10 contract:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f8fafc` | Page background |
| Secondary (30%) | `#ffffff` / borders | Cards, alert surfaces |
| Accent (10%) | `#0d9488` | Primary buttons, success alert icon (`text-primary`), progress fill — same reserved list as Phase 1 |
| Destructive | `#dc2626` | Failed job panel, destructive alerts, discard confirm |
| Warning (poll) | amber-800 / amber-200 (dark) | **Could not load job status** line only — distinguishes transient client/poll issues from hard failures |

Accent reserved for: primary CTA, focus rings, determinate progress, success icon emphasis — **not** for native `<video>` control bar (browser chrome).

---

## Copywriting Contract

Phase 4 **extends** Phase 1 copy for upload; below are **pipeline / output** strings (must stay in sync with `COPY` in `ManualUpload.tsx` or intentional product edits).

| Element | Copy |
|---------|------|
| Success body (after enqueue) | **Your manual is uploaded. Processing status updates below.** |
| Status — queued | **Queued — waiting for the worker to start…** |
| Status — processing | **Processing — extracting steps, generating audio, and rendering video…** |
| Status — completed | **Done — your assembly video is ready.** |
| Status — failed (heading) | **Processing failed.** |
| Status poll error | **Could not load job status. Is the dev server running?** |
| Checking status (spinner row) | **Checking status…** |
| Video `aria-label` | **Assembly video preview** |
| Video fallback (inside `<video>`) | **Your browser does not support HTML5 video.** |
| Video URL / presign failure (user-visible) | **We could not load the video preview.** Check your connection and refresh the page. If this keeps happening, confirm S3 download URLs are allowed for this bucket. |
| Scene key label | **Scene key** |
| Job id label prefix | **Job id:** `{id}` in monospace line |

**Destructive confirmation:** Unchanged from Phase 1 — **Discard this PDF?** / **Discard PDF** / **Keep file**.

---

## Interaction & state (prescriptive)

| State | Behavior | Visual |
|-------|----------|--------|
| `completed` + `videoKey` | **Once** when status first satisfies completed + key: `GET /api/jobs/{id}/video-url`; store URL in state; **do not** refetch on every poll tick | After URL arrives, render `<video controls playsInline={optional}>`. Native controls only unless a later phase adds a custom chrome |
| `completed` + presign non-OK or network error | Show **Video URL / presign failure** copy above or below the status line; do not leave the user with only “Done” and no explanation | Use `Alert` destructive variant or amber inline consistent with poll warning — **must** include refresh / connection path per copy table |
| `failed` + `jobError` | Always show `jobError` body; never empty failed panel | Destructive inset panel under **Processing failed.** |
| `processing` (long) | No per-stage progress bar in v1 (worker does not emit sub-progress) | Single processing string only — no fake percentages |

---

## Component inventory

| UI need | Primitive / pattern |
|---------|---------------------|
| Status + success chrome | shadcn **Alert** + **AlertTitle** / **AlertDescription** |
| Failed reason | Inset panel inside `AlertDescription` — destructive tint |
| Video | Native **HTML5 `<video>`** — `controls`, `className="mt-2 w-full rounded-lg"` |
| Loading | **Loader2** lucide icon inline with “Checking status…” |

No new shadcn blocks are **required** for Phase 4 if the above already exist.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `button`, `card`, `progress`, `alert`, `alert-dialog` (in repo) | Add new blocks only via official registry; `npx shadcn view <block>` before third-party registries |
| Third-party | none | N/A |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-04 (orchestrated `/gsd-ui-phase` — dimensions verified; video-load-failure copy specified for OUTPUT-01 resilience)
