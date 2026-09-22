import { API_BASE_URL } from "./config";
import {
  User,
  PublicUser,
  CardListing,
  CardSummary,
  Candidate,
  MatchSummary,
  Message,
  Trade,
  HelpArticle,
  ListType,
} from "./types";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---
export const requestCode = (email: string) => request<{ ok: true }>("/auth/request-code", { method: "POST", body: JSON.stringify({ email }) });

export const register = (input: { email: string; code: string; displayName: string; postcode: string; radiusMiles?: number; bio?: string }) =>
  request<{ token: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify(input) });

export const login = (email: string, code: string) =>
  request<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, code }) });

// --- Users ---
export const getMe = () => request<User>("/users/me");
export const updateMe = (input: Partial<{ displayName: string; bio: string; radiusMiles: number; postcode: string }>) =>
  request<User>("/users/me", { method: "PATCH", body: JSON.stringify(input) });
export const getPublicUser = (userId: number) => request<PublicUser>(`/users/${userId}`);
export const requestPhoneCode = (phone: string) => request<{ ok: true }>("/users/me/phone/request-code", { method: "POST", body: JSON.stringify({ phone }) });
export const verifyPhoneCode = (code: string) => request<{ ok: true }>("/users/me/phone/verify", { method: "POST", body: JSON.stringify({ code }) });

// --- Cards ---
export const searchCards = (q: string) => request<CardSummary[]>(`/cards/search?q=${encodeURIComponent(q)}`);

// --- Listings ---
export const getListings = (type?: ListType) => request<CardListing[]>(`/listings${type ? `?type=${type}` : ""}`);
export const addListing = (cardId: string, listType: ListType, condition?: string) =>
  request<CardListing>("/listings", { method: "POST", body: JSON.stringify({ cardId, listType, condition }) });
export const removeListing = (id: number) => request<void>(`/listings/${id}`, { method: "DELETE" });

// --- Swipes / matching ---
export const getCandidates = () => request<Candidate[]>("/swipes/candidates");
export const swipe = (targetUserId: number, direction: "like" | "pass") =>
  request<{ matched: boolean; matchId?: number }>("/swipes", { method: "POST", body: JSON.stringify({ targetUserId, direction }) });

// --- Matches / chat ---
export const getMatches = () => request<MatchSummary[]>("/matches");
export const getMessages = (matchId: number) => request<Message[]>(`/matches/${matchId}/messages`);
export const sendMessage = (matchId: number, body: string) =>
  request<Message>(`/matches/${matchId}/messages`, { method: "POST", body: JSON.stringify({ body }) });

// --- Trades / ratings ---
export const getTradesForMatch = (matchId: number) => request<Trade[]>(`/trades/matches/${matchId}`);
export const confirmTrade = (matchId: number) => request<Trade>(`/trades/matches/${matchId}/confirm`, { method: "POST" });
export const rateTrade = (tradeId: number, stars: number, review?: string) =>
  request<unknown>(`/ratings/trades/${tradeId}`, { method: "POST", body: JSON.stringify({ stars, review }) });

// --- Reports / help ---
export const reportUser = (reportedUserId: number, reason: string, details?: string) =>
  request<unknown>("/reports", { method: "POST", body: JSON.stringify({ reportedUserId, reason, details }) });
export const getHelpArticle = (slug: string) => request<HelpArticle>(`/help/articles/${slug}`);
