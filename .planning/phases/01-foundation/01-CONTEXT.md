# Phase 1: Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers: a locked Zod-defined scene JSON schema; Remotion templates that render correctly from **mock** SceneJSON; upload flow scaffolding; infrastructure layer (S3, BullMQ worker scaffold, job record + queryable status). Requirements in scope for this phase: **INGEST-01**, **INGEST-02**. No LLM extraction, no real render pipeline, no ElevenLabs in Phase 1.

</domain>

<decisions>
## Implementation Decisions

### SceneJSON schema (Zod)

- **D-01:** **Minimal breadth** — The Phase 1 schema includes only fields required for Remotion mock compositions and validation. Additional fields (e.g. tools, warnings, diagram refs, per-step confidence) are **not** added ahead of implementation; they arrive when their consuming phase ships.
- **D-02:** **Step identity** — Steps are ordered by **array index only** (0..N-1). No stable string id per step in Phase 1; step counter and ordering derive from position in the `steps` (or equivalent) array.
- **D-03:** **Per-step visuals** — Mock scenes use **structured parts** with **typed props** (e.g. id, label, position, rotation — exact shape to be defined in planning) so templates remain predictable and type-safe. No “single opaque JSON blob” or caption-only placeholder for visuals.

### Remotion preview workflow

- **D-04:** **Remotion Studio only for preview** — Developers iterate on compositions with `npx remotion studio` (or project equivalent) as a **separate** process from the Next.js dev server. Phase 1 does **not** add an embedded in-app preview route in Next.js for mock compositions.

### Claude's Discretion

- Exact Zod field names, part prop enums, and composition file layout are left to planning/implementation as long as D-01–D-03 are satisfied.
- Upload UX beyond requirements (copy, max size bytes) was not discussed here — planner aligns with INGEST-01/02 and existing stack docs.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and requirements

- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependency notes (schema before templates, worker scaffold).
- `.planning/REQUIREMENTS.md` — **INGEST-01**, **INGEST-02** traceability for Phase 1.
- `.planning/PROJECT.md` — Vision, constraints (Claude, Remotion, ElevenLabs, 2D-only), v1 scope.

### Stack and architecture

- `.planning/research/STACK.md` — Pinned library versions, Next.js + separate worker, S3 presigned uploads, BullMQ/Redis, Remotion 4.x.
- `CLAUDE.md` — Project + stack summary synced from planning/research sources.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- None yet — repository has GSD hooks only; no `src/` or app routes. Phase 1 establishes patterns from scratch.

### Established Patterns

- Stack and architecture expectations are documented in `.planning/research/STACK.md` and `CLAUDE.md` (Next.js App Router, Zod at LLM boundary later, BullMQ worker separate from Next).

### Integration Points

- Future: Next.js upload UI → API → job record + storage; worker package/process consuming the same SceneJSON types derived from Zod.

</code_context>

<specifics>
## Specific Ideas

- User referenced **minimal** schema intentionally to avoid premature fields; **structured parts** for mock data so exploded-view templates have a clear contract.

</specifics>

<deferred>
## Deferred Ideas

- **Upload limits & errors** — Max PDF size, rejection messaging tone, PDF-only vs future DOCX hint (not discussed; still governed by INGEST-01/02).
- **Job status API** — Polling vs SSE, status granularity (not discussed).
- **Local object storage** — S3 vs MinIO/local for dev (not discussed).
- **Embedded Remotion preview in Next** — Explicitly out for Phase 1 per D-04; could be a later phase if stakeholders need in-browser mock preview without Studio.

### Reviewed Todos (not folded)

- None.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-04*
