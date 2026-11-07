import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { badRequest, json, serverError, parseBody } from "./_shared/http";
import { DEFAULT_PRIZES, type PrizeDef } from "../../src/lib/types";

interface Body {
  sessionId?: string;
}

// Powers the student-facing "VIEW PRIZE ODDS" control (Part 9.1
// transparency requirement). Available once Lucky Spin has actually
// started, so the odds aren't spoiled during the review experiment.
export const handler: Handler = async (event) => {
  const { sessionId } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");

  const supabase = getSupabaseAdmin();
  const { data: session } = await supabase.from("sessions").select("stage").eq("id", sessionId).maybeSingle();

  const spinStages = ["spin_open", "spin_reveal", "ethical_reveal"];
  if (!session || !spinStages.includes(session.stage)) {
    return json(200, { odds: null, available: false });
  }

  const { data: config, error } = await supabase
    .from("game_config")
    .select("prizes")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) return serverError(error.message);

  const prizes: PrizeDef[] = (config?.prizes as PrizeDef[]) ?? DEFAULT_PRIZES;
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  const odds = prizes.map((p) => ({
    id: p.id,
    label: p.label,
    pct: Math.round((p.weight / total) * 1000) / 10,
  }));

  return json(200, { odds, available: true });
};
