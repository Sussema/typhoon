import crypto from 'node:crypto';

export const newOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

export const hashOtp = (phone, code) => {
  const pepper = process.env.OTP_PEPPER || 'change-me-to-a-long-random-string';
  return crypto.createHmac('sha256', pepper).update(`${phone}:${code}`).digest('hex');
};

export function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
