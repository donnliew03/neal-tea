import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { verifyParticipant } from "./_shared/participantAuth";
import { badRequest, conflict, json, parseBody, serverError, unauthorized } from "./_shared/http";

interface Body {
  sessionId?: string;
  participantId?: string;
  sessionToken?: string;
  decision?: "buy_more" | "no_thanks";
}

export const handler: Handler = async (event) => {
  const { sessionId, participantId, sessionToken, decision } = parseBody<Body>(event);

  if (!sessionId || !participantId || !sessionToken) return badRequest("Missing session info.");
  if (decision !== "buy_more" && decision !== "no_thanks") return badRequest("Invalid decision.");

  const ok = await verifyParticipant(sessionId, participantId, sessionToken);
  if (!ok) return unauthorized("Your session has ended.");

  const supabase = getSupabaseAdmin();

  const { data: config } = await supabase
    .from("game_config")
    .select("purchase_offer_enabled")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!config?.purchase_offer_enabled) {
    return conflict("This offer isn't available.", "offer_disabled");
  }

  const { data, error } = await supabase.rpc("record_purchase_decision", {
    p_participant_id: participantId,
    p_session_id: sessionId,
    p_decision: decision,
  });

  if (error) return serverError(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return json(200, { extraSpinGranted: Boolean(row?.extra_spin_granted) });
};
