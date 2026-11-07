import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { requireAdmin } from "./_shared/adminAuth";
import { badRequest, json, serverError, unauthorized, parseBody } from "./_shared/http";

const VALID_STAGES = [
  "welcome",
  "reviews_open",
  "reviews_reveal",
  "spin_open",
  "spin_reveal",
  "ethical_reveal",
];

interface Body {
  sessionId?: string;
  stage?: string;
  revealStep?: number;
}

export const handler: Handler = async (event) => {
  const admin = await requireAdmin(event);
  if (!admin) return unauthorized("Admin login required.");

  const { sessionId, stage, revealStep } = parseBody<Body>(event);
  if (!sessionId || !stage) return badRequest("Missing session or stage.");
  if (!VALID_STAGES.includes(stage)) return badRequest("Invalid stage.");
  if (revealStep !== undefined && (revealStep < 0 || revealStep > 3)) {
    return badRequest("Invalid reveal step.");
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { stage };
  if (revealStep !== undefined) update.reveal_step = revealStep;
  else if (stage !== "ethical_reveal") update.reveal_step = 0;

  const { data, error } = await supabase
    .from("sessions")
    .update(update)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) return serverError(error.message);
  return json(200, { session: data });
};
