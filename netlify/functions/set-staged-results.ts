import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, json, parseBody, serverError, unauthorized } from "./_shared/http";

interface Body {
  sessionId?: string;
  buyMore?: number;
  noThanks?: number;
}

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId, buyMore, noThanks } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");
  if (!Number.isInteger(buyMore) || !Number.isInteger(noThanks) || (buyMore as number) < 0 || (noThanks as number) < 0) {
    return badRequest("Staged counts must be non-negative whole numbers.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("staged_results").upsert({
    session_id: sessionId,
    staged_buy_more: buyMore,
    staged_no_thanks: noThanks,
    updated_at: new Date().toISOString(),
  });

  if (error) return serverError(error.message);
  return json(200, { ok: true });
};
