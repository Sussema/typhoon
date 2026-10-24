import crypto from 'node:crypto';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Call inside the same DB transaction as the insert it records.
export async function appendAudit(client, tableName, row) {
  try {
    await client.query('SELECT pg_advisory_xact_lock(4242)'); // one writer at a time
    const last = await client.query('SELECT hash FROM audit_log ORDER BY seq DESC LIMIT 1');
    const prevHash = last.rows[0]?.hash ?? '0'.repeat(64);
    const body = JSON.stringify({ tableName, row, prevHash });
    await client.query(
      'INSERT INTO audit_log (table_name, row_id, body, prev_hash, hash) VALUES ($1,$2,$3,$4,$5)',
      [tableName, row.id, body, prevHash, sha256(body)]
    );
  } catch (err) {
    // If audit_log table does not exist yet (before 002_audit migration), do not fail transaction in early development
    if (err.code === '42P01') {
      console.warn('audit_log table does not exist yet; skipping audit logging');
      return;
    }
    throw err;
  }
}

export async function verifyChain(pool) {
  const { rows } = await pool.query('SELECT seq, body, prev_hash, hash FROM audit_log ORDER BY seq');
  let prev = '0'.repeat(64);
  for (const r of rows) {
    if (r.prev_hash !== prev || sha256(r.body) !== r.hash) return { valid: false, brokenAt: r.seq };
    prev = r.hash;
  }
  return { valid: true, entries: rows.length, head: prev };
}
