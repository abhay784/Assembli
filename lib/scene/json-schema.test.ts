import { describe, expect, it } from "vitest";
import { sceneJsonSchema } from "./json-schema";

describe("sceneJsonSchema", () => {
  it("exports a JSON Schema object with type or properties", () => {
    expect(sceneJsonSchema).toBeTypeOf("object");
    expect(sceneJsonSchema).not.toBeNull();
    const top = sceneJsonSchema as Record<string, unknown>;
    if ("type" in top || "properties" in top) {
      return;
    }
    const inner = (top.definitions as Record<string, unknown> | undefined)
      ?.SceneJSON as Record<string, unknown> | undefined;
    expect(
      inner && ("type" in inner || "properties" in inner),
    ).toBeTruthy();
  });
});
