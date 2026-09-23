export type ListType = "have" | "want";
export type SwipeDirection = "like" | "pass";

export interface UserRow {
  id: number;
  email: string;
  phone: string | null;
  email_verified: 0 | 1;
  phone_verified: 0 | 1;
  display_name: string;
  postcode: string;
  lat: number;
  lng: number;
  radius_miles: number;
  bio: string | null;
  created_at: string;
}

export interface CardListingRow {
  id: number;
  user_id: number;
  list_type: ListType;
  card_id: string;
  card_name: string;
  set_name: string;
  image_url: string;
  image_url_large: string;
  market_price: number | null;
  condition: string | null;
  added_at: string;
}

export interface SwipeRow {
  id: number;
  user_id: number;
  target_user_id: number;
  direction: SwipeDirection;
  created_at: string;
}

export interface MatchRow {
  id: number;
  user_a: number;
  user_b: number;
  created_at: string;
}

export interface MessageRow {
  id: number;
  match_id: number;
  sender_id: number;
  body: string;
  created_at: string;
}

export interface TradeRow {
  id: number;
  match_id: number;
  confirmed_by_a: 0 | 1;
  confirmed_by_b: 0 | 1;
  completed_at: string | null;
  created_at: string;
}

export interface RatingRow {
  id: number;
  trade_id: number;
  rater_id: number;
  ratee_id: number;
  stars: number;
  review: string | null;
  created_at: string;
}

export interface ReportRow {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason: string;
  details: string | null;
  created_at: string;
}
