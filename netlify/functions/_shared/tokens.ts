import { randomBytes, createHash } from "crypto";

/** Cryptographically secure, URL-safe opaque token for participant sessions. */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Cryptographically secure float in [0, 1), suitable for weighted prize
 * selection. Uses 32 bits of randomness from the OS CSPRNG — never
 * Math.random() for anything that decides a prize outcome.
 */
export function secureRandom01(): number {
  const buf = randomBytes(4);
  return buf.readUInt32BE(0) / 0x100000000;
}
