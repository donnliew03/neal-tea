import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./_shared/supabaseAdmin";
import { badRequest, json, serverError, parseBody } from "./_shared/http";

interface Body {
  sessionId?: string;
}

// Public: nicknames only, for the welcome-screen marquee and the
// participant count. Never returns tokens or any other participant field.
export const handler: Handler = async (event) => {
  const { sessionId } = parseBody<Body>(event);
  if (!sessionId) return badRequest("Missing session.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("participants")
    .select("nickname, joined_at")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true })
    .limit(60);

  if (error) return serverError(error.message);
  return json(200, { nicknames: (data ?? []).map((d) => d.nickname), count: data?.length ?? 0 });
};
