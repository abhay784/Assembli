---
phase: 01-foundation
plan: "06"
subsystem: ui
tags: [shadcn, react-dropzone, upload, tailwind]

requires:
  - phase: 01-01
    provides: Next.js, upload constants, Vitest
  - phase: 01-05
    provides: POST /api/jobs presign flow
provides:
  - Manual upload UI per 01-UI-SPEC copy and layout (640px column)
  - Magic-byte PDF guard before presign; client size/MIME alignment with server
  - Vitest coverage for oversize, wrong type, and magic-byte rejection
affects: [phase-2]

tech-stack:
  added:
    - tailwindcss v4 + @tailwindcss/postcss
    - shadcn/ui (base-nova preset — new-york label unavailable in shadcn v4 CLI; tokens match UI-SPEC colors)
    - @base-ui/react primitives via shadcn registry
  patterns:
    - "Client upload uses XHR PUT for determinate progress"

key-files:
  created:
    - components/upload/ManualUpload.tsx
    - components/upload/magic-pdf.ts
    - components/upload/ManualUpload.test.tsx
  modified:
    - app/page.tsx
    - vitest.config.ts

key-decisions:
  - "shadcn v4 `init` uses preset `base-nova`; theme variables overridden to UI-SPEC teal/red/slate page background."

patterns-established:
  - "All user-visible upload strings copied from 01-UI-SPEC.md."

requirements-completed: [INGEST-01, INGEST-02]

duration: 90min
completed: 2026-04-04
---

# Phase 1: Plan 06 Summary

**Upload page with Card + react-dropzone, presign + S3 PUT with progress, Alert copy from UI-SPEC, and discard AlertDialog — automated tests cover validation paths.**

## Task 3 — Human verification

Plan checkpoint (blocking): confirm locally `npm run dev`, upload flow, and `npm run remotion:studio` per 01-06-PLAN Task 3. Tracked in `01-HUMAN-UAT.md` until you sign off.

## Self-Check: PASSED (automated); human gate pending

---
*Phase: 01-foundation*
*Completed: 2026-04-04*
