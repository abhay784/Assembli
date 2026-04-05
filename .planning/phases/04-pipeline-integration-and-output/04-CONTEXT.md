# Phase 4: Pipeline Integration and Output - Context

**Gathered:** 2026-04-04  
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers the **full pipeline experience in the product UI**: upload a real manual, **observe processing** without manual hand-offs, **preview the completed explainer video in the browser** (OUTPUT-01), and see **meaningful errors** if any stage fails (roadmap success criteria). Depends on **Phase 3** for rendered MP4 and API fields that expose a playable URL; UI may ship **layout + honest loading states + placeholder** before Phase 3 is done, per `04-UI-SPEC.md`.

**In scope:** Wiring the existing upload + job polling path to **pipeline presentation**, **terminal states**, and **HTML5 video** when `videoUrl` (or equivalent) is available. **Out of scope:** new ingest formats (DOCX), auth, social/share, downloadable file UX as a product requirement unless folded from backlog later.

</domain>

<decisions>
## Implementation Decisions

### Pipeline progress presentation

- **D-01 (User):** **Honest coarse status** — When the API only exposes coarse job states (`queued` / `processing` / `completed` / `failed`) without per-stage payloads, the UI shows a **single** processing row with spinner and copy such as “Working on your video…” — **no** fake checkmarks for stages that are not backed by server data. When the API later exposes granular stages, the UI upgrades to the ordered list in `04-UI-SPEC.md` without contradicting D-01’s honesty rule (only show complete/in-progress for stages the server reports).

### Video completion affordance

- **D-02 (User):** On job completion when the video element is shown, **smooth-scroll the player into view** and move **keyboard focus** to the player (or primary control) so keyboard and screen-reader users land on the success outcome immediately after status flips to completed.

### Failure recovery

- **D-03 (User):** On pipeline failure, the **primary recovery path** is **starting over with a new PDF** — copy and layout should emphasize **upload another manual** (aligned with Phase 1 tone). Secondary actions (e.g. retry status poll) remain optional per `04-UI-SPEC.md` but are not the main CTA.

### Consistency with UI contract

- **D-04:** Visual tokens, typography, spacing, and copy tables follow **`04-UI-SPEC.md`** and extend **`01-UI-SPEC.md`** where Phase 4 does not override. Native `<video controls>`, 16:9 container, destructive alerts for failures.

### Claude's Discretion

- Exact React component split (`PipelineStatus`, `VideoResult`, changes to `ManualUpload`), ref for scroll target, and polling backoff are implementation details as long as D-01–D-04 hold.
- Exact API field names (`videoUrl` vs presigned key) — align with Phase 3/4 backend when merged; use typed optional fields and feature flags for mock URLs in development.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and requirements

- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, dependency on Phase 3.
- `.planning/REQUIREMENTS.md` — **OUTPUT-01**; **INGEST-03** (processing status — v2 / table stakes).
- `.planning/PROJECT.md` — Vision, v1 POC scope.

### UI and prior phase locks

- `.planning/phases/04-pipeline-integration-and-output/04-UI-SPEC.md` — Phase 4 visual/interaction contract.
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Upload card, tokens, copy baseline.
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-04 (Remotion Studio only in Phase 1); Phase 4 **adds** in-app video — does not reuse D-04 restriction.

### Codebase map

- `.planning/codebase/STRUCTURE.md` — Where `app/`, `components/upload/` live.
- `.planning/codebase/CONVENTIONS.md` — Patterns for API routes and components.

### Runtime integration (current)

- `components/upload/ManualUpload.tsx` — Upload, poll `GET /api/jobs/:id`, job status state.
- `app/api/jobs/[id]/route.ts` — Job status JSON shape today (`status`, `error`, `sceneKey`); Phase 4 planning must extend contract for **video URL** and optional **stages** when backend is ready.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`ManualUpload`** — Already polls job status and holds `jobStatus`, `jobError`, `sceneKey`; Phase 4 extends this flow with pipeline UI and video region instead of replacing upload behavior.
- **`components/ui/*`** — Card, Alert, Button, Progress patterns from Phase 1.

### Established Patterns

- **Client-side polling** — `setInterval` ~2s for job GET; Phase 4 should avoid duplicate intervals and preserve “stop polling on terminal state.”
- **Next.js App Router** — API routes under `app/api/jobs/`.

### Integration Points

- **Job GET response** — Must grow to include video playback URL and optional stage list; UI gates honest pipeline list on presence of that data (D-01).

</code_context>

<specifics>
## Specific Ideas

- Discussion **2026-04-04:** User chose **honest single-row processing** when granular stages are unavailable, **scroll + focus** to video on success, and **new upload** as primary failure recovery.

</specifics>

<deferred>
## Deferred Ideas

- **SSE / WebSockets** for job status instead of polling — not in Phase 4 scope unless requirements change; would be its own discussion.
- **Download MP4** button — product nice-to-have; defer unless OUTPUT-01 is interpreted to require offline download.
- **Per-stage ETA strings** — only if backend provides them; omitted until then per `04-UI-SPEC.md`.

### Reviewed Todos (not folded)

- None (`todo match-phase` returned no matches).

</deferred>

---

*Phase: 04-pipeline-integration-and-output*  
*Context gathered: 2026-04-04*
