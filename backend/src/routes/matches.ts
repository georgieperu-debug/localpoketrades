import { Router } from "express";
import { prepare } from "../db";
import { MatchRow, MessageRow, UserRow } from "../types";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { uploadChatImage } from "../uploads";

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

function otherUserId(match: MatchRow, myId: number): number {
  return match.user_a === myId ? match.user_b : match.user_a;
}

function assertParticipant(match: MatchRow | undefined, myId: number): match is MatchRow {
  return !!match && (match.user_a === myId || match.user_b === myId);
}

/** My matches, most recently active first, with the other user's basic info. */
matchesRouter.get("/", (req: AuthedRequest, res) => {
  const matches = prepare(`SELECT * FROM matches WHERE user_a = ? OR user_b = ? ORDER BY created_at DESC`)
    .all(req.userId, req.userId) as MatchRow[];

  const withOther = matches.map((m) => {
    const other = prepare(`SELECT id, display_name FROM users WHERE id = ?`).get(otherUserId(m, req.userId!)) as Pick<
      UserRow,
      "id" | "display_name"
    >;
    const lastMessage = prepare(`SELECT body, created_at FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(m.id) as { body: string; created_at: string } | undefined;
    return { id: m.id, otherUser: { id: other.id, displayName: other.display_name }, lastMessage: lastMessage ?? null, createdAt: m.created_at };
  });

  res.json(withOther);
});

matchesRouter.get("/:id/messages", (req: AuthedRequest, res) => {
  const match = prepare(`SELECT * FROM matches WHERE id = ?`).get(req.params.id) as MatchRow | undefined;
  if (!assertParticipant(match, req.userId!)) return res.status(404).json({ error: "Not found" });

  const messages = prepare(`SELECT * FROM messages WHERE match_id = ? ORDER BY created_at ASC`)
    .all(match.id) as MessageRow[];
  res.json(messages);
});

matchesRouter.post("/:id/messages", (req: AuthedRequest, res) => {
  const match = prepare(`SELECT * FROM matches WHERE id = ?`).get(req.params.id) as MatchRow | undefined;
  if (!assertParticipant(match, req.userId!)) return res.status(404).json({ error: "Not found" });

  const { body } = req.body as { body?: string };
  if (!body?.trim()) return res.status(400).json({ error: "body is required" });

  const info = prepare(`INSERT INTO messages (match_id, sender_id, body) VALUES (?, ?, ?)`)
    .run(match.id, req.userId, body.trim());
  const message = prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json(message);
});

/**
 * Send a photo in chat — e.g. a card someone's asking the other party to
 * inspect before agreeing to meet up. Stored on local disk under
 * backend/uploads/ and served statically; fine for this stage, but worth
 * knowing it doesn't survive a redeploy without persistent disk if this
 * ever moves to real hosting.
 */
matchesRouter.post("/:id/messages/image", uploadChatImage.single("image"), (req: AuthedRequest, res) => {
  const match = prepare(`SELECT * FROM matches WHERE id = ?`).get(req.params.id) as MatchRow | undefined;
  if (!assertParticipant(match, req.userId!)) return res.status(404).json({ error: "Not found" });
  if (!req.file) return res.status(400).json({ error: "image is required" });

  const imageUrl = `/uploads/${req.file.filename}`;
  const info = prepare(`INSERT INTO messages (match_id, sender_id, body, image_url) VALUES (?, ?, ?, ?)`)
    .run(match.id, req.userId, "", imageUrl);
  const message = prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json(message);
});
