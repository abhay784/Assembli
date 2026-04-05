# Phase 4: Pipeline Integration and Output - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-04  
**Phase:** 04-pipeline-integration-and-output  
**Areas discussed:** Pipeline display (coarse API), video completion affordance, failure recovery

---

## Pipeline progress when API is coarse-only

| Option | Description | Selected |
|--------|-------------|----------|
| Single honest state | One “Processing…” row + spinner (no fake step checkmarks) | ✓ |
| Skeleton steps | Show all steps mostly as “waiting” until real data | |
| Hybrid | Muted pending list until backend sends updates | |

**User's choice:** Single honest state.  
**Notes:** Aligns with `04-UI-SPEC.md` rule to avoid fake granular progress.

---

## Attention when video is ready

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll + focus | Smooth-scroll into view + keyboard focus on player/controls | ✓ |
| Scroll only | Smooth-scroll; no programmatic focus | |
| Minimal | No scroll; aria-live only | |

**User's choice:** Scroll + focus.  
**Notes:** Accessibility and clear success path.

---

## Primary action after pipeline failure

| Option | Description | Selected |
|--------|-------------|----------|
| New upload | Emphasize choosing another PDF | ✓ |
| Retry then upload | Retry status fetch first, then new upload | |
| Equal | Retry and new upload with equal weight | |

**User's choice:** New upload.  
**Notes:** Matches Phase 1 supportive tone; retry remains secondary in spec.

---

*End of discussion log.*
