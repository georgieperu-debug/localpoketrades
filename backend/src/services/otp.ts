import { db } from "../db";

const CODE_TTL_MINUTES = 10;

/**
 * Email/phone verification is stubbed for dev: a 6-digit code is generated
 * and stored, but instead of actually sending it, it's logged to the
 * console. Swap this for a real provider before going live — e.g. Twilio
 * Verify for SMS, SendGrid/Postmark for email — keeping the same
 * generate/verify shape so routes/auth.ts doesn't need to change.
 */
export function issueOtp(email: string, channel: "email" | "phone"): void {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  db.prepare(`INSERT INTO otp_codes (email, channel, code, expires_at) VALUES (?, ?, ?, ?)`).run(
    email,
    channel,
    code,
    expiresAt
  );

  // eslint-disable-next-line no-console
  console.log(`[otp] ${channel} code for ${email}: ${code} (expires in ${CODE_TTL_MINUTES}m)`);
}

export function verifyOtp(email: string, channel: "email" | "phone", code: string): boolean {
  const row = db
    .prepare(
      `SELECT id, expires_at FROM otp_codes
       WHERE email = ? AND channel = ? AND code = ? AND consumed = 0
       ORDER BY id DESC LIMIT 1`
    )
    .get(email, channel, code) as { id: number; expires_at: string } | undefined;

  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  db.prepare(`UPDATE otp_codes SET consumed = 1 WHERE id = ?`).run(row.id);
  return true;
}
