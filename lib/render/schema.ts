import { z } from "zod";
import { sceneSchema } from "../scene/schema";

export const renderInputSchema = sceneSchema
  .extend({
    durationsInFrames: z.array(z.number().int().min(1).max(9000)),
    audioFiles: z.array(z.string().min(1)),
  })
  .superRefine((val, ctx) => {
    const n = val.steps.length;
    if (n > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "too many steps",
      });
      return;
    }
    if (n < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one step is required",
      });
      return;
    }
    if (n !== val.durationsInFrames.length || n !== val.audioFiles.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "steps, durationsInFrames, and audioFiles length mismatch",
      });
      return;
    }
    const sum = val.durationsInFrames.reduce((a, b) => a + b, 0);
    if (!Number.isSafeInteger(sum)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "total duration overflow",
      });
    }
  });

export type RenderInput = z.infer<typeof renderInputSchema>;
