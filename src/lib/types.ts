// Shared types used by both frontend and Netlify Functions.
// Keep this file dependency-free (no supabase-js imports) so it can be
// imported from both the browser bundle and the Netlify Functions bundle.

export type Stage =
  | "welcome"
  | "reviews_open"
  | "reviews_reveal"
  | "spin_open"
  | "spin_reveal"
  | "ethical_reveal";

export type RevealStep = 0 | 1 | 2 | 3; // 0 = not started, 1/2/3 = the three reveal moments

export type PrizeId =
  | "bonus_coins"
  | "free_topping"
  | "half_off"
  | "free_drink"
  | "a_for_ethics"
  | "dinner_with_prof"
  | "grand_prize";

export interface PrizeDef {
  id: PrizeId;
  label: string;
  shortLabel: string;
  headline: string;
  subline: string;
  color: string; // tailwind-ish hex for wheel segment
  weight: number; // integer weight out of total (default total = 1000)
}

// Exact seven prizes and default weights from the spec (Part 8 / Part 9).
// Weights are integers summing to 1000, i.e. 0.1% granularity.
export const DEFAULT_PRIZES: PrizeDef[] = [
  {
    id: "bonus_coins",
    label: "NEAL TEA Bonus Coins",
    shortLabel: "Bonus Coins",
    headline: "YOU WON BONUS COINS!",
    subline: "Every coin counts. Especially for our marketing team.",
    color: "#7fb25d",
    weight: 400,
  },
  {
    id: "free_topping",
    label: "Free Topping",
    shortLabel: "Free Topping",
    headline: "FREE TOPPING UNLOCKED!",
    subline: "Pearls of wisdom. Literally.",
    color: "#c98a4b",
    weight: 250,
  },
  {
    id: "half_off",
    label: "50% Off NEAL TEA",
    shortLabel: "50% Off",
    headline: "HALF-PRICE TEA!",
    subline: "Your wallet approves.",
    color: "#f6a0c3",
    weight: 150,
  },
  {
    id: "free_drink",
    label: "Free NEAL TEA Drink",
    shortLabel: "Free Drink",
    headline: "FREE TEA UNLOCKED!",
    subline: "Finally, something in life is free.",
    color: "#5f9941",
    weight: 99,
  },
  {
    id: "a_for_ethics",
    label: "A for Ethics",
    shortLabel: "A for Ethics",
    headline: "CONGRATULATIONS! YOU GOT AN A FOR ETHICS!",
    subline: "Prof Neal would like to review the terms and conditions.",
    color: "#e8c158",
    weight: 70,
  },
  {
    id: "dinner_with_prof",
    label: "Dinner with Prof Neal",
    shortLabel: "Dinner w/ Prof",
    headline: "YOU WON DINNER WITH PROF NEAL!",
    subline: "One dinner. Unlimited ethical dilemmas.",
    color: "#b06f33",
    weight: 30,
  },
  {
    id: "grand_prize",
    label: "1 Month Free NEAL TEA",
    shortLabel: "1-Month Jackpot",
    headline: "JACKPOT! ONE MONTH OF FREE NEAL TEA!",
    subline: "You absolute legend.",
    color: "#d4a52f",
    weight: 1,
  },
];

export const DEFAULT_TOTAL_WEIGHT = 1000;
export const DEFAULT_FREE_SPINS = 2;

export type ResultsMode = "actual" | "staged";

export interface GameConfig {
  session_id: string;
  prizes: PrizeDef[]; // weights may have been edited by admin, ids/labels fixed
  free_spins_per_participant: number;
  purchase_offer_enabled: boolean;
  locked: boolean;
  results_mode: ResultsMode;
}

export interface PublicPresentationState {
  session_id: string;
  stage: Stage;
  reveal_step: RevealStep;
  updated_at: string;
}

export interface ReviewAggregate {
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
  average: number;
  fiveStarPct: number;
}

export interface PurchaseAggregate {
  offered: number;
  buyMore: number;
  noThanks: number;
  pending: number;
  buyMorePct: number;
  noThanksPct: number;
}

export function emptyReviewAggregate(): ReviewAggregate {
  return { counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0, average: 0, fiveStarPct: 0 };
}

export function computeReviewAggregate(ratings: number[]): ReviewAggregate {
  const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    if (r >= 1 && r <= 5) counts[r as 1 | 2 | 3 | 4 | 5]++;
  }
  const total = ratings.length;
  if (total === 0) return { counts, total: 0, average: 0, fiveStarPct: 0 };
  const sum = ratings.reduce((a, b) => a + b, 0);
  return {
    counts,
    total,
    average: Math.round((sum / total) * 100) / 100,
    fiveStarPct: Math.round((counts[5] / total) * 1000) / 10,
  };
}

export function computePurchaseAggregate(
  decisions: Array<"buy_more" | "no_thanks">,
  offeredCount: number
): PurchaseAggregate {
  const buyMore = decisions.filter((d) => d === "buy_more").length;
  const noThanks = decisions.filter((d) => d === "no_thanks").length;
  const answered = buyMore + noThanks;
  const pending = Math.max(0, offeredCount - answered);
  return {
    offered: offeredCount,
    buyMore,
    noThanks,
    pending,
    buyMorePct: answered === 0 ? 0 : Math.round((buyMore / answered) * 1000) / 10,
    noThanksPct: answered === 0 ? 0 : Math.round((noThanks / answered) * 1000) / 10,
  };
}

/**
 * Deterministic-given-random-source weighted selection.
 * `rand01` must be a function returning a float in [0, 1). Production code
 * supplies a cryptographically secure source; tests inject a fixed sequence.
 */
export function pickWeightedPrize(prizes: PrizeDef[], rand01: () => number): PrizeDef {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) throw new Error("Total prize weight must be positive");
  const r = rand01() * total;
  let acc = 0;
  for (const p of prizes) {
    acc += p.weight;
    if (r < acc) return p;
  }
  return prizes[prizes.length - 1];
}

export function validatePrizeWeights(prizes: PrizeDef[]): { valid: boolean; total: number } {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  // Weights are integers out of 1000 (0.1% granularity).
  return { valid: total === DEFAULT_TOTAL_WEIGHT, total };
}
