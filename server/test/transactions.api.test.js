import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../src/app.js';
import { createShipment } from '../src/services/shipments.js';

describe('Stage 14: API Integration Testing (Chapter 19, Page 43)', () => {
  const validWorkerId = '00000000-0000-0000-0000-000000000014';

  it('returns 400 for negative or zero weight', async () => {
    const resNegative = await request(app)
      .post('/api/transactions')
      .set('x-role', 'aggregator')
      .send({
        clientId: crypto.randomUUID(),
        workerId: validWorkerId,
        material: 'PET',
        weightG: -5000,
        pricePaisePerKg: 2200,
        weightSource: 'scale',
        capturedAt: new Date().toISOString()
      });

    expect(resNegative.status).toBe(400);
    expect(resNegative.body.error).toBe('Invalid input');

    const resZero = await request(app)
      .post('/api/transactions')
      .set('x-role', 'aggregator')
      .send({
        clientId: crypto.randomUUID(),
        workerId: validWorkerId,
        material: 'PET',
        weightG: 0,
        pricePaisePerKg: 2200,
        weightSource: 'scale',
        capturedAt: new Date().toISOString()
      });

    expect(resZero.status).toBe(400);
  });

  it('returns 400 for weights exceeding 500 kg per manual/scale entry limit', async () => {
    const resOver = await request(app)
      .post('/api/transactions')
      .set('x-role', 'aggregator')
      .send({
        clientId: crypto.randomUUID(),
        workerId: validWorkerId,
        material: 'PET',
        weightG: 600_000, // 600 kg > 500 kg max
        pricePaisePerKg: 2200,
        weightSource: 'scale',
        capturedAt: new Date().toISOString()
      });

    expect(resOver.status).toBe(400);
  });

  it('returns 400 for unapproved polymer or material types', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('x-role', 'aggregator')
      .send({
        clientId: crypto.randomUUID(),
        workerId: validWorkerId,
        material: 'UNKNOWN_MATERIAL_TYPE',
        weightG: 18000,
        pricePaisePerKg: 2200,
        weightSource: 'scale',
        capturedAt: new Date().toISOString()
      });

    expect(res.status).toBe(400);
  });

  it('returns 403 when a recycler or collector tries to create a transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('x-role', 'recycler')
      .send({
        clientId: crypto.randomUUID(),
        workerId: validWorkerId,
        material: 'PET',
        weightG: 18000,
        pricePaisePerKg: 2200,
        weightSource: 'scale',
        capturedAt: new Date().toISOString()
      });

    expect(res.status).toBe(403);
  });

  it('returns 201 on initial transaction and 200 with NO duplicate when same clientId is retried (Idempotency)', async () => {
    const clientId = crypto.randomUUID();
    const payload = {
      clientId,
      workerId: validWorkerId,
      material: 'PET',
      weightG: 18450,
      pricePaisePerKg: 2200,
      weightSource: 'scale',
      capturedAt: new Date().toISOString()
    };

    // First attempt -> Created
    const res1 = await request(app)
      .post('/api/transactions')
      .set('x-role', 'aggregator')
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res1.body.client_id || res1.body.clientId).toBe(clientId);

    // Duplicate retry with identical clientId -> 200 OK returning existing row
    const res2 = await request(app)
      .post('/api/transactions')
      .set('x-role', 'aggregator')
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body.client_id || res2.body.clientId).toBe(clientId);
  });

  it('blocks over-shipment with HTTP 409 Conflict when shipping more than recovered batch inventory', async () => {
    // Mock DB client with batch of 50 kg recovered and 40 kg already shipped
    const mockClient = {
      query: vi.fn().mockImplementation((sql, params) => {
        if (sql.includes('SELECT recovered_g FROM batches')) {
          return { rows: [{ recovered_g: 50000 }] }; // 50 kg
        }
        if (sql.includes('SELECT COALESCE(SUM(shipped_g)')) {
          return { rows: [{ shipped: 40000 }] }; // 40 kg already shipped -> 10 kg left
        }
        return { rows: [] };
      })
    };

    const attemptOverShipment = {
      clientId: crypto.randomUUID(),
      batchId: '00000000-0000-0000-0000-000000000031',
      recyclerUserId: '00000000-0000-0000-0000-000000000041',
      material: 'PET',
      shippedG: 15000, // 15 kg > 10 kg available!
      capturedAt: new Date().toISOString()
    };

    await expect(
      createShipment(mockClient, attemptOverShipment, { id: 'user-1' })
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('Only 10 kg left in this batch')
    });
  });

  it('accepts shipment within available balance and records dispatch manifest', async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((sql, params) => {
        if (sql.includes('SELECT recovered_g FROM batches')) {
          return { rows: [{ recovered_g: 50000 }] };
        }
        if (sql.includes('SELECT COALESCE(SUM(shipped_g)')) {
          return { rows: [{ shipped: 30000 }] }; // 20 kg left
        }
        if (sql.includes('INSERT INTO shipments')) {
          return { rows: [{ id: 'shp-1', shipped_g: 10000, status: 'dispatched' }] };
        }
        return { rows: [] };
      })
    };

    const validShipment = {
      clientId: crypto.randomUUID(),
      batchId: '00000000-0000-0000-0000-000000000031',
      recyclerUserId: '00000000-0000-0000-0000-000000000041',
      material: 'PET',
      shippedG: 10000, // 10 kg <= 20 kg available
      capturedAt: new Date().toISOString()
    };

    const result = await createShipment(mockClient, validShipment, { id: 'user-1' });
    expect(result.id).toBe('shp-1');
    expect(result.shipped_g).toBe(10000);
  });
});
