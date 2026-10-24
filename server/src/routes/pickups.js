import { Router } from 'express';
import { requireRole } from '../auth/requireRole.js';

export const pickupsRouter = Router();

pickupsRouter.get('/', requireRole('collector', 'admin'), (req, res) => {
  res.json({ message: 'Pickups endpoint' });
});
