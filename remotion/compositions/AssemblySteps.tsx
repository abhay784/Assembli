import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import type { RenderInput } from "../../lib/render/schema";

export const AssemblySteps: React.FC<RenderInput> = ({
  steps,
  durationsInFrames,
  audioFiles,
}) => {
  const safeSteps = steps ?? [];

  let from = 0;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {safeSteps.map((step, stepIndex) => {
        const durationInFrames = durationsInFrames[stepIndex];
        const sequenceFrom = from;
        from += durationInFrames;
        return (
          <Sequence
            key={stepIndex}
            from={sequenceFrom}
            durationInFrames={durationInFrames}
          >
            <Audio src={audioFiles[stepIndex]} />
            <StepFrame
              step={step}
              stepIndex={stepIndex}
              totalSteps={safeSteps.length}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

function StepFrame({
  step,
  stepIndex,
  totalSteps,
  durationInFrames,
}: {
  step: RenderInput["steps"][number];
  stepIndex: number;
  totalSteps: number;
  durationInFrames: number;
}) {
  return (
    <AbsoluteFill style={{ padding: 80 }}>
      <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
        Step {stepIndex + 1} of {totalSteps}
      </div>
      <h1 style={{ fontSize: 36, margin: "0 0 16px" }}>{step.title}</h1>
      <p style={{ fontSize: 20, opacity: 0.8, margin: "0 0 40px" }}>
        {step.caption}
      </p>
      <p style={{ fontSize: 12, opacity: 0.45, margin: "-32px 0 40px" }}>
        confidence: {step.confidence.toFixed(2)}
      </p>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1000,
          height: 500,
          margin: "0 auto",
          border: "2px dashed #cbd5e1",
          borderRadius: 12,
          backgroundColor: "#ffffff",
        }}
      >
        {step.parts.map((part) => (
          <AnimatedPart
            key={`${stepIndex}-${part.id}`}
            part={part}
            durationInFrames={durationInFrames}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function AnimatedPart({
  part,
  durationInFrames,
}: {
  part: RenderInput["steps"][number]["parts"][number];
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const fadeEnd = Math.max(1, Math.floor(durationInFrames * 0.2));
  const opacity = interpolate(frame, [0, fadeEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: part.x,
        top: part.y,
        transform: `translate(-50%, -50%) rotate(${part.rotationDeg}deg)`,
        padding: "8px 12px",
        borderRadius: 8,
        backgroundColor: "#e0f2fe",
        border: "1px solid #0ea5e9",
        fontSize: 14,
        fontWeight: 600,
        opacity,
      }}
    >
      {part.label}
    </div>
  );
}
