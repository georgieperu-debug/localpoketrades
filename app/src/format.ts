/**
 * Card prices come from TCGplayer (via the PokemonTCG API), a US
 * marketplace — the number is always USD, never converted. Labelled as
 * such rather than shown with a £ sign, which would just be a different
 * kind of wrong.
 */
export function formatCardPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
