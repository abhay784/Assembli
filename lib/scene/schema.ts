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
});

const stepSchema = z.object({
  title: z.string(),
  caption: z.string(),
  parts: z.array(partSchema),
});

export const sceneSchema = z
  .object({
    steps: z.array(stepSchema),
  })
  .strict();

export type SceneJSON = z.infer<typeof sceneSchema>;
