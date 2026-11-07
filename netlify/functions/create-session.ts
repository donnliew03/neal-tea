import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { json, unauthorized, serverError } from "./_shared/http";
import { DEFAULT_PRIZES, DEFAULT_FREE_SPINS } from "../../src/lib/types";

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const supabase = getSupabaseAdmin();

  // Deactivate any currently active session first (there is only ever one
  // active session at a time).
  const { error: deactivateErr } = await supabase
    .from("sessions")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateErr) return serverError(deactivateErr.message);

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ is_active: true, stage: "welcome", reveal_step: 0 })
    .select()
    .single();
  if (error || !session) return serverError(error?.message);

  const { error: configErr } = await supabase.from("game_config").insert({
    session_id: session.id,
    prizes: DEFAULT_PRIZES,
    free_spins_per_participant: DEFAULT_FREE_SPINS,
    purchase_offer_enabled: true,
    locked: false,
  });
  if (configErr) return serverError(configErr.message);

  return json(200, { session });
};
