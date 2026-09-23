import { prepare } from "../db";
import { distanceMiles } from "./geo";
import { UserRow, CardListingRow } from "../types";

export interface OverlapCard {
  cardId: string;
  cardName: string;
  imageUrl: string;
  marketPrice: number | null;
}

export interface Candidate {
  user: Pick<UserRow, "id" | "display_name" | "bio">;
  distanceMiles: number;
  /** Cards they have that I want. */
  theyHaveIWant: OverlapCard[];
  /** Cards they want that I have. */
  theyWantIHave: OverlapCard[];
  mutual: boolean;
}

function toOverlapCard(row: CardListingRow): OverlapCard {
  return { cardId: row.card_id, cardName: row.card_name, imageUrl: row.image_url, marketPrice: row.market_price };
}

/**
 * Candidates for the swipe deck: other verified users within my radius
 * whose listings complement mine, ranked mutual-interest-first (both sides
 * have something the other wants) then by total overlap, then by
 * distance. Deliberately doesn't score or gate on "fairness" of value —
 * feedback from local collectors was that rigid value-matching is exactly
 * what makes trading unpleasant. Market prices are only ever shown
 * alongside cards, never used to accept/reject a match here.
 */
export function findCandidates(userId: number, limit = 30): Candidate[] {
  const me = prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as UserRow | undefined;
  if (!me) return [];

  const myWant = prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = 'want'`)
    .all(userId) as CardListingRow[];
  const myHave = prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = 'have'`)
    .all(userId) as CardListingRow[];

  if (myWant.length === 0 && myHave.length === 0) return [];

  const myWantIds = new Set(myWant.map((c) => c.card_id));
  const myHaveIds = new Set(myHave.map((c) => c.card_id));

  const alreadySwiped = new Set(
    (prepare(`SELECT target_user_id FROM swipes WHERE user_id = ?`).all(userId) as { target_user_id: number }[]).map(
      (r) => r.target_user_id
    )
  );

  const otherUsers = prepare(`SELECT * FROM users WHERE id != ? AND email_verified = 1`)
    .all(userId) as UserRow[];

  const candidates: Candidate[] = [];

  for (const other of otherUsers) {
    if (alreadySwiped.has(other.id)) continue;

    const dist = distanceMiles(me, other);
    if (dist > me.radius_miles) continue;

    const otherHave = prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = 'have'`)
      .all(other.id) as CardListingRow[];
    const otherWant = prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = 'want'`)
      .all(other.id) as CardListingRow[];

    const theyHaveIWant = otherHave.filter((c) => myWantIds.has(c.card_id)).map(toOverlapCard);
    const theyWantIHave = otherWant.filter((c) => myHaveIds.has(c.card_id)).map(toOverlapCard);

    if (theyHaveIWant.length === 0 && theyWantIHave.length === 0) continue;

    candidates.push({
      user: { id: other.id, display_name: other.display_name, bio: other.bio },
      distanceMiles: Math.round(dist * 10) / 10,
      theyHaveIWant,
      theyWantIHave,
      mutual: theyHaveIWant.length > 0 && theyWantIHave.length > 0,
    });
  }

  candidates.sort((a, b) => {
    if (a.mutual !== b.mutual) return a.mutual ? -1 : 1;
    const overlapDiff = b.theyHaveIWant.length + b.theyWantIHave.length - (a.theyHaveIWant.length + a.theyWantIHave.length);
    if (overlapDiff !== 0) return overlapDiff;
    return a.distanceMiles - b.distanceMiles;
  });

  return candidates.slice(0, limit);
}
