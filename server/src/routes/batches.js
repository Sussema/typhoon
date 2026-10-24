import { Router } from 'express';
import { requireRole } from '../auth/requireRole.js';

export const batchesRouter = Router();

batchesRouter.get('/', requireRole('facility_operator', 'admin'), (req, res) => {
  res.json({ message: 'Batches endpoint' });
});
