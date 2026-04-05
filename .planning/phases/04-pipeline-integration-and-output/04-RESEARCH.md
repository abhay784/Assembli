# Phase 4: Pipeline Integration and Output - Research

**Researched:** 2026-04-04
**Domain:** Full-stack pipeline integration — S3 presigned video playback, job progress UI, error states, HTML5 video embedding
**Confidence:** HIGH

---

## Summary

Phase 4 has a very narrow scope: the pipeline is fully built and functioning. The only remaining gap is that when a job completes, the `videoKey` (e.g. `uploads/{jobId}/output.mp4`) is surfaced as raw text in the UI, not as a playable video. The work is: (1) add a GET presigned URL endpoint for the completed MP4 so the browser can stream it, (2) upgrade the UI to render an HTML5 `<video>` element once the job completes and the presigned URL is fetched, and (3) improve the job status messages to reflect all pipeline stages (extraction, TTS, render) rather than the current extraction-only copy.

The infrastructure for everything else — upload, enqueue, poll, S3 access, worker pipeline — is complete and tested. Phase 4 does not need new dependencies. All libraries are already installed.

**Primary recommendation:** Add a `GET /api/jobs/[id]/video-url` route that returns a presigned S3 `GetObject` URL, then replace the `videoKey` text display in `ManualUpload.tsx` with an `<video controls>` element that uses that URL.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OUTPUT-01 | User can preview the completed video in the browser | Requires: presigned S3 GET URL endpoint + HTML5 `<video>` element in ManualUpload; all infra already present |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new deps needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-s3` | ^3.787.0 | S3 GetObject command for presigned download URL | Already used by `lib/s3/get-object.ts` and `lib/s3/presign.ts` |
| `@aws-sdk/s3-request-presigner` | ^3.787.0 | `getSignedUrl` for `GetObjectCommand` | Already used for upload presign; same API for download |
| Next.js 15 App Router | ^15.3.0 | New `GET /api/jobs/[id]/video-url` route | Same pattern as existing `GET /api/jobs/[id]` |
| React 19 | ^19.0.0 | HTML5 `<video>` in ManualUpload | Already the framework |

### No New Dependencies Required

All required capabilities are already in the installed package set. [VERIFIED: package.json inspection]

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. New files slot into existing structure:

```
app/api/jobs/[id]/
├── route.ts              (existing — GET job status)
├── enqueue/route.ts      (existing — POST enqueue job)
└── video-url/route.ts    (NEW — GET presigned S3 download URL)

lib/s3/
├── presign.ts            (existing upload presign — add presignVideoDownload here)
└── get-object.ts         (existing — no changes needed)

components/upload/
└── ManualUpload.tsx      (modify — add <video> element and URL fetch)
```

### Pattern 1: Presigned GET URL for Video Playback

**What:** When a job completes, the API issues a short-lived `GetObjectCommand` presigned URL. The browser uses this URL directly as the `src` for an HTML5 `<video>` element. The video streams from S3 without a proxy server.

**When to use:** Any time a private S3 object needs to be played or downloaded in the browser without exposing credentials.

**How it differs from the upload presign:** Upload uses `PutObjectCommand`. Download uses `GetObjectCommand`. The `getSignedUrl` call pattern is identical.

**Example — presign utility (add to `lib/s3/presign.ts`):**

```typescript
// Source: existing presignManualUpload pattern in lib/s3/presign.ts + AWS SDK docs
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function presignVideoDownload(options: {
  key: string;
  expiresIn?: number; // seconds; default 900 (15 min)
}): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: options.key });
  return getSignedUrl(client, command, { expiresIn: options.expiresIn ?? 900 });
}
```

**Example — API route (`app/api/jobs/[id]/video-url/route.ts`):**

```typescript
// Source: pattern from app/api/jobs/[id]/route.ts + app/api/jobs/[id]/enqueue/route.ts
import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";
import { presignVideoDownload } from "@/lib/s3/presign";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  // validate id same as existing routes
  // fetch job, verify it's completed, extract videoKey from returnvalue
  // call presignVideoDownload({ key: videoKey })
  // return { url, expiresIn }
}
```

**Example — UI `<video>` element:**

```tsx
// Source: HTML5 video spec + React patterns
{videoUrl ? (
  <video
    controls
    src={videoUrl}
    className="w-full rounded-lg"
    aria-label="Assembly video preview"
  >
    Your browser does not support HTML5 video.
  </video>
) : null}
```

### Pattern 2: Progressive Job Status Messages

**What:** The current `COPY` constants in ManualUpload describe only extraction stage ("Processing — extracting steps with Claude…"). Phase 3 added TTS and rendering stages but the status copy was not updated. The worker does not currently emit mid-job stage updates — BullMQ job state is `active` for the entire duration. There are two approaches:

**Option A (recommended for v1):** Update the status copy string to describe the full pipeline at a high level. Keep the single `processing` state but change the message to "Processing — extracting, generating audio, and rendering video…". Zero infrastructure change, ships in the copy constants.

**Option B (out of scope for v1):** BullMQ supports `job.updateProgress()` for granular sub-stage reporting. This would require adding progress events to the worker and reading `job.progress` from the GET route. Adds real complexity. Deferred.

### Pattern 3: Error State — Meaningful Failure Display

**What:** When `jobStatus === "failed"`, the UI already shows `jobError`. The `failedReason` on a BullMQ job is the error's `.message`. The worker currently throws with descriptive messages (e.g. `Invalid CLAUDE_MAX_PDF_PAGES`, Claude retry exhausted, Remotion render failure). No new infrastructure needed — the existing `failedReason` passthrough in the GET route handles it.

**Improvement needed:** The current `statusFailed` copy is bare: "Job failed". The UI should display the `jobError` prominently so it's readable, not as a footnote. This is a CSS/layout change in ManualUpload, not a new API.

### Anti-Patterns to Avoid

- **Streaming the MP4 through a Next.js API route:** Never pipe S3 video bytes through the Node.js API route. This wastes server memory, adds latency, and breaks for large files. The presigned URL pattern lets the browser stream directly from S3. [ASSUMED based on standard S3 streaming guidance — presigned URL is the correct pattern]

- **Embedding the `videoKey` string as a direct S3 URL:** S3 bucket objects are private. A raw S3 key is not a URL. A presigned URL is required unless the bucket is explicitly public (it is not in this project).

- **Auto-fetching the presigned URL on every poll tick:** Presigned URLs expire (900 seconds). Fetch the URL once when `jobStatus` transitions to `"completed"`, not on every poll interval. Store in component state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video streaming to browser | Proxy endpoint that pipes S3 bytes | S3 presigned `GetObjectCommand` URL | Presigned URLs are auth-capable CDN-level streaming; server proxy adds latency and memory pressure |
| Job sub-stage progress | Custom BullMQ progress event system | Update status copy string (Option A) | BullMQ `updateProgress` + polling adds round-trips; the v1 demo doesn't need step-by-step sub-stages |
| Video player controls | Custom `<video>` wrapper component | Native HTML5 `<video controls>` | Browser-native player handles play/pause/seek/fullscreen with accessibility baked in; no library needed |

**Key insight:** Everything complex is already done. Phase 4 is entirely UI wiring and one small S3 utility function. Any attempt to over-engineer (SSE for stage progress, custom video player, streaming proxy) exceeds the v1 scope.

---

## Runtime State Inventory

> Phase 4 is a UI wiring + presign endpoint addition — not a rename/refactor/migration. Skipped per protocol.

---

## Common Pitfalls

### Pitfall 1: CORS on the S3 Presigned URL

**What goes wrong:** The browser fetches the presigned URL (cross-origin from the Next.js origin to S3/CloudFront). S3 CORS policy must allow `GET` from the app's origin. This is a **deployment configuration** concern, not a code concern.

**Why it happens:** S3 buckets default to blocking cross-origin requests. Presigned URLs bypass auth but not CORS.

**How to avoid:** Ensure the S3 bucket CORS configuration allows `GET` with `AllowedOrigins: ["*"]` or the app domain. In local dev with MinIO this may also need configuring. The code itself is correct — this is a deployment step.

**Warning signs:** Browser console shows CORS error when the `<video>` tries to load the presigned URL. The URL itself is valid (returns 200 in curl) but the browser blocks it.

### Pitfall 2: Presigned URL Expiry in Long Sessions

**What goes wrong:** The presigned URL is fetched once when the job completes. After 15 minutes (900 seconds), the URL expires and the video fails to load if the user has left the tab open.

**Why it happens:** AWS S3 presigned URLs are time-limited by design.

**How to avoid:** For v1 demo, 15 minutes is acceptable. Don't re-fetch on a timer (adds complexity). If the URL expires, the user can refresh. Document this in the UI if needed. Alternatively, set `expiresIn` to 3600 (1 hour) — acceptable for a demo without download concerns.

**Warning signs:** Video stops loading after ~15 minutes. Network tab shows `403 Request has expired`.

### Pitfall 3: Fetching the Video URL Before Job is Confirmed Complete

**What goes wrong:** The poll tick returns `status: "completed"` but the `videoKey` is null or the S3 object isn't fully flushed yet (very rare race with `putObjectBytes` + eventual consistency).

**Why it happens:** The GET job route reads `returnvalue` from BullMQ Redis. If `videoKey` is null in `returnvalue`, the presign route will receive a null key and should return 404, not crash.

**How to avoid:** The `video-url` route must check that `videoKey` is non-null before calling `presignVideoDownload`. Return `{ error: "Video not ready" }` with status 404 if null. The UI should show "video not ready" rather than an error state.

**Warning signs:** `presignVideoDownload` called with empty/null key, throws S3 error.

### Pitfall 4: `videoKey` State Already in Component — Don't Re-Fetch It

**What goes wrong:** The component already has `videoKey` in state from the poll response (`GET /api/jobs/[id]`). A new `video-url` endpoint could return the presigned URL instead of the raw key — but the simplest flow is:

1. Poll returns `{ videoKey: "uploads/.../output.mp4" }` — already working
2. On `status === "completed"`, component fires a separate `GET /api/jobs/[id]/video-url` to get the presigned URL
3. Stores presigned URL in `videoUrl` state, renders `<video src={videoUrl}>`

**How to avoid:** Keep the two concerns separate. The GET status route returns the key (stable, cheap, fine to poll). The presign route returns a short-lived URL fetched once. Do not merge them.

---

## Code Examples

### Presigned Download URL Utility

```typescript
// lib/s3/presign.ts — add alongside presignManualUpload
// Source: AWS SDK v3 GetObjectCommand pattern, same as existing upload presign
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function presignVideoDownload(options: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: options.key });
  return getSignedUrl(client, command, { expiresIn: options.expiresIn ?? 900 });
}
```

### Video URL API Route

```typescript
// app/api/jobs/[id]/video-url/route.ts
// Source: pattern from app/api/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";
import { presignVideoDownload } from "@/lib/s3/presign";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.includes("/") || id.includes("\\")) {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  let job;
  try {
    const queue = getJobQueue();
    job = await queue.getJob(id);
  } catch {
    return NextResponse.json({ error: "Queue unavailable." }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const state = await job.getState();
  if (state !== "completed") {
    return NextResponse.json({ error: "Job not completed." }, { status: 409 });
  }

  const rv = job.returnvalue as unknown;
  const videoKey =
    rv !== null &&
    typeof rv === "object" &&
    "videoKey" in rv &&
    typeof (rv as { videoKey: unknown }).videoKey === "string"
      ? (rv as { videoKey: string }).videoKey
      : null;

  if (!videoKey) {
    return NextResponse.json({ error: "Video not available." }, { status: 404 });
  }

  let url: string;
  try {
    url = await presignVideoDownload({ key: videoKey });
  } catch {
    return NextResponse.json({ error: "Could not generate video URL." }, { status: 500 });
  }

  return NextResponse.json({ url, expiresIn: 900 });
}
```

### ManualUpload — Video State and Fetch

```tsx
// components/upload/ManualUpload.tsx — additions
// Source: existing component pattern, React state

// Add to state:
const [videoUrl, setVideoUrl] = useState<string | null>(null);

// Add to reset logic (onDropAccepted, onDropRejected, handleUpload):
setVideoUrl(null);

// In the useEffect poll, after jobStatus transitions to "completed":
if (body.status === "completed" && body.videoKey) {
  // Fetch presigned URL once
  void fetch(`/api/jobs/${successJobId}/video-url`)
    .then((r) => r.json())
    .then((data: { url?: string }) => {
      if (data.url) setVideoUrl(data.url);
    });
}

// In the JSX, replace videoKey text display with:
{jobStatus === "completed" && videoUrl ? (
  <video
    controls
    src={videoUrl}
    className="mt-2 w-full rounded-lg"
    aria-label="Assembly video preview"
  >
    Your browser does not support HTML5 video.
  </video>
) : null}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Show raw `videoKey` string in UI | HTML5 `<video>` with presigned URL | Phase 4 | User can actually watch the video |
| Status copy describes extraction only | Copy describes full pipeline | Phase 4 | Accurate expectation-setting during multi-minute render |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | S3 bucket CORS allows GET from app origin — a deployment config step, not a code step | Pitfall 1 | If CORS is not configured, video playback fails silently in browser despite correct presigned URL |
| A2 | 900-second URL expiry is acceptable for v1 demo | Pitfall 2 | Users who leave tab open >15 min face a broken video; workaround is increasing `expiresIn` to 3600 |

---

## Open Questions

1. **CORS configuration on S3 bucket**
   - What we know: Presigned URLs bypass AWS auth but not CORS
   - What's unclear: Whether the existing S3 bucket (or MinIO local equivalent) has a CORS policy permitting GET from the Next.js dev origin (localhost:3000)
   - Recommendation: Wave 0 task should verify/add CORS config. In local MinIO, this requires a `mc cors add` or mc policy command. In AWS, it's a bucket CORS XML rule.

2. **Placeholder audio mode behavior with video player**
   - What we know: `ASSEMBLI_PLACEHOLDER_AUDIO=true` skips ElevenLabs and uses `silence-1s.mp3`. A video is still rendered and uploaded.
   - What's unclear: Whether the rendered video with silent audio still produces a playable MP4 at a correct URL.
   - Recommendation: Treat as working assumption — the pipeline produces an MP4 regardless of audio source. No special-casing needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js, worker | Yes | v24.13.0 | — |
| Redis | BullMQ (job queue lookups) | Not currently running | — | `docker compose up redis` before testing |
| AWS S3 / MinIO | Presigned video URL generation | Env-configured (credentials in .env) | — | MinIO local (AWS_S3_ENDPOINT) |
| ffmpeg | Remotion renderer | ffmpeg-static (npm bundled) | 5.3.0 (ffmpeg-static) | — (bundled, no system install needed) |

**Missing dependencies with no fallback:**
- Redis must be running for any job status lookups. Dev environment requires `docker compose up redis`.

**Missing dependencies with fallback:**
- Real S3 credentials can be substituted with MinIO (`AWS_S3_ENDPOINT=http://127.0.0.1:9000`).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OUTPUT-01 | `presignVideoDownload` returns a signed URL string | unit | `npx vitest run lib/s3/presign.test.ts` | ❌ Wave 0 — add test to `lib/s3/presign.test.ts` |
| OUTPUT-01 | `GET /api/jobs/[id]/video-url` returns `{ url, expiresIn }` for completed job | unit | `npx vitest run app/api/jobs/route.test.ts` | ❌ Wave 0 — add route test to `app/api/jobs/route.test.ts` or new file |
| OUTPUT-01 | `GET /api/jobs/[id]/video-url` returns 409 for non-completed job | unit | same file | ❌ Wave 0 |
| OUTPUT-01 | ManualUpload renders `<video>` element when `videoUrl` state is set | unit | `npx vitest run components/upload/ManualUpload.test.tsx` | ❌ Wave 0 — add test cases |
| OUTPUT-01 | ManualUpload fetches `/video-url` once when status becomes `completed` | unit | same file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run lib/s3/presign.test.ts components/upload/ManualUpload.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/s3/presign.test.ts` — add `presignVideoDownload` unit test (mock `getSignedUrl`, assert it's called with `GetObjectCommand`)
- [ ] `app/api/jobs/[id]/video-url/route.test.ts` — new route test file: completed job → 200 with url; non-completed → 409; not-found → 404
- [ ] `components/upload/ManualUpload.test.tsx` — add test: when fetch mocked to return `{ status: "completed", videoKey: "..." }` and `/video-url` returns `{ url: "..." }`, a `<video>` element appears in the DOM

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No user auth in v1 |
| V3 Session Management | no | No sessions |
| V4 Access Control | yes (limited) | Job ID must be validated; presigned URLs are self-authenticating via AWS SigV4 |
| V5 Input Validation | yes | `id` parameter validated (no `/` or `\`) before passing to queue.getJob — existing pattern |
| V6 Cryptography | yes | AWS SigV4 presigned URL — never hand-roll; SDK handles it |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Enumeration of job IDs (UUID) — guessing `videoKey` via `/video-url` | Information Disclosure | UUIDs are non-sequential and non-guessable in practice; acceptable for v1 demo |
| Presigned URL leakage (URL sharing) | Information Disclosure | 15-minute expiry limits window; acceptable for v1 demo |
| Path traversal in job ID | Tampering | Existing check: reject if `id.includes("/")` or `id.includes("\\")` — apply same guard to new route |

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection — `components/upload/ManualUpload.tsx`, `app/api/jobs/[id]/route.ts`, `app/api/jobs/[id]/enqueue/route.ts`, `worker/extraction-pipeline.ts`, `lib/s3/presign.ts`, `lib/queue.ts`, `package.json`
- `.planning/phases/03-audio-and-render/03-04-SUMMARY.md` — confirms Phase 3 output: `{ sceneKey, videoKey }` return value, GET job API updated
- `.env.example` — env vars in use, `ASSEMBLI_PLACEHOLDER_AUDIO` flag

### Secondary (MEDIUM confidence)

- AWS SDK v3 `GetObjectCommand` + `getSignedUrl` pattern [ASSUMED identical to existing `PutObjectCommand` usage — confirmed by same library and same function signature in codebase]

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in `package.json`, verified by inspection
- Architecture: HIGH — patterns derived directly from existing codebase routes
- Pitfalls: MEDIUM — CORS and presigned URL expiry are well-known AWS S3 issues; specific bucket config not verified
- Test gaps: HIGH — gaps confirmed by directory scan

**Research date:** 2026-04-04
**Valid until:** Stable — no fast-moving dependencies; all packages already locked
