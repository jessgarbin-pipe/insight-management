import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify an HMAC-SHA256 signature against a payload.
 */
export function verifyHmacSha256(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Reject requests with timestamps older than maxAgeSeconds (default 5 minutes).
 */
export function isTimestampValid(
  timestampSeconds: number,
  maxAgeSeconds = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timestampSeconds) <= maxAgeSeconds;
}

/**
 * Standard JSON error response for webhook endpoints.
 */
export function webhookError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard 200 OK response for webhook endpoints.
 */
export function webhookOk(data?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}
