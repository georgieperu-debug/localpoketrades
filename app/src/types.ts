export interface User {
  id: number;
  displayName: string;
  postcode: string;
  radiusMiles: number;
  bio: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export type ListType = "have" | "want";

export interface CardListing {
  id: number;
  user_id: number;
  list_type: ListType;
  card_id: string;
  card_name: string;
  set_name: string;
  image_url: string;
  image_url_large: string;
  market_price: number | null;
  market_price_currency: string | null;
  condition: string | null;
  added_at: string;
}

export interface CardSummary {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  marketPrice: number | null;
  marketPriceCurrency: string | null;
}

export interface OverlapCard {
  cardId: string;
  cardName: string;
  imageUrl: string;
  marketPrice: number | null;
  marketPriceCurrency: string | null;
}

export interface PublicUser extends User {
  ratingAverage: number | null;
  ratingCount: number;
  haveList: OverlapCard[];
  wantList: OverlapCard[];
}

export interface Candidate {
  user: { id: number; display_name: string; bio: string | null };
  distanceMiles: number;
  theyHaveIWant: OverlapCard[];
  theyWantIHave: OverlapCard[];
  mutual: boolean;
}

export interface MatchSummary {
  id: number;
  otherUser: { id: number; displayName: string };
  lastMessage: { body: string; created_at: string } | null;
  createdAt: string;
}

export interface Message {
  id: number;
  match_id: number;
  sender_id: number;
  body: string;
  image_url: string | null;
  created_at: string;
}

export interface Trade {
  id: number;
  match_id: number;
  confirmed_by_a: 0 | 1;
  confirmed_by_b: 0 | 1;
  completed_at: string | null;
  created_at: string;
  myRating: { stars: number; review: string | null } | null;
}

export interface HelpArticle {
  slug: string;
  title: string;
  body: string[];
}
