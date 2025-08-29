import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as statsController from '../controllers/statsController.js';

// Rotte statistiche per i produttori
const router = Router();

// Statistiche orarie: min%, max%, media%, dev. standard% in un intervallo
router.get(
  '/producer',
  authenticate,
  requireRole(['producer', 'admin']),
  query('range').isString(),
  query('format').optional().isIn(['json', 'image']),
  statsController.producerStats
);

export default router;


