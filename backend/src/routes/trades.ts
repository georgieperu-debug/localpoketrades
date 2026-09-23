import { Router } from "express";
import { prepare } from "../db";
import { MatchRow, TradeRow } from "../types";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const tradesRouter = Router();
tradesRouter.use(requireAuth);

function assertParticipant(match: MatchRow | undefined, myId: number): match is MatchRow {
  return !!match && (match.user_a === myId || match.user_b === myId);
}

/**
 * Meetup confirmation: either side opens (or reuses) a trade for the
 * match and marks their side confirmed. Once both sides have confirmed,
 * the trade is marked complete and both users can leave a rating — mirrors
 * the "both parties tap trade completed" flow from the spec. No
 * payment/escrow here by design (cut for v1).
 */
tradesRouter.post("/matches/:matchId/confirm", (req: AuthedRequest, res) => {
  const match = prepare(`SELECT * FROM matches WHERE id = ?`).get(req.params.matchId) as MatchRow | undefined;
  if (!assertParticipant(match, req.userId!)) return res.status(404).json({ error: "Not found" });

  let trade = prepare(`SELECT * FROM trades WHERE match_id = ? AND completed_at IS NULL`).get(match.id) as TradeRow | undefined;
  if (!trade) {
    const info = prepare(`INSERT INTO trades (match_id) VALUES (?)`).run(match.id);
    trade = prepare(`SELECT * FROM trades WHERE id = ?`).get(info.lastInsertRowid) as TradeRow;
  }

  const isUserA = req.userId === match.user_a;
  prepare(`UPDATE trades SET ${isUserA ? "confirmed_by_a" : "confirmed_by_b"} = 1 WHERE id = ?`).run(trade.id);
  trade = prepare(`SELECT * FROM trades WHERE id = ?`).get(trade.id) as TradeRow;

  if (trade.confirmed_by_a && trade.confirmed_by_b && !trade.completed_at) {
    prepare(`UPDATE trades SET completed_at = datetime('now') WHERE id = ?`).run(trade.id);
    trade = prepare(`SELECT * FROM trades WHERE id = ?`).get(trade.id) as TradeRow;
  }

  res.json(trade);
});

tradesRouter.get("/matches/:matchId", (req: AuthedRequest, res) => {
  const match = prepare(`SELECT * FROM matches WHERE id = ?`).get(req.params.matchId) as MatchRow | undefined;
  if (!assertParticipant(match, req.userId!)) return res.status(404).json({ error: "Not found" });

  const trades = prepare(`SELECT * FROM trades WHERE match_id = ? ORDER BY created_at DESC`).all(match.id);
  res.json(trades);
});
