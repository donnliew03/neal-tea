import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, json, serverError, unauthorized, parseBody } from "./_shared/http";
import { DEFAULT_PRIZES, DEFAULT_FREE_SPINS } from "../../src/lib/types";

interface Body {
  sessionId?: string;
  mode?: "new_session" | "clear_participation";
}

// Resetting always creates a brand-new session row rather than mutating
// participant/spin/review data in place. This guarantees a prior test run's
// votes, spins and balances can never bleed into the live classroom run —
// they simply belong to a different, now-inactive session_id.
export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");

  const supabase = getSupabaseAdmin();

  const { error: deactivateErr } = await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("id", sessionId);
  if (deactivateErr) return serverError(deactivateErr.message);

  const { data: newSession, error } = await supabase
    .from("sessions")
    .insert({ is_active: true, stage: "welcome", reveal_step: 0 })
    .select()
    .single();
  if (error || !newSession) return serverError(error?.message);

  const { error: configErr } = await supabase.from("game_config").insert({
    session_id: newSession.id,
    prizes: DEFAULT_PRIZES,
    free_spins_per_participant: DEFAULT_FREE_SPINS,
    purchase_offer_enabled: true,
    locked: false,
  });
  if (configErr) return serverError(configErr.message);

  return json(200, { session: newSession });
};
