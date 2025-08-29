import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as consumerController from '../controllers/consumerController.js';

// Rotte lato consumer: prenotazioni, modifica/cancellazione, storico ed emissioni
const router = Router();

// Prenota uno slot orario per il giorno successivo (min 0.1 kWh);
// vincolo: un solo produttore per ora per consumatore
router.post(
  '/reserve',
  authenticate,
  requireRole(['consumer', 'admin']),
  body('producerId').isInt({ min: 1 }),
  body('date').isISO8601(),
  body('hour').isInt({ min: 0, max: 23 }),
  body('kwh').isFloat({ min: 0.1 }),
  consumerController.reserve
);

// Modifica prenotazione (inclusa cancellazione con kwh=0). Rimborso se >24h prima.
router.post(
  '/modify',
  authenticate,
  requireRole(['consumer', 'admin']),
  body('reservationId').isInt({ min: 1 }),
  body('kwh').isFloat({ min: 0 }),
  consumerController.modify
);

// Elenco acquisti con filtri
router.get(
  '/purchases',
  authenticate,
  requireRole(['consumer', 'admin']),
  query('producerId').optional().isInt({ min: 1 }),
  query('energyType').optional().isIn(['Fossile', 'Eolico', 'Fotovoltaico']),
  query('range').optional().isString(),
  consumerController.purchases
);

// Calcolo dell'impronta di carbonio in un intervallo di tempo
router.get(
  '/carbon',
  authenticate,
  requireRole(['consumer', 'admin']),
  query('range').isString(),
  consumerController.carbon
);

export default router;


