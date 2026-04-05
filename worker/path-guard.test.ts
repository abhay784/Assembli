import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertPathsContainedInDir } from "./path-guard";

describe("assertPathsContainedInDir", () => {
  let base: string;

  afterEach(async () => {
    if (base) {
      await fs.rm(base, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("allows files inside the directory", async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), "assembli-guard-"));
    const inner = path.join(base, "00.mp3");
    await fs.writeFile(inner, Buffer.from("x"));
    expect(() => assertPathsContainedInDir([inner], base)).not.toThrow();
  });

  it("rejects path traversal outside dir", async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), "assembli-guard-"));
    const escaped = path.join(base, "..", "outside.mp3");
    expect(() => assertPathsContainedInDir([escaped], base)).toThrow(
      /escapes work directory/,
    );
  });
});
