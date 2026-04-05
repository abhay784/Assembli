import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { RenderInput } from "../../lib/render/schema";

// ─── Isometric projection ────────────────────────────────────────────────────
const ISO_DX = 0.55;
const ISO_DY = 0.28;

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

type PartType = RenderInput["steps"][number]["parts"][number];
type StepType = RenderInput["steps"][number];

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
function isoVertices(cx: number, cy: number, w: number, h: number, d: number) {
  const hw = w / 2;
  const hh = h / 2;
  const dx = d * ISO_DX;
  const dy = d * ISO_DY;

  return {
    front: [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw, cy + hh],
      [cx - hw, cy + hh],
    ],
    top: [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw + dx, cy - hh - dy],
      [cx - hw + dx, cy - hh - dy],
    ],
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

// ─── Animation position data ─────────────────────────────────────────────────
interface AnimPos {
  x: number;
  y: number;
  prog: number;
  opacity: number;
  sinkProgress: number; // 0-1 for screws sinking into holes
}

/**
 * Compute animated positions for ALL parts in a step.
 *
 * Three animation modes:
 * 1. Default: spring from off-screen offset to final (x,y)
 * 2. Screws with insertionTarget: start at screw's (x,y), travel to the target hole, then sink in
 * 3. Parts with connectsTo: fly in, then slide toward their target in phase 2
 */
function computeAllPositions(
  parts: PartType[],
  frame: number,
): Map<string, AnimPos> {
  const posMap = new Map<string, AnimPos>();
  const partsById = new Map<string, PartType>();
  parts.forEach((p) => partsById.set(p.id, p));

  // First pass: compute positions for non-screw parts (targets must exist before screws resolve holes)
  parts.forEach((part, partIndex) => {
    const shape = part.shape ?? inferShape(part.label);
    if (part.insertionTarget && (shape === "screw" || shape === "dowel")) return; // handle in pass 2

    const isScrew = shape === "screw" || shape === "dowel";
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

    const relX = part.x / CANVAS_W - 0.5;
    const fromX = relX * 200;
    const fromY = isScrew ? -80 : -120;

    const x = interpolate(prog, [0, 1], [part.x + fromX, part.x]);
    const y = interpolate(prog, [0, 1], [part.y + fromY, part.y]);

    posMap.set(part.id, { x, y, prog, opacity, sinkProgress: 0 });
  });

  // Second pass: connectsTo parts — slide toward their target
  parts.forEach((part, partIndex) => {
    if (!part.connectsTo) return;
    const target = partsById.get(part.connectsTo);
    if (!target) return;

    const stagger = partIndex === 0 ? 0 : 8 + partIndex * 10;
    const adjFrame = Math.max(0, frame - stagger);
    const basePos = posMap.get(part.id)!;

    const slideProg = interpolate(adjFrame, [40, 80], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    if (slideProg > 0) {
      const slideX = interpolate(slideProg, [0, 1], [0, (target.x - part.x) * 0.3]);
      const slideY = interpolate(slideProg, [0, 1], [0, (target.y - part.y) * 0.3]);

      posMap.set(part.id, {
        ...basePos,
        x: basePos.x + slideX * basePos.prog,
        y: basePos.y + slideY * basePos.prog,
      });
    }
  });

  // Third pass: screws with insertionTarget — travel from screw (x,y) to hole position on target
  parts.forEach((part, partIndex) => {
    const shape = part.shape ?? inferShape(part.label);
    if (!part.insertionTarget || (shape !== "screw" && shape !== "dowel")) return;

    const stagger = partIndex === 0 ? 0 : 8 + partIndex * 10;
    const adjFrame = Math.max(0, frame - stagger);

    // Slower spring for screws — gives time to see them travel
    const prog = spring({
      frame: adjFrame,
      fps: FPS,
      config: { damping: 18, stiffness: 80, mass: 1.2 },
    });

    const opacity = interpolate(adjFrame, [0, 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Resolve hole destination
    const target = partsById.get(part.insertionTarget.targetPartId);
    let destX = part.x;
    let destY = part.y;

    if (target) {
      const tgtPos = posMap.get(target.id);
      if (tgtPos) {
        // Final destination = target part's animated position + hole offset
        const hi = part.insertionTarget.holeIndex;
        if (hi != null && target.holes && target.holes[hi]) {
          destX = tgtPos.x + target.holes[hi].hx;
          destY = tgtPos.y + target.holes[hi].hy;
        } else {
          destX = tgtPos.x;
          destY = tgtPos.y;
        }
      }
    }

    // Screw starts at its own (x,y) and travels to the hole.
    // If Claude placed the fastener at/near the hole instead of above it,
    // auto-compute a sensible starting position using the insertion angle.
    let startX = part.x;
    let startY = part.y;
    const distToHole = Math.sqrt((part.x - destX) ** 2 + (part.y - destY) ** 2);
    if (distToHole < 30) {
      // Offset backward from the hole in the direction opposite to insertion
      const angleRad = (part.insertionTarget.angle * Math.PI) / 180;
      const offsetDist = 90;
      startX = destX + Math.sin(angleRad) * offsetDist;
      startY = destY - Math.cos(angleRad) * offsetDist;
    }
    const x = interpolate(prog, [0, 1], [startX, destX]);
    const y = interpolate(prog, [0, 1], [startY, destY]);

    // Sink phase: after arriving, screw pushes further into the hole
    const sinkProgress = interpolate(adjFrame, [30, 60], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    posMap.set(part.id, { x, y, prog, opacity, sinkProgress });
  });

  return posMap;
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

// ─── Step frame — compact sidebar + large canvas ────────────────────────────
function StepFrame({
  step,
  stepIndex,
  totalSteps,
  durationInFrames,
}: {
  step: StepType;
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
            padding: "32px 48px 32px 16px",
          }}
        >
          <IsoCanvas step={step} frame={frame} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Left info panel (compact 320px) ────────────────────────���───────────────
function LeftPanel({
  step,
  stepIndex,
  totalSteps,
  frame,
}: {
  step: StepType;
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
        width: 320,
        padding: "36px 24px 32px 40px",
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
          gap: 12,
          marginBottom: 24,
          opacity: badgeAlpha,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(140deg, #3B82F6, #2563EB)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
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
              fontSize: 10,
              fontWeight: 700,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 1,
            }}
          >
            Assembly step
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
            {stepIndex + 1} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 34,
          fontWeight: 800,
          color: "#0F172A",
          lineHeight: 1.1,
          margin: "0 0 14px",
          letterSpacing: "-0.03em",
          opacity: titleAlpha,
        }}
      >
        {step.title}
      </h1>

      {/* Accent rule */}
      <div
        style={{
          width: 44,
          height: 4,
          background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
          borderRadius: 2,
          marginBottom: 16,
          opacity: titleAlpha,
        }}
      />

      {/* Caption */}
      <p
        style={{
          fontSize: 16,
          color: "#4B5563",
          lineHeight: 1.6,
          margin: "0 0 24px",
          fontWeight: 400,
          opacity: bodyAlpha,
        }}
      >
        {step.caption}
      </p>

      {/* Tools */}
      {step.tools.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            marginBottom: step.warnings.length > 0 ? 12 : 0,
            opacity: bodyAlpha,
          }}
        >
          <span
            style={{
              fontSize: 10,
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
                padding: "4px 10px",
                fontSize: 12,
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
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            opacity: bodyAlpha,
          }}
        >
          {step.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: "#92400E",
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rendered canvas size constants (1920×1080 output, 320px sidebar) ────────
const CANVAS_RENDERED_W = 1600;
const CANVAS_RENDERED_H = 800;

// ─── Isometric SVG canvas ────────────────────────────────────────────────────
function IsoCanvas({ step, frame }: { step: StepType; frame: number }) {
  const isBackgroundMode = !!step.backgroundImageUrl;
  const posMap = isBackgroundMode
    ? new Map<string, { x: number; y: number; prog: number; opacity: number; sinkProgress: number }>()
    : computeAllPositions(step.parts, frame);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        maxWidth: CANVAS_W * 1.6,
        maxHeight: CANVAS_H * 1.6,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        boxShadow:
          "0 24px 64px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)",
        position: "relative",
        overflow: "hidden",
        aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
      }}
    >
      {/* Background: manual diagram page (full opacity) or dot grid fallback */}
      {step.backgroundImageUrl ? (
        <Img
          src={step.backgroundImageUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: 1,
          }}
        />
      ) : (
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
      )}

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

      {/* Sprite overlay — only in background mode */}
      {isBackgroundMode && <SpriteOverlayLayer step={step} frame={frame} />}

      {/* SVG isometric rendering — suppressed in background mode */}
      {!isBackgroundMode && <svg
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
          <filter id="holeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="arrowHead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
          </marker>
          <marker
            id="connectArrowHead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#8B5CF6" />
          </marker>
        </defs>

        {/* Layer 0: Connection arrows between combining parts */}
        {step.parts.map((part) => {
          if (!part.connectsTo) return null;
          const srcPos = posMap.get(part.id);
          const tgtPos = posMap.get(part.connectsTo);
          if (!srcPos || !tgtPos) return null;
          return (
            <ConnectionArrow
              key={`conn-${part.id}`}
              srcX={srcPos.x}
              srcY={srcPos.y}
              tgtX={tgtPos.x}
              tgtY={tgtPos.y}
              frame={frame}
            />
          );
        })}

        {/* Layer 1: Non-screw parts (panels, legs, brackets) */}
        {step.parts.map((part, partIndex) => {
          const shape = part.shape ?? inferShape(part.label);
          if (shape === "screw" || shape === "dowel") return null;
          return (
            <IsoPart
              key={part.id}
              part={part}
              partIndex={partIndex}
              frame={frame}
              totalParts={step.parts.length}
              posMap={posMap}
            />
          );
        })}

        {/* Layer 2: Hole markers ON TOP of parts (visible on surface) */}
        {step.parts.map((part) => {
          if (!part.holes || part.holes.length === 0) return null;
          const pos = posMap.get(part.id)!;
          return (
            <HoleMarkers
              key={`holes-${part.id}`}
              part={part}
              cx={pos.x}
              cy={pos.y}
              frame={frame}
            />
          );
        })}

        {/* Layer 3: Insertion arrows (from screw start pos to hole) */}
        {step.parts.map((part) => {
          if (!part.insertionTarget) return null;
          const tgtPart = step.parts.find(
            (p) => p.id === part.insertionTarget!.targetPartId,
          );
          if (!tgtPart) return null;

          const tgtPos = posMap.get(tgtPart.id);
          if (!tgtPos) return null;

          let holeX = tgtPos.x;
          let holeY = tgtPos.y;
          const hi = part.insertionTarget.holeIndex;
          if (hi != null && tgtPart.holes && tgtPart.holes[hi]) {
            holeX = tgtPos.x + tgtPart.holes[hi].hx;
            holeY = tgtPos.y + tgtPart.holes[hi].hy;
          }

          // Use same auto-corrected start position as the animation system
          let srcX = part.x;
          let srcY = part.y;
          const distToHole = Math.sqrt((part.x - holeX) ** 2 + (part.y - holeY) ** 2);
          if (distToHole < 30) {
            const angleRad = (part.insertionTarget.angle * Math.PI) / 180;
            srcX = holeX + Math.sin(angleRad) * 90;
            srcY = holeY - Math.cos(angleRad) * 90;
          }

          return (
            <InsertionArrow
              key={`arrow-${part.id}`}
              srcX={srcX}
              srcY={srcY}
              holeX={holeX}
              holeY={holeY}
              angle={part.insertionTarget.angle}
              labelText={part.insertionTarget.labelText}
              frame={frame}
            />
          );
        })}

        {/* Layer 4: Screw/dowel parts — labels suppressed for insertion targets (grouped below) */}
        {step.parts.map((part, partIndex) => {
          const shape = part.shape ?? inferShape(part.label);
          if (shape !== "screw" && shape !== "dowel") return null;
          return (
            <IsoPart
              key={part.id}
              part={part}
              partIndex={partIndex}
              frame={frame}
              totalParts={step.parts.length}
              posMap={posMap}
              suppressLabel={!!part.insertionTarget}
            />
          );
        })}

        {/* Layer 4.5: Grouped fastener labels — one badge per unique label at hole cluster center */}
        {(() => {
          // Group insertionTarget fasteners by label, find centroid of their holes
          const groups = new Map<string, { holeXs: number[]; holeYs: number[]; count: number }>();
          step.parts.forEach((part) => {
            if (!part.insertionTarget) return;
            const tgtPart = step.parts.find((p) => p.id === part.insertionTarget!.targetPartId);
            if (!tgtPart) return;
            const tgtPos = posMap.get(tgtPart.id);
            if (!tgtPos) return;
            const hi = part.insertionTarget.holeIndex;
            let hx = tgtPos.x;
            let hy = tgtPos.y;
            if (hi != null && tgtPart.holes?.[hi]) {
              hx = tgtPos.x + tgtPart.holes[hi].hx;
              hy = tgtPos.y + tgtPart.holes[hi].hy;
            }
            const existing = groups.get(part.label) ?? { holeXs: [], holeYs: [], count: 0 };
            existing.holeXs.push(hx);
            existing.holeYs.push(hy);
            existing.count++;
            groups.set(part.label, existing);
          });

          const labelAlpha = interpolate(frame, [10, 25], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return Array.from(groups.entries()).map(([label, { holeXs, holeYs, count }]) => {
            const cx = holeXs.reduce((a, b) => a + b, 0) / holeXs.length;
            const cy = holeYs.reduce((a, b) => a + b, 0) / holeYs.length;
            const displayLabel = count > 1 ? `${label} ×${count}` : label;
            return (
              <g key={`flabel-${label}`} opacity={labelAlpha}>
                <text
                  x={cx}
                  y={cy + 28}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
                  fill="#374151"
                >
                  {displayLabel}
                </text>
              </g>
            );
          });
        })()}

        {/* Layer 5: Tool icons */}
        {step.toolIcons?.map((toolIcon, i) => (
          <ToolIcon
            key={`tool-${i}`}
            toolIcon={toolIcon}
            frame={frame}
            index={i}
          />
        ))}

        {/* Layer 6: Detail inset */}
        {step.detailInset && (
          <DetailInset
            inset={step.detailInset}
            parts={step.parts}
            posMap={posMap}
            frame={frame}
          />
        )}
      </svg>}

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

// ─── Sprite overlay layer (background mode) ───────────────────────────────────
function SpriteOverlayLayer({ step, frame }: { step: StepType; frame: number }) {
  const activeParts = step.parts.filter(
    (p) => p.isActiveSprite && p.imageUrl && p.pageXPct != null && p.pageYPct != null,
  );
  if (!activeParts.length) return null;

  // Compute letterbox bounds for objectFit:contain
  const imgW = step.bgImageWidth ?? 794;    // A4 at 96dpi fallback
  const imgH = step.bgImageHeight ?? 1123;
  const imgAspect = imgW / imgH;
  const containerAspect = CANVAS_RENDERED_W / CANVAS_RENDERED_H;

  let displayW: number, displayH: number, offsetX: number, offsetY: number;
  if (imgAspect > containerAspect) {
    // Landscape image — letterboxed (bars top/bottom)
    displayW = CANVAS_RENDERED_W;
    displayH = CANVAS_RENDERED_W / imgAspect;
    offsetX = 0;
    offsetY = (CANVAS_RENDERED_H - displayH) / 2;
  } else {
    // Portrait image — pillarboxed (bars left/right)
    displayH = CANVAS_RENDERED_H;
    displayW = CANVAS_RENDERED_H * imgAspect;
    offsetX = (CANVAS_RENDERED_W - displayW) / 2;
    offsetY = 0;
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {activeParts.map((part) => (
        <ScrewSpriteOverlay
          key={part.id}
          part={part}
          frame={frame}
          displayW={displayW}
          displayH={displayH}
          offsetX={offsetX}
          offsetY={offsetY}
        />
      ))}
    </div>
  );
}

// ─── Animated screw/fastener sprite over background image ─────────────────────
function ScrewSpriteOverlay({
  part,
  frame,
  displayW,
  displayH,
  offsetX,
  offsetY,
}: {
  part: PartType;
  frame: number;
  displayW: number;
  displayH: number;
  offsetX: number;
  offsetY: number;
}) {
  // Destination: hole position in container-pixel coordinates
  const destX = offsetX + ((part.pageXPct ?? 50) / 100) * displayW;
  const destY = offsetY + ((part.pageYPct ?? 50) / 100) * displayH;

  // Start: 15% of display height above the hole
  const liftPx = displayH * 0.15;
  const startY = destY - liftPx;

  // Travel spring — same config as existing screw insertion
  const prog = spring({
    frame,
    fps: FPS,
    config: { damping: 18, stiffness: 80, mass: 1.2 },
  });
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const currentY = interpolate(prog, [0, 1], [startY, destY]);

  // Subtle fastening rotation: one full turn as the screw sinks
  const sinkProg = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rotation = sinkProg * 360;

  // Sprite size: 5% of displayed image width, minimum 24px
  const spriteSize = Math.max(24, displayW * 0.05);

  return (
    <div
      style={{
        position: "absolute",
        left: destX - spriteSize / 2,
        top: currentY - spriteSize / 2,
        width: spriteSize,
        height: spriteSize,
        opacity,
        transform: `rotate(${rotation}deg)`,
        filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.5))",
      }}
    >
      <img
        src={part.imageUrl}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

// ─── Hole markers — bright, pulsing, highlighted ─────────────────────────────
function HoleMarkers({
  part,
  cx,
  cy,
  frame,
}: {
  part: PartType;
  cx: number;
  cy: number;
  frame: number;
}) {
  // Holes appear early and pulse to draw attention
  const holeAlpha = interpolate(frame, [10, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (holeAlpha <= 0 || !part.holes) return null;

  // Pulse: cycles between 0.6 and 1.0 opacity
  const pulse =
    0.8 + 0.2 * Math.sin(((frame - 20) / FPS) * Math.PI * 2.5);

  return (
    <g opacity={holeAlpha}>
      {part.holes.map((hole, i) => {
        const r = hole.radius ?? 6;
        const hx = cx + hole.hx;
        const hy = cy + hole.hy;
        return (
          <g key={i} transform={`translate(${hx}, ${hy})`}>
            {/* Outer glow ring */}
            <circle
              r={r + 4}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={2}
              opacity={pulse * 0.4}
              filter="url(#holeGlow)"
            />
            {/* Filled hole indicator */}
            <circle r={r} fill="#3B82F6" opacity={pulse * 0.25} />
            {/* Solid ring */}
            <circle
              r={r}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={2}
              opacity={pulse * 0.8}
            />
            {/* Center dot */}
            <circle r={1.5} fill="#3B82F6" opacity={pulse} />
            {/* Crosshair lines extending slightly beyond ring */}
            <line
              x1={-(r + 3)}
              y1={0}
              x2={-r + 1}
              y2={0}
              stroke="#3B82F6"
              strokeWidth={1.5}
              opacity={pulse * 0.6}
            />
            <line
              x1={r - 1}
              y1={0}
              x2={r + 3}
              y2={0}
              stroke="#3B82F6"
              strokeWidth={1.5}
              opacity={pulse * 0.6}
            />
            <line
              x1={0}
              y1={-(r + 3)}
              x2={0}
              y2={-r + 1}
              stroke="#3B82F6"
              strokeWidth={1.5}
              opacity={pulse * 0.6}
            />
            <line
              x1={0}
              y1={r - 1}
              x2={0}
              y2={r + 3}
              stroke="#3B82F6"
              strokeWidth={1.5}
              opacity={pulse * 0.6}
            />
          </g>
        );
      })}
    </g>
  );
}

// ─── Connection arrow (for combining parts) ──────────────────────────────────
function ConnectionArrow({
  srcX,
  srcY,
  tgtX,
  tgtY,
  frame,
}: {
  srcX: number;
  srcY: number;
  tgtX: number;
  tgtY: number;
  frame: number;
}) {
  // Appears as parts start to slide (frame 30-50)
  const drawProg = spring({
    frame: Math.max(0, frame - 30),
    fps: FPS,
    config: { damping: 20, stiffness: 100 },
  });

  if (drawProg <= 0.01) return null;

  const midX = (srcX + tgtX) / 2;
  const midY = (srcY + tgtY) / 2;

  // Curved arrow from source toward target
  const dx = tgtX - srcX;
  const dy = tgtY - srcY;
  const perpX = -dy * 0.15;
  const perpY = dx * 0.15;

  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;

  // Don't draw the arrow right to the target — stop partway
  const endX = srcX + dx * 0.65;
  const endY = srcY + dy * 0.65;

  const pathD = `M ${srcX} ${srcY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
  const pathLen = Math.sqrt(dx * dx + dy * dy) * 0.8;
  const dashOffset = interpolate(drawProg, [0, 1], [pathLen, 0]);

  return (
    <g
      opacity={interpolate(drawProg, [0, 0.15], [0, 0.65], {
        extrapolateRight: "clamp",
      })}
    >
      <path
        d={pathD}
        stroke="#8B5CF6"
        strokeWidth={2}
        strokeDasharray="6,4"
        fill="none"
        markerEnd="url(#connectArrowHead)"
        style={{ strokeDashoffset: dashOffset }}
      />
    </g>
  );
}

// ─── Insertion arrow (screw → specific hole) ─────────────────────────────────
function InsertionArrow({
  srcX,
  srcY,
  holeX,
  holeY,
  angle,
  labelText,
  frame,
}: {
  srcX: number;
  srcY: number;
  holeX: number;
  holeY: number;
  angle: number;
  labelText?: string;
  frame: number;
}) {
  const drawProg = spring({
    frame: Math.max(0, frame - 25),
    fps: FPS,
    config: { damping: 20, stiffness: 100 },
  });

  if (drawProg <= 0.01) return null;

  // Arrow from the screw's current position pointing toward the hole
  const dx = holeX - srcX;
  const dy = holeY - srcY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Only show arrow if screw is still some distance from hole
  if (dist < 8) return null;

  // Slight curve perpendicular to the line
  const perpX = -dy * 0.1;
  const perpY = dx * 0.1;

  const midX = (srcX + holeX) / 2 + perpX;
  const midY = (srcY + holeY) / 2 + perpY;

  const pathD = `M ${srcX} ${srcY} Q ${midX} ${midY} ${holeX} ${holeY}`;
  const pathLen = dist * 1.1;
  const dashOffset = interpolate(drawProg, [0, 1], [pathLen, 0]);

  return (
    <g
      opacity={interpolate(drawProg, [0, 0.2], [0, 0.7], {
        extrapolateRight: "clamp",
      })}
    >
      <path
        d={pathD}
        stroke="#3B82F6"
        strokeWidth={2}
        strokeDasharray="6,4"
        fill="none"
        markerEnd="url(#arrowHead)"
        style={{ strokeDashoffset: dashOffset }}
      />
      {labelText && drawProg > 0.5 && (
        <text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill="#3B82F6"
          fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
          opacity={interpolate(drawProg, [0.5, 0.8], [0, 1], {
            extrapolateRight: "clamp",
          })}
        >
          {labelText}
        </text>
      )}
    </g>
  );
}

// ─── Tool icon SVG components ────────────────────────────────────────────────
function ToolIcon({
  toolIcon,
  frame,
  index,
}: {
  toolIcon: NonNullable<StepType["toolIcons"]>[number];
  frame: number;
  index: number;
}) {
  const stagger = 40 + index * 8;
  const prog = spring({
    frame: Math.max(0, frame - stagger),
    fps: FPS,
    config: { damping: 16, stiffness: 120 },
  });

  const opacity = interpolate(prog, [0, 0.4], [0, 0.85], {
    extrapolateRight: "clamp",
  });
  const slideX = interpolate(prog, [0, 1], [-60, 0]);
  const scale = toolIcon.scale ?? 1.0;
  const rot = toolIcon.rotationDeg ?? 0;

  if (prog <= 0.01) return null;

  return (
    <g
      transform={`translate(${toolIcon.x + slideX}, ${toolIcon.y}) rotate(${rot}) scale(${scale})`}
      opacity={opacity}
      filter="url(#hwShadow)"
    >
      {toolIcon.tool === "allen_key" && <AllenKeyIcon />}
      {toolIcon.tool === "phillips_screwdriver" && <PhillipsScrewdriverIcon />}
      {toolIcon.tool === "flat_screwdriver" && <FlatScrewdriverIcon />}
      {toolIcon.tool === "hammer" && <HammerIcon />}
      {toolIcon.tool === "hand" && <HandIcon />}
      <text
        x={0}
        y={45}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill="#64748B"
        fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
      >
        {toolIcon.tool.replace(/_/g, " ")}
      </text>
    </g>
  );
}

function AllenKeyIcon() {
  return (
    <g>
      <path
        d="M -15 0 L 15 0 L 15 -40"
        stroke="#475569"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M -14 -1 L 14 -1 L 14 -38"
        stroke="#94A3B8"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.5}
      />
    </g>
  );
}

function PhillipsScrewdriverIcon() {
  return (
    <g>
      <rect x={-7} y={-35} width={14} height={30} rx={4} fill="#F97316" stroke="#C2410C" strokeWidth={1.5} />
      <line x1={-5} y1={-28} x2={5} y2={-28} stroke="#C2410C" strokeWidth={0.8} opacity={0.5} />
      <line x1={-5} y1={-22} x2={5} y2={-22} stroke="#C2410C" strokeWidth={0.8} opacity={0.5} />
      <line x1={-5} y1={-16} x2={5} y2={-16} stroke="#C2410C" strokeWidth={0.8} opacity={0.5} />
      <rect x={-2.5} y={-5} width={5} height={28} rx={1} fill="#A8B4C2" stroke="#7E8E9E" strokeWidth={1} />
      <line x1={-3} y1={24} x2={3} y2={24} stroke="#5A6A7A" strokeWidth={2} strokeLinecap="round" />
      <line x1={0} y1={21} x2={0} y2={27} stroke="#5A6A7A" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function FlatScrewdriverIcon() {
  return (
    <g>
      <rect x={-7} y={-35} width={14} height={30} rx={4} fill="#FBBF24" stroke="#D97706" strokeWidth={1.5} />
      <rect x={-2.5} y={-5} width={5} height={28} rx={1} fill="#A8B4C2" stroke="#7E8E9E" strokeWidth={1} />
      <rect x={-5} y={23} width={10} height={3} rx={0.5} fill="#7E8E9E" stroke="#5A6A7A" strokeWidth={1} />
    </g>
  );
}

function HammerIcon() {
  return (
    <g>
      <rect x={-3} y={-5} width={6} height={40} rx={2} fill="#D2B48C" stroke="#A08865" strokeWidth={1.5} />
      <rect x={-18} y={-15} width={36} height={14} rx={3} fill="#7E8E9E" stroke="#5A6A7A" strokeWidth={1.5} />
      <rect x={-16} y={-13} width={32} height={3} rx={1} fill="white" opacity={0.2} />
    </g>
  );
}

function HandIcon() {
  return (
    <g>
      <path
        d="M -8 15 L -8 -5 Q -8 -12 -3 -18 L 0 -22 Q 2 -25 5 -22 L 5 -15 L 8 -20 Q 10 -23 13 -20 L 10 -10 L 13 -14 Q 15 -17 18 -14 L 14 -2 L 14 10 Q 14 18 8 22 L -2 22 Q -8 22 -8 15 Z"
        fill="#FDDCB5"
        stroke="#C9956B"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </g>
  );
}

// ─── Detail inset (zoom callout) ─────────────────────────────────────────────
function DetailInset({
  inset,
  parts,
  posMap,
  frame,
}: {
  inset: NonNullable<StepType["detailInset"]>;
  parts: PartType[];
  posMap: Map<string, AnimPos>;
  frame: number;
}) {
  const scaleProg = spring({
    frame: Math.max(0, frame - 50),
    fps: FPS,
    config: { damping: 18, stiffness: 120 },
  });

  if (scaleProg <= 0.01) return null;

  const zoom = inset.zoom ?? 2.5;
  const bubbleR = 55;
  const clipId = `detail-clip-${inset.cx}-${inset.cy}`;
  const scaleVal = interpolate(scaleProg, [0, 1], [0.3, 1]);
  const alpha = interpolate(scaleProg, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <g opacity={alpha}>
      {/* Source region indicator */}
      <circle
        cx={inset.cx}
        cy={inset.cy}
        r={inset.radius}
        fill="none"
        stroke="#334155"
        strokeWidth={1.5}
        strokeDasharray="4,4"
        opacity={0.5}
      />

      {/* Leader line */}
      <line
        x1={inset.cx}
        y1={inset.cy}
        x2={inset.anchorX}
        y2={inset.anchorY}
        stroke="#334155"
        strokeWidth={1.5}
        strokeDasharray="6,4"
        opacity={0.4}
      />

      <g
        transform={`translate(${inset.anchorX}, ${inset.anchorY}) scale(${scaleVal})`}
      >
        <defs>
          <clipPath id={clipId}>
            <circle r={bubbleR} />
          </clipPath>
        </defs>

        <circle r={bubbleR} fill="white" />

        <g clipPath={`url(#${clipId})`}>
          <g
            transform={`scale(${zoom}) translate(${-inset.cx}, ${-inset.cy})`}
          >
            {parts.map((part) => {
              const pos = posMap.get(part.id);
              if (!pos) return null;
              const dx = pos.x - inset.cx;
              const dy = pos.y - inset.cy;
              if (Math.sqrt(dx * dx + dy * dy) > inset.radius * 2.5)
                return null;

              const shape = part.shape ?? inferShape(part.label);
              const material =
                part.material ?? inferMaterial(part.label, shape);
              const colors = MATERIALS[material];
              const defaults = SHAPE_DEFAULTS[shape];
              const w = part.w ?? defaults.w;
              const h = part.h ?? defaults.h;
              const d = part.d ?? defaults.d;

              // Sprite image takes priority over geometric shapes
              if (part.imageUrl) {
                const spriteW = w * 1.2;
                const spriteH = h > 30 ? h * 1.2 : w * 1.2;
                return (
                  <SpriteImage
                    key={`inset-${part.id}`}
                    cx={pos.x}
                    cy={pos.y}
                    w={spriteW}
                    h={spriteH}
                    imageUrl={part.imageUrl}
                    opacity={1}
                    rotation={part.rotationDeg}
                    label=""
                    colors={colors}
                  />
                );
              }

              if (shape === "screw") {
                return (
                  <ScrewShape
                    key={`inset-${part.id}`}
                    cx={pos.x}
                    cy={pos.y}
                    colors={colors}
                    opacity={1}
                    rotation={part.rotationDeg}
                    label=""
                  />
                );
              }

              return (
                <IsoBoxShape
                  key={`inset-${part.id}`}
                  cx={pos.x}
                  cy={pos.y}
                  w={w}
                  h={h}
                  d={d}
                  colors={colors}
                  opacity={1}
                  rotation={part.rotationDeg}
                  label=""
                  showMotion={false}
                  motionFromY={0}
                />
              );
            })}

            {/* Holes in inset */}
            {parts.map((part) => {
              if (!part.holes) return null;
              const pos = posMap.get(part.id);
              if (!pos) return null;
              return part.holes.map((hole, hi) => {
                const r = hole.radius ?? 6;
                return (
                  <g
                    key={`inset-hole-${part.id}-${hi}`}
                    transform={`translate(${pos.x + hole.hx}, ${pos.y + hole.hy})`}
                  >
                    <circle r={r} fill="#3B82F6" opacity={0.25} />
                    <circle
                      r={r}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth={1.5}
                    />
                    <circle r={1.5} fill="#3B82F6" />
                  </g>
                );
              });
            })}
          </g>
        </g>

        <circle r={bubbleR} fill="none" stroke="#334155" strokeWidth={3} />

        <text
          x={0}
          y={bubbleR + 14}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill="#64748B"
          fontFamily="Inter, SF Pro Display, Helvetica Neue, Arial, sans-serif"
          letterSpacing="0.1em"
        >
          DETAIL
        </text>
      </g>
    </g>
  );
}

// ─── Isometric part router ───────────────────────────────────────────────────
function IsoPart({
  part,
  partIndex,
  frame,
  totalParts,
  posMap,
  suppressLabel = false,
}: {
  part: PartType;
  partIndex: number;
  frame: number;
  totalParts: number;
  posMap: Map<string, AnimPos>;
  suppressLabel?: boolean;
}) {
  const shape = part.shape ?? inferShape(part.label);
  const material = part.material ?? inferMaterial(part.label, shape);
  const colors = MATERIALS[material];
  const defaults = SHAPE_DEFAULTS[shape];
  const w = part.w ?? defaults.w;
  const h = part.h ?? defaults.h;
  const d = part.d ?? defaults.d;

  const pos = posMap.get(part.id)!;
  const { x: curX, y: curY, prog, opacity, sinkProgress } = pos;

  // Screw rotation: multi-turn spin
  const stagger = partIndex === 0 ? 0 : 8 + partIndex * 10;
  const adjFrame = Math.max(0, frame - stagger);
  let screwRot = 0;
  if (shape === "screw") {
    const travelSpin = interpolate(adjFrame, [0, 20], [0, 540], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const tightenSpin = interpolate(adjFrame, [20, 50], [0, 360], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    screwRot = travelSpin + tightenSpin;
  }

  const totalRot = part.rotationDeg + screwRot;

  // For screws: apply sink offset (screw moves further in insertion direction after arriving)
  let sinkOffsetX = 0;
  let sinkOffsetY = 0;
  if (sinkProgress > 0 && part.insertionTarget) {
    const angleRad = (part.insertionTarget.angle * Math.PI) / 180;
    const sinkDist = 12 * sinkProgress; // sink 12 units into the hole
    sinkOffsetX = -Math.sin(angleRad) * sinkDist;
    sinkOffsetY = Math.cos(angleRad) * sinkDist;
  }

  const finalX = curX + sinkOffsetX;
  const finalY = curY + sinkOffsetY;

  const fromY = shape === "screw" || shape === "dowel" ? -80 : -120;

  const displayLabel = suppressLabel ? "" : part.label;

  // When a sprite image is available, render it instead of geometric shapes
  if (part.imageUrl) {
    const spriteW = w * 1.2;
    const spriteH = h > 30 ? h * 1.2 : w * 1.2;
    return (
      <SpriteImage
        cx={finalX}
        cy={finalY}
        w={spriteW}
        h={spriteH}
        imageUrl={part.imageUrl}
        opacity={opacity}
        rotation={totalRot}
        label={displayLabel}
        colors={colors}
      />
    );
  }

  if (shape === "screw") {
    return (
      <ScrewShape
        cx={finalX}
        cy={finalY}
        colors={colors}
        opacity={opacity}
        rotation={totalRot}
        label={displayLabel}
      />
    );
  }

  if (shape === "dowel") {
    return (
      <DowelShape
        cx={finalX}
        cy={finalY}
        w={w}
        h={h}
        d={d}
        colors={colors}
        opacity={opacity}
        rotation={totalRot}
        label={displayLabel}
      />
    );
  }

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
      label={displayLabel}
      showMotion={prog < 0.85 && prog > 0.15 && partIndex > 0}
      motionFromY={fromY}
    />
  );
}

// ─── Sprite image (extracted part illustration from manual) ──────────────────
function SpriteImage({
  cx,
  cy,
  w,
  h,
  imageUrl,
  opacity,
  rotation,
  label,
  colors,
}: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  imageUrl: string;
  opacity: number;
  rotation: number;
  label: string;
  colors: (typeof MATERIALS)[MaterialKey];
}) {
  const labelY = h / 2 + 22;

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
      opacity={opacity}
      filter="url(#partShadow)"
    >
      <foreignObject
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={imageUrl}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </foreignObject>

      {label && (
        <>
          <text
            x={0}
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
          <line
            x1={0}
            y1={h / 2 + 2}
            x2={0}
            y2={labelY - 14}
            stroke={colors.stroke}
            strokeWidth={1}
            opacity={0.35}
          />
        </>
      )}
    </g>
  );
}

// ���── Isometric box (panels, legs, brackets) ──────────────────────────────────
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

  const labelY = h / 2 + 22;

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotation})`}
      opacity={opacity}
      filter="url(#partShadow)"
    >
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

      <polygon
        points={pointsStr(verts.right)}
        fill={colors.right}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <polygon
        points={pointsStr(verts.top)}
        fill={colors.top}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <polygon
        points={pointsStr(verts.front)}
        fill={colors.front}
        stroke={colors.stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

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

      {label && (
        <>
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
          <line
            x1={dx / 2}
            y1={h / 2 + 2}
            x2={dx / 2}
            y2={labelY - 14}
            stroke={colors.stroke}
            strokeWidth={1}
            opacity={0.35}
          />
        </>
      )}
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
  const R = 12;
  const shaftLen = 18;

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      opacity={opacity}
      filter="url(#hwShadow)"
    >
      <g transform={`rotate(${rotation})`}>
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
        <circle
          r={R}
          fill={colors.top}
          stroke={colors.stroke}
          strokeWidth={1.5}
        />
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
        <circle
          r={R * 0.3}
          cx={-R * 0.2}
          cy={-R * 0.2}
          fill="white"
          opacity={0.3}
        />
      </g>

      {label && (
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
      )}
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
      <rect
        x={-bodyW * 0.15}
        y={-bodyH / 2 + 2}
        width={bodyW * 0.2}
        height={bodyH - 4}
        fill="white"
        opacity={0.2}
        rx={2}
      />

      {label && (
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
      )}
    </g>
  );
}
