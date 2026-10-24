import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Stage 12: Security Hardening (OWASP Top 10 & Section 17)', () => {
  it('enforces Helmet security headers (HSTS, nosniff, frameguard)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('rejects cross-facility access with 403 Forbidden (requireFacility isolation)', async () => {
    // User from facility 00000000-0000-0000-0000-000000000002 tries to access facility 9999
    const res = await request(app)
      .get('/api/dashboard/facility?facilityId=00000000-0000-0000-0000-000000009999')
      .set('x-role', 'facility_operator');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access to another facility ledger is prohibited');
  });

  it('rejects unauthorized role attempting facility operations with 403', async () => {
    // Recycler or collector attempting to access facility dashboard
    const res = await request(app)
      .get('/api/dashboard/facility')
      .set('x-role', 'collector');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('is not authorized for this operation');
  });

  it('rejects non-operator trying to create machine batches with 403', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('x-role', 'collector')
      .send({
        machineId: '00000000-0000-0000-0000-000000000021',
        inputG: 50000,
        recoveredG: 48000,
        residualG: 2000
      });

    expect(res.status).toBe(403);
  });

  it('rejects non-recycler trying to confirm shipment receipts with 403', async () => {
    const res = await request(app)
      .post('/api/shipments/SHP-8921-MUM/receipt')
      .set('x-role', 'collector')
      .send({ receivedG: 12000000 });

    expect(res.status).toBe(403);
  });

  it('allows authorized role to access their designated endpoints', async () => {
    const res = await request(app)
      .get('/api/dashboard/facility')
      .set('x-role', 'facility_operator');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('todayIntakeKg');
  });

  it('supports admin revoking user sessions (lost phone mitigation)', async () => {
    const res = await request(app)
      .post('/api/auth/revoke-sessions')
      .set('x-role', 'admin')
      .send({ userId: '00000000-0000-0000-0000-000000000001' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('ensures no dangerous reset or demo wipe routes exist (Page 40 DO NOT)', async () => {
    const res = await request(app).post('/api/reset');
    expect(res.status).toBe(404);

    const resSeed = await request(app).post('/api/seed');
    expect(resSeed.status).toBe(404);
  });
});
