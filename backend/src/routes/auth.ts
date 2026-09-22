import { Router } from "express";
import { db } from "../db";
import { UserRow } from "../types";
import { issueOtp, verifyOtp } from "../services/otp";
import { geocodePostcode, InvalidPostcodeError } from "../services/geo";
import { signToken } from "../middleware/requireAuth";

export const authRouter = Router();

function publicUser(u: UserRow) {
  const { id, display_name, postcode, radius_miles, bio, email_verified, phone_verified } = u;
  return { id, displayName: display_name, postcode, radiusMiles: radius_miles, bio, emailVerified: !!email_verified, phoneVerified: !!phone_verified };
}

/** Step 1 of registering or logging in: send a code to the given email. */
authRouter.post("/request-code", (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email is required" });

  issueOtp(email.toLowerCase().trim(), "email");
  res.json({ ok: true });
});

/**
 * Step 2 for a brand-new user: verify the code and create the profile in
 * one call. Requires a UK postcode (geocoded server-side — the app never
 * needs precise GPS) so radius-based matching has something to work with.
 */
authRouter.post("/register", async (req, res) => {
  const { email, code, displayName, postcode, radiusMiles, bio } = req.body as {
    email?: string;
    code?: string;
    displayName?: string;
    postcode?: string;
    radiusMiles?: number;
    bio?: string;
  };

  if (!email || !code || !displayName || !postcode) {
    return res.status(400).json({ error: "email, code, displayName and postcode are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!verifyOtp(normalizedEmail, "email", code)) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normalizedEmail);
  if (existing) return res.status(409).json({ error: "An account with this email already exists — use /login instead" });

  let coords;
  try {
    coords = await geocodePostcode(postcode);
  } catch (err) {
    if (err instanceof InvalidPostcodeError) return res.status(400).json({ error: err.message });
    throw err;
  }

  const info = db
    .prepare(
      `INSERT INTO users (email, email_verified, display_name, postcode, lat, lng, radius_miles, bio)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?)`
    )
    .run(normalizedEmail, displayName.trim(), postcode.trim().toUpperCase(), coords.lat, coords.lng, radiusMiles ?? 15, bio ?? null);

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid) as UserRow;
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

/** For a returning user: verify the code and issue a fresh token. */
authRouter.post("/login", (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email || !code) return res.status(400).json({ error: "email and code are required" });

  const normalizedEmail = email.toLowerCase().trim();
  if (!verifyOtp(normalizedEmail, "email", code)) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalizedEmail) as UserRow | undefined;
  if (!user) return res.status(404).json({ error: "No account with this email — use /register instead" });

  res.json({ token: signToken(user.id), user: publicUser(user) });
});
