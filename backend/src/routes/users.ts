import { Router } from "express";
import { prepare } from "../db";
import { UserRow, CardListingRow } from "../types";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { geocodePostcode, InvalidPostcodeError } from "../services/geo";
import { issueOtp, verifyOtp } from "../services/otp";

export const usersRouter = Router();
usersRouter.use(requireAuth);

function publicUser(u: UserRow) {
  const { id, display_name, postcode, radius_miles, bio, email_verified, phone_verified } = u;
  return { id, displayName: display_name, postcode, radiusMiles: radius_miles, bio, emailVerified: !!email_verified, phoneVerified: !!phone_verified };
}

usersRouter.get("/me", (req: AuthedRequest, res) => {
  const user = prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId) as UserRow | undefined;
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(publicUser(user));
});

/** Update display name, bio, radius, and/or postcode (re-geocoded if changed). */
usersRouter.patch("/me", async (req: AuthedRequest, res) => {
  const { displayName, bio, radiusMiles, postcode } = req.body as {
    displayName?: string;
    bio?: string;
    radiusMiles?: number;
    postcode?: string;
  };

  const updates: string[] = [];
  const params: unknown[] = [];

  if (displayName !== undefined) {
    updates.push("display_name = ?");
    params.push(displayName.trim());
  }
  if (bio !== undefined) {
    updates.push("bio = ?");
    params.push(bio);
  }
  if (radiusMiles !== undefined) {
    updates.push("radius_miles = ?");
    params.push(radiusMiles);
  }
  if (postcode !== undefined) {
    let coords;
    try {
      coords = await geocodePostcode(postcode);
    } catch (err) {
      if (err instanceof InvalidPostcodeError) return res.status(400).json({ error: err.message });
      throw err;
    }
    updates.push("postcode = ?", "lat = ?", "lng = ?");
    params.push(postcode.trim().toUpperCase(), coords.lat, coords.lng);
  }

  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

  params.push(req.userId);
  prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const user = prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId) as UserRow;
  res.json(publicUser(user));
});

/**
 * Optional phone verification (separate from the email flow used at
 * signup) — same dev-stub OTP delivery, see services/otp.ts.
 */
usersRouter.post("/me/phone/request-code", (req: AuthedRequest, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) return res.status(400).json({ error: "phone is required" });

  const user = prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId) as UserRow;
  prepare(`UPDATE users SET phone = ?, phone_verified = 0 WHERE id = ?`).run(phone.trim(), req.userId);
  issueOtp(user.email, "phone");
  res.json({ ok: true });
});

usersRouter.post("/me/phone/verify", (req: AuthedRequest, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: "code is required" });

  const user = prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId) as UserRow;
  if (!verifyOtp(user.email, "phone", code)) return res.status(400).json({ error: "Invalid or expired code" });

  prepare(`UPDATE users SET phone_verified = 1 WHERE id = ?`).run(req.userId);
  res.json({ ok: true });
});

function publicListing(row: CardListingRow) {
  return {
    cardId: row.card_id,
    cardName: row.card_name,
    setName: row.set_name,
    imageUrl: row.image_url,
    marketPrice: row.market_price,
    marketPriceCurrency: row.market_price_currency,
  };
}

/**
 * Another user's public profile: rating summary and their full have/want
 * lists (not just the overlap Discover shows), so someone can spot a card
 * worth trading for that the match engine didn't surface. Viewable by any
 * authenticated user, not just an existing match — same as everything else
 * this endpoint already returned.
 */
usersRouter.get("/:id", (req: AuthedRequest, res) => {
  const user = prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id) as UserRow | undefined;
  if (!user) return res.status(404).json({ error: "Not found" });

  const ratings = prepare(`SELECT AVG(stars) as avg, COUNT(*) as count FROM ratings WHERE ratee_id = ?`)
    .get(user.id) as { avg: number | null; count: number };

  const haveList = (
    prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = 'have' ORDER BY added_at DESC`).all(
      user.id
    ) as CardListingRow[]
  ).map(publicListing);
  const wantList = (
    prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = 'want' ORDER BY added_at DESC`).all(
      user.id
    ) as CardListingRow[]
  ).map(publicListing);

  res.json({ ...publicUser(user), ratingAverage: ratings.avg, ratingCount: ratings.count, haveList, wantList });
});
