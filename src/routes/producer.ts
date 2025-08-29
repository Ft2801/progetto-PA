import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as producerController from '../controllers/producerController.js';

// Rotte lato produttore: profilo, capacità, prezzi, occupazione, ricavi e accettazione proporzionale
const router = Router();

// Crea o aggiorna il profilo del produttore
router.post(
  '/profile',
  authenticate,
  requireRole(['producer', 'admin']),
  body('energyType').isIn(['Fossile', 'Eolico', 'Fotovoltaico']),
  body('co2PerKwh').isFloat({ min: 0 }),
  body('pricePerKwh').optional().isFloat({ min: 0 }),
  body('defaultMaxPerHourKwh').isFloat({ min: 0 }),
  producerController.upsertProfile
);

// Imposta/aggiorna capacità per uno o più slot orari in una data
router.post(
  '/capacities',
  authenticate,
  requireRole(['producer', 'admin']),
  body('date').isISO8601().toDate(),
  body('slots').isArray({ min: 1 }),
  body('slots.*.hour').isInt({ min: 0, max: 23 }),
  body('slots.*.maxCapacityKwh').isFloat({ min: 0 }),
  body('slots.*.pricePerKwh').optional().isFloat({ min: 0 }),
  producerController.upsertCapacities
);

// Occupazione per un produttore in un intervallo orario per una certa data
router.get(
  '/occupancy',
  authenticate,
  requireRole(['producer', 'admin']),
  query('date').isISO8601(),
  query('fromHour').optional().isInt({ min: 0, max: 23 }),
  query('toHour').optional().isInt({ min: 0, max: 23 }),
  producerController.occupancy
);

export default router;

// Aggiorna i prezzi per uno o più slot orari in una data
router.post(
  '/prices',
  authenticate,
  requireRole(['producer', 'admin']),
  body('date').isISO8601(),
  body('slots').isArray({ min: 1 }),
  body('slots.*.hour').isInt({ min: 0, max: 23 }),
  body('slots.*.pricePerKwh').isFloat({ min: 0 }),
  producerController.updatePrices
);

// Ricavi totali in un intervallo di date
router.get(
  '/earnings',
  authenticate,
  requireRole(['producer', 'admin']),
  query('range').isString(),
  producerController.earnings
);

// Taglio proporzionale in caso di overbooking: riduce le quantità e rimborsa l'eccesso
router.post(
  '/proportional-accept',
  authenticate,
  requireRole(['producer', 'admin']),
  body('date').isISO8601(),
  body('hour').isInt({ min: 0, max: 23 }),
  producerController.proportionalAccept
);


