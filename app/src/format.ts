/**
 * Card prices come from Cardmarket (EUR, preferred — the reference UK/EU
 * collectors actually use) or TCGplayer (USD, fallback for cards missing
 * Cardmarket data). Never hardcode a currency symbol here — always show
 * whichever one the price actually came from.
 */
export function formatCardPrice(amount: number, currency: string | null): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  return `${symbol}${amount.toFixed(2)}`;
}
