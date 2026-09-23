import { Router } from "express";
import { prepare } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { findCandidates } from "../services/matchEngine";
import { SwipeDirection } from "../types";

export const swipesRouter = Router();
swipesRouter.use(requireAuth);

/** The swipe deck: nearby users with complementary have/want overlap, mutual-interest-first. */
swipesRouter.get("/candidates", (req: AuthedRequest, res) => {
  res.json(findCandidates(req.userId!));
});

/**
 * Record a like/pass. A mutual like (both sides liked each other) opens a
 * match + chat thread, Bumble-style — swiping alone never messages anyone.
 */
swipesRouter.post("/", (req: AuthedRequest, res) => {
  const { targetUserId, direction } = req.body as { targetUserId?: number; direction?: SwipeDirection };
  if (!targetUserId || (direction !== "like" && direction !== "pass")) {
    return res.status(400).json({ error: "targetUserId and direction ('like'|'pass') are required" });
  }
  if (targetUserId === req.userId) return res.status(400).json({ error: "Can't swipe on yourself" });

  try {
    prepare(`INSERT INTO swipes (user_id, target_user_id, direction) VALUES (?, ?, ?)`).run(req.userId, targetUserId, direction);
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Already swiped on this user" });
    }
    throw err;
  }

  if (direction === "pass") return res.json({ matched: false });

  const reciprocal = prepare(`SELECT id FROM swipes WHERE user_id = ? AND target_user_id = ? AND direction = 'like'`)
    .get(targetUserId, req.userId);

  if (!reciprocal) return res.json({ matched: false });

  const [userA, userB] = [req.userId!, targetUserId].sort((a, b) => a - b);
  prepare(`INSERT OR IGNORE INTO matches (user_a, user_b) VALUES (?, ?)`).run(userA, userB);
  const match = prepare(`SELECT id FROM matches WHERE user_a = ? AND user_b = ?`).get(userA, userB) as { id: number };

  res.json({ matched: true, matchId: match.id });
});
