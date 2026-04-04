import React from "react";
import { AbsoluteFill, Series } from "remotion";
import type { SceneJSON } from "../../lib/scene/schema";

const FRAMES_PER_STEP = 90;

export const AssemblySteps: React.FC<SceneJSON> = ({ steps }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Series>
        {steps.map((step, stepIndex) => (
          <Series.Sequence durationInFrames={FRAMES_PER_STEP} key={stepIndex}>
            <StepFrame
              step={step}
              stepIndex={stepIndex}
              totalSteps={steps.length}
            />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

function StepFrame({
  step,
  stepIndex,
  totalSteps,
}: {
  step: SceneJSON["steps"][number];
  stepIndex: number;
  totalSteps: number;
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
          <div
            key={`${stepIndex}-${part.id}`}
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
            }}
          >
            {part.label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
