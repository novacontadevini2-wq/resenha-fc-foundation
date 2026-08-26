export const DRAW_WEIGHTS = { rating: 1, position: 0.5 } as const;

export function calculateBalanceScore(teamRatings: number[], positionCounts: number[] = []): number {
  if (teamRatings.length === 0) return 0;
  const spread = Math.max(...teamRatings) - Math.min(...teamRatings);
  const average = teamRatings.reduce((sum, rating) => sum + rating, 0) / teamRatings.length;
  const variance = teamRatings.reduce((sum, rating) => sum + (rating - average) ** 2, 0) / teamRatings.length;
  const positionPenalty = positionCounts.reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  return spread * DRAW_WEIGHTS.rating + Math.sqrt(variance) + positionPenalty * DRAW_WEIGHTS.position;
}
