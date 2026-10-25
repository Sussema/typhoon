import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import rateLimit from 'express-rate-limit';
import { loadSession } from './auth/session.js';
import { authRouter } from './routes/auth.js';
import { transactionsRouter } from './routes/transactions.js';
import { batchesRouter } from './routes/batches.js';
import { shipmentsRouter } from './routes/shipments.js';
import { pickupsRouter } from './routes/pickups.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { privacyRouter } from './routes/privacy.js';
import { householdsRouter } from './routes/households.js';

export const app = express();
app.set('trust proxy', 1); // behind proxy, so rate limiting sees real client IPs (Page 40)
app.use(helmet()); // safe HTTP headers
app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' })); // refuse huge bodies
app.use(cookieParser());

// Stage 12: Logs are data too — mask phone numbers and redact secrets (Page 40)
app.use(pinoHttp({
  redact: [
    'req.headers.cookie',
    'req.headers.authorization',
    'req.body.code',
    'req.body.otp'
  ],
  serializers: {
    req(req) {
      if (req.body?.phone) {
        req.body.phone = req.body.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
      }
      return req;
    }
  }
}));

app.use(loadSession); // sets req.user if logged in (Stage 10)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Stage 12: Rate limit on /api/auth to prevent brute-forcing OTPs (Section 17)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' }
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/pickups', pickupsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/households', householdsRouter);

// Stage 15: In production, serve the built React PWA if available
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// One place that turns errors into responses
app.use((err, req, res, next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: 'Invalid input', details: err.issues });
  if (err.status) return res.status(err.status).json({ error: err.message });
  req.log?.error ? req.log.error(err) : console.error(err);
  res.status(500).json({ error: 'Internal error' }); // never leak stack traces
});
