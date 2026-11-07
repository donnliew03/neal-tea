import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { badRequest, conflict, json, parseBody, serverError } from "./_shared/http";
import { generateToken, hashToken } from "./_shared/tokens";

const MAX_PARTICIPANTS = 60; // soft ceiling above the ~50 expected, with headroom

interface JoinBody {
  sessionId?: string;
  nickname?: string;
}

export const handler: Handler = async (event) => {
  const { sessionId, nickname } = parseBody<JoinBody>(event);

  if (!sessionId) return badRequest("Missing session.");
  const trimmed = (nickname ?? "").trim();
  if (!trimmed) return badRequest("Please enter your name or nickname.");
  if (trimmed.length > 24) return badRequest("Nickname is too long (max 24 characters).");

  const supabase = getSupabaseAdmin();

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, is_active")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionErr) return serverError(sessionErr.message);
  if (!session || !session.is_active) {
    return conflict("This session has ended. Please check the screen for a new link.", "session_inactive");
  }

  const { count, error: countErr } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (countErr) return serverError(countErr.message);
  if ((count ?? 0) >= MAX_PARTICIPANTS) {
    return conflict("This session is full.", "session_full");
  }

  const { data: config, error: configErr } = await supabase
    .from("game_config")
    .select("free_spins_per_participant")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (configErr) return serverError(configErr.message);

  const token = generateToken();
  const tokenHash = hashToken(token);

  // Basic sanitisation: strip control characters; rendering is also safely
  // escaped by React on the client (no dangerouslySetInnerHTML anywhere),
  // so this is defence-in-depth rather than the only protection.
  const safeNickname = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");

  const { data: participant, error: insertErr } = await supabase
    .from("participants")
    .insert({ session_id: sessionId, nickname: safeNickname, session_token_hash: tokenHash })
    .select("id")
    .single();
  if (insertErr || !participant) return serverError(insertErr?.message);

  const freeSpins = config?.free_spins_per_participant ?? 2;
  const { error: balanceErr } = await supabase.from("spin_balances").insert({
    participant_id: participant.id,
    session_id: sessionId,
    free_spins_remaining: freeSpins,
    extra_spins_remaining: 0,
    total_spins_used: 0,
  });
  if (balanceErr) return serverError(balanceErr.message);

  return json(200, {
    participantId: participant.id,
    sessionToken: token,
    freeSpinsRemaining: freeSpins,
    extraSpinsRemaining: 0,
  });
};
