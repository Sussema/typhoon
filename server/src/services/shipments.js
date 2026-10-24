import { httpError } from '../httpError.js';
import { appendAudit } from './audit.js';

export async function createShipment(client, s, user) {
  await client.query('BEGIN');
  try {
    // Lock this batch row until COMMIT: a second dispatch must wait its turn
    const b = await client.query('SELECT recovered_g FROM batches WHERE id = $1 FOR UPDATE', [s.batchId]);
    if (!b.rows[0]) throw httpError(404, 'Batch not found');

    const sum = await client.query(
      'SELECT COALESCE(SUM(shipped_g), 0)::int AS shipped FROM shipments WHERE batch_id = $1',
      [s.batchId]
    );
    const available = b.rows[0].recovered_g - sum.rows[0].shipped;
    if (s.shippedG > available) {
      throw httpError(409, `Only ${available / 1000} kg left in this batch`);
    }

    const ins = await client.query(
      `INSERT INTO shipments (client_id, batch_id, recycler_user_id, material, grade, shipped_g,
      vehicle_no, operator_id, captured_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [s.clientId, s.batchId, s.recyclerUserId, s.material, s.grade ?? null, s.shippedG,
      s.vehicleNo ?? null, user.id, s.capturedAt]
    );

    await appendAudit(client, 'shipments', ins.rows[0]);
    await client.query('COMMIT');
    return ins.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}
