import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const MAX_CHARS = 5000;

async function readableStreamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function synthesizeNarrationToBuffer(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey?.trim() || !voiceId?.trim()) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set");
  }
  if (text.trim().length === 0) {
    throw new Error("Narration text is empty");
  }
  if (text.length > MAX_CHARS) {
    throw new Error("Narration text exceeds maximum length");
  }

  const client = new ElevenLabsClient({ apiKey });
  const stream = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: "eleven_multilingual_v2",
  });

  const buffer = await readableStreamToBuffer(stream);
  if (buffer.length === 0) {
    throw new Error("ElevenLabs returned empty audio");
  }
  return buffer;
}
