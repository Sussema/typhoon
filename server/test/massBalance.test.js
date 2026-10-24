import { describe, it, expect } from 'vitest';
import { checkBatch, checkReceipt } from '../src/services/massBalance.js';
import { scorePickup, POINTS, STREAK_BONUS } from '../src/services/points.js';

describe('checkBatch', () => {
  it('accepts a balanced batch', () => {
    expect(checkBatch({ inputG: 50000, recoveredG: 38000, residualG: 12000 }).flagged).toBe(false);
  });

  it('flags a 3 kg gap on 50 kg input', () => {
    const r = checkBatch({ inputG: 50000, recoveredG: 35000, residualG: 12000 });
    expect(r.gapG).toBe(3000);
    expect(r.flagged).toBe(true);
  });

  it('rejects outputs larger than input', () => {
    expect(() => checkBatch({ inputG: 1000, recoveredG: 900, residualG: 200 })).toThrow('Outputs exceed input');
  });
});

describe('checkReceipt', () => {
  it('accepts matching shipment and receipt weights', () => {
    expect(checkReceipt({ shippedG: 20000, receivedG: 20000 }).flagged).toBe(false);
  });

  it('flags discrepancy exceeding tolerance', () => {
    const r = checkReceipt({ shippedG: 20000, receivedG: 19000 });
    expect(r.diffG).toBe(1000);
    expect(r.flagged).toBe(true);
  });
});

describe('scorePickup', () => {
  it('awards standard points for correct segregation and increments streak', () => {
    const res = scorePickup('correct', 2);
    expect(res.points).toBe(POINTS.correct);
    expect(res.streak).toBe(3);
    expect(res.needsFeedback).toBe(false);
  });

  it('awards streak bonus on day 7', () => {
    const res = scorePickup('correct', 6);
    expect(res.streak).toBe(7);
    expect(res.points).toBe(POINTS.correct + STREAK_BONUS.points);
  });

  it('resets streak and flags feedback on incorrect waste', () => {
    const res = scorePickup('incorrect', 10);
    expect(res.streak).toBe(0);
    expect(res.points).toBe(0);
    expect(res.needsFeedback).toBe(true);
  });
});
