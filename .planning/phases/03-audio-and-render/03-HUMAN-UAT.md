---
status: partial
phase: 03-audio-and-render
source: [03-VERIFICATION.md]
started: 2026-04-04
updated: 2026-04-04
---

## Current Test

Awaiting human run with full worker stack and API keys.

## Tests

### 1. End-to-end PDF → video artifact

expected: Upload a real manual PDF through ManualUpload; worker completes; GET `/api/jobs/{id}` shows non-null `sceneKey` and `videoKey` ending in `output.mp4`; S3 contains `uploads/{jobId}/audio/*.mp3` and `uploads/{jobId}/output.mp4`.

result: [pending]

### 2. UI shows video key

expected: On completed job, ManualUpload shows **Scene key** and **Video key** blocks with monospace keys.

result: [pending]

### 3. A/V sync sanity

expected: Download `output.mp4` and confirm narration roughly aligns with step transitions (no hardcoded per-step frame cap).

result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

(none yet)
