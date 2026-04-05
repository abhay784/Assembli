import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

/**
 * `@remotion/media-utils` exposes `getAudioDurationInSeconds`, but it requires `document`
 * (browser-only). In Node we probe duration with the pinned `ffmpeg-static` binary.
 */
export async function getAudioDurationSecondsFromBuffer(
  buffer: Buffer,
): Promise<number> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary path is not available");
  }
  const tmp = path.join(
    os.tmpdir(),
    `assembli-audio-dur-${process.pid}-${Date.now()}.mp3`,
  );
  await fs.writeFile(tmp, buffer);
  try {
    let stderr = "";
    try {
      const result = await execFileAsync(
        ffmpegPath,
        ["-i", tmp, "-f", "null", "-"],
        { maxBuffer: 10 * 1024 * 1024 },
      );
      stderr = result.stderr;
    } catch (err: unknown) {
      const e = err as { stderr?: string };
      stderr = e.stderr ?? "";
    }
    const m = /Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/.exec(stderr);
    if (!m) {
      throw new Error("Could not parse audio duration from ffmpeg output");
    }
    const h = Number(m[1]);
    const min = Number(m[2]);
    const sec = Number(m[3]);
    return h * 3600 + min * 60 + sec;
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

export function secondsToFramesAt30fps(seconds: number): number {
  return Math.max(1, Math.ceil(seconds * 30));
}
