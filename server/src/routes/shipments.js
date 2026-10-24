import { Router } from 'express';
import { requireRole } from '../auth/requireRole.js';

export const shipmentsRouter = Router();

shipmentsRouter.get('/', requireRole('facility_operator', 'recycler', 'admin'), (req, res) => {
  res.json({ message: 'Shipments endpoint' });
});
