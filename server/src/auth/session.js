import { pool } from '../db.js';
import { hashToken } from './otp.js';

export async function loadSession(req, res, next) {
  const token = req.cookies?.cl_session;

  if (token) {
    try {
      const sessionHash = hashToken(token);
      const { rows } = await pool.query(
        `SELECT u.id, u.phone, u.role, u.facility_id as "facilityId"
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.expires_at > now()`,
        [sessionHash]
      );

      if (rows.length > 0) {
        req.user = { ...rows[0], authenticated: true };
        return next();
      }
    } catch (err) {
      // In early dev if tables don't exist yet, fall through to dev user
    }
  }

  // Development fallback for quick local testing (Section 8.4 CHECK)
  if (process.env.NODE_ENV !== 'production' && !req.user) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      phone: '+919876543210',
      role: 'aggregator',
      facilityId: '00000000-0000-0000-0000-000000000002',
      authenticated: !!token,
      isDevFallback: !token
    };
  }

  next();
}
