# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 1-Foundation
**Areas discussed:** SceneJSON v1 shape, Remotion preview

---

## SceneJSON v1 shape

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal breadth | Only fields Remotion mock needs now; extend schema in later phases when features land | ✓ |
| Forward-compatible | Optional nullable fields now (tools, warnings, diagramRef, confidence) to reduce later churn |  |
| Numeric index only | Step identity from array position 0..N-1 | ✓ |
| Stable string id | Slug/uuid per step for logs and assets |  |
| Structured parts | Typed props per part for predictable templates | ✓ |
| Lightweight placeholder | Caption + optional URL/ref string; minimal template |  |

**User's choice:** Minimal schema; index-ordered steps; structured parts with typed props.

**Notes:** User chose to move on after these three decision points without additional schema topics.

---

## Remotion preview

| Option | Description | Selected |
|--------|-------------|----------|
| Remotion Studio only | Run Studio separately from Next; app focuses on upload + APIs | ✓ |
| Embedded in Next | In-app route for mock composition preview |  |
| Both | Studio + minimal embedded preview |  |

**User's choice:** Remotion Studio only for Phase 1 mock preview.

**Notes:** A follow-up question on embedded scope received “OK for demo deploy” while preview mode was Studio-only; **CONTEXT.md records Studio only** and no embedded Next preview for Phase 1. User confirmed “ready for context” without revising this.

---

## Claude's Discretion

- Exact Zod property names, enums, and file layout for compositions (not user-specified).

## Deferred Ideas

- Upload limits & messaging; job status transport/granularity; local dev storage choice; embedded preview (deferred past Phase 1 per final context).
