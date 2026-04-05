import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
} from "remotion";
import type { RenderInput } from "../../lib/render/schema";

// ─── Color palette — each part gets a distinct color with depth shades ─────────
const PALETTE = [
  { face: "#3B82F6", d1: "#2563EB", d2: "#1D4ED8", d3: "#1E40AF" }, // blue
  { face: "#10B981", d1: "#059669", d2: "#047857", d3: "#065F46" }, // emerald
  { face: "#F59E0B", d1: "#D97706", d2: "#B45309", d3: "#92400E" }, // amber
  { face: "#EF4444", d1: "#DC2626", d2: "#B91C1C", d3: "#991B1B" }, // red
  { face: "#8B5CF6", d1: "#7C3AED", d2: "#6D28D9", d3: "#5B21B6" }, // violet
  { face: "#06B6D4", d1: "#0891B2", d2: "#0E7490", d3: "#155E75" }, // cyan
  { face: "#F97316", d1: "#EA580C", d2: "#C2410C", d3: "#9A3412" }, // orange
  { face: "#84766B", d1: "#705F54", d2: "#5D4C42", d3: "#4A3A30" }, // warm brown
] as const;

const FPS = 30;
// Coordinate space: Claude generates x in 0–1000, y in 0–500
const CANVAS_W = 1000;
const CANVAS_H = 500;

// ─── Root composition ──────────────────────────────────────────────────────────
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
        backgroundColor: "#EEF2F7",
        fontFamily:
          '"Inter", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {safeSteps.map((step, stepIndex) => {
        const duration = durationsInFrames[stepIndex];
        const sequenceFrom = from;
        from += duration;
        return (
          <Sequence
            key={stepIndex}
            from={sequenceFrom}
            durationInFrames={duration}
          >
            <Audio src={audioFiles[stepIndex]} />
            <StepFrame
              step={step}
              stepIndex={stepIndex}
              totalSteps={safeSteps.length}
              durationInFrames={duration}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Step frame — layout: left info panel + right assembly canvas ──────────────
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
  const frame = useCurrentFrame();

  const enterSpring = spring({
    frame,
    fps: FPS,
    config: { damping: 20, stiffness: 160 },
  });
  const slideY = interpolate(enterSpring, [0, 1], [48, 0]);
  const alpha = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const progressPct = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <AbsoluteFill
      style={{ opacity: alpha, transform: `translateY(${slideY}px)` }}
    >
      {/* Top accent gradient stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 7,
          background: "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 60%, #06B6D4 100%)",
        }}
      />

      {/* Progress track */}
      <div
        style={{
          position: "absolute",
          top: 7,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: "#D1D9E6",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "flex",
          height: "100%",
          paddingTop: 10,
        }}
      >
        {/* ── Left: step info ── */}
        <LeftPanel
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          frame={frame}
        />

        {/* ── Right: assembly diagram ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "44px 80px 44px 28px",
          }}
        >
          <AssemblyCanvas
            step={step}
            durationInFrames={durationInFrames}
            frame={frame}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Left info panel ───────────────────────────────────────────────────────────
function LeftPanel({
  step,
  stepIndex,
  totalSteps,
  frame,
}: {
  step: RenderInput["steps"][number];
  stepIndex: number;
  totalSteps: number;
  frame: number;
}) {
  // Stagger-in elements
  const badgeAlpha = interpolate(frame, [4, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleAlpha = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyAlpha = interpolate(frame, [14, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 580,
        padding: "52px 44px 44px 80px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Step badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 32,
          opacity: badgeAlpha,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(140deg, #3B82F6 0%, #2563EB 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 800,
            boxShadow: "0 4px 14px rgba(59,130,246,0.45)",
            flexShrink: 0,
          }}
        >
          {stepIndex + 1}
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 2,
            }}
          >
            Assembly step
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#475569",
            }}
          >
            {stepIndex + 1} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 52,
          fontWeight: 800,
          color: "#0F172A",
          lineHeight: 1.08,
          margin: "0 0 18px",
          letterSpacing: "-0.03em",
          opacity: titleAlpha,
        }}
      >
        {step.title}
      </h1>

      {/* Accent rule */}
      <div
        style={{
          width: 52,
          height: 4,
          background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
          borderRadius: 2,
          marginBottom: 22,
          opacity: titleAlpha,
        }}
      />

      {/* Caption */}
      <p
        style={{
          fontSize: 21,
          color: "#4B5563",
          lineHeight: 1.65,
          margin: "0 0 36px",
          fontWeight: 400,
          opacity: bodyAlpha,
        }}
      >
        {step.caption}
      </p>

      {/* Parts count */}
      {step.parts.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: step.tools.length > 0 || step.warnings.length > 0 ? 20 : 0,
            opacity: bodyAlpha,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#94A3B8",
            }}
          />
          <span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 500 }}>
            {step.parts.length} component
            {step.parts.length !== 1 ? "s" : ""} in this step
          </span>
        </div>
      )}

      {/* Tools */}
      {step.tools.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            marginBottom: step.warnings.length > 0 ? 14 : 0,
            opacity: bodyAlpha,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginRight: 2,
            }}
          >
            Tools
          </span>
          {step.tools.map((tool, i) => (
            <span
              key={i}
              style={{
                backgroundColor: "#F8FAFC",
                border: "1.5px solid #CBD5E1",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 14,
                color: "#334155",
                fontWeight: 600,
              }}
            >
              🔧 {tool}
            </span>
          ))}
        </div>
      )}

      {/* Warnings */}
      {step.warnings.length > 0 && (
        <div
          style={{
            backgroundColor: "#FFFBEB",
            border: "1.5px solid #FDE68A",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            opacity: bodyAlpha,
          }}
        >
          {step.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
              <span
                style={{
                  fontSize: 14,
                  color: "#92400E",
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                {w}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assembly canvas — the 2.5D diagram area ───────────────────────────────────
function AssemblyCanvas({
  step,
  durationInFrames,
  frame,
}: {
  step: RenderInput["steps"][number];
  durationInFrames: number;
  frame: number;
}) {
  return (
    <div
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        boxShadow:
          "0 24px 64px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dot-grid blueprint background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, #C4D0E0 1.2px, transparent 1.2px)",
          backgroundSize: "36px 36px",
          backgroundPosition: "18px 18px",
          opacity: 0.55,
        }}
      />

      {/* Subtle corner marks — drafting reference */}
      {[
        { top: 16, left: 16 },
        { top: 16, right: 16 },
        { bottom: 16, left: 16 },
        { bottom: 16, right: 16 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 18,
            height: 18,
            borderTop: i < 2 ? "2px solid #CBD5E1" : undefined,
            borderBottom: i >= 2 ? "2px solid #CBD5E1" : undefined,
            borderLeft: i % 2 === 0 ? "2px solid #CBD5E1" : undefined,
            borderRight: i % 2 === 1 ? "2px solid #CBD5E1" : undefined,
          }}
        />
      ))}

      {/* "Assembly view" watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 18,
          fontSize: 10,
          fontWeight: 700,
          color: "#C4D0E0",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        Assembly view
      </div>

      {/* Parts */}
      {step.parts.map((part, partIndex) => (
        <IsoPart
          key={part.id}
          part={part}
          color={PALETTE[partIndex % PALETTE.length]}
          frame={frame}
          startFrame={partIndex * 9}
          totalParts={step.parts.length}
        />
      ))}
    </div>
  );
}

// ─── Isometric-style part block ────────────────────────────────────────────────
function IsoPart({
  part,
  color,
  frame,
  startFrame,
  totalParts,
}: {
  part: RenderInput["steps"][number]["parts"][number];
  color: (typeof PALETTE)[number];
  frame: number;
  startFrame: number;
  totalParts: number;
}) {
  const adjFrame = Math.max(0, frame - startFrame);

  const progress = spring({
    frame: adjFrame,
    fps: FPS,
    config: { damping: 13, stiffness: 160, mass: 1.0 },
  });

  const opacity = interpolate(adjFrame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Approach direction: parts fly in from above and toward canvas center
  const relX = part.x / CANVAS_W - 0.5; // −0.5 to +0.5
  const fromX = relX * 240;
  const fromY = -130;

  const curX = interpolate(progress, [0, 1], [part.x + fromX, part.x]);
  const curY = interpolate(progress, [0, 1], [part.y + fromY, part.y]);

  // Part block dimensions — scale with label length
  const charCount = part.label.length;
  const W = Math.max(130, Math.min(220, charCount * 12 + 36));
  const H = 54;
  // Extrusion depth creates the 2.5D illusion
  const DX = 10; // right extrusion width
  const DY = 8;  // top extrusion height

  return (
    <div
      style={{
        position: "absolute",
        left: curX,
        top: curY,
        transform: `translate(-50%, -50%) rotate(${part.rotationDeg}deg)`,
        opacity,
      }}
    >
      {/* ── Top extrusion face (lighter, skewed) ── */}
      <div
        style={{
          position: "absolute",
          left: DX * 0.6,
          top: -DY * 0.85,
          width: W - DX * 0.5,
          height: DY,
          backgroundColor: color.d1,
          borderRadius: "6px 6px 0 0",
          transform: "skewX(-14deg)",
          transformOrigin: "bottom left",
        }}
      />

      {/* ── Right extrusion face (darker, skewed) ── */}
      <div
        style={{
          position: "absolute",
          left: W - DX * 0.2,
          top: DY * 0.45,
          width: DX,
          height: H - DY * 0.3,
          backgroundColor: color.d2,
          borderRadius: "0 6px 6px 0",
          transform: "skewY(-14deg)",
          transformOrigin: "top left",
        }}
      />

      {/* ── Main front face ── */}
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          background: `linear-gradient(140deg, ${color.face} 0%, ${color.d1} 100%)`,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Stacked box-shadow creates convincing depth
          boxShadow: [
            `3px 3px 0 ${color.d1}`,
            `6px 6px 0 ${color.d2}`,
            `9px 9px 0 ${color.d3}`,
            `0 18px 40px rgba(0,0,0,0.22)`,
            `inset 0 1px 0 rgba(255,255,255,0.28)`,
          ].join(", "),
          // Offset to visually center the stacked shadows
          transform: "translate(-4px, -4px)",
        }}
      >
        {/* Part label */}
        <span
          style={{
            color: "white",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textShadow: "0 1px 4px rgba(0,0,0,0.35)",
            padding: "0 16px",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {part.label}
        </span>
      </div>

      {/* ── Assembly arrow — shown for non-primary parts (index > 0) ── */}
      {totalParts > 1 && (
        <AssemblyArrow
          frame={adjFrame}
          partX={part.x}
          partY={part.y}
          canvasCX={CANVAS_W / 2}
          canvasCY={CANVAS_H / 2}
        />
      )}
    </div>
  );
}

// ─── Small directional arrow indicating assembly direction ────────────────────
function AssemblyArrow({
  frame,
  partX,
  partY,
  canvasCX,
  canvasCY,
}: {
  frame: number;
  partX: number;
  partY: number;
  canvasCX: number;
  canvasCY: number;
}) {
  const arrowOpacity = interpolate(frame, [18, 28], [0, 0.65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Direction toward canvas center
  const dx = canvasCX - partX;
  const dy = canvasCY - partY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        opacity: arrowOpacity,
        pointerEvents: "none",
      }}
    >
      {/* Arrow shaft */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: -1,
          width: 36,
          height: 2,
          backgroundColor: "#94A3B8",
          borderRadius: 1,
        }}
      />
      {/* Arrowhead */}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: -5,
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: "10px solid #94A3B8",
        }}
      />
    </div>
  );
}
