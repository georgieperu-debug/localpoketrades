import axios from "axios";

const BASE_URL = "https://api.pokemontcg.io/v2";

// Works without a key at a lower rate limit; set POKEMONTCG_API_KEY to raise it.
// https://dev.pokemontcg.io/
// NOTE: this API is now deprecated by its maintainer (new signups are
// closed; existing keys work through March 2027, migration path is
// scrydex.com). It's noticeably flakier than it used to be as a result —
// the retry helper below is a mitigation, not a fix. Budget time to
// evaluate a replacement card-data source before it's fully retired.
function headers() {
  return process.env.POKEMONTCG_API_KEY ? { "X-Api-Key": process.env.POKEMONTCG_API_KEY } : {};
}

/** Retries on 5xx/network errors only — a 4xx means the request itself is wrong, retrying won't help. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const isRetryable = status === undefined || status >= 500;
      if (!isRetryable || attempt === attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  throw new Error("unreachable");
}

export type PriceCurrency = "EUR" | "USD";

export interface CardSummary {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  /** Higher-res image, for detail/zoomed views — the "small" imageUrl looks blurry scaled up. */
  imageUrlLarge: string;
  marketPrice: number | null;
  /** Which currency marketPrice actually is — never assume, always show alongside the number. */
  marketPriceCurrency: PriceCurrency | null;
}

interface ApiCard {
  id: string;
  name: string;
  set?: { name?: string };
  images?: { small?: string; large?: string };
  tcgplayer?: {
    prices?: Record<string, { market?: number | null } | undefined>;
  };
  cardmarket?: {
    prices?: {
      trendPrice?: number | null;
      averageSellPrice?: number | null;
    };
  };
}

// Cardmarket (EUR) is preferred over TCGplayer (USD) — it's the reference
// UK/EU collectors and traders actually use, TCGplayer is US-centric.
// trendPrice is Cardmarket's own "current fair value" metric; averageSellPrice
// is the fallback for cards missing a trend price. TCGplayer only kicks in
// if a card has no Cardmarket data at all (unverified how common that is —
// this sandbox can't reach the live API to check).
function toSummary(card: ApiCard): CardSummary {
  const cardmarketPrice = card.cardmarket?.prices?.trendPrice ?? card.cardmarket?.prices?.averageSellPrice ?? null;

  const tcgplayerPriceBlock = card.tcgplayer?.prices ?? {};
  const tcgplayerPrice = Object.values(tcgplayerPriceBlock).find((p) => p?.market != null)?.market ?? null;

  const [marketPrice, marketPriceCurrency]: [number | null, PriceCurrency | null] =
    cardmarketPrice != null ? [cardmarketPrice, "EUR"] : tcgplayerPrice != null ? [tcgplayerPrice, "USD"] : [null, null];

  return {
    id: card.id,
    name: card.name,
    setName: card.set?.name ?? "Unknown set",
    imageUrl: card.images?.small ?? "",
    imageUrlLarge: card.images?.large ?? card.images?.small ?? "",
    marketPrice,
    marketPriceCurrency,
  };
}

/** Free-text card search (name, set, etc.) — used to populate have/want lists. */
export async function searchCards(query: string, pageSize = 20): Promise<CardSummary[]> {
  const res = await withRetry(() =>
    axios.get<{ data: ApiCard[] }>(`${BASE_URL}/cards`, {
      headers: headers(),
      params: { q: `name:*${query}*`, pageSize },
      timeout: 10000,
    })
  );
  return res.data.data.map(toSummary);
}

/** Re-fetches a single card, mainly to get a fresh market price ("live" price lookup). */
export async function getCard(cardId: string): Promise<CardSummary | null> {
  const res = await withRetry(() =>
    axios.get<{ data: ApiCard }>(`${BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
      headers: headers(),
      timeout: 10000,
    })
  );
  return res.data.data ? toSummary(res.data.data) : null;
}
