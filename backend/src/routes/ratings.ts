import { Router } from "express";
import { db } from "../db";
import { MatchRow, TradeRow } from "../types";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const ratingsRouter = Router();
ratingsRouter.use(requireAuth);

/** Leave a 1-5 star rating (+ optional written review) for a completed trade's other party. */
ratingsRouter.post("/trades/:tradeId", (req: AuthedRequest, res) => {
  const trade = db.prepare(`SELECT * FROM trades WHERE id = ?`).get(req.params.tradeId) as TradeRow | undefined;
  if (!trade) return res.status(404).json({ error: "Not found" });
  if (!trade.completed_at) return res.status(400).json({ error: "Trade isn't marked complete by both parties yet" });

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(trade.match_id) as MatchRow;
  if (match.user_a !== req.userId && match.user_b !== req.userId) return res.status(404).json({ error: "Not found" });

  const rateeId = match.user_a === req.userId ? match.user_b : match.user_a;
  const { stars, review } = req.body as { stars?: number; review?: string };
  if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: "stars must be an integer 1-5" });

  try {
    const info = db
      .prepare(`INSERT INTO ratings (trade_id, rater_id, ratee_id, stars, review) VALUES (?, ?, ?, ?, ?)`)
      .run(trade.id, req.userId, rateeId, stars, review ?? null);
    res.status(201).json(db.prepare(`SELECT * FROM ratings WHERE id = ?`).get(info.lastInsertRowid));
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Already rated this trade" });
    }
    throw err;
  }
});
