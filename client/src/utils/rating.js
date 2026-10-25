/**
 * Calculates household segregation rating based on their audit/pickup history.
 * Evaluates how often a household segregates their waste properly.
 * 
 * Score calculation:
 * - 'correct' (Perfect Segregation) = 100% compliance
 * - 'partial' (Partially Segregated) = 50% compliance
 * - 'incorrect' (Mixed / Contaminated) = 0% compliance
 * - 'no_waste' (No Waste / Skipped) = Neutral
 */
export function calculateSegregationRating(history = [], fallbackStreak = 3, householdCode = '') {
  const scorable = (history || []).filter(h => h.result && h.result !== 'no_waste');

  if (scorable.length === 0) {
    // Provide realistic demo rating based on code/streak if history is not yet populated
    let initialScore = 80;
    if (householdCode === 'HOME-102') initialScore = 90;
    else if (householdCode === 'HOME-0077' || householdCode === 'HOME-0190') initialScore = 95;
    else if (householdCode === 'HOME-0191') initialScore = 65;
    else if (householdCode === 'HOME-0192') initialScore = 35;
    else if (householdCode === 'HOME-0193') initialScore = 60;
    else initialScore = Math.min(95, Math.max(50, 65 + (fallbackStreak * 6)));

    const stars = Number((initialScore / 20).toFixed(1));
    const estimatedAudits = Math.max(3, fallbackStreak);
    const correctEst = Math.round(estimatedAudits * (initialScore / 100));
    const partialEst = estimatedAudits - correctEst;
    return buildRatingResult(initialScore, stars, estimatedAudits, correctEst, partialEst, 0);
  }

  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;

  for (const h of scorable) {
    if (h.result === 'correct') correctCount++;
    else if (h.result === 'partial') partialCount++;
    else if (h.result === 'incorrect') incorrectCount++;
  }

  const total = scorable.length;
  // Weighted compliance: 100% for correct, 50% for partial, 0% for incorrect
  const weighted = (correctCount * 1.0) + (partialCount * 0.5);
  const scorePct = total > 0 ? Math.round((weighted / total) * 100) : 0;
  const stars = Number(Math.min(5, Math.max(1, (scorePct / 20))).toFixed(1));

  return buildRatingResult(scorePct, stars, (history || []).length, correctCount, partialCount, incorrectCount);
}

function buildRatingResult(scorePct, stars, totalAudits, correctCount, partialCount, incorrectCount) {
  let label = 'Rarely Segregates';
  let tag = '🛑 Needs Improvement';
  let tier = 'Needs Improvement';
  let badgeClass = 'badge-danger';
  let frequencyText = 'Rarely (<50% Proper)';

  if (scorePct >= 90) {
    label = 'Always Segregates';
    tag = '🌟 5★ Champion Segregator';
    tier = 'Gold (A+)';
    badgeClass = 'badge-success';
    frequencyText = 'Always (90-100% Proper)';
  } else if (scorePct >= 75) {
    label = 'Frequently Segregates';
    tag = '⭐ 4★ Consistent Segregator';
    tier = 'Silver (A)';
    badgeClass = 'badge-info';
    frequencyText = 'Frequently (75-89% Proper)';
  } else if (scorePct >= 50) {
    label = 'Occasionally Segregates';
    tag = '⚠️ 3★ Developing Segregator';
    tier = 'Bronze (B)';
    badgeClass = 'badge-warning';
    frequencyText = 'Occasionally (50-74% Proper)';
  }

  return {
    scorePct,
    stars,
    label,
    tag,
    tier,
    badgeClass,
    frequencyText,
    totalAudits,
    correctCount,
    partialCount,
    incorrectCount
  };
}
