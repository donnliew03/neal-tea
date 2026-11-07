import type { HandlerEvent } from "@netlify/functions";

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string, code?: string) {
  return json(400, { error: message, code });
}

export function unauthorized(message = "Not authorized.") {
  return json(401, { error: message, code: "unauthorized" });
}

export function conflict(message: string, code?: string) {
  return json(409, { error: message, code });
}

export function serverError(message = "Something went wrong. Please try again.") {
  return json(500, { error: message, code: "server_error" });
}

export function parseBody<T = Record<string, unknown>>(event: HandlerEvent): T {
  try {
    return JSON.parse(event.body ?? "{}") as T;
  } catch {
    return {} as T;
  }
}
