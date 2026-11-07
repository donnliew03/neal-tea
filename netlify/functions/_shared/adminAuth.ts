import type { HandlerEvent } from "@netlify/functions";
import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * Verifies the Supabase Auth access token sent by the admin dashboard
 * (Authorization: Bearer <token>) and checks the signed-in user's email is
 * in the ADMIN_EMAILS allowlist. Returns the user id on success.
 *
 * A frontend route guard alone is not sufficient — every admin-only Netlify
 * Function calls this before doing anything privileged.
 */
export async function requireAdmin(event: HandlerEvent): Promise<{ userId: string; email: string } | null> {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.email) return null;

  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowList.length === 0) {
    // Fail closed: if nobody configured ADMIN_EMAILS, nobody is admin.
    return null;
  }

  if (!allowList.includes(data.user.email.toLowerCase())) return null;

  return { userId: data.user.id, email: data.user.email };
}
