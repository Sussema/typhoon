import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

const dir = path.resolve('migrations');
const files = (await fs.readdir(dir)).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
  if (done.rowCount) continue; // already applied
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log('applied', file);
  } catch (err) {
    await client.query('ROLLBACK'); // all-or-nothing
    throw err;
  } finally {
    client.release();
  }
}
await pool.end();
