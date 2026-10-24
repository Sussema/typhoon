// Values are programme settings, funded by sponsors. Keep them in config, not code.
export const POINTS = { correct: 20, partial: 10, incorrect: 0, no_waste: 0 };
export const STREAK_BONUS = { every: 7, points: 30 };

export function scorePickup(result, previousStreak = 0) {
  const streak = result === 'correct' ? previousStreak + 1 : 0;
  const bonus = streak > 0 && streak % STREAK_BONUS.every === 0 ? STREAK_BONUS.points : 0;
  return {
    points: POINTS[result] + bonus,
    streak,
    needsFeedback: result !== 'correct' && result !== 'no_waste'
  };
}
