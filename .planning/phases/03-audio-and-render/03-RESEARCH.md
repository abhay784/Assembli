# Phase 3: Audio and Render — Research

**Researched:** 2026-04-04  
**Domain:** ElevenLabs TTS, Remotion SSR (`@remotion/renderer`), audio-driven `Sequence` durations, S3 audio/video objects, BullMQ worker extension  
**Confidence:** HIGH for Remotion + ElevenLabs public APIs; MEDIUM for exact worker orchestration and env defaults until implemented

<user_constraints>
## User Constraints

No Phase 3 `03-CONTEXT.md` — scope is **ROADMAP.md** success criteria + **REQUIREMENTS.md** VIDEO-01–03 and AUDIO-01–02.

**Locked from stack / prior phases (non-negotiable):**

- **Remotion 4.0.445** — same major as existing `remotion` / `@remotion/cli` in `package.json`.
- **ElevenLabs** — official JS SDK `@elevenlabs/elevenlabs-js` (STACK cites **2.30.0**); `textToSpeech.convert()` returns audio buffer.
- **Worker-only render** — `@remotion/bundler` / `renderMedia` **must not** run inside Next.js API routes; extend existing `worker/index.ts` + BullMQ processor (same pattern as Phase 2 extraction).
- **S3** — uploaded manuals and artifacts under `uploads/{jobId}/…`; use existing AWS SDK v3 PutObject/GetObject helpers where possible.
- **Audio drives frame counts** — slide / sequence duration must derive from measured narration length (seconds → frames at composition FPS), not a fixed `FRAMES_PER_STEP` constant.

</user_constraints>

<phase_requirements>
## Phase requirements

| ID | Description | Research support |
|----|-------------|------------------|
| VIDEO-01 | Exploded-view style step animations | Extend `remotion/compositions/AssemblySteps.tsx`: keep part positioning model; add simple motion (e.g. `interpolate` / `spring`) per step |
| VIDEO-02 | Captions synced to narration | Caption text from `step.caption` / `title` on same `Sequence` as that step’s audio |
| VIDEO-03 | Step counter "Step N of M" | Already present in UI; ensure it remains correct with variable per-step lengths |
| AUDIO-01 | ElevenLabs per-step narration | TTS from step script string (recommend: `title` + `caption` or dedicated narration field if added to schema — prefer not to extend schema unless needed; concatenation is OK for POC) |
| AUDIO-02 | Audio synced to transitions | One audio file per step; `Sequence` `durationInFrames` = ceil(durationSec × fps) + optional small padding (document if used) |

</phase_requirements>

## Summary

Phase 3 extends the **same BullMQ job** after successful extraction: load **SceneJSON** from S3 (or keep in memory after extraction), **generate one MP3 (or supported format) per step** via ElevenLabs, **upload clips to S3** (e.g. `uploads/{jobId}/audio/00.mp3`, …), **probe each file’s duration in seconds**, convert to **frames at 30 fps** (match `remotion/Root.tsx`), and pass **per-step frame counts** (and optionally **public or local file paths**) into Remotion as **`inputProps`**.

**Remotion SSR pattern (Node worker):**

1. Add **`@remotion/renderer`** and **`@remotion/bundler`** (or use renderer’s bundle API per Remotion 4 docs) — align versions with `remotion@4.0.445`.
2. **`bundle()`** the Remotion entry (`remotion/index.tsx` or dedicated entry) once per process or per render (cache bundle path in worker for performance).
3. **`selectComposition()`** with `inputProps` that include `steps` plus **`durationsInFrames: number[]`** (or embedded on each step in a **Zod-validated input type** separate from LLM `SceneJSON` if you want zero LLM schema drift).
4. **`renderMedia()`** with composition ID (e.g. rename from `assembly-mock` to `assembly` when no longer mock-paced), **`ffmpegExecutable`** from **`ffmpeg-static`** (STACK) for portable Node renders.
5. Upload final **MP4** to S3 e.g. **`uploads/{jobId}/output.mp4`**.

**Audio duration:**

- Remotion provides **`getAudioDurationInSeconds()`** from `@remotion/media-utils` or renderer-adjacent packages — verify exact import for v4.0.445 in project after install; alternative is **ffprobe** via CLI if already required by renderer.

**ElevenLabs:**

- Env: **`ELEVENLABS_API_KEY`**, **`ELEVENLABS_VOICE_ID`** (or model/voice from dashboard).
- Rate limits / character quotas: call **sequentially** per job for POC to avoid burst errors; optional small retry with backoff on 429.

**Job API:**

- Extend BullMQ **`returnvalue`** to include **`videoKey`** (and keep **`sceneKey`** if pipeline returns both — or single object with both keys).
- Extend **`GET /api/jobs/[id]`** to expose **`videoKey: string | null`** mirroring **`sceneKey`** pattern in `app/api/jobs/[id]/route.ts`.

**Composition changes:**

- Replace fixed **`FRAMES_PER_STEP = 90`** with per-step duration from props.
- **`durationInFrames`** on root `Composition` must equal **sum(durationsInFrames)** — compute in **`calculateMetadata`** if using dynamic metadata API, or pass total from worker as `inputProps` (simpler for POC).

## Pitfalls

| Risk | Mitigation |
|------|------------|
| Bundling Remotion inside Next.js | Keep **all** `bundle` / `renderMedia` calls in **worker** only |
| Drift between LLM schema and render props | Use **`SceneJSON`** for steps; add **`RenderInput`** Zod schema in `lib/` for `durationsInFrames` + optional `audioKeys` only |
| Silent A/V desync | Derive frames **only** from probed audio; log durations per step in worker |
| Huge env vars / command line | Pass **S3 keys** or **HTTPS URLs** Remotion can read — prefer **local temp files** downloaded in worker before `renderMedia` if URL auth is painful |
| ffmpeg missing on host | **`ffmpeg-static`** + pass path to `renderMedia` |

## Open questions (execution) (RESOLVED)

Decisions locked for planning / execution:

1. **Narration script per step:** Use **`${step.title}. ${step.caption}`** concatenation for ElevenLabs input. Do **not** extend `stepSchema` in Phase 3 unless a plan explicitly needs it.
2. **Padding frames:** **0** frames between steps for v1 POC — each `Sequence` duration equals probed narration length only; any future gap is a Phase 4+ polish item.
3. **Worker memory / length limits:** POC acceptable; enforce **Zod caps** on render input (`durationsInFrames` per step and step count) as in plan **03-03** threat **T-3-09**; document rough max manual size in worker or `.env.example` if needed.

## Validation Architecture

> Nyquist Dimension 8 — executable verification hooks for Phase 3.

### Test infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config | `vitest.config.ts` |
| Quick command | `npm test` |
| Full command | `npm test` + `npm run typecheck` |
| Focus | `lib/audio/**/*.test.ts`, `lib/remotion/**/*.test.ts` (if added), `worker/**/*.test.ts`, Remotion composition tests via `@remotion/test-utils` if adopted |

### Automated vs manual

| Behavior | Automated | Notes |
|----------|-----------|--------|
| Zod validation for render input props | Yes | Unit tests with fixture durations |
| ElevenLabs client error mapping | Yes | Mock SDK, assert retry / fail behavior |
| `durationInFrames` sum matches Composition | Yes | Pure function tests |
| End-to-end MP4 with real TTS + render | **Manual** | Requires API keys, ffmpeg, S3 |
| Listening sync quality | **Manual** | Human verifies narration vs slide changes |

### Sampling expectations

- After audio module: `npm test` green without network.
- After render module: typecheck + unit tests green; worker starts without throwing on missing optional env only where documented.
- Before phase sign-off: one manual job produces **video in S3** and acceptable sync.

## RESEARCH COMPLETE
