# Requirements: Assembli

**Defined:** 2026-04-04
**Core Value:** Upload a furniture assembly manual, get back a clear, watchable explainer video

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Document Ingestion

- [ ] **INGEST-01**: User can upload a furniture assembly manual via drag-and-drop (PDF)
- [ ] **INGEST-02**: System validates uploaded file type and size before processing

### Content Extraction

- [x] **EXTRACT-01**: System extracts steps, tools, and warnings from uploaded PDF using Claude API
- [x] **EXTRACT-02**: System produces a clean, well-defined scene JSON schema (Zod-validated)
- [x] **EXTRACT-03**: Each extracted scene includes a confidence score indicating extraction reliability

### Video Generation

- [x] **VIDEO-01**: System renders animated step-by-step slides with exploded-view style part animations
- [x] **VIDEO-02**: Video includes text captions/overlays synced to narration
- [x] **VIDEO-03**: Video displays step counter ("Step 3 of 12")

### Audio Narration

- [x] **AUDIO-01**: ElevenLabs generates voice narration for each step
- [x] **AUDIO-02**: Audio narration is synced with visual transitions and animations

### Output

- [ ] **OUTPUT-01**: User can preview the completed video in the browser

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Ingestion Enhancements

- **INGEST-03**: Processing status indicator showing pipeline progress
- **INGEST-04**: DOCX file support (Word documents)

### Content Enhancements

- **EXTRACT-04**: LLM simplifies complex instructions into plain language (beyond structural extraction)

### Video Enhancements

- **VIDEO-04**: Warning/safety callout cards displayed as visual elements
- **VIDEO-05**: Arrow/motion indicators showing assembly direction
- **VIDEO-06**: Part highlighting and labeling overlays

### Audio Enhancements

- **AUDIO-03**: Voice selection (choose different narrator voices)
- **AUDIO-04**: Playback speed control

### Output Enhancements

- **OUTPUT-02**: MP4 download of completed video
- **OUTPUT-03**: Shareable link for completed video
- **OUTPUT-04**: Quality/resolution options

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video timeline editor | v1 is one-shot pipeline, no editing |
| 3D rendering / physics | Simple 2D exploded-view animations only |
| Talking-head avatars | Adds complexity without serving assembly use case |
| Interactive branching | Overcomplicated for step-by-step instructions |
| OAuth / account management | Not needed for v1 demo |
| Non-assembly manuals | Furniture first — general purpose deferred |
| Mobile app | Web only for v1 |
| Real-time collaboration | Single user flow |
| Batch/multi-manual upload | One manual at a time for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INGEST-01 | Phase 1 | Pending |
| INGEST-02 | Phase 1 | Pending |
| EXTRACT-01 | Phase 2 | Complete |
| EXTRACT-02 | Phase 2 | Complete |
| EXTRACT-03 | Phase 2 | Complete |
| VIDEO-01 | Phase 3 | Complete |
| VIDEO-02 | Phase 3 | Complete |
| VIDEO-03 | Phase 3 | Complete |
| AUDIO-01 | Phase 3 | Complete |
| AUDIO-02 | Phase 3 | Complete |
| OUTPUT-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after Phase 3 execution*
