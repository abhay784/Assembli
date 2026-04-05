# Testing

**Analysis Date:** 2026-04-04

## Framework

- **Vitest** (`vitest.config.ts`) with **globals** enabled.
- **Environment:** Default `node` for tests; React plugin loaded for component tests that need JSX.
- **Setup:** `vitest.setup.ts` — extend matchers (`@testing-library/jest-dom`).

## Scope (include patterns)

From `vitest.config.ts`:

- `lib/**/*.{test,spec}.ts`
- `app/**/*.{test,spec}.ts`
- `components/**/*.{test,spec}.tsx`

## Patterns

- **Unit / pure logic** — Claude JSON parsing, Zod schemas, S3 helpers, queue payload, PDF helpers, upload validation.
- **Component tests** — Example: `components/upload/ManualUpload.test.tsx` with **@testing-library/react** and **jsdom** (devDependency).
- **API route tests** — Example: `app/api/jobs/route.test.ts`, `app/api/jobs/[id]/route.test.ts` (mocking `@/lib/queue` / BullMQ behavior).

## Commands

- `npm test` → `vitest run`
- `npm run typecheck` → `tsc --noEmit`
- `npm run lint` → ESLint

## Coverage

- No enforced coverage threshold observed in `vitest.config.ts`; rely on phase UAT docs where referenced.

## Gaps

- **E2E** — No Playwright/Cypress in `package.json`.
- **Worker** — No dedicated integration test for `worker/extraction-pipeline.ts` (would need mocks or test containers for S3/Claude).

---

*Testing analysis: 2026-04-04*
