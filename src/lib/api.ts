// Thin client for calling Netlify Functions. All sensitive/game logic lives
// server-side in netlify/functions/*; the frontend only ever sends a request
// and renders whatever the server decided.

const BASE = "/.netlify/functions";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call<T>(fn: string, body?: unknown, adminToken?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}/${fn}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError("Connection interrupted. Reconnecting...", 0, "network_error");
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    throw new ApiError(json?.error ?? "Please try again.", res.status, json?.code);
  }
  return json as T;
}

export const api = {
  createSession: (payload: { adminToken: string }) =>
    call<{ session: any }>("create-session", {}, payload.adminToken),

  resetSession: (payload: { adminToken: string; sessionId: string }) =>
    call<{ session: any }>("reset-session", { sessionId: payload.sessionId }, payload.adminToken),

  getActiveSession: () => call<{ session: any | null }>("get-active-session"),

  joinSession: (payload: { sessionId: string; nickname: string }) =>
    call<{ participantId: string; sessionToken: string; freeSpinsRemaining: number; extraSpinsRemaining: number }>(
      "join-session",
      payload
    ),

  submitReview: (payload: {
    sessionId: string;
    participantId: string;
    sessionToken: string;
    rating: number;
  }) => call<{ ok: true }>("submit-review", payload),

  requestSpin: (payload: {
    sessionId: string;
    participantId: string;
    sessionToken: string;
    spinType: "free" | "extra";
    requestId: string;
  }) => call<{ prizeId: string; freeSpinsRemaining: number; extraSpinsRemaining: number; replayed: boolean }>(
    "request-spin",
    payload
  ),

  purchaseDecision: (payload: {
    sessionId: string;
    participantId: string;
    sessionToken: string;
    decision: "buy_more" | "no_thanks";
  }) => call<{ extraSpinGranted: boolean }>("purchase-decision", payload),

  setStage: (payload: { adminToken: string; sessionId: string; stage: string; revealStep?: number }) =>
    call<{ ok: true }>("set-stage", payload, payload.adminToken),

  saveConfig: (payload: { adminToken: string; sessionId: string; prizes: any[]; freeSpins: number; purchaseEnabled: boolean }) =>
    call<{ ok: true }>("save-config", payload, payload.adminToken),

  setStagedResults: (payload: { adminToken: string; sessionId: string; buyMore: number; noThanks: number }) =>
    call<{ ok: true }>("set-staged-results", payload, payload.adminToken),

  getPrivateResults: (payload: { adminToken: string; sessionId: string }) =>
    call<{ reviews: any; purchases: any; spins: any; staged: any; config: any; participantCount: number }>(
      "get-private-results",
      { sessionId: payload.sessionId },
      payload.adminToken
    ),

  getPublicNicknames: (sessionId: string) =>
    call<{ nicknames: string[]; count: number }>("get-public-nicknames", { sessionId }),

  getPublicResults: (sessionId: string) =>
    call<{ reviews: any; purchases: any; odds: any; stagedPurchases?: any }>("get-public-results", { sessionId }),

  getPrizeOdds: (sessionId: string) =>
    call<{ odds: any; available: boolean }>("get-prize-odds", { sessionId }),
};
