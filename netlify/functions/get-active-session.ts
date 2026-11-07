import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { json, serverError } from "./_shared/http";

// Public: returns only the safe, public fields of whichever session is
// currently active (or null). Used by /join and /display on load, and as
// the polling fallback if a Realtime subscription drops.
export const handler: Handler = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, stage, reveal_step, created_at")
    .eq("is_active", true)
    .maybeSingle();

  if (error) return serverError(error.message);
  return json(200, { session: data ?? null });
};
