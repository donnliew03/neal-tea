import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { verifyParticipant } from "./_shared/participantAuth";
import { secureRandom01 } from "./_shared/tokens";
import { badRequest, conflict, json, parseBody, serverError, unauthorized } from "./_shared/http";
import { pickWeightedPrize, type PrizeDef } from "../../src/lib/types";

interface Body {
  sessionId?: string;
  participantId?: string;
  sessionToken?: string;
  spinType?: "free" | "extra";
  requestId?: string;
}

export const handler: Handler = async (event) => {
  const { sessionId, participantId, sessionToken, spinType, requestId } = parseBody<Body>(event);

  if (!sessionId || !participantId || !sessionToken || !requestId) {
    return badRequest("Missing session info.");
  }
  if (spinType !== "free" && spinType !== "extra") return badRequest("Invalid spin type.");

  const ok = await verifyParticipant(sessionId, participantId, sessionToken);
  if (!ok) return unauthorized("Your session has ended.");

  const supabase = getSupabaseAdmin();

  const { data: session } = await supabase
    .from("sessions")
    .select("stage")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.stage !== "spin_open") {
    return conflict("Lucky Spin isn't open right now.", "wrong_stage");
  }

  const { data: config, error: configErr } = await supabase
    .from("game_config")
    .select("prizes")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (configErr || !config) return serverError(configErr?.message ?? "Missing game configuration.");

  const prizes = config.prizes as PrizeDef[];
  const chosen = pickWeightedPrize(prizes, secureRandom01);

  const { data, error } = await supabase.rpc("consume_spin", {
    p_participant_id: participantId,
    p_session_id: sessionId,
    p_spin_type: spinType,
    p_request_id: requestId,
    p_prize_id: chosen.id,
  });

  if (error) {
    if (error.code === "P0002") return conflict("You're out of free spins.", "no_free_spins");
    if (error.code === "P0003") return conflict("You're out of extra spins.", "no_extra_spins");
    return serverError(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return serverError("Spin did not return a result.");

  if (!row.replayed) {
    // Lock the odds the moment the first genuine spin of the session
    // happens — changing probabilities mid-game would be unfair and the
    // spec explicitly requires locking here.
    await supabase.from("game_config").update({ locked: true }).eq("session_id", sessionId).eq("locked", false);
  }

  return json(200, {
    prizeId: row.prize_id,
    freeSpinsRemaining: row.free_spins_remaining,
    extraSpinsRemaining: row.extra_spins_remaining,
    replayed: row.replayed,
  });
};
