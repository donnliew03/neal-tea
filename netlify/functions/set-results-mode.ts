import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, json, parseBody, serverError, unauthorized } from "./_shared/http";

interface Body {
  sessionId?: string;
  mode?: string;
}

// Deliberately NOT gated by game_config.locked — unlike prize odds, this
// switch is meant to be flipped live while actually presenting the
// ethical_reveal stage, long after the first spin has already locked the
// odds.
export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId, mode } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");
  if (mode !== "actual" && mode !== "staged") return badRequest("Invalid results mode.");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("game_config")
    .update({ results_mode: mode, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  if (error) return serverError(error.message);
  return json(200, { ok: true });
};
