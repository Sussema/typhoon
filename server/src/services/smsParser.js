/**
 * SMS Parser for Collector Doorstep Waste Reporting
 * Supports English, Hindi, and Marathi messages sent by the collector.
 *
 * Rules:
 *  - 'yes' (ha, ho, hoy, हो, होय, हाँ, हां) -> Perfectly Segregated (correct / dry_clean / +20 pts)
 *  - 'no' (nahi, na, नाही, नहीं, ना) -> Not Segregated (incorrect / wet_mixed / 0 pts)
 *  - 'ok' (theek, thik, partial, ठीक, आधा, अर्धा) -> Partially Segregated (partial / dry_dirty / +10 pts)
 *  - null / empty / 'not received' / 'skipped' -> Not Collected or Skipped (no_waste / 0 pts, streak kept)
 *  - Any other text -> Parsed with extracted house no and custom answer handling
 */

function normalizeDevanagariDigits(str = '') {
  const devanagariDigits = '०१२३४५६७८९';
  return str.replace(/[०-९]/g, (d) => String(devanagariDigits.indexOf(d)));
}

export function parseSmsPickup(message, fallbackHousehold = 'HOME-0193', phone = '') {
  let text = (message || '').trim();
  text = normalizeDevanagariDigits(text);

  // 1. Empty or explicitly unreceived / skipped message
  if (!text || /^(no[ -]?message|not[ -]?received|skipped|no[ -]?response|missed|unreceived|skip|वगळले|कचरा नाही|छोड़ दिया|खाली)$/i.test(text)) {
    return {
      householdCode: fallbackHousehold,
      rawMessage: text || '[No SMS Sent]',
      phone: phone || '+91 98201 44002',
      intent: 'not_received',
      status: 'not_collected_skipped',
      statusLabel: '🚪 Not Collected or Skipped',
      result: 'no_waste',
      segregationGrade: 'dry_clean',
      points: 0,
      badgeClass: 'badge-neutral',
      explanation: 'No SMS sent by collector — marked as skipped (streak protected)'
    };
  }

  // 2. Extract House Number / Code (e.g. 'house no 12', 'ghar no 193', 'घर क्र 45', 'मकान नं 101', 'HOME-0193')
  let householdCode = fallbackHousehold;
  const houseMatch = text.match(/(?:house|home|flat|ghar|makan|घर|मकान|h)\s*(?:no\.?|num|number|kramank|kr|क्रमांक|क्र\.?|नं\.?|नंबर|#)?\s*(\d+)/iu)
    || text.match(/(?:क्रमांक|क्र\.?|नं\.?|no\.?|#)\s*(\d+)/iu)
    || text.match(/^(\d+)\s+(?:yes|no|ok|ha|ho|nahi|theek|हो|नाही|हाँ|नहीं|ठीक)/iu);

  if (houseMatch && houseMatch[1]) {
    const num = parseInt(houseMatch[1], 10);
    householdCode = `HOME-${String(num).padStart(4, '0')}`;
  } else if (/HOME-\d{3,4}/i.test(text)) {
    const directMatch = text.match(/HOME-\d{3,4}/i);
    householdCode = directMatch[0].toUpperCase();
  }

  // Remove house identifier portion from message to isolate collector's grade report
  const bodyWithoutHouse = text
    .replace(/(?:house|home|flat|ghar|makan|घर|मकान|h)\s*(?:no\.?|num|number|kramank|kr|क्रमांक|क्र\.?|नं\.?|नंबर|#)?\s*\d+/giu, '')
    .replace(/(?:क्रमांक|क्र\.?|नं\.?|no\.?|#)\s*\d+/giu, '')
    .trim();

  const evaluationTarget = bodyWithoutHouse || text;

  // 3. Classify response
  // A. YES -> Perfectly Segregated
  if (/\b(yes|y|ha|haa|ho|hoy|done|clean|perfect|segregated)\b/i.test(evaluationTarget) || /(होय|हो|हाँ|हां|पूर्ण)/.test(evaluationTarget)) {
    return {
      householdCode,
      rawMessage: text,
      phone: phone || '+91 98201 44002',
      intent: 'yes',
      status: 'perfectly_segregated',
      statusLabel: '✅ Perfectly Segregated',
      result: 'correct',
      segregationGrade: 'dry_clean',
      points: 20,
      badgeClass: 'badge-success',
      explanation: 'Collector reported perfect waste segregation'
    };
  }

  // B. OK -> Partially Segregated
  if (/\b(ok|okay|theek|thik|partial|partially|avg|average|half|kuch)\b/i.test(evaluationTarget) || /(ठीक|अर्धा|आधा|अंशतः)/.test(evaluationTarget)) {
    return {
      householdCode,
      rawMessage: text,
      phone: phone || '+91 98201 44002',
      intent: 'ok',
      status: 'partially_segregated',
      statusLabel: '⚠️ Partially Segregated',
      result: 'partial',
      segregationGrade: 'dry_dirty',
      points: 10,
      badgeClass: 'badge-warning',
      explanation: 'Collector reported partial segregation'
    };
  }

  // C. NO -> Not Segregated
  if (/\b(no|n|nahi|nahin|na|not|unsegregated|mixed|dirty|contaminated|none)\b/i.test(evaluationTarget) || /(नाही|नहीं|ना|मिश्र|अवर्गीकृत)/.test(evaluationTarget)) {
    return {
      householdCode,
      rawMessage: text,
      phone: phone || '+91 98201 44002',
      intent: 'no',
      status: 'not_segregated',
      statusLabel: '❌ Not Segregated (Mixed)',
      result: 'incorrect',
      segregationGrade: 'wet_mixed',
      points: 0,
      badgeClass: 'badge-danger',
      explanation: 'Collector reported mixed / contaminated waste'
    };
  }

  // D. Unavailability keywords -> Not Collected / Skipped
  if (/\b(out of station|locked|closed|away|tomorrow|traveling|busy|door closed)\b/i.test(evaluationTarget) || /(बंद|कचरा नाही|वगळले|छोड़ दिया)/.test(evaluationTarget)) {
    return {
      householdCode,
      rawMessage: text,
      phone: phone || '+91 98201 44002',
      intent: 'skipped',
      status: 'not_collected_skipped',
      statusLabel: '🚪 Not Collected or Skipped',
      result: 'no_waste',
      segregationGrade: 'dry_clean',
      points: 0,
      badgeClass: 'badge-neutral',
      explanation: 'Collector reported house locked/unavailable — skipped (streak protected)'
    };
  }

  // E. Any other answer: "any ans can exist"
  return {
    householdCode,
    rawMessage: text,
    phone: phone || '+91 98201 44002',
    intent: 'custom_answer',
    status: 'partially_segregated',
    statusLabel: `💬 Collector SMS: "${text}"`,
    result: 'partial',
    segregationGrade: 'dry_dirty',
    points: 10,
    badgeClass: 'badge-info',
    explanation: `Collector report received: "${text}" (recorded with partial credit)`
  };
}
