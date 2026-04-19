---
phase: quick
plan: 260405-ekf
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/scene/schema.ts
  - lib/scene/json-schema.ts
  - lib/pdf/rasterize-step-pages.ts
  - lib/claude/extract-scene.ts
  - worker/extraction-pipeline.ts
  - remotion/compositions/AssemblySteps.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Each step in SceneJSON can carry a pageIndex (0-based PDF page) and backgroundImageUrl"
    - "The pipeline rasterizes step pages from the PDF and injects backgroundImageUrl into step objects"
    - "Remotion renders the actual manual diagram page as background instead of the dot-grid when backgroundImageUrl is present"
  artifacts:
    - path: "lib/scene/schema.ts"
      provides: "pageIndex and backgroundImageUrl optional fields on stepSchema"
      contains: "pageIndex"
    - path: "lib/pdf/rasterize-step-pages.ts"
      provides: "rasterizeStepPages function that rasterizes specific PDF pages to PNG"
      exports: ["rasterizeStepPages"]
    - path: "worker/extraction-pipeline.ts"
      provides: "Post-extraction step that rasterizes pages and injects backgroundImageUrl"
    - path: "remotion/compositions/AssemblySteps.tsx"
      provides: "IsoCanvas renders background image when backgroundImageUrl present on step"
  key_links:
    - from: "lib/claude/extract-scene.ts"
      to: "lib/scene/schema.ts"
      via: "System prompt instructs Claude to emit pageIndex per step"
      pattern: "pageIndex"
    - from: "worker/extraction-pipeline.ts"
      to: "lib/pdf/rasterize-step-pages.ts"
      via: "Pipeline calls rasterizeStepPages after scene extraction"
      pattern: "rasterizeStepPages"
    - from: "remotion/compositions/AssemblySteps.tsx"
      to: "step.backgroundImageUrl"
      via: "IsoCanvas conditionally renders Img background"
      pattern: "backgroundImageUrl"
---

<objective>
Implement sprite-based assembly animation pipeline that replaces the synthetic dot-grid background in Remotion with actual manual diagram pages.

Purpose: Use the manual as ground truth — each assembly step shows the real diagram page from the PDF as its background, making animations more accurate and familiar to users.

Output: Updated schema, new rasterizer utility, updated extraction prompt, pipeline integration, and Remotion rendering support for background images.
</objective>

<execution_context>
@/Users/abhaykorlapati/Desktop/Assembli/.claude/get-shit-done/workflows/execute-plan.md
@/Users/abhaykorlapati/Desktop/Assembli/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/scene/schema.ts
@lib/scene/json-schema.ts
@lib/pdf/rasterize-parts.ts
@lib/claude/extract-scene.ts
@worker/extraction-pipeline.ts
@remotion/compositions/AssemblySteps.tsx
@lib/render/schema.ts

<interfaces>
<!-- From lib/scene/schema.ts — stepSchema is the target for new fields -->
const stepSchema = z.object({
  title: z.string(),
  caption: z.string(),
  parts: z.array(partSchema),
  confidence: z.number().min(0).max(1),
  tools: z.array(z.string()),
  warnings: z.array(z.string()),
  toolIcons: z.array(toolIconSchema).optional(),
  detailInset: detailInsetSchema.optional(),
});

export const sceneSchema = z.object({ steps: z.array(stepSchema) }).strict();

<!-- From lib/render/schema.ts — extends sceneSchema, so step changes flow through -->
export const renderInputSchema = sceneSchema.extend({
  durationsInFrames: z.array(z.number().int().min(1).max(9000)),
  audioFiles: z.array(z.string().min(1)),
});

<!-- From lib/pdf/rasterize-parts.ts — pattern to follow for rasterize-step-pages.ts -->
export async function rasterizePartSprites(options: {
  pdfPath: string;
  parts: PartInventoryItem[];
  outputDir: string;
  dpi?: number;
}): Promise<PartSprite[]>

<!-- From remotion/compositions/AssemblySteps.tsx — Img already imported -->
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
type StepType = SceneJSON["steps"][number];
function IsoCanvas({ step, frame }: { step: StepType; frame: number })
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Schema + Rasterizer + Prompt updates</name>
  <files>lib/scene/schema.ts, lib/pdf/rasterize-step-pages.ts, lib/claude/extract-scene.ts</files>
  <action>
1. **lib/scene/schema.ts** — Add two optional fields to `stepSchema`:
   - `pageIndex: z.number().int().min(0).optional()` — 0-based PDF page index this step corresponds to
   - `backgroundImageUrl: z.string().optional()` — URL to the rasterized page image (injected by pipeline, NOT emitted by Claude)

   Place them after the existing `detailInset` field. The `sceneSchema` uses `.strict()` so these MUST be on stepSchema to pass validation. The `sceneJsonSchema` in `lib/scene/json-schema.ts` auto-derives from the Zod schema via `zodToJsonSchema()` — no changes needed there, it will pick up the new fields automatically. Similarly `renderInputSchema` extends `sceneSchema` so step type changes flow through.

2. **lib/pdf/rasterize-step-pages.ts** — Create new file modeled on `rasterize-parts.ts` but simpler (no cropping, no ImageMagick). Export:
   ```typescript
   export interface StepPageRaster {
     pageIndex: number;
     localPath: string;
   }

   export async function rasterizeStepPages(options: {
     pdfPath: string;
     pageIndices: number[];  // 0-based, deduplicated by caller
     outputDir: string;
     dpi?: number;  // default 150 (lower than sprites — background only)
   }): Promise<StepPageRaster[]>
   ```
   Implementation: iterate `pageIndices`, call `pdftoppm -png -r {dpi} -f {page+1} -l {page+1} -singlefile {pdfPath} {outputDir}/step-page-{pageIndex}`. Collect results. Wrap in try/catch like rasterize-parts.ts — if pdftoppm not available, return empty array (graceful fallback). Do NOT clean up rasterized files — caller manages cleanup.

3. **lib/claude/extract-scene.ts** — Add pageIndex instruction to SYSTEM_PROMPT. Append after the detailInset paragraph:
   ```
   For each step, include "pageIndex" — the 0-based PDF page index that contains the diagram for that assembly step. This tells the pipeline which page to rasterize as the background image. If multiple steps come from the same page, they share the same pageIndex. Count pages starting from 0 (first page = 0). Do NOT include "backgroundImageUrl" — the pipeline injects that after rasterization.
   ```
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
  - stepSchema has pageIndex (optional int >= 0) and backgroundImageUrl (optional string)
  - rasterize-step-pages.ts exports rasterizeStepPages function
  - SYSTEM_PROMPT includes pageIndex instruction and explicitly says not to emit backgroundImageUrl
  - TypeScript compiles cleanly
  </done>
</task>

<task type="auto">
  <name>Task 2: Pipeline integration + Remotion background rendering</name>
  <files>worker/extraction-pipeline.ts, remotion/compositions/AssemblySteps.tsx</files>
  <action>
1. **worker/extraction-pipeline.ts** — After scene extraction (after the `extractSceneFromPdfBuffer` call on ~line 105), add a new post-processing block before audio generation. Pattern:

   ```typescript
   // ── Phase 1.5: Rasterize step background pages ─────────────────────────
   let stepPagesDir: string | undefined;
   let publishedStepPagesDir: string | undefined;
   try {
     // Collect unique pageIndex values from extracted steps
     const pageIndices = [...new Set(
       scene.steps
         .map(s => s.pageIndex)
         .filter((idx): idx is number => idx !== undefined)
     )];

     if (pageIndices.length > 0) {
       stepPagesDir = await fs.mkdtemp(path.join(os.tmpdir(), "assembli-step-pages-"));
       const tempPdfPath = path.join(stepPagesDir, "manual.pdf");
       await fs.writeFile(tempPdfPath, pdfBuffer);

       const rasters = await rasterizeStepPages({
         pdfPath: tempPdfPath,
         pageIndices,
         outputDir: path.join(stepPagesDir, "pages"),
       });

       if (rasters.length > 0) {
         const publicStepPagesRel = `__assembli-step-pages/${payload.jobId}`;
         publishedStepPagesDir = path.join(process.cwd(), "remotion/public", publicStepPagesRel);
         await fs.mkdir(publishedStepPagesDir, { recursive: true });

         // Build pageIndex → URL map
         const pageUrlMap = new Map<number, string>();
         for (const raster of rasters) {
           const filename = `page-${raster.pageIndex}.png`;
           await fs.copyFile(raster.localPath, path.join(publishedStepPagesDir, filename));
           pageUrlMap.set(raster.pageIndex, publicStaticFileUrl(`${publicStepPagesRel}/${filename}`));

           // Also upload to S3 for persistence
           const s3Key = `uploads/${payload.jobId}/step-pages/${filename}`;
           const pageBytes = await fs.readFile(raster.localPath);
           await putObjectBytes({ key: s3Key, body: Buffer.from(pageBytes), contentType: "image/png" });
         }

         // Inject backgroundImageUrl into each step that has a pageIndex
         for (const step of scene.steps) {
           if (step.pageIndex !== undefined) {
             const url = pageUrlMap.get(step.pageIndex);
             if (url) {
               (step as any).backgroundImageUrl = url;
             }
           }
         }
       }
     }
   } catch (err) {
     console.warn("Step page rasterization failed (non-fatal):", err);
   } finally {
     if (stepPagesDir) {
       await fs.rm(stepPagesDir, { recursive: true, force: true }).catch(() => {});
     }
   }
   ```

   Add import at top: `import { rasterizeStepPages } from "../lib/pdf/rasterize-step-pages";`

   Add `publishedStepPagesDir` cleanup in the existing finally block (alongside publishedAudioDir and publishedSpritesDir cleanup).

   IMPORTANT: The mutation `(step as any).backgroundImageUrl = url` is needed because TypeScript infers the step type from the Zod parse which makes the object readonly-ish. The field IS on the schema (added in Task 1), so this is safe. Alternatively, type-assert `scene.steps` as mutable.

2. **remotion/compositions/AssemblySteps.tsx** — Update the `IsoCanvas` component (starts at line 587). When `step.backgroundImageUrl` is present, replace the dot-grid div with a Remotion `<Img>` element:

   In the IsoCanvas component body, replace the dot-grid div block (lines 607-617) with a conditional:
   ```tsx
   {step.backgroundImageUrl ? (
     <Img
       src={step.backgroundImageUrl}
       style={{
         position: "absolute",
         inset: 0,
         width: "100%",
         height: "100%",
         objectFit: "contain",
         opacity: 0.35,
       }}
     />
   ) : (
     <div
       style={{
         position: "absolute",
         inset: 0,
         backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
         backgroundSize: "32px 32px",
         backgroundPosition: "16px 16px",
         opacity: 0.4,
       }}
     />
   )}
   ```

   The `Img` component from Remotion handles static file resolution correctly in both Studio preview and server-side rendering. Use `objectFit: "contain"` to preserve aspect ratio. Use `opacity: 0.35` so the diagram page is visible but doesn't overpower the animated parts overlay. Keep the drafting corner marks (lines 619-639) regardless of background type — they frame the canvas nicely in both modes.

   The `step` object is typed as `StepType` which is `SceneJSON["steps"][number]` — since we added the fields to stepSchema in Task 1, TypeScript will recognize `step.backgroundImageUrl` without any type changes.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
  - Pipeline collects pageIndex values from extracted scene, rasterizes those pages, uploads to S3 and remotion/public, injects backgroundImageUrl into step objects
  - IsoCanvas conditionally renders Remotion Img background when backgroundImageUrl present, falls back to dot-grid when absent
  - Cleanup of publishedStepPagesDir happens in the finally block
  - TypeScript compiles cleanly
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Claude output -> schema | pageIndex values from LLM could be out of range |
| PDF -> pdftoppm | External tool processes uploaded PDF |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | T (Tampering) | pageIndex from LLM | mitigate | Zod schema validates pageIndex as non-negative integer; pipeline only rasterizes pages that exist in the PDF (pdftoppm silently skips invalid pages) |
| T-quick-02 | D (Denial of Service) | rasterizeStepPages | accept | Same risk profile as existing rasterizePartSprites — pdftoppm on untrusted PDFs is already in the pipeline; DPI is capped at 150 |
</threat_model>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Schema changes: `node -e "const {sceneSchema} = require('./lib/scene/schema'); const r = sceneSchema.safeParse({steps:[{title:'t',caption:'c',parts:[],confidence:1,tools:[],warnings:[],pageIndex:2}]}); console.log(r.success)"` prints true
3. Rasterizer file exists and exports correctly: `node -e "const m = require('./lib/pdf/rasterize-step-pages'); console.log(typeof m.rasterizeStepPages);"` prints "function"
</verification>

<success_criteria>
- stepSchema accepts optional pageIndex (int >= 0) and optional backgroundImageUrl (string)
- rasterize-step-pages.ts can rasterize specific PDF pages to PNG at 150 DPI
- Claude system prompt instructs emission of pageIndex per step
- Pipeline rasterizes step pages post-extraction and injects backgroundImageUrl
- Remotion IsoCanvas shows manual diagram page as semi-transparent background when available, falls back to dot-grid when not
- All existing functionality (sprite extraction, audio, rendering) continues to work unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/260405-ekf-implement-sprite-based-assembly-animatio/260405-ekf-SUMMARY.md`
</output>
