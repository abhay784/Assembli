import type { SceneJSON } from "./schema";

/**
 * Parse a quantity hint from part labels like "Screws (×4)", "Bolts x2", "(6)".
 */
export function parseSuggestedQuantity(label: string): number {
  const timesSign = /\u00d7\s*(\d+)/i;
  const xNum = /[xX]\s*(\d+)/;
  const parensTimes = /\(\s*\u00d7\s*(\d+)\s*\)/i;
  const parensX = /\(\s*[xX]\s*(\d+)\s*\)/;
  const parensPlain = /\(\s*(\d+)\s*\)/;

  for (const re of [parensTimes, parensX, timesSign, xNum, parensPlain]) {
    const m = label.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1) return Math.min(n, 999);
    }
  }
  return 1;
}

/**
 * Removes trailing part-instance suffixes: "Dowel 1", "dowel_2", "dowel3", "Pin #4".
 * Requires ≥3 letters before glued digits (avoids stripping "m6"-style tokens).
 */
function stripTrailingInstanceSuffix(s: string, letterRe: string): string {
  let out = s;
  let prev = "";
  const sepThenDigits = /(?:\s+|_+|-+|\s*#\s*)\d+$/u;
  const gluedWordDigits = new RegExp(`(${letterRe}{3,})\\d+$`, "iu");
  while (out !== prev) {
    prev = out;
    out = out.replace(sepThenDigits, "").trim();
    out = out.replace(gluedWordDigits, "$1").trim();
  }
  return out;
}

/**
 * Key for merging rows that describe the same hardware (e.g. "Screw" / "Screws (×4)",
 * "Dowel 1" / "dowel2" / "Dowel_3").
 * Trims, lowercases, strips trailing "(...)", strips trailing indices, then folds
 * simple trailing plurals for single-token labels ("screws" → "screw"). Skips folding
 * when the token ends in "ss" (e.g. "glass").
 */
export function inventoryMergeKey(label: string): string {
  const t = label.trim().toLowerCase();
  let noParen = t.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  noParen = stripTrailingInstanceSuffix(noParen, "[a-z]");
  if (
    !noParen.includes(" ") &&
    noParen.length > 2 &&
    noParen.endsWith("s") &&
    !noParen.endsWith("ss")
  ) {
    return noParen.slice(0, -1);
  }
  return noParen;
}

function slugFromMergeKey(mergeKey: string): string {
  const s = mergeKey.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return s.length > 0 ? s : "part";
}

function displayLabelForGroup(labels: string[]): string {
  if (labels.length === 0) return "";
  const rows = labels.map((raw) => {
    const t = raw.trim();
    const noParen = t.replace(/\s*\([^)]*\)\s*$/u, "").trim();
    const display = stripTrailingInstanceSuffix(noParen, "[a-zA-Z]");
    return { raw: t, noParen, display };
  });
  rows.sort(
    (a, b) =>
      a.display.length - b.display.length ||
      a.noParen.length - b.noParen.length,
  );
  return rows[0]?.display ?? "";
}

export type AggregatedPart = {
  /** Stable id for UI state (from merge key) */
  id: string;
  label: string;
  suggestedQty: number;
};

/**
 * Merges parts that describe the same piece (see inventoryMergeKey).
 * Quantity uses max( sum of counts for "unit" rows, sum of pack-sized rows ) so
 * "Screws (×4)" plus four diagram "Screw" rows resolves to 4, not 8.
 */
export function aggregateParts(scene: SceneJSON): AggregatedPart[] {
  const groups = new Map<
    string,
    { labels: string[]; packSum: number; unitRows: number }
  >();

  for (const step of scene.steps) {
    for (const part of step.parts) {
      const key = inventoryMergeKey(part.label);
      const q = parseSuggestedQuantity(part.label);
      const g = groups.get(key) ?? { labels: [], packSum: 0, unitRows: 0 };
      g.labels.push(part.label);
      if (q > 1) {
        g.packSum += q;
      } else {
        g.unitRows += 1;
      }
      groups.set(key, g);
    }
  }

  return [...groups.entries()].map(([mergeKey, g]) => ({
    id: `inv-${slugFromMergeKey(mergeKey)}`,
    label: displayLabelForGroup(g.labels),
    suggestedQty: Math.max(g.packSum, g.unitRows),
  }));
}

/**
 * Unique tool names across all steps, stable order (first seen).
 */
export function aggregateTools(scene: SceneJSON): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const step of scene.steps) {
    for (const t of step.tools) {
      const key = t.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
