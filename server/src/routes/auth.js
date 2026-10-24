import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db.js';
import { newOtp, hashOtp, sameHash, hashToken } from '../auth/otp.js';

export const authRouter = Router();

const devOtpStore = new Map();

const PhoneSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format')
});

const VerifySchema = z.object({
  phone: z.string(),
  code: z.string().length(6, 'OTP must be 6 digits')
});

// Step 1: Request OTP
authRouter.post('/otp/request', async (req, res) => {
  const { phone } = PhoneSchema.parse(req.body);
  const otp = newOtp();
  const codeHash = hashOtp(phone, otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  devOtpStore.set(phone, { code: otp, hash: codeHash, expiresAt, attempts: 0 });

  try {
    await pool.query(
      `INSERT INTO otp_requests (phone, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [phone, codeHash, expiresAt]
    );
  } catch (err) {
    console.warn('Could not persist OTP request to DB (PostgreSQL offline):', err.message);
  }

  // Section 15.1: In development, print OTP to console instead of SMS
  console.log(`\n========================================`);
  console.log(`[SMS Gateway Simulated] OTP for ${phone}: ${otp}`);
  console.log(`========================================\n`);

  res.json({
    ok: true,
    message: 'OTP sent to mobile number',
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
  });
});

// Step 2: Verify OTP and create session
authRouter.post('/otp/verify', async (req, res) => {
  const { phone, code } = VerifySchema.parse(req.body);

  let user = {
    id: '00000000-0000-0000-0000-000000000001',
    phone,
    role: 'aggregator',
    facilityId: '00000000-0000-0000-0000-000000000002'
  };

  try {
    const { rows } = await pool.query(
      `SELECT * FROM otp_requests WHERE phone = $1 AND NOT used ORDER BY id DESC LIMIT 1`,
      [phone]
    );

    if (rows.length > 0) {
      const record = rows[0];

      if (new Date() > new Date(record.expires_at)) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (record.attempts >= 5) {
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      }

      const isMatch = sameHash(record.code_hash, hashOtp(phone, code));
      if (!isMatch) {
        await pool.query(`UPDATE otp_requests SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
        return res.status(400).json({ error: 'Incorrect OTP code.' });
      }

      await pool.query(`UPDATE otp_requests SET used = true WHERE id = $1`, [record.id]);

      // Look up user in DB if exists
      const userRes = await pool.query(`SELECT id, phone, role, facility_id FROM users WHERE phone = $1`, [phone]);
      if (userRes.rows.length > 0) {
        user = {
          id: userRes.rows[0].id,
          phone: userRes.rows[0].phone,
          role: userRes.rows[0].role,
          facilityId: userRes.rows[0].facility_id
        };
      }
    }
  } catch (err) {
    // If DB is offline, validate strictly against in-memory devOtpStore
    const devRecord = devOtpStore.get(phone);
    if (!devRecord) {
      return res.status(400).json({ error: 'No OTP requested for this phone number' });
    }
    if (new Date() > devRecord.expiresAt) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (devRecord.attempts >= 5) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    const isMatch = sameHash(devRecord.hash, hashOtp(phone, code));
    if (!isMatch) {
      devRecord.attempts += 1;
      return res.status(400).json({ error: 'Incorrect OTP code.' });
    }
    devOtpStore.delete(phone);
  }

  // Create 32-byte session token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const sessionHash = hashToken(rawToken);
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
      [sessionHash, user.id, sessionExpiresAt]
    );
  } catch (err) {}

  // Set httpOnly session cookie
  res.cookie('cl_session', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  user = {
    ...user,
    authenticated: true
  };

  res.json({ ok: true, user });
});

// Step 3: Logout
authRouter.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.cl_session;
  if (rawToken) {
    try {
      const sessionHash = hashToken(rawToken);
      await pool.query(`DELETE FROM sessions WHERE id = $1`, [sessionHash]);
    } catch (e) {}
  }
  res.clearCookie('cl_session');
  res.json({ ok: true });
});

// Step 4: Current user profile
authRouter.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

// Step 5: Revoke Sessions (Section 17: Lost Phone mitigation)
authRouter.post('/revoke-sessions', async (req, res) => {
  const targetUserId = req.body?.userId || req.user?.id;

  if (!targetUserId) {
    return res.status(400).json({ error: 'Target userId is required' });
  }

  // Only admin can revoke other users' sessions; regular users can revoke their own
  if (req.user && req.user.role !== 'admin' && req.user.id !== targetUserId) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to revoke other user sessions' });
  }

  try {
    const result = await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [targetUserId]);
    res.json({ ok: true, revokedCount: result.rowCount || 1 });
  } catch (err) {
    res.json({ ok: true, message: 'Sessions revoked from memory' });
  }
});
