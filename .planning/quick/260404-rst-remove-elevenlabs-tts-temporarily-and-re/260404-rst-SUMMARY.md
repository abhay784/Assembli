---
phase: quick
plan: 260404-rst
subsystem: audio
tags: [placeholder-audio, ffmpeg, tts, silence-generation]
dependency_graph:
  requires: [ffmpeg-static, remotion/public/silence-1s.mp3]
  provides: [proportional-silence-generation]
  affects: [worker pipeline, video duration accuracy]
tech_stack:
  added: []
  patterns: [execFileAsync with ffmpeg anullsrc, tmp-file-write-read-unlink]
key_files:
  modified:
    - lib/audio/elevenlabs-client.ts
    - lib/audio/elevenlabs-client.test.ts
decisions:
  - "Duration formula: Math.max(3, Math.ceil(text.length / 11)) seconds (~130 WPM, ~5 chars/word)"
  - "Fallback to silence-1s.mp3 on any ffmpeg failure — pipeline never halts"
  - "Unlink temp file in finally block, swallow unlink errors"
metrics:
  duration: 10m
  completed: "2026-04-05"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick Plan 260404-rst: Proportional Silence for Placeholder Audio Summary

Replaced hardcoded 1-second silence placeholder with ffmpeg-generated silence scaled to approximate real narration duration (~130 WPM, minimum 3s), enabling full-length video renders without an ElevenLabs API key.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add proportional silence generation to elevenlabs-client.ts | aeeed87 | lib/audio/elevenlabs-client.ts |
| 2 | Update tests to cover proportional silence and fallback | aeeed87 | lib/audio/elevenlabs-client.test.ts |

## What Was Built

### `generateProportionalSilence(text: string): Promise<Buffer>`

New internal function added to `lib/audio/elevenlabs-client.ts`:

- Duration formula: `Math.max(3, Math.ceil(text.length / 11))` seconds
- Uses `ffmpeg-static` + `execFileAsync` to generate silent MP3 via `anullsrc=r=44100:cl=mono`
- Writes output to a temp file (`os.tmpdir()/assembli-silence-{pid}-{ts}.mp3`), reads it, then unlinks in `finally`
- On any failure (null ffmpegPath, execFile error, unreadable output): falls back to `remotion/public/silence-1s.mp3`
- If fallback also fails: rethrows with a clear message

### Placeholder branch updated

`synthesizeNarrationToBuffer` placeholder branch now delegates to `generateProportionalSilence(text)` instead of directly reading the static 1s file.

### Tests updated (7 tests total)

- Existing ElevenLabs path tests preserved (3)
- "returns non-empty buffer and does not call ElevenLabs" (real ffmpeg)
- "placeholder buffer is larger for long text than for short text" (220 chars → 20s > 3s)
- "placeholder returns minimum 3s duration for short text"
- "placeholder falls back to silence file when ffmpeg (execFile) fails" (mock execFile error → fallback)

## Verification Results

```
Tests:  7 passed (7)
Full audio suite: 10 passed (10) — no regressions
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vi.mock hoisting issue with mockExecFile reference**

- **Found during:** Task 2 (test writing)
- **Issue:** `vi.mock("node:child_process", () => ({ execFile: mockExecFile }))` causes ReferenceError because `vi.mock` is hoisted above `const mockExecFile = vi.fn()`. Factory ran before variable initialization.
- **Fix:** Used `importOriginal` pattern in the mock factory so the mock wraps the real module; individual tests use `vi.mocked(childProcess.execFile).mockImplementation(realExecFile)` to restore real behavior per-test, or mock with a rejecting callback for the failure case.
- **Files modified:** lib/audio/elevenlabs-client.test.ts
- **Commit:** aeeed87

## Known Stubs

None — proportional silence is fully wired. The `generateProportionalSilence` function produces real MP3 bytes proportional to text length.

## Threat Flags

None — no new network endpoints or auth paths introduced. The T-rst-03 threat (tmp file not cleaned) is mitigated by the `finally` block unlinking the temp file.

## Self-Check: PASSED

- [x] lib/audio/elevenlabs-client.ts — modified, committed aeeed87
- [x] lib/audio/elevenlabs-client.test.ts — modified, committed aeeed87
- [x] Commit aeeed87 exists: confirmed via `git rev-parse --short HEAD`
- [x] All 7 tests pass, 10 audio suite tests pass
