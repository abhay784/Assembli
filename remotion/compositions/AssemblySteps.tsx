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

// ─── Isometric projection ────────────────────────────────────────────────────
const ISO_DX = 0.55; // depth → horizontal offset
const ISO_DY = 0.28; // depth → vertical offset (up)

// ─── Material color palettes ─────────────────────────────────────────────────
const MATERIALS = {
  wood: {
    top: "#EDD9B5",
    front: "#DEC9A5",
    right: "#C4AA84",
    stroke: "#A08865",
    label: "#5C4A32",
  },
  metal: {
    top: "#C8D0DA",
    front: "#A8B4C2",
    right: "#7E8E9E",
    stroke: "#5A6A7A",
    label: "#374151",
  },
  plastic: {
    top: "#C9E0F0",
    front: "#A8CBE2",
    right: "#78AAC8",
    stroke: "#4A82A4",
    label: "#2C5F7D",
  },
} as const;

type MaterialKey = keyof typeof MATERIALS;

// ─── Default dimensions per shape ────────────────────────────────────────────
const SHAPE_DEFAULTS = {
  panel: { w: 200, h: 14, d: 90 },
  leg: { w: 24, h: 110, d: 24 },
  screw: { w: 16, h: 16, d: 6 },
  dowel: { w: 8, h: 36, d: 8 },
  bracket: { w: 18, h: 18, d: 10 },
} as const;

type ShapeKey = keyof typeof SHAPE_DEFAULTS;

const FPS = 30;
const CANVAS_W = 1000;
const CANVAS_H = 500;

// ─── Inference helpers ───────────────────────────────────────────────────────
function inferShape(label: string): ShapeKey {
  const l = label.toLowerCase();
  if (/screw|bolt|nail|fastener/.test(l)) return "screw";
  if (/dowel|pin|peg/.test(l)) return "dowel";
  if (/leg/.test(l)) return "leg";
  if (/bracket|cam|lock|hinge|fitting/.test(l)) return "bracket";
  return "panel";
}

function inferMaterial(label: string, shape: ShapeKey): MaterialKey {
  if (shape === "screw" || shape === "bracket") return "metal";
  const l = label.toLowerCase();
  if (/metal|steel|iron|aluminum/.test(l)) return "metal";
  if (/plastic|nylon|rubber/.test(l)) return "plastic";
  return "wood";
}

// ─── Isometric box vertex calculator ─────────────────────────────────────────
function isoVertices(
  cx: number,
  cy: number,
  w: number,
  h: number,
  d: number,
) {
  const hw = w / 2;
  const hh = h / 2;
  const dx = d * ISO_DX;
  const dy = d * ISO_DY;

  return {
    // Front face (rectangle — most visible)
    front: [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw, cy + hh],
      [cx - hw, cy + hh],
    ],
    // Top face (parallelogram — extends back-right from top edge)
    top: [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw + dx, cy - hh - dy],
      [cx - hw + dx, cy - hh - dy],
    ],
    // Right face (parallelogram — extends back-right from right edge)
    right: [
      [cx + hw, cy - hh],
      [cx + hw + dx, cy - hh - dy],
      [cx + hw + dx, cy + hh - dy],
      [cx + hw, cy + hh],
    ],
  };
}

function pointsStr(pts: number[][]): string {
  return pts.map((p) => `${p[0]},${p[1]}`).join(" ");
}

// ─── Root composition ────────────────────────────────────────────────────────
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
        const seq = from;
        from += duration;
        return (
          <Sequence key={stepIndex} from={seq} durationInFrames={duration}>
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

// ─── Step frame — left info panel + right isometric canvas ───────────────────
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
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <AbsoluteFill
      style={{ opacity: alpha, transform: `translateY(${slideY}px)` }}
    >
      {/* Top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 7,
          background:
            "linear-gradient(90deg, #3B82F6 0%, #8B5CF6 60%, #06B6D4 100%)",
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
            width: `${progress}%`,
            background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      <div style={{ display: "flex", height: "100%", paddingTop: 10 }}>
        <LeftPanel
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          frame={frame}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "44px 72px 44px 28px",
          }}
        >
          <IsoCanvas step={step} frame={frame} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Left info panel ─────────────────────────────────────────────────────────
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
        width: 540,
        padding: "52px 40px 44px 80px",
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
            background: "linear-gradient(140deg, #3B82F6, #2563EB)",
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
          <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
            {stepIndex + 1} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: "#0F172A",
          lineHeight: 1.1,
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
          fontSize: 20,
          color: "#4B5563",
          lineHeight: 1.65,
          margin: "0 0 32px",
          fontWeight: 400,
          opacity: bodyAlpha,
        }}
      >
        {step.caption}
      </p>

      {/* Parts summary */}
      {step.parts.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
            opacity: bodyAlpha,
          }}
        >
          {step.parts.map((part, i) => {
            const shape = part.shape ?? inferShape(part.label);
            const material = part.material ?? inferMaterial(part.label, shape);
            const colors = MATERIALS[material];
            return (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: colors.top,
                  border: `1.5px solid ${colors.stroke}`,
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 13,
                  color: colors.label,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: colors.front,
                    border: `1px solid ${colors.stroke}`,
                    flexShrink: 0,
                  }}
                />
                {part.label}
              </span>
            );
          })}
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
              {tool}
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

// ─── Isometric SVG canvas ────────────────────────────────────────────────────
function IsoCanvas({
  step,
  frame,
}: {
  step: RenderInput["steps"][number];
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
      {/* Blueprint dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          backgroundPosition: "16px 16px",
          opacity: 0.4,
        }}
      />

      {/* Drafting corner marks */}
      {[
        { top: 14, left: 14 },
        { top: 14, right: 14 },
        { bottom: 14, left: 14 },
        { bottom: 14, right: 14 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 16,
            height: 16,
            borderTop: i < 2 ? "2px solid #CBD5E1" : undefined,
            borderBottom: i >= 2 ? "2px solid #CBD5E1" : undefined,
            borderLeft: i % 2 === 0 ? "2px solid #CBD5E1" : undefined,
            borderRight: i % 2 === 1 ? "2px solid #CBD5E1" : undefined,
          }}
        />
      ))}

      {/* SVG isometric diagram */}
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <filter id="partShadow">
            <feDropShadow
              dx="4"
              dy="6"
              stdDeviation="6"
              floodColor="#0F172A"
              floodOpacity="0.12"
            />
          </filter>
          <filter id="hwShadow">
            <feDropShadow
              dx="2"
              dy="3"
              stdDeviation="3"
              floodColor="#0F172A"
              floodOpacity="0.15"
            />
          </filter>
        </defs>

        {step.parts.map((part, partIndex) => (
          <IsoPart
            key={part.id}
            part={part}
            partIndex={partIndex}
            frame={frame}
            totalParts={step.parts.length}
          />
        ))}
      </svg>

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 16,
          fontSize: 10,
          fontWeight: 700,
          color: "#C4D0E0",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
        }}
      >
        Assembly view
      </div>
    </div>
  );
}

// ─── Isometric part router ───────────────────────────────────────────────────
function IsoPart({
  part,
  partIndex,
  frame,
  totalParts,
}: {
  part: RenderInput["steps"][number]["parts"][number];
  partIndex: number;
  frame: number;
  totalParts: number;
}) {
  const shape = part.shape ?? inferShape(part.label);
  const material = part.material ?? inferMaterial(part.label, shape);
  const colors = MATERIALS[material];
  const defaults = SHAPE_DEFAULTS[shape];
  const w = part.w ?? defaults.w;
  const h = part.h ?? defaults.h;
  const d = part.d ?? defaults.d;

  // Stagger: first part appears fast (the "base"), others fly in later
  const stagger = partIndex === 0 ? 0 : 8 + partIndex * 10;
  const adjFrame = Math.max(0, frame - stagger);

  const prog = spring({
    frame: adjFrame,
    fps: FPS,
    config: { damping: 14, stiffness: 150, mass: 1.0 },
  });

  const opacity = interpolate(adjFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Approach direction: parts come from above and slightly lateral
  const relX = part.x / CANVAS_W - 0.5;
  const fromX = relX * 200;
  const fromY = shape === "screw" || shape === "dowel" ? -80 : -120;

  const curX = interpolate(prog, [0, 1], [part.x + fromX, part.x]);
  const curY = interpolate(prog, [0, 1], [part.y + fromY, part.y]);

  // Screw rotation animation
  const screwRot =
    shape === "screw"
      ? interpolate(prog, [0, 1], [180, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  const totalRot = part.rotationDeg + screwRot;

  if (shape === "screw") {
    return (
      <ScrewShape
        cx={curX}
        cy={curY}
        colors={colors}
        opacity={opacity}
        rotation={totalRot}
        label={part.label}
      />
    );
  }

  if (shape === "dowel") {
    return (
      <DowelShape
        cx={curX}
        cy={curY}
        w={w}
        h={h}
        d={d}
        colors={colors}
        opacity={opacity}
        rotation={totalRot}
        label={part.label}
      />
    );
  }

  // Panel, leg, bracket — all render as isometric boxes
  return (
    <IsoBoxShape
      cx={curX}
      cy={curY}
      w={w}
      h={h}
      d={d}
      colors={colors}
      opacity={opacity}
      rotation={totalRot}
      label={part.label}
      showMotion={prog < 0.85 && prog > 0.15 && partIndex > 0}
      motionFromY={fromY}
    />
  );
}

// ─── Isometric box (panels, legs, brackets) ──────────────────────────────────
function IsoBoxShape({
  cx,
  cy,
  w,
  h,
  d,
  colors,
  opacity,
  rotation,
  label,
  showMotion,
  motionFromY,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  d: number;
  colors: (typeof MATERIALS)[MaterialKey];
  opacity: number;
  rotation: number;
  label: string;
  showMotion: boolean;
  motionFromY: number;
}) {
  const verts = isoVertices(0, 0, w, h, d);
  const dx = d * ISO_DX;
  const dy = d * ISO_DY;

  // Label position: below the front face, centered
  const labelY = h / 2 + 22;

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
      opacity={opacity}
      filter="url(#partShadow)"
    >
      {/* Motion trail lines */}
      {showMotion && (
        <>
          <line
            x1={-w * 0.3}
            y1={motionFromY * 0.15}
            x2={-w * 0.3}
            y2={motionFromY * 0.45}
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="4,6"
            opacity={0.4}
          />
          <line
            x1={w * 0.3}
            y1={motionFromY * 0.15}
            x2={w * 0.3}
            y2={motionFromY * 0.45}
            stroke="#94A3B8"
            strokeWidth={1.5}
            strokeDasharray="4,6"
            opacity={0.4}
          />
        </>
      )}

      {/* Right face (darkest — draw first, back of painter order) */}
      <polygon
        points={pointsStr(verts.right)}
        fill={colors.right}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Top face (lightest) */}
      <polygon
        points={pointsStr(verts.top)}
        fill={colors.top}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Front face (main visible) */}
      <polygon
        points={pointsStr(verts.front)}
        fill={colors.front}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Wood grain lines on front face (if wood and large enough) */}
      {colors === MATERIALS.wood && w > 60 && (
        <>
          <line
            x1={-w * 0.35}
            y1={-h * 0.1}
            x2={w * 0.35}
            y2={-h * 0.1}
            stroke={colors.stroke}
            strokeWidth={0.5}
            opacity={0.3}
          />
          <line
            x1={-w * 0.3}
            y1={h * 0.15}
            x2={w * 0.3}
            y2={h * 0.15}
            stroke={colors.stroke}
            strokeWidth={0.5}
            opacity={0.25}
          />
        </>
      )}

      {/* Label */}
      <text
        x={dx / 2}
        y={labelY}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
        fill={colors.label}
        letterSpacing="0.02em"
      >
        {label}
      </text>
      {/* Label connector line */}
      <line
        x1={dx / 2}
        y1={h / 2 + 2}
        x2={dx / 2}
        y2={labelY - 14}
        stroke={colors.stroke}
        strokeWidth={1}
        opacity={0.35}
      />
    </g>
  );
}

// ─── Screw shape ─────────────────────────────────────────────────────────────
function ScrewShape({
  cx,
  cy,
  colors,
  opacity,
  rotation,
  label,
}: {
  cx: number;
  cy: number;
  colors: (typeof MATERIALS)[MaterialKey];
  opacity: number;
  rotation: number;
  label: string;
}) {
  const R = 12; // head radius
  const shaftLen = 18;

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
      opacity={opacity}
      filter="url(#hwShadow)"
    >
      {/* Shaft */}
      <rect
        x={-2.5}
        y={R * 0.4}
        width={5}
        height={shaftLen}
        fill={colors.right}
        stroke={colors.stroke}
        strokeWidth={1}
        rx={1.5}
      />
      {/* Thread lines on shaft */}
      {[0.3, 0.5, 0.7, 0.9].map((t) => (
        <line
          key={t}
          x1={-3.5}
          y1={R * 0.4 + shaftLen * t}
          x2={3.5}
          y2={R * 0.4 + shaftLen * t - 2}
          stroke={colors.stroke}
          strokeWidth={0.7}
          opacity={0.5}
        />
      ))}
      {/* Screw head */}
      <circle
        r={R}
        fill={colors.top}
        stroke={colors.stroke}
        strokeWidth={1.5}
      />
      {/* Phillips cross */}
      <line
        x1={-R * 0.5}
        y1={0}
        x2={R * 0.5}
        y2={0}
        stroke={colors.stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={0}
        y1={-R * 0.5}
        x2={0}
        y2={R * 0.5}
        stroke={colors.stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Highlight */}
      <circle r={R * 0.3} cx={-R * 0.2} cy={-R * 0.2} fill="white" opacity={0.3} />

      {/* Label */}
      <text
        x={0}
        y={R + shaftLen + 18}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
        fill={colors.label}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Dowel shape ─────────────────────────────────────────────────────────────
function DowelShape({
  cx,
  cy,
  w,
  h,
  d,
  colors,
  opacity,
  rotation,
  label,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  d: number;
  colors: (typeof MATERIALS)[MaterialKey];
  opacity: number;
  rotation: number;
  label: string;
}) {
  const bodyW = Math.max(w, 8);
  const bodyH = Math.max(h, 30);

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
      opacity={opacity}
      filter="url(#hwShadow)"
    >
      {/* Dowel body — rounded rectangle (capsule) */}
      <rect
        x={-bodyW / 2}
        y={-bodyH / 2}
        width={bodyW}
        height={bodyH}
        fill={colors.front}
        stroke={colors.stroke}
        strokeWidth={1.5}
        rx={bodyW / 2}
      />
      {/* Ridge lines */}
      {[-0.25, 0, 0.25].map((t) => (
        <line
          key={t}
          x1={-bodyW / 2 + 1}
          y1={t * bodyH}
          x2={bodyW / 2 - 1}
          y2={t * bodyH}
          stroke={colors.stroke}
          strokeWidth={0.7}
          opacity={0.35}
        />
      ))}
      {/* Highlight streak */}
      <rect
        x={-bodyW * 0.15}
        y={-bodyH / 2 + 2}
        width={bodyW * 0.2}
        height={bodyH - 4}
        fill="white"
        opacity={0.2}
        rx={2}
      />

      {/* Label */}
      <text
        x={0}
        y={bodyH / 2 + 18}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
        fill={colors.label}
      >
        {label}
      </text>
    </g>
  );
}
