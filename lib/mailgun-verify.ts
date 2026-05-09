import crypto from "crypto";

export function verifyMailgunWebhook(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string,
): boolean {
  // Reject replayed requests older than 15 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 900) return false;

  const hash = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp.concat(token))
    .digest("hex");

  return hash === signature;
}
