import { z } from "zod";

/**
 * SceneJSON contract (Phase 1).
 *
 * Step display index: "Step N of M" uses N = array index + 1 and M = steps.length.
 * Steps do not carry a separate string id in Phase 1 — ordering is array order only (D-02).
 */

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
});

const stepSchema = z.object({
  title: z.string(),
  caption: z.string(),
  parts: z.array(partSchema),
  confidence: z.number().min(0).max(1),
  tools: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const sceneSchema = z
  .object({
    steps: z.array(stepSchema),
  })
  .strict();

export type SceneJSON = z.infer<typeof sceneSchema>;
