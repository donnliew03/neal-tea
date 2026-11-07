import { useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_CONFIGURED } from "../lib/supabaseClient";
import { api } from "../lib/api";
import type { Stage } from "../lib/types";

export interface ActiveSessionState {
  id: string | null;
  stage: Stage | null;
  revealStep: number;
  loading: boolean;
  realtimeConnected: boolean;
}

/**
 * Tracks whichever session is currently active, live. Prefers a Supabase
 * Realtime subscription; falls back to polling every 4s if the realtime
 * channel isn't connected (satisfies "a lightweight polling fallback is
 * acceptable if real-time subscriptions temporarily fail").
 */
export function useActiveSession(): ActiveSessionState {
  const [state, setState] = useState<ActiveSessionState>({
    id: null,
    stage: null,
    revealStep: 0,
    loading: true,
    realtimeConnected: false,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refetch() {
    try {
      const { session } = await api.getActiveSession();
      setState((s) => ({
        ...s,
        id: session?.id ?? null,
        stage: session?.stage ?? null,
        revealStep: session?.reveal_step ?? 0,
        loading: false,
      }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  useEffect(() => {
    refetch();

    if (!SUPABASE_CONFIGURED) {
      pollRef.current = setInterval(refetch, 4000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    const channel = supabase
      .channel("sessions-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, (payload) => {
        const row = (payload.new ?? payload.old) as any;
        if (!row) return;
        if (row.is_active) {
          setState((s) => ({
            ...s,
            id: row.id,
            stage: row.stage,
            revealStep: row.reveal_step ?? 0,
            loading: false,
          }));
        } else {
          // The previously-active session was deactivated (reset/new
          // session created) — refetch to pick up whatever is active now.
          refetch();
        }
      })
      .subscribe((status) => {
        setState((s) => ({ ...s, realtimeConnected: status === "SUBSCRIBED" }));
      });

    // Always keep a slow poll running as a safety net even when realtime is
    // connected — cheap, and guarantees the UI can't get permanently stuck
    // if a single realtime event is missed.
    pollRef.current = setInterval(refetch, 6000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
