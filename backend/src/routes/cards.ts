import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { searchCards, getCard } from "../services/pokemonTcgApi";

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

/**
 * Card search backing both have/want list entry. Proxies the PokemonTCG
 * API, which only indexes individual cards — there's no sealed-product
 * catalogue to search, which is what keeps listings to singles by
 * construction rather than needing a separate "no sealed product" rule.
 */
cardsRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.status(400).json({ error: "q query param is required" });

  const results = await searchCards(q);
  res.json(results);
});

/** Re-fetches a single card for an up-to-date ("live") market price. */
cardsRouter.get("/:cardId", async (req, res) => {
  const card = await getCard(req.params.cardId);
  if (!card) return res.status(404).json({ error: "Not found" });
  res.json(card);
});
