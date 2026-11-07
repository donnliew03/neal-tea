import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, json, serverError, unauthorized, parseBody } from "./_shared/http";
import { computeReviewAggregate, computePurchaseAggregate, DEFAULT_PRIZES, type PrizeDef } from "../../src/lib/types";

interface Body {
  sessionId?: string;
}

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");

  const supabase = getSupabaseAdmin();

  const [
    { data: reviewRows, error: reviewErr },
    { count: participantCount },
    { data: purchaseRows, error: purchaseErr },
    { data: spinRows, error: spinErr },
    { data: staged },
    { data: config },
    { count: offeredCandidates },
  ] = await Promise.all([
    supabase.from("reviews").select("rating").eq("session_id", sessionId),
    supabase.from("participants").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
    supabase.from("purchase_decisions").select("decision").eq("session_id", sessionId),
    supabase.from("spins").select("prize_id, spin_type").eq("session_id", sessionId),
    supabase.from("staged_results").select("*").eq("session_id", sessionId).maybeSingle(),
    supabase.from("game_config").select("prizes, free_spins_per_participant, purchase_offer_enabled, locked, results_mode").eq("session_id", sessionId).maybeSingle(),
    // "Offered" = participants who have exhausted their free spins (a proxy
    // we compute from spin_balances rather than tracking a separate flag).
    supabase
      .from("spin_balances")
      .select("participant_id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("free_spins_remaining", 0),
  ]);

  if (reviewErr || purchaseErr || spinErr) {
    return serverError(reviewErr?.message || purchaseErr?.message || spinErr?.message);
  }

  const reviews = computeReviewAggregate((reviewRows ?? []).map((r) => r.rating));

  const decisions = (purchaseRows ?? []).map((p) => p.decision as "buy_more" | "no_thanks");
  const purchases = computePurchaseAggregate(decisions, offeredCandidates ?? 0);

  const prizes: PrizeDef[] = (config?.prizes as PrizeDef[]) ?? DEFAULT_PRIZES;
  const prizeDistribution: Record<string, number> = {};
  for (const p of prizes) prizeDistribution[p.id] = 0;
  for (const s of spinRows ?? []) {
    if (prizeDistribution[s.prize_id] === undefined) prizeDistribution[s.prize_id] = 0;
    prizeDistribution[s.prize_id]++;
  }

  return json(200, {
    participantCount: participantCount ?? 0,
    reviews,
    purchases,
    spins: {
      total: (spinRows ?? []).length,
      byType: {
        free: (spinRows ?? []).filter((s) => s.spin_type === "free").length,
        extra: (spinRows ?? []).filter((s) => s.spin_type === "extra").length,
      },
      prizeDistribution,
    },
    staged: staged
      ? {
          buyMore: staged.staged_buy_more,
          noThanks: staged.staged_no_thanks,
          review1: staged.staged_review_1,
          review2: staged.staged_review_2,
          review3: staged.staged_review_3,
          review4: staged.staged_review_4,
          review5: staged.staged_review_5,
        }
      : { buyMore: 0, noThanks: 0, review1: 0, review2: 0, review3: 0, review4: 0, review5: 0 },
    config: {
      prizes,
      freeSpins: config?.free_spins_per_participant ?? 2,
      purchaseEnabled: config?.purchase_offer_enabled ?? true,
      locked: config?.locked ?? false,
      resultsMode: config?.results_mode ?? "actual",
    },
  });
};
