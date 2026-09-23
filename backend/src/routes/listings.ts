import { Router } from "express";
import { prepare } from "../db";
import { CardListingRow, ListType } from "../types";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getCard } from "../services/pokemonTcgApi";

export const listingsRouter = Router();
listingsRouter.use(requireAuth);

function isListType(v: unknown): v is ListType {
  return v === "have" || v === "want";
}

/** My have and/or want list. ?type=have|want filters to one. */
listingsRouter.get("/", (req: AuthedRequest, res) => {
  const type = req.query.type;
  const rows = isListType(type)
    ? (prepare(`SELECT * FROM card_listings WHERE user_id = ? AND list_type = ? ORDER BY added_at DESC`).all(req.userId, type) as CardListingRow[])
    : (prepare(`SELECT * FROM card_listings WHERE user_id = ? ORDER BY added_at DESC`).all(req.userId) as CardListingRow[]);
  res.json(rows);
});

/** Add a card to my have or want list, snapshotting its current market price. */
listingsRouter.post("/", async (req: AuthedRequest, res) => {
  const { cardId, listType, condition } = req.body as { cardId?: string; listType?: ListType; condition?: string };
  if (!cardId || !isListType(listType)) return res.status(400).json({ error: "cardId and listType ('have'|'want') are required" });

  const card = await getCard(cardId);
  if (!card) return res.status(404).json({ error: "Card not found" });

  try {
    const info = prepare(
        `INSERT INTO card_listings (user_id, list_type, card_id, card_name, set_name, image_url, market_price, condition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.userId, listType, card.id, card.name, card.setName, card.imageUrl, card.marketPrice, condition ?? null);
    const row = prepare(`SELECT * FROM card_listings WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Already on that list" });
    }
    throw err;
  }
});

listingsRouter.delete("/:id", (req: AuthedRequest, res) => {
  const result = prepare(`DELETE FROM card_listings WHERE id = ? AND user_id = ?`).run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});
