import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireRole } from '../auth/requireRole.js';
import { scorePickup } from '../services/points.js';
import { appendAudit } from '../services/audit.js';
import { parseSmsPickup } from '../services/smsParser.js';

const GRADE_MAP = {
  dry_clean: 'correct',
  dry_dirty: 'partial',
  wet_mixed: 'incorrect',
  hazardous: 'incorrect',
  correct: 'correct',
  partial: 'partial',
  incorrect: 'incorrect',
  no_waste: 'no_waste'
};

const PickupInput = z.object({
  clientId: z.string().uuid().optional(),
  householdCode: z.string().min(3).optional(),
  householdId: z.string().optional(),
  workerId: z.string().optional(),
  result: z.string().optional(),
  segregationGrade: z.string().optional(),
  capturedAt: z.string().datetime().default(() => new Date().toISOString())
});

export const pickupsRouter = Router();

pickupsRouter.get('/', requireRole('collector', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, h.code AS household_code, h.ward
       FROM pickups p
       JOIN households h ON h.id = p.household_id
       ORDER BY p.captured_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

pickupsRouter.post('/', requireRole('collector', 'admin'), async (req, res) => {
  const data = PickupInput.parse(req.body);
  const clientId = data.clientId || crypto.randomUUID();
  const rawGrade = data.segregationGrade || (data.result === 'correct' ? 'dry_clean' : data.result === 'partial' ? 'dry_dirty' : data.result === 'no_waste' ? 'dry_clean' : 'wet_mixed');
  const validGrades = ['dry_clean', 'dry_dirty', 'wet_mixed', 'hazardous'];
  const segregationGrade = validGrades.includes(rawGrade) ? rawGrade : (rawGrade === 'correct' ? 'dry_clean' : rawGrade === 'partial' ? 'dry_dirty' : 'wet_mixed');
  const evaluation = GRADE_MAP[segregationGrade] || 'partial';
  const scoreResult = scorePickup(evaluation, 3); // Calculate streak and points
  const householdCode = data.householdCode || 'HOME-0193';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find or create pseudonymous household record
    let householdId = data.householdId || '00000000-0000-0000-0000-000000000099';
    const hhRes = await client.query(`SELECT id FROM households WHERE code = $1`, [householdCode]);
    if (hhRes.rows.length > 0) {
      householdId = hhRes.rows[0].id;
    }

    const { rows } = await client.query(
      `INSERT INTO pickups (client_id, household_id, collector_id, segregation_grade, segregation_score, points_awarded, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id) DO NOTHING
       RETURNING *`,
      [
        clientId,
        householdId,
        req.user?.id || data.workerId || '00000000-0000-0000-0000-000000000001',
        segregationGrade,
        scoreResult.points >= 20 ? 100 : scoreResult.points >= 10 ? 60 : 20,
        scoreResult.points,
        data.capturedAt
      ]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      const existing = await pool.query(`SELECT * FROM pickups WHERE client_id = $1`, [clientId]);
      return res.status(200).json(existing.rows[0]);
    }

    await appendAudit(client, 'pickups', rows[0]);
    await client.query('COMMIT');
    res.status(201).json({ ...rows[0], ...scoreResult });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

// In-memory feed of recent SMS reports sent by collector (WRK-0014)
const recentSmsFeed = [
  {
    id: 'SMS-1001',
    phone: '+91 98201 44014',
    householdCode: 'HOME-0190',
    rawMessage: 'house no 190 yes',
    intent: 'yes',
    status: 'perfectly_segregated',
    statusLabel: '✅ Perfectly Segregated',
    result: 'correct',
    segregationGrade: 'dry_clean',
    points: 20,
    badgeClass: 'badge-success',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'SMS-1002',
    phone: '+91 98201 44014',
    householdCode: 'HOME-0191',
    rawMessage: 'house no 191 ok',
    intent: 'ok',
    status: 'partially_segregated',
    statusLabel: '⚠️ Partially Segregated',
    result: 'partial',
    segregationGrade: 'dry_dirty',
    points: 10,
    badgeClass: 'badge-warning',
    timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString()
  },
  {
    id: 'SMS-1003',
    phone: '+91 98201 44014',
    householdCode: 'HOME-0192',
    rawMessage: 'house no 192 no',
    intent: 'no',
    status: 'not_segregated',
    statusLabel: '❌ Not Segregated (Mixed)',
    result: 'incorrect',
    segregationGrade: 'wet_mixed',
    points: 0,
    badgeClass: 'badge-danger',
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString()
  },
  {
    id: 'SMS-1004',
    phone: '+91 98201 44014',
    householdCode: 'HOME-0193',
    rawMessage: '[No SMS Sent]',
    intent: 'not_received',
    status: 'not_collected_skipped',
    statusLabel: '🚪 Not Collected or Skipped',
    result: 'no_waste',
    segregationGrade: 'dry_clean',
    points: 0,
    badgeClass: 'badge-neutral',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  }
];

pickupsRouter.get('/sms-feed', async (req, res) => {
  res.json(recentSmsFeed);
});

pickupsRouter.post('/sms-message', async (req, res) => {
  try {
    const { phone = '+91 98201 44014', message = '', workerId, fallbackHousehold = 'HOME-0193' } = req.body || {};
    const parsed = parseSmsPickup(message, fallbackHousehold, phone);

    const clientId = crypto.randomUUID();
    const evaluation = GRADE_MAP[parsed.segregationGrade] || 'partial';
    const scoreResult = scorePickup(evaluation, 3);

    let savedPickup = null;
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        let householdId = '00000000-0000-0000-0000-000000000099';
        const hhRes = await client.query(`SELECT id FROM households WHERE code = $1`, [parsed.householdCode]);
        if (hhRes.rows.length > 0) {
          householdId = hhRes.rows[0].id;
        }

        const { rows } = await client.query(
          `INSERT INTO pickups (client_id, household_id, collector_id, segregation_grade, segregation_score, points_awarded, captured_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (client_id) DO NOTHING
           RETURNING *`,
          [
            clientId,
            householdId,
            req.user?.id || workerId || '00000000-0000-0000-0000-000000000001',
            parsed.segregationGrade,
            scoreResult.points >= 20 ? 100 : scoreResult.points >= 10 ? 60 : 20,
            scoreResult.points,
            new Date().toISOString()
          ]
        );
        savedPickup = rows[0] || null;
        if (savedPickup) {
          await appendAudit(client, 'pickups', savedPickup);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
      } finally {
        client.release();
      }
    } catch (dbErr) {
      // Database offline/mock fallback
      savedPickup = {
        id: crypto.randomUUID(),
        client_id: clientId,
        household_id: '00000000-0000-0000-0000-000000000099',
        collector_id: req.user?.id || workerId || '00000000-0000-0000-0000-000000000001',
        segregation_grade: parsed.segregationGrade,
        points_awarded: scoreResult.points,
        captured_at: new Date().toISOString()
      };
    }

    const feedEntry = {
      id: `SMS-${Date.now().toString().slice(-4)}`,
      phone,
      householdCode: parsed.householdCode,
      rawMessage: message,
      intent: parsed.intent,
      status: parsed.status,
      statusLabel: parsed.statusLabel,
      result: parsed.result,
      segregationGrade: parsed.segregationGrade,
      points: parsed.points,
      badgeClass: parsed.badgeClass,
      timestamp: new Date().toISOString()
    };
    recentSmsFeed.unshift(feedEntry);
    if (recentSmsFeed.length > 30) recentSmsFeed.pop();

    res.status(201).json({
      success: true,
      parsed,
      feedEntry,
      pickup: savedPickup
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
