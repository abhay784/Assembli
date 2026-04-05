import { z } from "zod";

/**
 * SceneJSON contract (Phase 1).
 *
 * Step display index: "Step N of M" uses N = array index + 1 and M = steps.length.
 * Steps do not carry a separate string id in Phase 1 — ordering is array order only (D-02).
 */

const holeSchema = z.object({
  /** X offset from part center in diagram units. */
  hx: z.number(),
  /** Y offset from part center in diagram units. */
  hy: z.number(),
  /** Visual radius of the hole marker. */
  radius: z.number().optional(),
});

const insertionTargetSchema = z.object({
  /** ID of the part this fastener connects to. */
  targetPartId: z.string(),
  /** Insertion direction in degrees: 0=down, 90=left, 180=up, 270=right. */
  angle: z.number(),
  /** Index into the target part's holes array — which specific hole this fastener enters. */
  holeIndex: z.number().optional(),
  /** Optional annotation like "x4" or "hand-tighten". */
  labelText: z.string().optional(),
});

const partSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  rotationDeg: z.number(),
  /** Part shape — drives isometric rendering. Inferred from label when absent. */
  shape: z
    .enum(["panel", "screw", "dowel", "leg", "bracket"])
    .optional(),
  /** Width of the part in diagram units (left-right). */
  w: z.number().optional(),
  /** Height of the part in diagram units (top-bottom / thickness). */
  h: z.number().optional(),
  /** Depth of the part in diagram units (front-back, drawn as isometric offset). */
  d: z.number().optional(),
  /** Material drives color palette. Inferred from label/shape when absent. */
  material: z.enum(["wood", "metal", "plastic"]).optional(),
  /** Where this fastener inserts into — drives directional arrow rendering. */
  insertionTarget: insertionTargetSchema.optional(),
  /** Hole/insertion point markers on receiving parts. */
  holes: z.array(holeSchema).optional(),
  /** ID of another part this part physically connects to — drives slide-together animation. */
  connectsTo: z.string().optional(),
  /** URL to an extracted sprite image of this part (from the manual's hardware page). When present, the renderer uses this image instead of generic geometric shapes. */
  imageUrl: z.string().optional(),
});

const toolIconSchema = z.object({
  tool: z.enum([
    "allen_key",
    "phillips_screwdriver",
    "flat_screwdriver",
    "hammer",
    "hand",
  ]),
  x: z.number(),
  y: z.number(),
  rotationDeg: z.number().optional(),
  scale: z.number().optional(),
});

const detailInsetSchema = z.object({
  /** Center X of the source region to magnify. */
  cx: z.number(),
  /** Center Y of the source region to magnify. */
  cy: z.number(),
  /** Radius of the source region. */
  radius: z.number(),
  /** Where to draw the magnified inset bubble — X. */
  anchorX: z.number(),
  /** Where to draw the magnified inset bubble — Y. */
  anchorY: z.number(),
  /** Magnification factor (default 2.5). */
  zoom: z.number().optional(),
});

const stepSchema = z.object({
  title: z.string(),
  caption: z.string(),
  parts: z.array(partSchema),
  confidence: z.number().min(0).max(1),
  tools: z.array(z.string()),
  warnings: z.array(z.string()),
  /** Visual tool placements on the canvas diagram. */
  toolIcons: z.array(toolIconSchema).optional(),
  /** Zoom callout showing detail of a specific area. */
  detailInset: detailInsetSchema.optional(),
});

export const sceneSchema = z
  .object({
    steps: z.array(stepSchema),
  })
  .strict();

export type SceneJSON = z.infer<typeof sceneSchema>;
