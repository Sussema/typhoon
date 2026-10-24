import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireRole } from '../auth/requireRole.js';
import { checkBatch } from '../services/massBalance.js';
import { appendAudit } from '../services/audit.js';

const BatchInput = z.object({
  clientId: z.string().uuid().optional(),
  machineId: z.string().uuid().or(z.string().min(1)),
  inputG: z.number().int().positive(),
  recoveredG: z.number().int().nonnegative(),
  residualG: z.number().int().nonnegative(),
  weightSource: z.enum(['scale', 'manual']).default('scale')
});

export const batchesRouter = Router();

batchesRouter.get('/', requireRole('facility_operator', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, m.code AS machine_code FROM batches b JOIN machines m ON m.id = b.machine_id ORDER BY b.captured_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

batchesRouter.post('/', requireRole('facility_operator', 'admin'), async (req, res) => {
  const data = BatchInput.parse(req.body);
  const { gapG, allowedG, flagged } = checkBatch(data);
  const clientId = data.clientId || crypto.randomUUID();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO batches (client_id, machine_id, operator_id, input_g, recovered_g, residual_g, gap_g, weight_source, flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (client_id) DO NOTHING
       RETURNING *`,
      [clientId, data.machineId, req.user?.id || '00000000-0000-0000-0000-000000000001', data.inputG, data.recoveredG, data.residualG, gapG, data.weightSource, flagged]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      const existing = await pool.query(`SELECT * FROM batches WHERE client_id = $1`, [clientId]);
      return res.status(200).json(existing.rows[0]);
    }

    await appendAudit(client, 'batches', rows[0]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});
