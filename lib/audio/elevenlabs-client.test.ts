import { beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeNarrationToBuffer } from "./elevenlabs-client";

const mockConvert = vi.fn();

vi.mock("@elevenlabs/elevenlabs-js", () => {
  return {
    ElevenLabsClient: class {
      textToSpeech = { convert: mockConvert };
      constructor() {}
    },
  };
});

// vi.mock is hoisted — use a module-level spy approach instead.
// We mock node:child_process with a stable function reference via hoisting-safe factory.
vi.mock("node:child_process", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("node:child_process")>();
  return {
    ...mod,
    execFile: vi.fn(mod.execFile),
  };
});

function streamFromBuffer(buf: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buf));
      controller.close();
    },
  });
}

describe("synthesizeNarrationToBuffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    delete process.env.ASSEMBLI_PLACEHOLDER_AUDIO;
  });

  it("returns a buffer on success", async () => {
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_VOICE_ID = "v";
    mockConvert.mockResolvedValue(streamFromBuffer(Buffer.from([1, 2, 3])));

    const out = await synthesizeNarrationToBuffer("Hello.");
    expect(out.equals(Buffer.from([1, 2, 3]))).toBe(true);
    expect(mockConvert).toHaveBeenCalledWith("v", {
      text: "Hello.",
      modelId: "eleven_multilingual_v2",
    });
  });

  it("throws when env is missing", async () => {
    process.env.ELEVENLABS_API_KEY = "";
    process.env.ELEVENLABS_VOICE_ID = "v";
    await expect(synthesizeNarrationToBuffer("Hi")).rejects.toThrow(
      /ELEVENLABS_API_KEY/,
    );
  });

  it("throws when text is too long", async () => {
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_VOICE_ID = "v";
    await expect(
      synthesizeNarrationToBuffer("x".repeat(5001)),
    ).rejects.toThrow(/maximum length/);
    expect(mockConvert).not.toHaveBeenCalled();
  });

  describe("placeholder mode (ASSEMBLI_PLACEHOLDER_AUDIO=true)", () => {
    beforeEach(() => {
      process.env.ASSEMBLI_PLACEHOLDER_AUDIO = "true";
    });

    it("returns non-empty buffer and does not call ElevenLabs", async () => {
      // Real execFile runs ffmpeg to generate proportional silence
      const childProcess = await import("node:child_process");
      const { execFile: realExecFile } = await vi.importActual<
        typeof import("node:child_process")
      >("node:child_process");
      vi.mocked(childProcess.execFile).mockImplementation(
        realExecFile as typeof childProcess.execFile,
      );

      const out = await synthesizeNarrationToBuffer("Any narration text.");
      expect(out.length).toBeGreaterThan(100);
      expect(mockConvert).not.toHaveBeenCalled();
    });

    it("placeholder buffer is larger for long text than for short text", async () => {
      const childProcess = await import("node:child_process");
      const { execFile: realExecFile } = await vi.importActual<
        typeof import("node:child_process")
      >("node:child_process");
      vi.mocked(childProcess.execFile).mockImplementation(
        realExecFile as typeof childProcess.execFile,
      );

      const shortText = "Hi.";
      const longText = "x".repeat(220); // 220 chars → ceil(220/11) = 20s vs 3s minimum

      const shortBuf = await synthesizeNarrationToBuffer(shortText);
      const longBuf = await synthesizeNarrationToBuffer(longText);

      // Both buffers must be valid (non-empty)
      expect(shortBuf.length).toBeGreaterThan(100);
      expect(longBuf.length).toBeGreaterThan(100);
      // Longer text should produce a larger MP3 (more silence = more bytes)
      expect(longBuf.length).toBeGreaterThan(shortBuf.length);
    });

    it("placeholder returns minimum 3s duration for short text", async () => {
      const childProcess = await import("node:child_process");
      const { execFile: realExecFile } = await vi.importActual<
        typeof import("node:child_process")
      >("node:child_process");
      vi.mocked(childProcess.execFile).mockImplementation(
        realExecFile as typeof childProcess.execFile,
      );

      // Very short text (< 33 chars) should still return a valid buffer (minimum 3s)
      const out = await synthesizeNarrationToBuffer("Ok");
      expect(out.length).toBeGreaterThan(100);
      expect(mockConvert).not.toHaveBeenCalled();
    });

    it("placeholder falls back to silence file when ffmpeg (execFile) fails", async () => {
      const childProcess = await import("node:child_process");
      // Make execFile invoke callback with an error to simulate ffmpeg failure
      vi.mocked(childProcess.execFile).mockImplementation(
        ((_cmd: string, _args: string[], callback: childProcess.ExecFileCallback) => {
          callback(new Error("ffmpeg not found"), "", "");
        }) as typeof childProcess.execFile,
      );

      const out = await synthesizeNarrationToBuffer("Test narration text.");
      // Should fall back to silence-1s.mp3 — still returns a non-empty buffer
      expect(out.length).toBeGreaterThan(100);
      expect(mockConvert).not.toHaveBeenCalled();
    });
  });
});
