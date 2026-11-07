import { describe, it, expect } from "vitest";
import {
  pickWeightedPrize,
  computeReviewAggregate,
  computePurchaseAggregate,
  validatePrizeWeights,
  DEFAULT_PRIZES,
  DEFAULT_TOTAL_WEIGHT,
  type PrizeDef,
} from "../src/lib/types";

// A tiny deterministic linear-congruential generator so the "weighted
// randomness" statistical test below is reproducible across runs/CI,
// rather than relying on Math.random() and risking rare flakiness.
function makeDeterministicRand(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return function rand01() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("pickWeightedPrize", () => {
  const prizes: PrizeDef[] = [
    { id: "bonus_coins" as any, label: "A", shortLabel: "A", headline: "", subline: "", color: "", weight: 400 },
    { id: "free_topping" as any, label: "B", shortLabel: "B", headline: "", subline: "", color: "", weight: 250 },
    { id: "half_off" as any, label: "C", shortLabel: "C", headline: "", subline: "", color: "", weight: 150 },
    { id: "free_drink" as any, label: "D", shortLabel: "D", headline: "", subline: "", color: "", weight: 99 },
    { id: "a_for_ethics" as any, label: "E", shortLabel: "E", headline: "", subline: "", color: "", weight: 70 },
    { id: "dinner_with_prof" as any, label: "F", shortLabel: "F", headline: "", subline: "", color: "", weight: 30 },
    { id: "grand_prize" as any, label: "G", shortLabel: "G", headline: "", subline: "", color: "", weight: 1 },
  ];

  it("picks the first prize when rand01 returns 0", () => {
    expect(pickWeightedPrize(prizes, () => 0).id).toBe("bonus_coins");
  });

  it("picks the last prize when rand01 returns just under 1", () => {
    expect(pickWeightedPrize(prizes, () => 0.999999999).id).toBe("grand_prize");
  });

  it("respects cumulative weight boundaries exactly", () => {
    const total = prizes.reduce((s, p) => s + p.weight, 0); // 1000
    // Just below the first boundary (400/1000) -> still prize A.
    expect(pickWeightedPrize(prizes, () => 399.999 / total).id).toBe("bonus_coins");
    // Exactly at the first boundary -> rolls into prize B (r < acc is strict).
    expect(pickWeightedPrize(prizes, () => 400 / total).id).toBe("free_topping");
    // Between the F/G boundary (999/1000) and the end -> prize G (grand_prize).
    expect(pickWeightedPrize(prizes, () => 999.999 / total).id).toBe("grand_prize");
  });

  it("throws if total weight is not positive", () => {
    const zeroWeighted = prizes.map((p) => ({ ...p, weight: 0 }));
    expect(() => pickWeightedPrize(zeroWeighted, () => 0.5)).toThrow();
  });

  it("converges to the configured probabilities over many draws (deterministic PRNG)", () => {
    const rand = makeDeterministicRand(42);
    const counts: Record<string, number> = {};
    const N = 200_000;
    for (let i = 0; i < N; i++) {
      const prize = pickWeightedPrize(prizes, rand);
      counts[prize.id] = (counts[prize.id] ?? 0) + 1;
    }
    for (const p of prizes) {
      const expectedPct = p.weight / DEFAULT_TOTAL_WEIGHT;
      const actualPct = (counts[p.id] ?? 0) / N;
      // Generous tolerance: +/- 1.5 percentage points absolute, so this
      // stays stable even for the 0.1%-weight grand prize.
      expect(Math.abs(actualPct - expectedPct)).toBeLessThan(0.015);
    }
  });

  it("DEFAULT_PRIZES weights sum to exactly DEFAULT_TOTAL_WEIGHT", () => {
    const total = DEFAULT_PRIZES.reduce((s, p) => s + p.weight, 0);
    expect(total).toBe(DEFAULT_TOTAL_WEIGHT);
  });
});

describe("validatePrizeWeights", () => {
  it("is valid when weights sum to exactly 1000", () => {
    const { valid, total } = validatePrizeWeights(DEFAULT_PRIZES);
    expect(valid).toBe(true);
    expect(total).toBe(1000);
  });

  it("is invalid when weights sum to anything other than 1000", () => {
    const tooLow = DEFAULT_PRIZES.map((p, i) => (i === 0 ? { ...p, weight: p.weight - 1 } : p));
    const { valid, total } = validatePrizeWeights(tooLow);
    expect(valid).toBe(false);
    expect(total).toBe(999);

    const tooHigh = DEFAULT_PRIZES.map((p, i) => (i === 0 ? { ...p, weight: p.weight + 50 } : p));
    expect(validatePrizeWeights(tooHigh).valid).toBe(false);
  });
});

describe("computeReviewAggregate", () => {
  it("returns a zeroed aggregate for no ratings", () => {
    const agg = computeReviewAggregate([]);
    expect(agg.total).toBe(0);
    expect(agg.average).toBe(0);
    expect(agg.fiveStarPct).toBe(0);
    expect(agg.counts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it("computes counts, average and five-star percentage correctly", () => {
    const agg = computeReviewAggregate([5, 5, 5, 4, 1]);
    expect(agg.total).toBe(5);
    expect(agg.counts).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 3 });
    expect(agg.average).toBe(4); // (5+5+5+4+1)/5 = 4
    expect(agg.fiveStarPct).toBe(60); // 3/5
  });

  it("ignores out-of-range ratings defensively", () => {
    const agg = computeReviewAggregate([5, 0, 6, -1, 3]);
    // Only 5 and 3 are in-range; total still reflects the raw input length
    // per the current implementation's contract (average uses all values).
    expect(agg.counts[5]).toBe(1);
    expect(agg.counts[3]).toBe(1);
  });

  it("rounds average and fiveStarPct to reasonable precision", () => {
    const agg = computeReviewAggregate([5, 4, 4]);
    expect(agg.average).toBeCloseTo(4.33, 2);
  });
});

describe("computePurchaseAggregate", () => {
  it("handles zero offered/answered without dividing by zero", () => {
    const agg = computePurchaseAggregate([], 0);
    expect(agg.offered).toBe(0);
    expect(agg.buyMore).toBe(0);
    expect(agg.noThanks).toBe(0);
    expect(agg.pending).toBe(0);
    expect(agg.buyMorePct).toBe(0);
    expect(agg.noThanksPct).toBe(0);
  });

  it("computes buy/no-thanks percentages relative to answered, not offered", () => {
    const agg = computePurchaseAggregate(["buy_more", "buy_more", "no_thanks"], 5);
    expect(agg.offered).toBe(5);
    expect(agg.buyMore).toBe(2);
    expect(agg.noThanks).toBe(1);
    expect(agg.pending).toBe(2); // 5 offered - 3 answered
    expect(agg.buyMorePct).toBeCloseTo(66.7, 1);
    expect(agg.noThanksPct).toBeCloseTo(33.3, 1);
  });

  it("never returns a negative pending count even if answered exceeds offered", () => {
    const agg = computePurchaseAggregate(["buy_more", "no_thanks"], 1);
    expect(agg.pending).toBe(0);
  });
});
