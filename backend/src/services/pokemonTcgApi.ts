import axios from "axios";

const BASE_URL = "https://api.pokemontcg.io/v2";

// Works without a key at a lower rate limit; set POKEMONTCG_API_KEY to raise it.
// https://dev.pokemontcg.io/
function headers() {
  return process.env.POKEMONTCG_API_KEY ? { "X-Api-Key": process.env.POKEMONTCG_API_KEY } : {};
}

export interface CardSummary {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  marketPrice: number | null;
}

interface ApiCard {
  id: string;
  name: string;
  set?: { name?: string };
  images?: { small?: string; large?: string };
  tcgplayer?: {
    prices?: Record<string, { market?: number | null } | undefined>;
  };
}

function toSummary(card: ApiCard): CardSummary {
  const priceBlock = card.tcgplayer?.prices ?? {};
  const marketPrice = Object.values(priceBlock).find((p) => p?.market != null)?.market ?? null;

  return {
    id: card.id,
    name: card.name,
    setName: card.set?.name ?? "Unknown set",
    imageUrl: card.images?.small ?? "",
    marketPrice,
  };
}

/** Free-text card search (name, set, etc.) — used to populate have/want lists. */
export async function searchCards(query: string, pageSize = 20): Promise<CardSummary[]> {
  const res = await axios.get<{ data: ApiCard[] }>(`${BASE_URL}/cards`, {
    headers: headers(),
    params: { q: `name:*${query}*`, pageSize },
    timeout: 10000,
  });
  return res.data.data.map(toSummary);
}

/** Re-fetches a single card, mainly to get a fresh market price ("live" price lookup). */
export async function getCard(cardId: string): Promise<CardSummary | null> {
  const res = await axios.get<{ data: ApiCard }>(`${BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
    headers: headers(),
    timeout: 10000,
  });
  return res.data.data ? toSummary(res.data.data) : null;
}
