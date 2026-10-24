import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireRole } from '../auth/requireRole.js';
import { appendAudit } from '../services/audit.js';

const MATERIALS = ['PET', 'HDPE_PP', 'MIXED_PLASTIC', 'CARDBOARD', 'PAPER', 'ALUMINIUM', 'GLASS'];

const NewTransaction = z.object({
  clientId: z.string().uuid(),
  workerId: z.string().uuid(),
  material: z.enum(MATERIALS),
  grade: z.string().max(40).optional(),
  weightG: z.number().int().positive().max(500_000), // max 500 kg per entry
  pricePaisePerKg: z.number().int().nonnegative().max(1_000_000),
  weightSource: z.enum(['scale', 'manual']),
  scaleId: z.string().max(40).optional(),
  capturedAt: z.string().datetime()
});

export const transactionsRouter = Router();

transactionsRouter.post('/', requireRole('aggregator', 'facility_operator'), async (req, res) => {
  const t = NewTransaction.parse(req.body); // throws ZodError -> 400
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO transactions (client_id, worker_id, facility_id, material, grade, weight_g,
      price_paise_per_kg, weight_source, scale_id, operator_id, captured_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (client_id) DO NOTHING
      RETURNING *`,
      [t.clientId, t.workerId, req.user.facilityId, t.material, t.grade ?? null, t.weightG,
      t.pricePaisePerKg, t.weightSource, t.scaleId ?? null, req.user.id, t.capturedAt]);

    if (rows.length === 0) { // duplicate retry: return the original
      await client.query('ROLLBACK');
      const existing = await pool.query('SELECT * FROM transactions WHERE client_id = $1', [t.clientId]);
      return res.status(200).json(existing.rows[0]);
    }

    await appendAudit(client, 'transactions', rows[0]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

transactionsRouter.get('/', requireRole('aggregator', 'facility_operator', 'municipal_viewer', 'admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE facility_id = $1 ORDER BY received_at DESC LIMIT 200`,
    [req.user.facilityId]
  );
  res.json(rows);
});
