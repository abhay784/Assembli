import type { SceneJSON } from "@/lib/scene/schema";

export type PartsProgressItem = {
  partCode: string;
  partName?: string | null;
  totalRequired: number;
  usedSoFar: number;
  remaining: number;
};

type TotalsEntry = { total: number; partName?: string | null };

/**
 * Sum quantities per partCode across all steps (partsUsed only).
 */
export function aggregateTotalRequiredByPart(
  steps: SceneJSON["steps"],
): Map<string, TotalsEntry> {
  const map = new Map<string, TotalsEntry>();
  for (const step of steps) {
    for (const u of step.partsUsed ?? []) {
      const prev = map.get(u.partCode);
      const nextTotal = (prev?.total ?? 0) + u.quantity;
      const name =
        u.partName !== undefined && u.partName !== null
          ? u.partName
          : prev?.partName;
      map.set(u.partCode, { total: nextTotal, partName: name });
    }
  }
  return map;
}

/**
 * usedSoFar = sum of quantities for completed steps only.
 * remaining = max(totalRequired - usedSoFar, 0).
 */
export function computePartsProgress(
  steps: SceneJSON["steps"],
  completedStepIndices: ReadonlySet<number>,
): PartsProgressItem[] {
  const totals = aggregateTotalRequiredByPart(steps);
  const usedByPart = new Map<string, number>();

  steps.forEach((step, index) => {
    if (!completedStepIndices.has(index)) return;
    for (const u of step.partsUsed ?? []) {
      usedByPart.set(
        u.partCode,
        (usedByPart.get(u.partCode) ?? 0) + u.quantity,
      );
    }
  });

  const items: PartsProgressItem[] = [];
  for (const [partCode, { total, partName }] of totals) {
    const usedSoFar = usedByPart.get(partCode) ?? 0;
    items.push({
      partCode,
      partName,
      totalRequired: total,
      usedSoFar,
      remaining: Math.max(total - usedSoFar, 0),
    });
  }

  items.sort((a, b) => {
    const aDone = a.remaining === 0 ? 1 : 0;
    const bDone = b.remaining === 0 ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.partCode.localeCompare(b.partCode);
  });

  return items;
}

export function hasAnyPartsUsage(steps: SceneJSON["steps"]): boolean {
  return steps.some((s) => (s.partsUsed?.length ?? 0) > 0);
}
