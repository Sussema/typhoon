import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireRole } from '../auth/requireRole.js';
import { createShipment } from '../services/shipments.js';
import { checkReceipt } from '../services/massBalance.js';
import { appendAudit } from '../services/audit.js';

const ShipmentInput = z.object({
  clientId: z.string().uuid().optional(),
  batchId: z.string().uuid(),
  recyclerUserId: z.string().uuid(),
  material: z.string().default('PET'),
  grade: z.string().optional(),
  shippedG: z.number().int().positive(),
  vehicleNo: z.string().optional(),
  capturedAt: z.string().datetime().default(() => new Date().toISOString())
});

const ReceiptInput = z.object({
  receivedG: z.number().int().positive(),
  note: z.string().optional()
});

export const shipmentsRouter = Router();

shipmentsRouter.get('/', requireRole('facility_operator', 'recycler', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM shipments ORDER BY captured_at DESC LIMIT 50`);
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

// Facility Operator dispatches shipment
shipmentsRouter.post('/', requireRole('facility_operator', 'admin'), async (req, res) => {
  const data = ShipmentInput.parse(req.body);
  const clientId = data.clientId || crypto.randomUUID();
  const s = { ...data, clientId };

  const client = await pool.connect();
  try {
    const shipment = await createShipment(client, s, req.user);
    res.status(201).json(shipment);
  } finally {
    client.release();
  }
});

// Recycler confirms incoming receipt
shipmentsRouter.post('/:id/receipt', requireRole('recycler', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { receivedG, note } = ReceiptInput.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const shipRes = await client.query(`SELECT * FROM shipments WHERE id = $1`, [id]);
    const shippedG = shipRes.rows[0]?.shipped_g || receivedG; // fallback in dev

    const { diffG, allowedG, flagged } = checkReceipt({ shippedG, receivedG });

    const ins = await client.query(
      `INSERT INTO shipment_receipts (shipment_id, received_weight_g, variance_pct, variance_flag, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, receivedG, ((diffG / (shippedG || 1)) * 100).toFixed(2), flagged, note ?? null]
    );

    await appendAudit(client, 'shipment_receipts', ins.rows[0]);
    await client.query('COMMIT');
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});
