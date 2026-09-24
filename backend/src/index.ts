import "dotenv/config";
import express from "express";
import cors from "cors";
// Side-effect import: makes Express 4 forward rejected promises from async
// route handlers to the error middleware below, instead of the default
// behaviour of an unhandled rejection crashing the whole process. Must be
// imported before any router that has async handlers.
import "express-async-errors";
import "./db";
import { UPLOADS_DIR } from "./uploads";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { cardsRouter } from "./routes/cards";
import { listingsRouter } from "./routes/listings";
import { swipesRouter } from "./routes/swipes";
import { matchesRouter } from "./routes/matches";
import { tradesRouter } from "./routes/trades";
import { ratingsRouter } from "./routes/ratings";
import { reportsRouter } from "./routes/reports";
import { helpRouter } from "./routes/help";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/cards", cardsRouter);
app.use("/listings", listingsRouter);
app.use("/swipes", swipesRouter);
app.use("/matches", matchesRouter);
app.use("/trades", tradesRouter);
app.use("/ratings", ratingsRouter);
app.use("/reports", reportsRouter);
app.use("/help", helpRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`localpoketrades backend listening on :${PORT}`);
});
