import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

const MAX_CHARS = 5000;

/** ~1s silent MP3 committed under remotion/public — used as fallback when ffmpeg unavailable. */
const PLACEHOLDER_SILENCE = path.join("remotion", "public", "silence-1s.mp3");

function isPlaceholderNarration(): boolean {
  const v = process.env.ASSEMBLI_PLACEHOLDER_AUDIO?.toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Generate a silent MP3 whose duration is proportional to the narration text length.
 *
 * Formula: Math.max(3, Math.ceil(text.length / 11)) seconds
 * (~130 WPM speaking rate, ~5 chars/word → ~11 chars/sec)
 *
 * Falls back to reading PLACEHOLDER_SILENCE when ffmpeg is unavailable or fails.
 */
async function generateProportionalSilence(text: string): Promise<Buffer> {
  const durationSec = Math.max(3, Math.ceil(text.length / 11));
  const outputPath = path.join(
    os.tmpdir(),
    `assembli-silence-${process.pid}-${Date.now()}.mp3`,
  );

  try {
    if (!ffmpegPath) {
      throw new Error("ffmpeg-static binary path is not available");
    }

    await execFileAsync(ffmpegPath, [
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=mono",
      "-t",
      String(durationSec),
      "-acodec",
      "libmp3lame",
      "-q:a",
      "9",
      outputPath,
    ]);

    const buf = await fs.readFile(outputPath);
    return buf;
  } catch {
    // Fallback: return static 1s silence file
    const silencePath = path.join(process.cwd(), PLACEHOLDER_SILENCE);
    try {
      const buf = await fs.readFile(silencePath);
      if (buf.length === 0) {
        throw new Error("empty fallback silence file");
      }
      return buf;
    } catch (fallbackErr) {
      throw new Error(
        `generateProportionalSilence: ffmpeg failed and could not read fallback ${silencePath}: ${fallbackErr}`,
      );
    }
  } finally {
    // Clean up temp file — swallow errors to avoid masking real failures
    await fs.unlink(outputPath).catch(() => {});
  }
}

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
  if (text.trim().length === 0) {
    throw new Error("Narration text is empty");
  }
  if (text.length > MAX_CHARS) {
    throw new Error("Narration text exceeds maximum length");
  }

  if (isPlaceholderNarration()) {
    return generateProportionalSilence(text);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey?.trim() || !voiceId?.trim()) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set");
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
