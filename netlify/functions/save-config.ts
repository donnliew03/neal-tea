import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, conflict, json, parseBody, serverError, unauthorized } from "./_shared/http";
import { validatePrizeWeights, type PrizeDef } from "../../src/lib/types";

interface Body {
  sessionId?: string;
  prizes?: PrizeDef[];
  freeSpins?: number;
  purchaseEnabled?: boolean;
}

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId, prizes, freeSpins, purchaseEnabled } = parseBody<Body>(event);
  if (!sessionId || !Array.isArray(prizes) || prizes.length !== 7) {
    return badRequest("Expected exactly seven prizes.");
  }
  if (!Number.isInteger(freeSpins) || (freeSpins as number) < 1 || (freeSpins as number) > 5) {
    return badRequest("Free spins per participant must be between 1 and 5.");
  }

  const { valid, total } = validatePrizeWeights(prizes);
  if (!valid) {
    return badRequest(`Prize probabilities must total exactly 100% (currently ${(total / 10).toFixed(1)}%).`, "invalid_total");
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("game_config")
    .select("locked")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing?.locked) {
    return conflict(
      "Configuration is locked because live spins have already happened this session. Reset the session to change the odds.",
      "config_locked"
    );
  }

  const { error } = await supabase
    .from("game_config")
    .update({
      prizes,
      free_spins_per_participant: freeSpins,
      purchase_offer_enabled: Boolean(purchaseEnabled),
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (error) return serverError(error.message);
  return json(200, { ok: true });
};
