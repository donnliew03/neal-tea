import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { badRequest, json, serverError, parseBody } from "./_shared/http";
import { computeReviewAggregate, computePurchaseAggregate, DEFAULT_PRIZES, type PrizeDef } from "../../src/lib/types";

interface Body {
  sessionId?: string;
}

// Public, but gated server-side by the session's current stage — this is
// what actually enforces "students must not see aggregate results before
// the presenter reveals them". Hiding a chart in the frontend is not
// enough on its own; this function refuses to return real numbers unless
// the session has genuinely moved into the matching reveal stage.
export const handler: Handler = async (event) => {
  const { sessionId } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");

  const supabase = getSupabaseAdmin();
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("stage, reveal_step")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionErr) return serverError(sessionErr.message);
  if (!session) return json(200, { reviews: null, purchases: null, odds: null });

  const stage = session.stage as string;
  const result: { reviews: unknown; purchases: unknown; odds: unknown } = {
    reviews: null,
    purchases: null,
    odds: null,
  };

  if (stage === "reviews_reveal" || stage === "spin_open" || stage === "spin_reveal" || stage === "ethical_reveal") {
    const { data: reviewRows } = await supabase.from("reviews").select("rating").eq("session_id", sessionId);
    result.reviews = computeReviewAggregate((reviewRows ?? []).map((r) => r.rating));
  }

  if (stage === "spin_reveal" || stage === "ethical_reveal") {
    const { data: purchaseRows } = await supabase.from("purchase_decisions").select("decision").eq("session_id", sessionId);
    const { count: offeredCandidates } = await supabase
      .from("spin_balances")
      .select("participant_id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("free_spins_remaining", 0);
    const decisions = (purchaseRows ?? []).map((p) => p.decision as "buy_more" | "no_thanks");
    result.purchases = computePurchaseAggregate(decisions, offeredCandidates ?? 0);
  }

  if (stage === "ethical_reveal" && (session.reveal_step as number) >= 1) {
    const { data: config } = await supabase
      .from("game_config")
      .select("prizes")
      .eq("session_id", sessionId)
      .maybeSingle();
    const prizes: PrizeDef[] = (config?.prizes as PrizeDef[]) ?? DEFAULT_PRIZES;
    const total = prizes.reduce((s, p) => s + p.weight, 0);
    result.odds = prizes.map((p) => ({ id: p.id, label: p.label, pct: Math.round((p.weight / total) * 1000) / 10 }));
  }

  if (stage === "ethical_reveal" && (session.reveal_step as number) >= 2) {
    const { data: staged } = await supabase.from("staged_results").select("*").eq("session_id", sessionId).maybeSingle();
    if (staged && (staged.staged_buy_more > 0 || staged.staged_no_thanks > 0)) {
      const total = staged.staged_buy_more + staged.staged_no_thanks;
      (result as any).stagedPurchases = {
        buyMorePct: total === 0 ? 0 : Math.round((staged.staged_buy_more / total) * 1000) / 10,
        noThanksPct: total === 0 ? 0 : Math.round((staged.staged_no_thanks / total) * 1000) / 10,
      };
    }
  }

  return json(200, result);
};
