---
phase: quick
plan: 260404-rst
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/audio/elevenlabs-client.ts
  - lib/audio/elevenlabs-client.test.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "When ASSEMBLI_PLACEHOLDER_AUDIO=true, each step gets silence proportional to its narration text length"
    - "A 20-word narration (~3s) gets ~3s silence; a 130-word narration (~60s) gets ~60s silence"
    - "If ffmpeg generation fails, fallback to silence-1s.mp3 so the pipeline never halts"
    - "When ASSEMBLI_PLACEHOLDER_AUDIO is unset, real ElevenLabs behaviour is unchanged"
  artifacts:
    - path: "lib/audio/elevenlabs-client.ts"
      provides: "synthesizeNarrationToBuffer with proportional silence generation"
      contains: "generateProportionalSilence"
    - path: "lib/audio/elevenlabs-client.test.ts"
      provides: "Tests covering proportional duration and fallback behaviour"
  key_links:
    - from: "lib/audio/elevenlabs-client.ts"
      to: "ffmpeg-static"
      via: "execFile(ffmpegPath, ['-f', 'lavfi', ...])"
      pattern: "anullsrc"
    - from: "lib/audio/elevenlabs-client.ts"
      to: "remotion/public/silence-1s.mp3"
      via: "fs.readFile fallback on ffmpeg error"
      pattern: "PLACEHOLDER_SILENCE"
---

<objective>
Fix placeholder audio mode so each step gets silence whose duration matches approximate real
narration time. Currently the placeholder always returns the hardcoded 1-second silence file,
making every rendered step exactly 1 second.

Purpose: Allow full-length videos to be rendered without an ElevenLabs account or API key, by
using silence whose duration mirrors what a real TTS read-back would produce.

Output: Updated `synthesizeNarrationToBuffer` that, when `ASSEMBLI_PLACEHOLDER_AUDIO=true`,
generates an MP3 silence file of `Math.max(3, text.length / 11)` seconds using ffmpeg, with a
fallback to `silence-1s.mp3` on ffmpeg failure. Tests updated to cover the new behaviour.
</objective>

<execution_context>
@/Users/abhaykorlapati/Desktop/Assembli/.claude/get-shit-done/workflows/execute-plan.md
@/Users/abhaykorlapati/Desktop/Assembli/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@lib/audio/duration.ts

<interfaces>
<!-- Existing API surface that must remain unchanged -->

From lib/audio/elevenlabs-client.ts:
```typescript
export async function synthesizeNarrationToBuffer(text: string): Promise<Buffer>
// MAX_CHARS = 5000 — guard must stay
// isPlaceholderNarration() reads ASSEMBLI_PLACEHOLDER_AUDIO env var
```

From lib/audio/duration.ts:
```typescript
import ffmpegPath from "ffmpeg-static";
// Pattern already used: execFileAsync(ffmpegPath, [...args])
// ffmpegPath may be null — must guard before use
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add proportional silence generation to elevenlabs-client.ts</name>
  <files>lib/audio/elevenlabs-client.ts</files>
  <behavior>
    - generateProportionalSilence("Hello world."): returns Buffer of MP3 bytes, duration >= 3s
    - generateProportionalSilence("x".repeat(110)): duration ~= 10s (110/11)
    - generateProportionalSilence("a"): duration = 3s (minimum clamp)
    - On ffmpeg failure (ffmpegPath null OR execFile throws): falls back to reading PLACEHOLDER_SILENCE, returns that buffer
    - synthesizeNarrationToBuffer(text) with ASSEMBLI_PLACEHOLDER_AUDIO=true: calls generateProportionalSilence(text), not the hardcoded 1s file
    - synthesizeNarrationToBuffer(text) with ASSEMBLI_PLACEHOLDER_AUDIO unset: ElevenLabs path unchanged
  </behavior>
  <action>
Add a new internal async function `generateProportionalSilence(text: string): Promise<Buffer>`
to `lib/audio/elevenlabs-client.ts`.

Duration formula: `const durationSec = Math.max(3, Math.ceil(text.length / 11));`
(~130 WPM average speaking rate, ~5 chars/word → ~11 chars/sec)

Use `ffmpeg-static` (already a project dependency) to generate the silence:

```
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
```

ffmpeg command to generate silent MP3:
```
ffmpegPath, [
  "-f", "lavfi",
  "-i", "anullsrc=r=44100:cl=mono",
  "-t", String(durationSec),
  "-acodec", "libmp3lame",
  "-q:a", "9",
  outputPath
]
```

Write to a temp file: `path.join(os.tmpdir(), \`assembli-silence-${process.pid}-${Date.now()}.mp3\`)`.
Read the file into a Buffer, then `fs.unlink` it (swallow unlink error).

Wrap entire ffmpeg execution in try/catch. On any error (ffmpegPath is null, ffmpeg fails,
output file unreadable), fall back to reading the static `PLACEHOLDER_SILENCE` file
(`remotion/public/silence-1s.mp3`). If that also fails, rethrow with a clear message.

Replace the current placeholder branch in `synthesizeNarrationToBuffer`:

Before (current):
```typescript
if (isPlaceholderNarration()) {
  const silencePath = path.join(process.cwd(), PLACEHOLDER_SILENCE);
  try {
    const buf = await fs.readFile(silencePath);
    if (buf.length === 0) { throw new Error("empty file"); }
    return buf;
  } catch {
    throw new Error(`ASSEMBLI_PLACEHOLDER_AUDIO is set but could not read ${silencePath}`);
  }
}
```

After:
```typescript
if (isPlaceholderNarration()) {
  return generateProportionalSilence(text);
}
```

Do NOT change the ElevenLabs path, the MAX_CHARS guard, or the empty-text guard.
Do NOT remove the PLACEHOLDER_SILENCE constant — it is used as a fallback inside
`generateProportionalSilence`.
  </action>
  <verify>
    <automated>cd /Users/abhaykorlapati/Desktop/Assembli && npx vitest run lib/audio/elevenlabs-client.test.ts</automated>
  </verify>
  <done>
    All tests in elevenlabs-client.test.ts pass, including the updated placeholder test that
    verifies the returned buffer is a valid MP3 whose duration matches text length, not always 1s.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Update tests to cover proportional silence and fallback</name>
  <files>lib/audio/elevenlabs-client.test.ts</files>
  <behavior>
    - Existing test "uses local silence MP3 when ASSEMBLI_PLACEHOLDER_AUDIO is true" must still pass (verifies buffer length > 100, mockConvert not called) — keep it as-is if it still passes with proportional silence
    - New test: "placeholder returns buffer longer than 1s silence for long text" — set ASSEMBLI_PLACEHOLDER_AUDIO=true, call synthesizeNarrationToBuffer with 220+ char text, verify returned buffer.length > length-of-1s-silence (use the real silence-1s.mp3 byte count as upper bound comparison: proportional silence for 220 chars = 20s >> 1s)
    - New test: "placeholder returns minimum 3s duration for short text" — verify short text (< 33 chars) still returns a non-empty buffer
    - New test: "placeholder falls back to 1s silence when ffmpeg is unavailable" — mock ffmpeg-static to return null, verify returned buffer equals the static silence-1s.mp3 content
  </behavior>
  <action>
Update `lib/audio/elevenlabs-client.test.ts`.

Add a vi.mock for `ffmpeg-static` at the top of the file (alongside the existing ElevenLabsClient
mock) so individual tests can control whether ffmpegPath is available:

```typescript
const mockFfmpegPath = vi.fn(() => "/usr/bin/ffmpeg"); // default: available
vi.mock("ffmpeg-static", () => ({ default: mockFfmpegPath() }));
```

Actually for simpler control, mock it as a module-level variable:

```typescript
let ffmpegBinPath: string | null = "/usr/bin/ffmpeg";
vi.mock("ffmpeg-static", () => ({ default: ffmpegBinPath }));
```

But because vi.mock is hoisted, use a factory approach. The cleanest approach for this file is to
mock `node:child_process` execFile behaviour instead of ffmpeg-static path:

```typescript
const mockExecFile = vi.fn();
vi.mock("node:child_process", () => ({ execFile: mockExecFile }));
```

For the "unavailable" test, make mockExecFile throw. Note: the existing silence-1s.mp3 file
must be readable on disk for the fallback test to work — it is committed under
`remotion/public/silence-1s.mp3`.

For proportional duration comparison tests, since the output is a temp file written by ffmpeg
(which is real in unit tests), consider that unit tests should mock the child_process layer and
have the mock write a real (but tiny) MP3 or just return success so the code reads the output
file. The simpler approach: in the test environment, the actual ffmpeg binary from
`ffmpeg-static` IS available, so let the real ffmpeg run for the integration-style placeholder
tests (these are already integration-like since the existing test reads the real silence-1s.mp3).

Revised plan for the tests:

1. Keep existing test "uses local silence MP3 when ASSEMBLI_PLACEHOLDER_AUDIO is true" — rename
   slightly to "returns non-empty buffer in placeholder mode" and let real ffmpeg run.
2. Add "placeholder buffer is larger for long text than for short text" — call twice with
   short text ("Hi.") and long text ("x".repeat(220)), assert long buffer.length > short
   buffer.length (or just assert both > 100 and that they differ, since ffmpeg output size
   scales with duration).
3. Add "placeholder falls back to silence file when ffmpeg-static returns null" — use
   vi.spyOn on the module or pass through by temporarily overriding the environment. The cleanest
   approach without deep mocking: temporarily set ffmpegPath to be unavailable by mocking the
   import. Use `vi.doMock` or simply test by mocking `node:child_process.execFile` to reject,
   then call synthesizeNarrationToBuffer with ASSEMBLI_PLACEHOLDER_AUDIO=true and verify a
   non-empty buffer is still returned (fallback path).

Implement whichever mock strategy compiles and makes the tests deterministic. All tests must
pass with `npx vitest run lib/audio/elevenlabs-client.test.ts`.
  </action>
  <verify>
    <automated>cd /Users/abhaykorlapati/Desktop/Assembli && npx vitest run lib/audio/elevenlabs-client.test.ts --reporter=verbose</automated>
  </verify>
  <done>
    All tests pass. Test suite covers: real ElevenLabs path (mocked SDK), placeholder mode with
    proportional silence (real or mocked ffmpeg), placeholder fallback when ffmpeg unavailable,
    empty-text guard, max-chars guard.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| text input → ffmpeg args | narration text length is used to compute a duration integer, not interpolated into shell — no shell injection risk |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-rst-01 | Tampering | tmp file path | accept | file is written to os.tmpdir() with pid+timestamp — no predictable path for tampering in a single-process worker |
| T-rst-02 | Denial of Service | durationSec formula | mitigate | MAX_CHARS=5000 already caps text length; max duration = ceil(5000/11) = 455s — acceptable for a demo pipeline; add no further cap |
| T-rst-03 | Information Disclosure | tmp file not cleaned | mitigate | unlink in finally block; swallow unlink error to avoid masking real errors |
</threat_model>

<verification>
After both tasks complete:

1. Run full audio test suite: `cd /Users/abhaykorlapati/Desktop/Assembli && npx vitest run lib/audio/`
2. Smoke test with placeholder mode:
   ```
   ASSEMBLI_PLACEHOLDER_AUDIO=true npx tsx -e "
   import { synthesizeNarrationToBuffer } from './lib/audio/elevenlabs-client';
   const buf = await synthesizeNarrationToBuffer('Attach the left leg bracket using two M6 bolts. Tighten until snug but do not overtighten.');
   console.log('Buffer bytes:', buf.length);
   "
   ```
   Expect: buffer length distinctly larger than the 1s silence file (~26KB for 1s at 44100Hz mono).
</verification>

<success_criteria>
- `ASSEMBLI_PLACEHOLDER_AUDIO=true` produces silence scaled to ~130 WPM narration time (minimum 3s)
- Full pipeline renders videos whose duration reflects actual step count and text length
- ElevenLabs code path is unchanged; no regressions for users with API keys
- All tests in `lib/audio/elevenlabs-client.test.ts` pass
- Fallback to `silence-1s.mp3` prevents pipeline halts when ffmpeg is unavailable
</success_criteria>

<output>
After completion, create `.planning/quick/260404-rst-remove-elevenlabs-tts-temporarily-and-re/260404-rst-SUMMARY.md`
</output>
