import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Stage 13: Privacy, Payments, EPR: Legal Limits (Chapter 18 & DPDP Act, 2023)', () => {
  const testSubjectId = '00000000-0000-0000-0000-000000000099';

  it('GET /api/privacy/notice returns multilingual disclosure (Marathi, Hindi, English)', async () => {
    const res = await request(app).get('/api/privacy/notice');
    expect(res.status).toBe(200);
    expect(res.body.act).toContain('Digital Personal Data Protection Act, 2023');
    expect(res.body.languages).toHaveProperty('mr');
    expect(res.body.languages).toHaveProperty('hi');
    expect(res.body.languages).toHaveProperty('en');
    expect(res.body.languages.mr.summary).toContain('आधार क्रमांक कधीही मागत नाही');
    expect(res.body.languages.en.summary).toContain('NEVER collect Aadhaar');
  });

  it('POST /api/privacy/consent records lawful consent in people_private', async () => {
    const res = await request(app)
      .post('/api/privacy/consent')
      .send({
        subjectId: testSubjectId,
        fullName: 'Sunita Kamble',
        phone: '+919876543210',
        address: 'Ghole Road Slum Pocket 4, Pune',
        preferredLanguage: 'mr',
        consentGiven: true
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.consentAt).toBeDefined();
  });

  it('REJECTS collection of Aadhaar numbers with 400 error (Chapter 18 DO NOT Rule)', async () => {
    const res = await request(app)
      .post('/api/privacy/consent')
      .send({
        subjectId: '00000000-0000-0000-0000-000000000098',
        phone: '+919876543210',
        aadhaar: '1234-5678-9012', // FORBIDDEN FIELD
        consentGiven: true
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input');
    expect(JSON.stringify(res.body.details)).toContain('Aadhaar collection is prohibited');
  });

  it('GET /api/privacy/status verifies active consent exists prior to erasure', async () => {
    const res = await request(app).get(`/api/privacy/status/${testSubjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.hasPrivateData).toBe(true);
    expect(res.body.status).toBe('ACTIVE_CONSENT');
  });

  it('DELETE /api/privacy/erase/:subjectId permanently purges PII under DPDP Right to Erasure', async () => {
    const res = await request(app)
      .delete(`/api/privacy/erase/${testSubjectId}`)
      .set('x-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.erased).toBe(true);
    expect(res.body.message).toContain('DPDP Act, 2023');

    // Confirm status is now erased
    const checkRes = await request(app).get(`/api/privacy/status/${testSubjectId}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.hasPrivateData).toBe(false);
    expect(checkRes.body.status).toBe('ERASED_OR_UNREGISTERED');
  });
});
