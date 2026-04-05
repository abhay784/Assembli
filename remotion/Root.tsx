import type React from "react";
import { Composition, staticFile } from "remotion";
import { AssemblySteps } from "./compositions/AssemblySteps";
import { mockScene } from "../lib/scene/mock";

export const RemotionRoot: React.FC = () => {
  const defaultDurations = mockScene.steps.map(() => 45);
  const totalFrames = defaultDurations.reduce((a, b) => a + b, 0);

  return (
    <Composition
      id="assembly"
      component={AssemblySteps}
      durationInFrames={totalFrames}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        ...mockScene,
        durationsInFrames: defaultDurations,
        audioFiles: mockScene.steps.map(() => staticFile("silence-1s.mp3")),
      }}
    />
  );
};
