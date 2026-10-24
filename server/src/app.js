import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';
import { loadSession } from './auth/session.js';
import { authRouter } from './routes/auth.js';
import { transactionsRouter } from './routes/transactions.js';
import { batchesRouter } from './routes/batches.js';
import { shipmentsRouter } from './routes/shipments.js';
import { pickupsRouter } from './routes/pickups.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';

export const app = express();
app.set('trust proxy', 1); // behind proxy, so rate limiting sees real client IPs (Page 40)
app.use(helmet()); // safe HTTP headers
app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' })); // refuse huge bodies
app.use(cookieParser());
app.use(pinoHttp({ redact: ['req.headers.cookie'] })); // logs without secrets
app.use(loadSession); // sets req.user if logged in (Stage 10)
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/pickups', pickupsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);

// One place that turns errors into responses
app.use((err, req, res, next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: 'Invalid input', details: err.issues });
  if (err.status) return res.status(err.status).json({ error: err.message });
  req.log?.error ? req.log.error(err) : console.error(err);
  res.status(500).json({ error: 'Internal error' }); // never leak stack traces
});
