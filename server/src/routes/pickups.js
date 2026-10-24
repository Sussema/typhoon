import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireRole } from '../auth/requireRole.js';
import { scorePickup } from '../services/points.js';
import { appendAudit } from '../services/audit.js';

const GRADE_MAP = {
  dry_clean: 'correct',
  dry_dirty: 'partial',
  wet_mixed: 'incorrect',
  hazardous: 'incorrect'
};

const PickupInput = z.object({
  clientId: z.string().uuid().optional(),
  householdCode: z.string().min(3),
  segregationGrade: z.enum(['dry_clean', 'dry_dirty', 'wet_mixed', 'hazardous']),
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
  const evaluation = GRADE_MAP[data.segregationGrade] || 'partial';
  const scoreResult = scorePickup(evaluation, 3); // Calculate streak and points

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find or create pseudonymous household record
    let householdId = '00000000-0000-0000-0000-000000000099';
    const hhRes = await client.query(`SELECT id FROM households WHERE code = $1`, [data.householdCode]);
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
        req.user?.id || '00000000-0000-0000-0000-000000000001',
        data.segregationGrade,
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
