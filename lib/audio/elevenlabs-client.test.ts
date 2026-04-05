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
});
