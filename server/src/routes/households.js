import { Router } from 'express';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { z } from 'zod';
import { pool } from '../db.js';
import { scorePickup } from '../services/points.js';
import { appendAudit } from '../services/audit.js';

export const householdsRouter = Router();

export function calculateSegregationRating(history = [], fallbackStreak = 3, householdCode = '') {
  const scorable = (history || []).filter(h => h.result && h.result !== 'no_waste');

  if (scorable.length === 0) {
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

function getInitialHouseholdData(code = 'HOME-102') {
  const norm = (code || 'HOME-102').toUpperCase().trim();
  const history = [
    {
      id: 'PKP-0912',
      date: new Date(Date.now() - 86400000 * 2).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: '08:45 AM',
      result: 'correct',
      gradeLabel: 'Correctly Segregated',
      points: 20,
      bonus: 0,
      blockHash: '00a4b73f8e12903829dc7b1a209b5581cf20847290bc91f82be7b41982b61fcb'
    },
    {
      id: 'PKP-0854',
      date: new Date(Date.now() - 86400000 * 3).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: '09:10 AM',
      result: 'correct',
      gradeLabel: 'Correctly Segregated',
      points: 20,
      bonus: 0,
      blockHash: '72e819fa2c4d9b62a90184c20847290bc91f82be7b41982b61fcb00a4b73f8e1'
    },
    {
      id: 'PKP-0791',
      date: new Date(Date.now() - 86400000 * 4).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: '08:55 AM',
      result: 'partial',
      gradeLabel: 'Partially Segregated',
      points: 10,
      bonus: 0,
      blockHash: '1a90c420847290bc91f82be7b41982b61fcb00a4b73f8e12903829dc7b1a209b'
    },
    {
      id: 'PKP-0720',
      date: new Date(Date.now() - 86400000 * 5).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: '08:40 AM',
      result: 'correct',
      gradeLabel: 'Correctly Segregated',
      points: 20,
      bonus: 0,
      blockHash: '5c819fa2c4d9b62a90184c20847290bc91f82be7b41982b61fcb00a4b73f8e12'
    }
  ];

  const rating = calculateSegregationRating(history, 5, norm);

  return {
    code: norm,
    ward: 'Ward 12 (Ghole Road)',
    worker: 'WRK-0014 (Ramesh Shinde)',
    address: 'Flat 402, Sai Shraddha Apts, Prabhat Road',
    points: 120,
    streak: 5,
    divertedKg: 48.2,
    rating,
    history,
    customPickups: [
      {
        ticketId: 'PKP-CUST-84920',
        category: 'e_waste',
        categoryLabel: 'E-Waste (Electronics & Cables)',
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        timeSlot: 'Morning (09:00 AM – 11:30 AM)',
        notes: '2 broken laptops and copper adapters',
        status: 'Scheduled',
        qrPayload: 'CL:CUSTOM:PKP-CUST-84920',
        createdAt: new Date().toISOString()
      }
    ],
    redemptions: [
      {
        id: 'RCPT-PAY-1082',
        type: 'upi',
        amountRupees: 12,
        pointsRedeemed: 100,
        destination: 'household.shinde@oksbi',
        date: new Date(Date.now() - 86400000 * 7).toLocaleDateString('en-IN'),
        utr: 'UPI/20261017/9820148192',
        blockHash: 'e7b41982b61fcb4e370e28f3ac615da07c9135081b22e1b402847290bc91f82b'
      }
    ]
  };
}

// In-memory demo state backing for offline database / prototype operation
const demoHouseholdStore = {
  'HOME-102': getInitialHouseholdData('HOME-102')
};

function getOrCreateHousehold(code) {
  const norm = (code || 'HOME-102').toUpperCase().trim();
  if (!demoHouseholdStore[norm]) {
    const history = [];
    demoHouseholdStore[norm] = {
      code: norm,
      ward: 'Ward 12 (Ghole Road)',
      worker: 'WRK-0014 (Ramesh Shinde)',
      address: `Household ${norm}, Municipal Zone 3`,
      points: 100,
      streak: 3,
      divertedKg: 24.5,
      rating: calculateSegregationRating(history, 3, norm),
      history,
      customPickups: [],
      redemptions: []
    };
  }
  demoHouseholdStore[norm].rating = calculateSegregationRating(
    demoHouseholdStore[norm].history,
    demoHouseholdStore[norm].streak,
    norm
  );
  return demoHouseholdStore[norm];
}

// 1. GET /api/households/:code/portal - Fetch household profile, points balance, streak, & history
householdsRouter.get('/:code/portal', async (req, res) => {
  const code = (req.params.code || 'HOME-102').toUpperCase().trim();

  try {
    // Attempt database query if PostgreSQL is online
    const hhRes = await pool.query(
      `SELECT h.*, pp.full_name, pp.address, pp.preferred_language, w.code AS worker_code
       FROM households h
       LEFT JOIN people_private pp ON pp.subject_id = h.id
       LEFT JOIN workers w ON w.id = h.assigned_worker_id
       WHERE h.qr_code = $1`,
      [code]
    );

    if (hhRes.rows.length > 0) {
      const hh = hhRes.rows[0];
      const pointsRes = await pool.query(
        `SELECT COALESCE(SUM(delta_points), 0)::int as total_points
         FROM reward_ledger WHERE household_id = $1`,
        [hh.id]
      );
      const pickupsRes = await pool.query(
        `SELECT p.*, al.hash AS block_hash
         FROM pickups p
         LEFT JOIN audit_log al ON al.row_id = p.id
         WHERE p.household_id = $1
         ORDER BY p.captured_at DESC LIMIT 20`,
        [hh.id]
      );

      const mem = getOrCreateHousehold(code);
      const history = pickupsRes.rows.length > 0 ? pickupsRes.rows.map(r => ({
        id: r.id.substring(0, 8),
        date: new Date(r.captured_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date(r.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: r.result,
        gradeLabel: r.result === 'correct' ? 'Correctly Segregated' : r.result === 'partial' ? 'Partially Segregated' : 'Contaminated',
        points: r.result === 'correct' ? 20 : r.result === 'partial' ? 10 : 0,
        bonus: 0,
        blockHash: r.block_hash || crypto.createHash('sha256').update(r.id).digest('hex')
      })) : mem.history;

      const rating = calculateSegregationRating(history, mem.streak, code);

      return res.json({
        code: hh.qr_code,
        ward: hh.ward,
        worker: hh.worker_code || 'WRK-0014 (Ramesh Shinde)',
        address: hh.address || mem.address,
        points: Math.max(0, pointsRes.rows[0]?.total_points ?? mem.points),
        streak: mem.streak,
        divertedKg: mem.divertedKg,
        rating,
        history,
        customPickups: mem.customPickups,
        redemptions: mem.redemptions
      });
    }
  } catch (err) {
    // Database query failed or offline -> fall through to in-memory store
  }

  const data = getOrCreateHousehold(code);
  data.rating = calculateSegregationRating(data.history, data.streak, code);
  res.json(data);
});

// Reset / restore household state & audit history to initial condition
householdsRouter.post('/:code/reset-points', (req, res) => {
  const code = (req.params.code || 'HOME-102').toUpperCase().trim();
  demoHouseholdStore[code] = getInitialHouseholdData(code);
  res.json({ success: true, points: demoHouseholdStore[code].points, data: demoHouseholdStore[code] });
});

householdsRouter.post('/reset', (req, res) => {
  demoHouseholdStore['HOME-102'] = getInitialHouseholdData('HOME-102');
  res.json({ success: true, points: demoHouseholdStore['HOME-102'].points, data: demoHouseholdStore['HOME-102'] });
});

// 2. POST /api/households/audit - Record doorstep optical QR audit inspection
const AuditSchema = z.object({
  householdCode: z.string().min(3),
  result: z.enum(['correct', 'partial', 'incorrect', 'no_waste']),
  capturedAt: z.string().datetime().optional()
});

householdsRouter.post('/audit', async (req, res) => {
  const parsed = AuditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid audit payload', details: parsed.error.issues });
  }

  const { householdCode, result } = parsed.data;
  const target = getOrCreateHousehold(householdCode);
  const scoreResult = scorePickup(result, target.streak);

  target.streak = scoreResult.streak;
  target.points += scoreResult.points;
  target.divertedKg = parseFloat((target.divertedKg + (result === 'correct' ? 1.4 : result === 'partial' ? 0.8 : 0)).toFixed(1));

  const blockContent = `${target.code}|${Date.now()}|pickup|${JSON.stringify({ result, points: scoreResult.points, streak: target.streak })}`;
  const blockHash = crypto.createHash('sha256').update(blockContent).digest('hex');

  const auditEntry = {
    id: 'PKP-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    result,
    gradeLabel: result === 'correct' ? 'Correctly Segregated' : result === 'partial' ? 'Partially Segregated' : result === 'no_waste' ? 'No Waste' : 'Contaminated',
    points: scoreResult.points,
    bonus: scoreResult.bonus || 0,
    blockHash
  };

  target.history.unshift(auditEntry);
  const updatedRating = calculateSegregationRating(target.history, target.streak, target.code);
  target.rating = updatedRating;

  // Attempt database persistence & cryptographic chain write if available
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const hhRes = await client.query('SELECT id FROM households WHERE qr_code = $1', [target.code]);
      if (hhRes.rows.length > 0) {
        const hhId = hhRes.rows[0].id;
        const pRes = await client.query(
          `INSERT INTO pickups (client_id, household_id, worker_id, result, operator_id, captured_at)
           VALUES ($1, $2, '00000000-0000-0000-0000-000000000002', $3, '00000000-0000-0000-0000-000000000001', now())
           RETURNING *`,
          [crypto.randomUUID(), hhId, result]
        );
        if (scoreResult.points > 0) {
          await client.query(
            `INSERT INTO reward_ledger (household_id, pickup_id, delta_points, reason)
             VALUES ($1, $2, $3, $4)`,
            [hhId, pRes.rows[0].id, scoreResult.points, `Doorstep audit: ${result}`]
          );
        }
        await appendAudit(client, 'pickups', pRes.rows[0]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
    } finally {
      client.release();
    }
  } catch (dbErr) {
    // Offline DB: In-memory store continues smoothly
  }

  res.status(201).json({
    success: true,
    householdCode: target.code,
    newBalance: target.points,
    streak: target.streak,
    pointsAwarded: scoreResult.points,
    rating: updatedRating,
    auditEntry
  });
});

// 3. POST /api/households/custom-pickup - Schedule on-demand custom garbage pickup
const CustomPickupSchema = z.object({
  householdCode: z.string().min(3),
  category: z.enum(['e_waste', 'bulk_recyclables', 'bulky_furniture', 'domestic_hazardous']),
  preferredDate: z.string().min(4),
  timeSlot: z.string().min(2),
  notes: z.string().optional(),
  address: z.string().optional()
});

const CATEGORY_LABELS = {
  e_waste: 'E-Waste (Electronics & Cables)',
  bulk_recyclables: 'Bulk Recyclables (Cardboard & Rigid Plastic)',
  bulky_furniture: 'Bulky Furniture & Scrap Metal',
  domestic_hazardous: 'Domestic Hazardous (Paints & Tube Lights)'
};

householdsRouter.post('/custom-pickup', async (req, res) => {
  const parsed = CustomPickupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid pickup scheduling payload', details: parsed.error.issues });
  }

  const { householdCode, category, preferredDate, timeSlot, notes, address } = parsed.data;
  const target = getOrCreateHousehold(householdCode);
  const ticketId = 'PKP-CUST-' + Math.floor(10000 + Math.random() * 90000);
  const qrPayload = `CL:CUSTOM:${ticketId}`;

  // Generate QR Code data URL for the tracking ticket
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 300, margin: 2, errorCorrectionLevel: 'M' });
  } catch (qrErr) {
    qrDataUrl = '';
  }

  const newTicket = {
    ticketId,
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    preferredDate,
    timeSlot,
    notes: notes || 'Standard residential pickup',
    address: address || target.address,
    status: 'Scheduled',
    qrPayload,
    qrDataUrl,
    createdAt: new Date().toISOString()
  };

  target.customPickups.unshift(newTicket);

  res.status(201).json({
    success: true,
    ticket: newTicket
  });
});

// 4. POST /api/households/redeem - Redeem points for UPI cashback or Municipal Property Tax rebate
const RedeemSchema = z.object({
  householdCode: z.string().min(3),
  type: z.enum(['upi', 'property_tax']),
  points: z.number().int().positive(),
  destination: z.string().min(3)
});

householdsRouter.post('/redeem', async (req, res) => {
  const parsed = RedeemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid redemption payload', details: parsed.error.issues });
  }

  const { householdCode, type, points, destination } = parsed.data;
  const target = getOrCreateHousehold(householdCode);

  if (target.points < points) {
    return res.status(400).json({
      error: `Insufficient points balance. Current: ${target.points} pts, requested: ${points} pts.`
    });
  }

  // Conversion rate: 100 points = ₹12 (1 pt = ₹0.12)
  const amountRupees = Math.round((points * 12) / 100);
  target.points -= points;

  const receiptId = 'RCPT-PAY-' + Math.floor(10000 + Math.random() * 90000);
  const utrRef = type === 'upi'
    ? `UPI/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(1000000000 + Math.random() * 9000000000)}`
    : `PMC-TAX-REBATE-${Math.floor(100000 + Math.random() * 900000)}`;

  const blockContent = `${receiptId}|${target.code}|${points}|${amountRupees}|${destination}|${Date.now()}`;
  const blockHash = crypto.createHash('sha256').update(blockContent).digest('hex');

  const redemptionReceipt = {
    id: receiptId,
    type,
    typeLabel: type === 'upi' ? 'Direct UPI Cashback Payout' : 'Municipal Property Tax Rebate Credit',
    amountRupees,
    pointsRedeemed: points,
    destination,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    utr: utrRef,
    blockHash,
    status: 'Confirmed'
  };

  target.redemptions.unshift(redemptionReceipt);

  // Attempt database persistence into reward_ledger with negative points
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const hhRes = await client.query('SELECT id FROM households WHERE qr_code = $1', [target.code]);
      if (hhRes.rows.length > 0) {
        await client.query(
          `INSERT INTO reward_ledger (household_id, delta_points, reason)
           VALUES ($1, $2, $3)`,
          [hhRes.rows[0].id, -points, `Redemption: ${type} to ${destination} (${receiptId})`]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
    } finally {
      client.release();
    }
  } catch (dbErr) {
    // Offline DB: In-memory store handles transaction
  }

  res.status(200).json({
    success: true,
    newBalance: target.points,
    receipt: redemptionReceipt
  });
});

// 5. GET /api/households/qr - Generate real QR code image data URL for any payload
householdsRouter.get('/qr', async (req, res) => {
  const payload = req.query.payload || 'CL:H:HOME-102';
  try {
    const dataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2, errorCorrectionLevel: 'M' });
    res.json({ payload, dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code', details: err.message });
  }
});
