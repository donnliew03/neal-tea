// Client-side participant identity continuity.
// localStorage here is NOT the shared classroom database — it only lets a
// student's own browser remember who they already are after a refresh.
// The server is always the source of truth for balances/decisions.

const KEY = "nealtea.participant.v1";

export interface StoredParticipant {
  participantId: string;
  sessionId: string;
  sessionToken: string;
  nickname: string;
  // Local-only UX continuity (never the source of truth — the server
  // re-derives/enforces all of this on every request regardless).
  freeSpinsRemaining?: number;
  extraSpinsRemaining?: number;
  reviewSubmitted?: boolean;
  purchaseDecisionMade?: "buy_more" | "no_thanks";
}

export function loadParticipant(): StoredParticipant | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.participantId === "string" &&
      typeof parsed?.sessionId === "string" &&
      typeof parsed?.sessionToken === "string" &&
      typeof parsed?.nickname === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveParticipant(p: StoredParticipant): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private browsing / storage disabled — the app still works, the
    // student just won't survive a hard refresh mid-session.
  }
}

export function clearParticipant(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
