import { describe, expect, it } from "vitest";
import { parseModelJson } from "./parse-json-response";

describe("parseModelJson", () => {
  it("parses raw JSON", () => {
    expect(parseModelJson('  {"a":1}  ')).toEqual({ a: 1 });
  });

  it("parses fenced json blocks", () => {
    const text = "```json\n{\"x\": true}\n```";
    expect(parseModelJson(text)).toEqual({ x: true });
  });

  it("parses generic fenced blocks", () => {
    const text = "```\n{\"y\": 2}\n```";
    expect(parseModelJson(text)).toEqual({ y: 2 });
  });

  it("throws Invalid JSON from model on bad input", () => {
    expect(() => parseModelJson("not json")).toThrow("Invalid JSON from model");
  });
});
