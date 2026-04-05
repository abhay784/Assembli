import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import ffmpegStatic from "ffmpeg-static";
import type { RenderInput } from "../lib/render/schema";

// Do not import from Next.js `app/` routes — Remotion bundler/renderer stay worker-only.

export async function renderAssemblyToMp4(params: {
  inputProps: RenderInput;
  outputLocation: string;
}): Promise<void> {
  const binariesDirectory = ffmpegStatic
    ? path.dirname(ffmpegStatic)
    : null;
  const entryPoint = path.join(process.cwd(), "remotion/index.tsx");
  const serveUrl = await bundle({
    entryPoint,
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
    binariesDirectory,
  });
}
