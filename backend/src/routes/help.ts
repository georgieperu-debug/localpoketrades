import { Router } from "express";

export const helpRouter = Router();

// Static for v1 — no auth required, no CMS. Content lives in code so it
// ships with the app; move to a real CMS/DB if it needs non-dev editing.
const ARTICLES = [
  {
    slug: "spotting-fake-cards",
    title: "How to spot a fake Pokémon card",
    body: [
      "Light test: genuine cards have a black layer inside that blocks light. Hold the card up to a bright light/torch from behind — if you can clearly see through it (especially an Energy symbol-shaped glow), it's likely fake.",
      "Texture and font: official cards have a consistent card stock texture and precise font/kerning. Fakes often feel glossy, waxy, or too thin/thick, and text is sometimes slightly misaligned or the wrong weight.",
      "Colour accuracy: compare against official images for that exact set/print. Washed-out or oversaturated colours, especially on energy symbols and card borders, are a common tell.",
      "Card back: the Pokémon TCG card back has a specific blue tone and consistent print quality. Faded, blurry, or off-colour backs are a red flag.",
      "Weight and cut: genuine cards have a consistent weight and precisely cut, sharp corners. Fakes are frequently a bit lighter and less precisely cut.",
      "Ask for more photos before you meet: front, back, and an edge-on shot showing the card stock. A genuine seller won't mind.",
      "If in doubt, meet in a public place, inspect the card in hand before completing the trade, and use the in-app report button if something feels off — don't complete a trade you're not confident in.",
    ],
  },
];

helpRouter.get("/articles", (_req, res) => {
  res.json(ARTICLES.map(({ slug, title }) => ({ slug, title })));
});

helpRouter.get("/articles/:slug", (req, res) => {
  const article = ARTICLES.find((a) => a.slug === req.params.slug);
  if (!article) return res.status(404).json({ error: "Not found" });
  res.json(article);
});
