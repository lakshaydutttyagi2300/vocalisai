// Admin-tunable weights for how much each category contributes to a mock
// test's overall Readiness score. Deliberately NOT imported by
// scoring-engine.ts (that module stays a pure function you can call with
// an explicit weights map, for testability) - callers fetch the current
// weights here and pass them in. Missing row = weight 1, so a fresh
// database behaves exactly like the old plain average until an admin
// changes something.

import { db } from "@/lib/db";

const DEFAULT_WEIGHT = 1;
const MIN_WEIGHT = 0;
const MAX_WEIGHT = 5;

export function isValidWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= MIN_WEIGHT && value <= MAX_WEIGHT;
}

export async function getCategoryWeights(categories: readonly string[]): Promise<Record<string, number>> {
  const rows = await db.scoringCategoryWeight.findMany({ where: { category: { in: [...categories] } } });
  const byCategory = new Map(rows.map((r) => [r.category, r.weight]));
  const result: Record<string, number> = {};
  for (const c of categories) result[c] = byCategory.get(c) ?? DEFAULT_WEIGHT;
  return result;
}

export interface CategoryWeightView {
  category: string;
  weight: number;
  updatedAt: string | null;
}

export async function getAllCategoryWeights(categories: readonly string[]): Promise<CategoryWeightView[]> {
  const rows = await db.scoringCategoryWeight.findMany({ where: { category: { in: [...categories] } } });
  const byCategory = new Map(rows.map((r) => [r.category, r]));
  return categories.map((c) => {
    const row = byCategory.get(c);
    return { category: c, weight: row?.weight ?? DEFAULT_WEIGHT, updatedAt: row?.updatedAt.toISOString() ?? null };
  });
}
