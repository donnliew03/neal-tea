import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { verifyParticipant } from "./_shared/participantAuth";
import { badRequest, conflict, json, parseBody, serverError, unauthorized } from "./_shared/http";

interface Body {
  sessionId?: string;
  participantId?: string;
  sessionToken?: string;
  rating?: number;
}

export const handler: Handler = async (event) => {
  const { sessionId, participantId, sessionToken, rating } = parseBody<Body>(event);

  if (!sessionId || !participantId || !sessionToken) return badRequest("Missing session info.");
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    return badRequest("Please choose a rating from 1 to 5 stars.");
  }

  const ok = await verifyParticipant(sessionId, participantId, sessionToken);
  if (!ok) return unauthorized("Your session has ended.");

  const supabase = getSupabaseAdmin();

  const { data: session } = await supabase
    .from("sessions")
    .select("stage")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.stage !== "reviews_open") {
    return conflict("Reviews aren't open right now.", "wrong_stage");
  }

  const { error } = await supabase.from("reviews").insert({
    session_id: sessionId,
    participant_id: participantId,
    rating,
  });

  if (error) {
    if (error.code === "23505") {
      return conflict("You've already submitted a review.", "already_submitted");
    }
    return serverError(error.message);
  }

  return json(200, { ok: true });
};
