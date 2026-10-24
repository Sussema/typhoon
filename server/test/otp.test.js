import { describe, it, expect } from 'vitest';
import { newOtp, hashOtp, sameHash, hashToken } from '../src/auth/otp.js';

describe('OTP Authentication Services (Stage 10)', () => {
  it('generates a 6-digit numeric OTP string', () => {
    const otp = newOtp();
    expect(otp).toMatch(/^\d{6}$/);
    expect(otp.length).toBe(6);
  });

  it('hashes phone and code with HMAC-SHA256 producing 64-char hex string', () => {
    const phone = '+919876543210';
    const otp = '123456';
    const hash = hashOtp(phone, otp);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies valid OTP hash using timingSafeEqual', () => {
    const phone = '+919876543210';
    const otp = '654321';
    const hash1 = hashOtp(phone, otp);
    const hash2 = hashOtp(phone, otp);
    expect(sameHash(hash1, hash2)).toBe(true);
  });

  it('rejects incorrect OTP code hash', () => {
    const phone = '+919876543210';
    const hash1 = hashOtp(phone, '123456');
    const hash2 = hashOtp(phone, '654321');
    expect(sameHash(hash1, hash2)).toBe(false);
  });

  it('creates deterministic SHA-256 hash for session cookie tokens', () => {
    const token = '1234567890abcdef1234567890abcdef';
    const hash = hashToken(token);
    expect(hash.length).toBe(64);
    expect(hashToken(token)).toBe(hash);
  });
});
