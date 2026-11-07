import { getSupabaseAdmin } from "./supabaseAdmin";
import { hashToken } from "./tokens";

/**
 * Confirms that (participantId, sessionToken) genuinely belong together and
 * to the given session. Every student-facing function calls this before
 * touching reviews, spins or purchase decisions — a participant can only
 * ever act as themselves.
 */
export async function verifyParticipant(
  sessionId: string,
  participantId: string,
  sessionToken: string
): Promise<boolean> {
  if (!sessionId || !participantId || !sessionToken) return false;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("participants")
    .select("id, session_token_hash")
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !data) return false;
  return data.session_token_hash === hashToken(sessionToken);
}
