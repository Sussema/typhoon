import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Stage 11: Dashboards and Reports', () => {
  it('GET /api/dashboard/facility returns structured KPIs and machine breakdown', async () => {
    const res = await request(app)
      .get('/api/dashboard/facility')
      .set('x-role', 'facility_operator');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('todayIntakeKg');
    expect(res.body).toHaveProperty('recoveryRatePct');
    expect(res.body).toHaveProperty('flaggedBatchesCount');
    expect(res.body).toHaveProperty('machineDowntimeEvents');
    expect(res.body).toHaveProperty('machines');
    expect(Array.isArray(res.body.machines)).toBe(true);
    expect(res.body.machines[0]).toHaveProperty('machine');
    expect(res.body.machines[0]).toHaveProperty('recovery_pct');
    expect(res.body).toHaveProperty('capacity');
    expect(res.body.capacity).toHaveProperty('dailyRatedKg');
    expect(res.body.capacity).toHaveProperty('utilizationPct');
    expect(res.body.capacity).toHaveProperty('status');
    expect(Array.isArray(res.body.capacity.history)).toBe(true);
  });

  it('GET /api/dashboard/municipal returns ward aggregates and baseline comparison', async () => {
    const res = await request(app)
      .get('/api/dashboard/municipal')
      .set('x-role', 'municipal_viewer');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalTonnageDivertedKg');
    expect(res.body).toHaveProperty('averageSegregationScore');
    expect(res.body).toHaveProperty('baselineVsCurrent');
    expect(res.body.baselineVsCurrent).toHaveProperty('baselineRecoveryRatePct');
    expect(res.body.baselineVsCurrent).toHaveProperty('currentRecoveryRatePct');
    expect(Array.isArray(res.body.coverageByWard)).toBe(true);
    // DPDP Act: Verify no personal PII keys are leaked
    res.body.coverageByWard.forEach((w) => {
      expect(w).not.toHaveProperty('phone');
      expect(w).not.toHaveProperty('aadhaar');
      expect(w).not.toHaveProperty('address');
    });
  });

  it('GET /api/reports/evidence/:shipmentId returns verified Recycling Evidence Pack with honest wording', async () => {
    const res = await request(app).get('/api/reports/evidence/SHP-8921-MUM');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Recycling Evidence Pack · Verified Recycling Record');
    // Section 18.3 & Section 16 DO NOT rule: Must not claim to be self-issued CPCB certificate
    expect(res.body.legalDisclaimer).toContain('tamper-evident audit record');
    expect(res.body.legalDisclaimer).not.toContain('CPCB certified');
    expect(res.body).toHaveProperty('shipment');
    expect(res.body).toHaveProperty('recyclerReceipt');
    expect(res.body).toHaveProperty('linkedBatches');
    expect(res.body).toHaveProperty('cryptographicProof');
    expect(res.body.cryptographicProof).toHaveProperty('merkleHash');
  });

  it('GET /api/reports/evidence/:shipmentId?format=html returns formatted printable audit sheet', async () => {
    const res = await request(app).get('/api/reports/evidence/SHP-8921-MUM?format=html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Recycling Evidence Pack');
    expect(res.text).toContain('Cryptographic SHA-256 Linear Audit Proof');
  });

  it('GET /api/reports/export/csv exports spreadsheet data for municipal officials', async () => {
    const res = await request(app).get('/api/reports/export/csv?type=wards');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Ward,Households Registered,Total Pickups');
  });
});
