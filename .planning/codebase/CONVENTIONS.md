# Code Conventions

**Analysis Date:** 2026-04-04

## TypeScript

- **`strict: true`** — `tsconfig.json`; avoid `any` in new code.
- **Path alias** — Import app code with `@/...` (e.g. `@/lib/queue`, `@/components/ui/button`).

## React / Next.js

- **Client components** — `"use client"` where hooks or browser APIs are used (`ManualUpload.tsx`).
- **Server routes** — `NextResponse.json` for API handlers; validate bodies with **Zod** `safeParse` before domain logic.
- **Params** — Dynamic routes use `context: { params: Promise<{ id: string }> }` and `await context.params` (Next 15 style in `app/api/jobs/[id]/route.ts`).

## Validation & errors

- **Zod** at boundaries: API POST bodies, `JobPayload`, `SceneJSON`.
- **Custom errors** — e.g. `UploadValidationError` in `lib/jobs/upload-request.ts`; caught in routes and mapped to HTTP 400.
- **Worker / infra** — Missing env throws from helpers like `getAnthropicApiKey()`, `getRedisConnection()` (fail fast).

## Module organization

- **Barrel** — `lib/scene/index.ts` re-exports as needed.
- **Tests** — Sibling `*.test.ts` / `*.test.tsx` files.

## Styling

- **Tailwind** utility classes in components; `cn()` from `lib/utils.ts` for conditional classes.
- **Fonts** — Geist via `geist` / `GeistSans` in `app/layout.tsx`.

## Strings & UX copy

- Upload flow uses a centralized `COPY` object in `ManualUpload.tsx` for user-visible strings.

## Comments

- Decision tags appear in extraction code (e.g. `D-08` in `lib/claude/extract-scene.ts`) referencing phase discussions.

---

*Conventions analysis: 2026-04-04*
