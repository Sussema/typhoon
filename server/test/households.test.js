import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Step 5: Household & Consumer Operations Portal', () => {
  it('GET /api/households/:code/portal returns profile, points, streak, rating, and history', async () => {
    const res = await request(app).get('/api/households/HOME-102/portal');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('HOME-102');
    expect(res.body.points).toBeGreaterThanOrEqual(120);
    expect(res.body.streak).toBeGreaterThanOrEqual(1);
    expect(res.body.rating).toBeDefined();
    expect(res.body.rating.scorePct).toBeGreaterThanOrEqual(0);
    expect(res.body.rating.stars).toBeGreaterThanOrEqual(1);
    expect(res.body.rating.tag).toBeDefined();
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(Array.isArray(res.body.customPickups)).toBe(true);
  });

  it('POST /api/households/audit records correctly segregated pickup and awards +20 points and updates rating', async () => {
    const beforeRes = await request(app).get('/api/households/HOME-102/portal');
    const startPoints = beforeRes.body.points;

    const res = await request(app)
      .post('/api/households/audit')
      .send({
        householdCode: 'HOME-102',
        result: 'correct'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.pointsAwarded).toBe(20);
    expect(res.body.newBalance).toBe(startPoints + 20);
    expect(res.body.rating).toBeDefined();
    expect(res.body.rating.scorePct).toBeGreaterThanOrEqual(50);
    expect(res.body.auditEntry.blockHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('POST /api/households/custom-pickup schedules on-demand collection with QR payload', async () => {
    const res = await request(app)
      .post('/api/households/custom-pickup')
      .send({
        householdCode: 'HOME-102',
        category: 'e_waste',
        preferredDate: '2026-10-26',
        timeSlot: 'Morning (09:00 AM – 11:30 AM)',
        notes: '2 broken laptops and copper adapters'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket.ticketId).toMatch(/^PKP-CUST-\d+$/);
    expect(res.body.ticket.qrPayload).toContain('CL:CUSTOM:PKP-CUST-');
    expect(res.body.ticket.status).toBe('Scheduled');
  });

  it('POST /api/households/redeem handles direct UPI cashback with instant receipt', async () => {
    const res = await request(app)
      .post('/api/households/redeem')
      .send({
        householdCode: 'HOME-102',
        type: 'upi',
        points: 50,
        destination: 'shinde@okhdfcbank'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receipt.id).toMatch(/^RCPT-PAY-\d+$/);
    expect(res.body.receipt.amountRupees).toBe(6);
    expect(res.body.receipt.blockHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('POST /api/households/redeem rejects when points exceed balance', async () => {
    const res = await request(app)
      .post('/api/households/redeem')
      .send({
        householdCode: 'HOME-102',
        type: 'upi',
        points: 999999,
        destination: 'shinde@okhdfcbank'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Insufficient points balance');
  });
});
