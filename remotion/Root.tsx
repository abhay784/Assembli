import type React from "react";
import { Composition } from "remotion";
import { AssemblySteps } from "./compositions/AssemblySteps";
import { mockScene } from "../lib/scene/mock";

/** Mock-only pacing; Phase 3 ties frames to audio duration. */
const FRAMES_PER_STEP = 90;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="assembly-mock"
      component={AssemblySteps}
      durationInFrames={mockScene.steps.length * FRAMES_PER_STEP}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={mockScene}
    />
  );
};
