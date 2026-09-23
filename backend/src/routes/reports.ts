import { Router } from "express";
import { prepare } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

/**
 * Report a user (e.g. suspected fake cards, no-show, harassment). v1 just
 * records reports for manual review — no automated moderation/blocking
 * flow yet.
 */
reportsRouter.post("/", (req: AuthedRequest, res) => {
  const { reportedUserId, reason, details } = req.body as { reportedUserId?: number; reason?: string; details?: string };
  if (!reportedUserId || !reason) return res.status(400).json({ error: "reportedUserId and reason are required" });

  const info = prepare(`INSERT INTO reports (reporter_id, reported_user_id, reason, details) VALUES (?, ?, ?, ?)`)
    .run(req.userId, reportedUserId, reason, details ?? null);
  res.status(201).json(prepare(`SELECT * FROM reports WHERE id = ?`).get(info.lastInsertRowid));
});
