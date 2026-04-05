import type { SceneJSON } from "../scene/schema";

export function buildStepNarrationText(step: {
  title: string;
  caption: string;
}): string {
  const title = step.title.trim();
  const caption = step.caption.trim();
  if (title.length === 0 && caption.length === 0) {
    throw new Error("empty narration: step has no title or caption");
  }
  return `${title}. ${caption}`;
}

export type NarrationStep = SceneJSON["steps"][number];
