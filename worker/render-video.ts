import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RenderInput } from "../lib/render/schema";

// Do not import from Next.js `app/` routes — Remotion bundler/renderer stay worker-only.
//
// Do not set `binariesDirectory` to `ffmpeg-static`'s folder: Remotion resolves ffmpeg,
// ffprobe, and the `remotion` compositor binary from the *same* directory (@remotion/compositor-*).
// Pointing only at ffmpeg-static makes it look for .../ffmpeg-static/remotion → ENOENT.

export async function renderAssemblyToMp4(params: {
  inputProps: RenderInput;
  outputLocation: string;
}): Promise<void> {
  const entryPoint = path.join(process.cwd(), "remotion/index.tsx");
  const serveUrl = await bundle({
    entryPoint,
    publicDir: "remotion/public",
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl,
    id: "assembly",
    inputProps: params.inputProps,
  });

  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: params.outputLocation,
    inputProps: params.inputProps,
  });
}
