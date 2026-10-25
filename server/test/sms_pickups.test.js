import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { parseSmsPickup } from '../src/services/smsParser.js';

describe('Collector SMS Doorstep Reporting Parser', () => {
  it('parses English "yes" as perfectly segregated (+20 pts)', () => {
    const res = parseSmsPickup('yes', 'HOME-0193');
    expect(res.intent).toBe('yes');
    expect(res.status).toBe('perfectly_segregated');
    expect(res.result).toBe('correct');
    expect(res.segregationGrade).toBe('dry_clean');
    expect(res.points).toBe(20);
    expect(res.householdCode).toBe('HOME-0193');
  });

  it('parses English "house no 12 yes" extracting house number and perfect segregation', () => {
    const res = parseSmsPickup('house no 12 yes');
    expect(res.householdCode).toBe('HOME-0012');
    expect(res.status).toBe('perfectly_segregated');
    expect(res.result).toBe('correct');
    expect(res.points).toBe(20);
  });

  it('parses English "no" as not segregated (0 pts)', () => {
    const res = parseSmsPickup('no', 'HOME-0193');
    expect(res.intent).toBe('no');
    expect(res.status).toBe('not_segregated');
    expect(res.result).toBe('incorrect');
    expect(res.segregationGrade).toBe('wet_mixed');
    expect(res.points).toBe(0);
  });

  it('parses English "house no 45 no" extracting house number and not segregated', () => {
    const res = parseSmsPickup('house no 45 no');
    expect(res.householdCode).toBe('HOME-0045');
    expect(res.status).toBe('not_segregated');
    expect(res.result).toBe('incorrect');
    expect(res.points).toBe(0);
  });

  it('parses English "ok" as partially segregated (+10 pts)', () => {
    const res = parseSmsPickup('ok', 'HOME-0193');
    expect(res.intent).toBe('ok');
    expect(res.status).toBe('partially_segregated');
    expect(res.result).toBe('partial');
    expect(res.segregationGrade).toBe('dry_dirty');
    expect(res.points).toBe(10);
  });

  it('parses English "house no 193 ok" extracting house number and partially segregated', () => {
    const res = parseSmsPickup('house no 193 ok');
    expect(res.householdCode).toBe('HOME-0193');
    expect(res.status).toBe('partially_segregated');
    expect(res.result).toBe('partial');
    expect(res.points).toBe(10);
  });

  it('parses unreceived / empty message as not collected or skipped (0 pts, streak kept)', () => {
    const res1 = parseSmsPickup('', 'HOME-0193');
    expect(res1.intent).toBe('not_received');
    expect(res1.status).toBe('not_collected_skipped');
    expect(res1.result).toBe('no_waste');
    expect(res1.points).toBe(0);

    const res2 = parseSmsPickup('not received', 'HOME-0193');
    expect(res2.status).toBe('not_collected_skipped');
    expect(res2.result).toBe('no_waste');

    const res3 = parseSmsPickup('house no 89 out of station');
    expect(res3.householdCode).toBe('HOME-0089');
    expect(res3.status).toBe('not_collected_skipped');
    expect(res3.result).toBe('no_waste');
  });

  it('parses Marathi SMS messages accurately (हो, नाही, ठीक, घर क्र)', () => {
    const res1 = parseSmsPickup('घर क्र 12 हो');
    expect(res1.householdCode).toBe('HOME-0012');
    expect(res1.status).toBe('perfectly_segregated');
    expect(res1.points).toBe(20);

    const res2 = parseSmsPickup('घर क्र 193 ठीक');
    expect(res2.householdCode).toBe('HOME-0193');
    expect(res2.status).toBe('partially_segregated');
    expect(res2.points).toBe(10);

    const res3 = parseSmsPickup('घर क्र 45 नाही');
    expect(res3.householdCode).toBe('HOME-0045');
    expect(res3.status).toBe('not_segregated');
    expect(res3.points).toBe(0);

    const res4 = parseSmsPickup('घर क्र १२ हो'); // Devanagari numerals १२
    expect(res4.householdCode).toBe('HOME-0012');
    expect(res4.status).toBe('perfectly_segregated');
  });

  it('parses Hindi SMS messages accurately (हाँ, नहीं, ठीक, मकान नं)', () => {
    const res1 = parseSmsPickup('मकान नं 101 हाँ');
    expect(res1.householdCode).toBe('HOME-0101');
    expect(res1.status).toBe('perfectly_segregated');
    expect(res1.points).toBe(20);

    const res2 = parseSmsPickup('मकान नं 102 ठीक');
    expect(res2.householdCode).toBe('HOME-0102');
    expect(res2.status).toBe('partially_segregated');
    expect(res2.points).toBe(10);

    const res3 = parseSmsPickup('मकान नं 103 नहीं');
    expect(res3.householdCode).toBe('HOME-0103');
    expect(res3.status).toBe('not_segregated');
    expect(res3.points).toBe(0);
  });

  it('gracefully handles arbitrary custom answers ("any ans can exist")', () => {
    const res = parseSmsPickup('house no 105 left bin outside');
    expect(res.householdCode).toBe('HOME-0105');
    expect(res.rawMessage).toBe('house no 105 left bin outside');
    expect(res.result).toBeDefined();
  });
});

describe('Collector SMS Endpoints API', () => {
  it('GET /api/pickups/sms-feed returns recent collector SMS feed', async () => {
    const res = await request(app).get('/api/pickups/sms-feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/pickups/sms-message processes incoming SMS for house no 193 yes sent by collector', async () => {
    const res = await request(app)
      .post('/api/pickups/sms-message')
      .send({
        phone: '+91 98201 44014',
        message: 'house no 193 yes'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.parsed.householdCode).toBe('HOME-0193');
    expect(res.body.parsed.status).toBe('perfectly_segregated');
    expect(res.body.parsed.points).toBe(20);
  });

  it('POST /api/pickups/sms-message processes Marathi SMS sent by collector', async () => {
    const res = await request(app)
      .post('/api/pickups/sms-message')
      .send({
        phone: '+91 98201 44014',
        message: 'घर क्र 45 नाही'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.parsed.householdCode).toBe('HOME-0045');
    expect(res.body.parsed.status).toBe('not_segregated');
    expect(res.body.parsed.points).toBe(0);
  });
});
