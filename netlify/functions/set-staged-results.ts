import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, json, parseBody, serverError, unauthorized } from "./_shared/http";

interface Body {
  sessionId?: string;
  buyMore?: number;
  noThanks?: number;
  review1?: number;
  review2?: number;
  review3?: number;
  review4?: number;
  review5?: number;
}

function isNonNegInt(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0;
}

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId, buyMore, noThanks, review1, review2, review3, review4, review5 } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");

  const counts = [buyMore, noThanks, review1, review2, review3, review4, review5];
  if (!counts.every(isNonNegInt)) {
    return badRequest("Staged counts must be non-negative whole numbers.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("staged_results").upsert({
    session_id: sessionId,
    staged_buy_more: buyMore,
    staged_no_thanks: noThanks,
    staged_review_1: review1,
    staged_review_2: review2,
    staged_review_3: review3,
    staged_review_4: review4,
    staged_review_5: review5,
    updated_at: new Date().toISOString(),
  });

  if (error) return serverError(error.message);
  return json(200, { ok: true });
};
