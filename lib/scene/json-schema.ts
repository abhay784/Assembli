import { zodToJsonSchema } from "zod-to-json-schema";
import { sceneSchema } from "./schema";

export const sceneJsonSchema = zodToJsonSchema(sceneSchema, {
  name: "SceneJSON",
  $refStrategy: "none",
});
